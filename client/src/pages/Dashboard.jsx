import { useEffect, useState } from 'react';
import api from '../api/axios';
import SupplierCard from '../components/SupplierCard';
import SupplierDetail from './SupplierDetail';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'raw_material', label: 'Raw material' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'saas', label: 'SaaS' },
  { value: 'other', label: 'Other' },
];

const PAGE_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

export default function Dashboard({ user, onLogout }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the raw input before it drives a refetch.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const loadSuppliers = async () => {
      setLoading(true);
      try {
        const response = await api.get('/suppliers', {
          params: {
            search: search || undefined,
            category: category || undefined,
            country: country || undefined,
            page,
            limit: PAGE_LIMIT,
          },
        });
        if (active) {
          setSuppliers(response.data.data);
          setPagination(response.data.meta.pagination);
          setError('');
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
  }, [search, category, country, page, refreshKey, onLogout]);

  const handleSupplierChanged = () => {
    setRefreshKey((key) => key + 1);
  };

  return (
    <div style={styles.shell}>
      {selectedSupplier ? (
        <SupplierDetail
          supplierId={selectedSupplier._id}
          user={user}
          onBack={() => setSelectedSupplier(null)}
          onChanged={handleSupplierChanged}
        />
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

          <div style={styles.controls}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name..."
              style={styles.searchInput}
              type="search"
            />
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              style={styles.select}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              value={country}
              onChange={(event) => {
                setCountry(event.target.value.slice(0, 2));
                setPage(1);
              }}
              placeholder="Country (e.g. US)"
              style={styles.countryInput}
              maxLength={2}
            />
          </div>

          {loading ? <p style={styles.status}>Loading suppliers...</p> : null}
          {error ? <p style={styles.error}>{error}</p> : null}

          {!loading && !error && suppliers.length === 0 ? (
            <div style={styles.empty}>
              <h2 style={styles.emptyTitle}>No suppliers found</h2>
              <p style={styles.emptyCopy}>Nothing matches the current search/filters, or this workspace has no suppliers yet.</p>
            </div>
          ) : null}

          <div style={styles.grid}>
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier._id || supplier.name} supplier={supplier} onOpen={setSelectedSupplier} />
            ))}
          </div>

          {!loading && pagination.total > 0 ? (
            <div style={styles.pagination}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                style={styles.pageButton}
              >
                Previous
              </button>
              <span style={styles.pageStatus}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                style={styles.pageButton}
              >
                Next
              </button>
            </div>
          ) : null}
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
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  searchInput: {
    flex: '1 1 220px',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.92)',
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.92)',
  },
  countryInput: {
    width: '110px',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '0.95rem',
    textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.92)',
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
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
  },
  pageButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    padding: '8px 16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  pageStatus: {
    color: '#475569',
    fontSize: '0.9rem',
  },
};
