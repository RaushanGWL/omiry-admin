import { useEffect, useState } from 'react';
import { RefreshCw, Mail, Phone } from 'lucide-react';
import { enquiriesApi, type Enquiry } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const statusCycle: Record<string, Enquiry['status']> = {
  new: 'read',
  read: 'resolved',
  resolved: 'new',
};

export const Enquiries = () => {
  const { show } = useToastContext();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Enquiry['status']>('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await enquiriesApi.list();
      setEnquiries(data);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (enq: Enquiry) => {
    const next = statusCycle[enq.status] ?? 'read';
    try {
      const updated = await enquiriesApi.update(enq.id, { status: next });
      setEnquiries((prev) => prev.map((e) => (e.id === enq.id ? updated : e)));
      show(`Marked as ${next}`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const filtered = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  const counts = {
    all: enquiries.length,
    new: enquiries.filter((e) => e.status === 'new').length,
    read: enquiries.filter((e) => e.status === 'read').length,
    resolved: enquiries.filter((e) => e.status === 'resolved').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Purchase Enquiries</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {counts.new} new · {counts.read} read · {counts.resolved} resolved
          </p>
        </div>
        <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'new', 'read', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="tab-count">{counts[tab]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={6} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No {filter !== 'all' ? filter : ''} enquiries found.</p></div>
        ) : (
          <div className="enquiry-list">
            {filtered.map((enq) => (
              <div key={enq.id} className={`enquiry-card ${enq.status === 'new' ? 'enquiry-card--new' : ''}`}>
                <div className="enquiry-header">
                  <div>
                    <span className="enquiry-name">{enq.name || 'Anonymous'}</span>
                    <div className="enquiry-contact">
                      <Mail size={13} />
                      <span>{enq.email}</span>
                      {enq.phone && (
                        <>
                          <Phone size={13} style={{ marginLeft: 8 }} />
                          <span>{enq.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      className="toggle-btn"
                      onClick={() => handleStatusChange(enq)}
                      title="Click to advance status"
                    >
                      <StatusBadge
                        label={enq.status}
                        variant={enq.status as 'new' | 'read' | 'resolved'}
                      />
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {enq.created_at ? new Date(enq.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
                {enq.message && (
                  <p className="enquiry-message">{enq.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
