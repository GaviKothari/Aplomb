'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ fontFamily: 'monospace', padding: '2rem', background: '#0a0a0a', color: '#f0f0f0' }}>
        <h2 style={{ color: '#f87171' }}>Runtime Error</h2>
        <pre style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {error?.message ?? 'Unknown error'}
          {'\n\n'}
          {error?.stack ?? ''}
        </pre>
        {error?.digest && (
          <p style={{ color: '#9ca3af', fontSize: '12px' }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </body>
    </html>
  )
}
