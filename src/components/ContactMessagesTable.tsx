import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, X, MessageSquare, User, Calendar, Trash2 } from 'lucide-react';
import { contactInfoApi, type ContactMessage } from '../lib/api';
import { LoadingSkeleton } from './LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const PAGE_LIMIT = 20;

export const ContactMessagesTable = () => {
  const { show } = useToastContext();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await contactInfoApi.listPaginated(targetPage, PAGE_LIMIT);
      setMessages(res.data);
      setTotalPages(res.pagination.total_pages || 1);
      setTotal(res.pagination.total || res.data.length);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load contact messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(page); }, [page, load]);

  const openDetail = async (msg: ContactMessage) => {
    setSelected(msg);
    setDetailLoading(true);
    try {
      const full = await contactInfoApi.getById(msg.id);
      setSelected(full);
    } catch {
      // silently keep the list version
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmDelete = (id: string) => setDeletingId(id);
  const cancelDelete = () => setDeletingId(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await contactInfoApi.delete(deletingId);
      setMessages((prev) => prev.filter((m) => m.id !== deletingId));
      if (selected?.id === deletingId) setSelected(null);
      setTotal((t) => t - 1);
      show('Message deleted', 'success');
      setDeletingId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginTop: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {total} total messages
          </p>
        </div>
        <button className="btn-secondary icon-btn-sm" onClick={() => load(page)} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}>
            <LoadingSkeleton rows={6} />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p>No contact messages found.</p>
          </div>
        ) : (
          <div className="enquiry-list">
            {messages.map((msg) => (
              <div key={msg.id} className="enquiry-card">
                <div className="enquiry-header">
                  <div
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => openDetail(msg)}
                  >
                    <span className="enquiry-name">{msg.full_name || msg.name || 'Anonymous'}</span>
                    <div className="enquiry-contact">
                      <Mail size={13} />
                      <span>{msg.email}</span>
                      {(msg.phone || msg.mobile || msg.phone_number || msg.mobile_number) && (
                        <>
                          <Phone size={13} style={{ marginLeft: 8 }} />
                          <span>{msg.phone || msg.mobile || msg.phone_number || msg.mobile_number}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 72 }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : '—'}
                    </span>
                    <button
                      className="icon-btn-danger"
                      title="Delete message"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(msg.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {msg.message && (
                  <p
                    className="enquiry-message"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetail(msg)}
                  >
                    {msg.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Message Detail</h3>
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
                    <strong>{selected.full_name || selected.name || 'Anonymous'}</strong>
                  </div>
                  <div className="drawer-meta-row">
                    <Mail size={15} />
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                  {(selected.phone || selected.mobile || selected.phone_number || selected.mobile_number) && (
                    <div className="drawer-meta-row">
                      <Phone size={15} />
                      <a href={`tel:${selected.phone || selected.mobile || selected.phone_number || selected.mobile_number}`}>{selected.phone || selected.mobile || selected.phone_number || selected.mobile_number}</a>
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
                    Delete Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {deletingId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Message?</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              This action cannot be undone. The message will be permanently removed.
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
    </div>
  );
};
