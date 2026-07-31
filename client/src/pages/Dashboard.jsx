import { useEffect, useState } from 'react';
import api from '../api/axios';
import SupplierCard from '../components/SupplierCard';
import SupplierDetail from './SupplierDetail';
import Button from '../components/Button';

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
    <div className="grid gap-5">
      {selectedSupplier ? (
        <SupplierDetail
          supplierId={selectedSupplier._id}
          user={user}
          onBack={() => setSelectedSupplier(null)}
          onChanged={handleSupplierChanged}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 uppercase tracking-[0.18em] text-xs font-bold text-[#3853b5]">Live API data</p>
              <h1 className="mt-2 mb-0 text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.05] text-slate-900">Supplier dashboard</h1>
            </div>
            <Button onClick={onLogout} className="rounded-full px-3.5 py-2.5">
              Sign out
            </Button>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name..."
              className="flex-[1_1_220px] border border-slate-300 rounded-xl px-3.5 py-2.5 text-[0.95rem] bg-white/92"
              type="search"
            />
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="border border-slate-300 rounded-xl px-3.5 py-2.5 text-[0.95rem] bg-white/92"
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
              className="w-[110px] border border-slate-300 rounded-xl px-3.5 py-2.5 text-[0.95rem] uppercase bg-white/92"
              maxLength={2}
            />
          </div>

          {loading ? <p className="m-0 text-slate-600">Loading suppliers...</p> : null}
          {error ? <p className="m-0 text-red-700">{error}</p> : null}

          {!loading && !error && suppliers.length === 0 ? (
            <div className="border border-dashed border-slate-400 rounded-[20px] p-6 bg-white/55">
              <h2 className="m-0 text-[1.2rem] text-slate-900">No suppliers found</h2>
              <p className="mt-2 mb-0 text-slate-600 leading-[1.7]">Nothing matches the current search/filters, or this workspace has no suppliers yet.</p>
            </div>
          ) : null}

          <div className="grid gap-3.5">
            {suppliers.map((supplier) => (
              <SupplierCard key={supplier._id || supplier.name} supplier={supplier} onOpen={setSelectedSupplier} />
            ))}
          </div>

          {!loading && pagination.total > 0 ? (
            <div className="flex items-center justify-center gap-3.5">
              <Button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                className="rounded-full px-4 py-2"
              >
                Previous
              </Button>
              <span className="text-slate-600 text-[0.9rem]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-full px-4 py-2"
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
