export default function SupplierCard({ supplier, onOpen }) {
  return (
    <article style={styles.card} onClick={() => onOpen?.(supplier)} role="button" tabIndex={0}>
      <div>
        <p style={styles.name}>{supplier.name}</p>
        <p style={styles.meta}>{supplier.category || 'other'} · {supplier.country}</p>
      </div>

      <div style={styles.footer}>
        <span style={styles.pill}>Risk {supplier.riskScore ?? 0}</span>
        {supplier.contractExpiry ? (
          <span style={styles.expiry}>Expiry {new Date(supplier.contractExpiry).toLocaleDateString()}</span>
        ) : null}
      </div>
    </article>
  );
}

const styles = {
  card: {
    display: 'grid',
    gap: '10px',
    padding: '18px 20px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(148,163,184,0.35)',
    cursor: 'pointer',
  },
  name: {
    margin: 0,
    fontSize: '1.08rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  meta: {
    margin: '4px 0 0',
    color: '#475569',
    fontSize: '0.95rem',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    background: '#dbeafe',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  expiry: {
    color: '#475569',
    fontSize: '0.9rem',
  },
};