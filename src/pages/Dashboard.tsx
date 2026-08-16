import { useEffect, useState } from 'react';
import { Package, FolderTree, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { productsApi, collectionsApi, enquiriesApi, type Enquiry } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';

interface Stats {
  products: number;
  collections: number;
  enquiries: number;
  customers: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [productsData, collectionsData, enquiriesData] = await Promise.allSettled([
          productsApi.list(),
          collectionsApi.list(),
          enquiriesApi.list(),
        ]);

        const productList = productsData.status === 'fulfilled' ? productsData.value : [];
        const collectionList = collectionsData.status === 'fulfilled' ? collectionsData.value : [];
        const enquiryList = enquiriesData.status === 'fulfilled' ? enquiriesData.value : [];

        setStats({
          products: productList.length,
          collections: collectionList.length,
          enquiries: enquiryList.length,
          customers: 0,
        });

        setEnquiries(enquiryList.slice(0, 5));
      } catch {
        setStats({ products: 0, collections: 0, enquiries: 0, customers: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Total Products', value: stats?.products, icon: Package, color: '#36284A' },
    { label: 'Collections', value: stats?.collections, icon: FolderTree, color: '#0369a1' },
    { label: 'Enquiries', value: stats?.enquiries, icon: MessageSquare, color: '#7c3aed' },
    { label: 'Customers', value: stats?.customers, icon: Users, color: '#d97706' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Dashboard Overview</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Welcome back to the OMRIY admin panel.
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="5rem" />
      ) : (
        <div className="stat-grid">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="stat-card">
                <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                  <Icon size={22} />
                </div>
                <div className="stat-details">
                  <h4>{card.label}</h4>
                  <p style={{ color: card.color }}>{card.value ?? '—'}</p>
                </div>
                <TrendingUp size={16} style={{ marginLeft: 'auto', color: '#22c55e', opacity: 0.7 }} />
              </div>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Recent Enquiries</h3>
        </div>
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : enquiries.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>
            No enquiries yet.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enq) => (
                <tr key={enq.id}>
                  <td style={{ fontWeight: 600 }}>{enq.name || '—'}</td>
                  <td>{enq.email}</td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {enq.message || '—'}
                  </td>
                  <td>
                    <StatusBadge
                      label={enq.status}
                      variant={enq.status as 'new' | 'read' | 'resolved'}
                    />
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {enq.created_at ? new Date(enq.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
