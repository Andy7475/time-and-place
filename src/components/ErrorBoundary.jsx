import { Component } from 'react';

/**
 * Catches render/runtime errors anywhere below it and shows a recoverable
 * banner instead of a blank screen — the React-idiomatic replacement for the
 * prototype's try/catch around its render function.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Time & Place crashed while rendering:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || 'unknown error';
      return (
        <div style={{ padding: 24 }}>
          <div
            style={{
              background: '#fde8e4',
              border: '1px solid #d9532f',
              color: '#7a2c14',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 13,
              maxWidth: 560,
            }}
          >
            <strong>Something went wrong rendering your data</strong> ({msg}).
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #d9532f',
                  background: '#fff',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
