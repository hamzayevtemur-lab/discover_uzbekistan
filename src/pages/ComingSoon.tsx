import { Link } from 'react-router-dom'

/** Placeholder for pages that haven't been ported from the static HTML yet. */
export default function ComingSoon({ title, source }: { title: string; source: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0d0d0d', color: '#fff', textAlign: 'center', padding: '2rem' }}>
      <div>
        <h1 style={{ marginBottom: '.5rem' }}>{title}</h1>
        <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>Not ported yet (original: {source})</p>
        <Link to="/" style={{ color: '#8b5cf6' }}>← Back to Home</Link>
      </div>
    </div>
  )
}
