import { useEffect, useState } from 'react';
import api from '../api/axios';
import SupplierCard from '../components/SupplierCard';
import SupplierDetail from './SupplierDetail';

export default function Dashboard({ onLogout }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSuppliers = async () => {
      try {
        const response = await api.get('/suppliers');
        if (active) {
          setSuppliers(response.data.data);
        }
      } catch (requestError) {
        if (active) {
          if (requestError?.response?.status === 401) {
            onLogout();
            return;
          }
          setError('Unable to load suppliers from the API');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSuppliers();

    return () => {
      active = false;
    };
  }, [onLogout]);

  return (
    <div style={styles.shell}>
      {selectedSupplier ? (
        <SupplierDetail supplierId={selectedSupplier._id} onBack={() => setSelectedSupplier(null)} />
      ) : (
        <>
          <div style={styles.header}>
            <div>
              <p style={styles.kicker}>Live API data</p>
              <h1 style={styles.title}>Supplier dashboard</h1>
            </div>
            <button onClick={onLogout} style={styles.logout} type="button">
              Sign out
            </button>
          </div>

          {loading ? <p style={styles.status}>Loading suppliers...</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          {!loading && !error && suppliers.length === 0 ? (
            <div style={styles.empty}>
              <h2 style={styles.emptyTitle}>No suppliers yet</h2>
              <p style={styles.emptyCopy}>The backend is responding, but there are no suppliers for this workspace. Signing in with a new demo account will seed one automatically.</p>
            </div>
          ) : null}

          <div style={styles.grid}>
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier._id || supplier.name} supplier={supplier} onOpen={setSelectedSupplier} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  shell: {
    display: 'grid',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  },
  kicker: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    fontSize: '12px',
    fontWeight: 700,
    color: '#3853b5',
  },
  title: {
    margin: '8px 0 0',
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    lineHeight: 1.05,
    color: '#0f172a',
  },
  logout: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  status: {
    margin: 0,
    color: '#475569',
  },
  error: {
    margin: 0,
    color: '#b91c1c',
  },
  empty: {
    border: '1px dashed #94a3b8',
    borderRadius: '20px',
    padding: '24px',
    background: 'rgba(255,255,255,0.55)',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#0f172a',
  },
  emptyCopy: {
    margin: '8px 0 0',
    color: '#475569',
    lineHeight: 1.7,
  },
  grid: {
    display: 'grid',
    gap: '14px',
  },
};