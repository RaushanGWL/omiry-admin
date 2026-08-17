import { useEffect, useState } from 'react';
import { RefreshCw, User } from 'lucide-react';
import { customersApi, type Customer } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

export const Customers = () => {
  const { show } = useToastContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const limit = 20;

  const load = async (query = search, p = page) => {
    setLoading(true);
    try {
      const data = await customersApi.list(query, p, limit);
      setCustomers(data || []);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search, 1);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Registered Customers</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button className="btn-secondary icon-btn-sm" onClick={() => load(search, page)} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          className="form-control"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={6} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No customers match your search.' : 'No customers yet.'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const name = c.full_name || c.user_metadata?.full_name || c.user_metadata?.name || 'Unknown';
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: '#36284A20', color: '#36284A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <User size={18} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                      </div>
                    </td>
                    <td>{c.email}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
