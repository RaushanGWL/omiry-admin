import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Mail,
  Phone,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  User,
  Calendar,
} from 'lucide-react';
import { enquiriesApi, type Enquiry } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';
import { ContactMessagesTable } from '../components/ContactMessagesTable';

const STATUS_OPTIONS: Enquiry['status'][] = ['new', 'read', 'contacted', 'resolved'];

const STATUS_LABELS: Record<Enquiry['status'], string> = {
  new: 'New',
  read: 'Read',
  contacted: 'Contacted',
  resolved: 'Resolved',
};

const STATUS_COLORS: Record<Enquiry['status'], string> = {
  new: '#ef4444',
  read: '#3b82f6',
  contacted: '#f59e0b',
  resolved: '#22c55e',
};

const PAGE_LIMIT = 20;

export const Enquiries = () => {
  const { show } = useToastContext();

  const [activeTab, setActiveTab] = useState<'purchase' | 'messages'>('purchase');

  // list state
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Enquiry['status']>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // detail drawer
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // status update loading per row
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await enquiriesApi.listPaginated(targetPage, PAGE_LIMIT);
      setEnquiries(res.data);
      setTotalPages(res.pagination.total_pages || 1);
      setTotal(res.pagination.total || res.data.length);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(page); }, [page]);

  // open detail drawer
  const openDetail = async (enq: Enquiry) => {
    setSelected(enq);
    setDetailLoading(true);
    try {
      const full = await enquiriesApi.getById(enq.id);
      setSelected(full);
    } catch {
      // silently keep the list version
    } finally {
      setDetailLoading(false);
    }
  };

  // status change
  const handleStatusChange = async (enq: Enquiry, status: Enquiry['status']) => {
    setStatusLoading((prev) => ({ ...prev, [enq.id]: true }));
    try {
      const updated = await enquiriesApi.updateStatus(enq.id, status);
      setEnquiries((prev) => prev.map((e) => (e.id === enq.id ? updated : e)));
      if (selected?.id === enq.id) setSelected(updated);
      show(`Status changed to "${STATUS_LABELS[status]}"`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Status update failed', 'error');
    } finally {
      setStatusLoading((prev) => ({ ...prev, [enq.id]: false }));
    }
  };

  // delete
  const confirmDelete = (id: string) => setDeletingId(id);
  const cancelDelete = () => setDeletingId(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await enquiriesApi.delete(deletingId);
      setEnquiries((prev) => prev.filter((e) => e.id !== deletingId));
      if (selected?.id === deletingId) setSelected(null);
      setTotal((t) => t - 1);
      show('Enquiry deleted', 'success');
      setDeletingId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered =
    filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  const counts = {
    all: enquiries.length,
    new: enquiries.filter((e) => e.status === 'new').length,
    read: enquiries.filter((e) => e.status === 'read').length,
    contacted: enquiries.filter((e) => e.status === 'contacted').length,
    resolved: enquiries.filter((e) => e.status === 'resolved').length,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span
              style={{ cursor: 'pointer', color: activeTab === 'purchase' ? 'inherit' : 'var(--text-secondary)' }}
              onClick={() => setActiveTab('purchase')}
            >
              Purchase Enquiries
            </span>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span
              style={{ cursor: 'pointer', color: activeTab === 'messages' ? 'inherit' : 'var(--text-secondary)' }}
              onClick={() => setActiveTab('messages')}
            >
              Messages
            </span>
          </h2>
          {activeTab === 'purchase' && (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {total} total · {counts.new} new · {counts.contacted} contacted · {counts.resolved} resolved
            </p>
          )}
        </div>
        {activeTab === 'purchase' && (
          <button className="btn-secondary icon-btn-sm" onClick={() => load(page)} title="Refresh">
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {activeTab === 'purchase' ? (
        <>
          {/* Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'new', 'read', 'contacted', 'resolved'] as const).map((tab) => (
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

      {/* Main List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <LoadingSkeleton rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No {filter !== 'all' ? filter : ''} enquiries found.</p>
          </div>
        ) : (
          <div className="enquiry-list">
            {filtered.map((enq) => (
              <div
                key={enq.id}
                className={`enquiry-card ${enq.status === 'new' ? 'enquiry-card--new' : ''}`}
              >
                <div className="enquiry-header">
                  <div
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => openDetail(enq)}
                  >
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
                    {(enq.sku || enq.product_sku) && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        color: '#374151',
                        letterSpacing: '0.03em',
                      }}>
                        SKU: {enq.sku || enq.product_sku}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Status dropdown */}
                    <select
                      className="enquiry-status-select"
                      value={enq.status}
                      disabled={!!statusLoading[enq.id]}
                      onChange={(e) =>
                        handleStatusChange(enq, e.target.value as Enquiry['status'])
                      }
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: STATUS_COLORS[enq.status] }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 72 }}>
                      {enq.created_at ? new Date(enq.created_at).toLocaleDateString() : '—'}
                    </span>

                    {/* Delete */}
                    <button
                      className="icon-btn-danger"
                      title="Delete enquiry"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(enq.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {enq.message && (
                  <p
                    className="enquiry-message"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetail(enq)}
                  >
                    {enq.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="btn-secondary icon-btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary icon-btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Enquiry Detail</h3>
              <button className="icon-btn-sm btn-secondary" onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '1.5rem' }}>
                <LoadingSkeleton rows={4} />
              </div>
            ) : (
              <div className="drawer-body">
                <div className="drawer-section">
                  <div className="drawer-meta-row">
                    <User size={15} />
                    <strong>{selected.name || 'Anonymous'}</strong>
                  </div>
                  <div className="drawer-meta-row">
                    <Mail size={15} />
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                  {selected.phone && (
                    <div className="drawer-meta-row">
                      <Phone size={15} />
                      <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                    </div>
                  )}
                  {(selected.sku || selected.product_sku) && (
                    <div className="drawer-meta-row">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKU</span>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.82rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        color: '#374151',
                      }}>
                        {selected.sku || selected.product_sku}
                      </span>
                    </div>
                  )}
                  <div className="drawer-meta-row">
                    <Calendar size={15} />
                    <span>
                      {selected.created_at
                        ? new Date(selected.created_at).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="drawer-section">
                  <div className="drawer-meta-row">
                    <MessageSquare size={15} />
                    <strong>Message</strong>
                  </div>
                  <p className="drawer-message">{selected.message}</p>
                </div>

                <div className="drawer-section">
                  <label className="drawer-label">Update Status</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        className={`status-pill-btn ${selected.status === s ? 'active' : ''}`}
                        disabled={!!statusLoading[selected.id]}
                        onClick={() => handleStatusChange(selected, s)}
                        style={selected.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : {}}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="drawer-section" style={{ marginTop: '1.5rem' }}>
                  <button
                    className="btn-danger"
                    style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                    onClick={() => {
                      setSelected(null);
                      confirmDelete(selected.id);
                    }}
                  >
                    <Trash2 size={15} />
                    Delete Enquiry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Enquiry?</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              This action cannot be undone. The enquiry will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={cancelDelete} disabled={deleteLoading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        <ContactMessagesTable />
      )}
    </div>
  );
};
