// OKLCH colour interpolation used by the day/night gradient.
// Colours are `[L, C, H]` triples. Hue is interpolated along the shortest
// angular path so crossing 0/360 doesn't wash through muddy grey.

/** Interpolate hue `a`→`b` by factor `f` along the shortest angular path. */
export function lerpHue(a, b, f) {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * f + 360) % 360;
}

/** Linear interpolation between two OKLCH colours. */
export function lerpColor(c1, c2, f) {
  return [
    c1[0] + (c2[0] - c1[0]) * f,
    c1[1] + (c2[1] - c1[1]) * f,
    lerpHue(c1[2], c2[2], f),
  ];
}

/** Cosine ease-in-out interpolation between two OKLCH colours. */
export function easeColor(c1, c2, f) {
  const clamped = Math.min(1, Math.max(0, f));
  const e = (1 - Math.cos(Math.PI * clamped)) / 2;
  return lerpColor(c1, c2, e);
}

/** Render an OKLCH triple as a CSS `oklch(...)` string. */
export function cssOklch(c) {
  return `oklch(${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(1)})`;
}
