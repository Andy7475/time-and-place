#!/usr/bin/env python3
"""How accurately does an LLM geocode place names?

1. Randomly sample populated places (towns/cities/villages) from GeoNames.
2. Ask a Claude model for each place's latitude/longitude.
3. Compare with the GeoNames coordinates.
4. Report the great-circle error in km, per place and in aggregate.

Sampling is uniform over all GeoNames populated places in the chosen dump
(default: cities1000 = every place with population >= 1000, ~150k rows), so
the sample is dominated by small towns, not capitals. National capitals
(feature code PPLC) are excluded unless --include-capitals is given.

Usage:
    pip install anthropic
    export ANTHROPIC_API_KEY=...
    python research/llm_geocode_eval.py -n 200 --seed 1
    python research/llm_geocode_eval.py -n 200 --model claude-haiku-5-5 --effort low

Outputs a CSV of per-place results plus a summary printed to stdout.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import random
import statistics
import sys
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path

GEONAMES_BASE = "https://download.geonames.org/export/dump/"
DATA_DIR = Path(__file__).parent / "data"

# Populated-place feature codes to keep. Excludes PPLC (national capital) by
# default, plus sections/historical/abandoned/destroyed places, which are not
# meaningful "towns" to geocode.
PLACE_CODES = {
    "PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLA5",
    "PPLF", "PPLG", "PPLL", "PPLR", "PPLS",
}

# GeoNames main-table column indices (see GeoNames readme.txt).
COL_ID, COL_NAME, COL_ASCII, COL_LAT, COL_LNG = 0, 1, 2, 4, 5
COL_FCODE, COL_COUNTRY, COL_ADMIN1, COL_POP = 7, 8, 10, 14


# ---------------------------------------------------------------- GeoNames

def fetch(filename: str) -> Path:
    """Download a GeoNames dump file into DATA_DIR once, then reuse it."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / filename
    if not path.exists():
        print(f"Downloading {GEONAMES_BASE}{filename} ...", file=sys.stderr)
        urllib.request.urlretrieve(GEONAMES_BASE + filename, path)
    return path


def load_lookup(filename: str, key_cols: tuple[int, ...], val_col: int) -> dict[str, str]:
    out = {}
    with open(fetch(filename), encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.rstrip("\n").split("\t")
            out[".".join(parts[i] for i in key_cols)] = parts[val_col]
    return out


@dataclass
class Place:
    geonameid: str
    name: str
    admin1: str
    country: str
    feature_code: str
    population: int
    lat: float
    lng: float

    @property
    def query(self) -> str:
        return ", ".join(p for p in (self.name, self.admin1, self.country) if p)


def load_places(dump: str, include_capitals: bool, min_pop: int) -> list[Place]:
    countries = load_lookup("countryInfo.txt", (0,), 4)        # ISO -> name
    admin1 = load_lookup("admin1CodesASCII.txt", (0,), 1)      # "GB.ENG" -> "England"
    codes = PLACE_CODES | ({"PPLC"} if include_capitals else set())

    places = []
    with zipfile.ZipFile(fetch(f"{dump}.zip")) as zf:
        with zf.open(f"{dump}.txt") as raw:
            for line in io.TextIOWrapper(raw, encoding="utf-8"):
                r = line.rstrip("\n").split("\t")
                if r[COL_FCODE] not in codes:
                    continue
                pop = int(r[COL_POP] or 0)
                if pop < min_pop:
                    continue
                cc = r[COL_COUNTRY]
                places.append(Place(
                    geonameid=r[COL_ID],
                    name=r[COL_NAME],
                    admin1=admin1.get(f"{cc}.{r[COL_ADMIN1]}", ""),
                    country=countries.get(cc, cc),
                    feature_code=r[COL_FCODE],
                    population=pop,
                    lat=float(r[COL_LAT]),
                    lng=float(r[COL_LNG]),
                ))
    return places


# ---------------------------------------------------------------- LLM

PROMPT = (
    "Give the latitude and longitude of the centre of this populated place, "
    "in decimal degrees (WGS84). Give your best estimate even if unsure.\n\n"
    "Place: {query}"
)

SCHEMA = {
    "type": "object",
    "properties": {"lat": {"type": "number"}, "lng": {"type": "number"}},
    "required": ["lat", "lng"],
    "additionalProperties": False,
}


def ask_llm(client, model: str, effort: str | None, query: str) -> tuple[float | None, float | None, str]:
    """Return (lat, lng, status). status is 'ok' or a short error label."""
    import anthropic

    output_config = {"format": {"type": "json_schema", "schema": SCHEMA}}
    if effort:
        output_config["effort"] = effort
    try:
        resp = client.messages.create(
            model=model,
            max_tokens=16000,
            output_config=output_config,
            messages=[{"role": "user", "content": PROMPT.format(query=query)}],
        )
    except anthropic.APIError as e:
        return None, None, f"api_error:{type(e).__name__}"

    if resp.stop_reason == "refusal":
        return None, None, "refusal"
    text = next((b.text for b in resp.content if b.type == "text"), None)
    if text is None:
        return None, None, f"no_text:{resp.stop_reason}"
    try:
        data = json.loads(text)
        lat, lng = float(data["lat"]), float(data["lng"])
    except (ValueError, KeyError, TypeError):
        return None, None, "bad_json"
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None, None, "out_of_range"
    return lat, lng, "ok"


# ---------------------------------------------------------------- scoring

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0088  # mean Earth radius, km
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def percentile(xs: list[float], q: float) -> float:
    xs = sorted(xs)
    k = (len(xs) - 1) * q
    lo, hi = math.floor(k), math.ceil(k)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def summarise(rows: list[dict]) -> str:
    errs = [r["error_km"] for r in rows if r["error_km"] is not None]
    failed = len(rows) - len(errs)
    lines = [f"Places: {len(rows)}   answered: {len(errs)}   failed: {failed}"]
    if not errs:
        return "\n".join(lines)
    lines += [
        f"Error km  median {statistics.median(errs):.1f}   mean {statistics.mean(errs):.1f}   "
        f"p90 {percentile(errs, 0.9):.1f}   max {max(errs):.1f}",
        "Within:   " + "   ".join(
            f"{t:>4} km {100 * sum(e <= t for e in errs) / len(errs):5.1f}%"
            for t in (1, 5, 10, 25, 100, 500)
        ),
        "",
        "By population (median error km, n):",
    ]
    bands = [(0, 5_000), (5_000, 20_000), (20_000, 100_000), (100_000, 1_000_000), (1_000_000, 10**10)]
    for lo, hi in bands:
        e = [r["error_km"] for r in rows if r["error_km"] is not None and lo <= r["population"] < hi]
        if e:
            lines.append(f"  {lo:>9,} - {hi:<13,} {statistics.median(e):8.1f}  (n={len(e)})")
    return "\n".join(lines)


# ---------------------------------------------------------------- main

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-n", "--n", type=int, default=100, help="number of places to sample")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--dump", default="cities1000", choices=["cities500", "cities1000", "cities5000", "cities15000"],
                    help="GeoNames dump; the number is the minimum population")
    ap.add_argument("--min-pop", type=int, default=0, help="extra population floor")
    ap.add_argument("--include-capitals", action="store_true")
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--effort", choices=["low", "medium", "high", "xhigh", "max"], default=None,
                    help="output_config.effort; omit for the model default")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--out", type=Path, default=None, help="CSV path (default: research/results/<model>_n<N>_s<seed>.csv)")
    args = ap.parse_args()

    import anthropic

    places = load_places(args.dump, args.include_capitals, args.min_pop)
    print(f"Loaded {len(places):,} candidate places from {args.dump}", file=sys.stderr)
    sample = random.Random(args.seed).sample(places, args.n)

    client = anthropic.Anthropic()

    def run(p: Place) -> dict:
        lat, lng, status = ask_llm(client, args.model, args.effort, p.query)
        err = haversine_km(p.lat, p.lng, lat, lng) if status == "ok" else None
        return {**asdict(p), "query": p.query, "llm_lat": lat, "llm_lng": lng,
                "status": status, "error_km": None if err is None else round(err, 3)}

    rows = []
    with ThreadPoolExecutor(args.workers) as pool:
        for i, row in enumerate(pool.map(run, sample), 1):
            rows.append(row)
            e = "—" if row["error_km"] is None else f"{row['error_km']:.1f} km"
            print(f"[{i}/{args.n}] {row['query']}: {e} ({row['status']})", file=sys.stderr)

    out = args.out or Path(__file__).parent / "results" / f"{args.model}_n{args.n}_s{args.seed}.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    print(f"\nModel: {args.model}   effort: {args.effort or 'default'}   dump: {args.dump}   seed: {args.seed}")
    print(summarise(rows))
    print(f"\nPer-place results: {out}")


if __name__ == "__main__":
    main()
