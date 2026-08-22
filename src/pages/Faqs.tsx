import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { faqsApi, type Faq, type FaqPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const emptyForm = (): FaqPayload => ({
  question: '',
  answer: '',
  type: 'home',
  blog_id: null,
  sort_order: 1,
  is_active: true,
});

export const Faqs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const blogIdFilter = searchParams.get('blog_id');

  const { show } = useToastContext();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FaqPayload>(emptyForm());
  const [sortOrderError, setSortOrderError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = blogIdFilter ? { blog_id: `eq.${blogIdFilter}` } : { type: 'eq.home' };
      const data = await faqsApi.list(params);
      setFaqs(data);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load FAQs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    const form = emptyForm();
    if (blogIdFilter) {
      form.type = 'blog';
      form.blog_id = blogIdFilter;
    }
    setForm(form);
    setSortOrderError(null);
    setModalOpen(true);
  };

  const openEdit = (f: Faq) => {
    setEditingId(f.id);
    setForm({
      question: f.question,
      answer: f.answer,
      type: f.type || 'home',
      blog_id: f.blog_id || null,
      sort_order: f.sort_order || 1,
      is_active: f.is_active ?? true,
    });
    setSortOrderError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        // Do not send type or blog_id on update since they are read-only
        const { type, blog_id, ...patchPayload } = form;
        const updated = await faqsApi.update(editingId, patchPayload);
        setFaqs((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
        show('FAQ updated', 'success');
      } else {
        const createPayload = {
          ...form,
          blog_id: form.type === 'blog' ? form.blog_id : null,
        };
        const created = await faqsApi.create(createPayload);
        setFaqs((prev) => [created, ...prev]);
        show('FAQ created', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('faqs_blog_sort_order_unique') || msg.includes('faqs_type_sort_order_unique') || msg.includes('duplicate key value violates unique constraint')) {
        setSortOrderError('This sort order is already in use. Please choose a different order.');
      } else {
        show(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await faqsApi.delete(deleteId);
      setFaqs((prev) => prev.filter((f) => f.id !== deleteId));
      show('FAQ deleted', 'success');
      setDeleteId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (f: Faq) => {
    const action = f.is_active ? 'unpublish' : 'publish';
    try {
      const updated = await faqsApi.action(f.id, action);
      setFaqs((prev) => prev.map((item) => (item.id === f.id ? updated : item)));
      show(`FAQ ${action === 'publish' ? 'published' : 'unpublished'}`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const setField = <K extends keyof FaqPayload>(k: K, v: FaqPayload[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            {blogIdFilter && (
              <button className="icon-btn-sm" onClick={() => navigate('/blogs')} title="Back to Blogs">
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 style={{ margin: 0 }}>FAQs {blogIdFilter ? `for Blog` : ''}</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} total {blogIdFilter ? `for this blog` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={18} /> Add FAQ
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={5} /></div>
        ) : faqs.length === 0 ? (
          <div className="empty-state"><p>No FAQs yet. Add your first FAQ!</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Question</th>
                <th>Answer</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faqs.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {f.type} {f.blog_id ? `(${f.blog_id})` : ''}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={f.question}
                    >
                      {f.question}
                    </div>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={f.answer}
                    >
                      {f.answer}
                    </div>
                  </td>
                  <td>
                    <button className="toggle-btn" onClick={() => toggleStatus(f)}>
                      <StatusBadge
                        label={f.is_active ? 'Active' : 'Inactive'}
                        variant={f.is_active ? 'published' : 'draft'}
                      />
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-action edit" onClick={() => openEdit(f)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => setDeleteId(f.id)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit FAQ' : 'New FAQ'}
        size="md"
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input
              className="form-control"
              value={form.question}
              onChange={(e) => setField('question', e.target.value)}
              required
              placeholder="Enter the question..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea
              className="form-control"
              value={form.answer}
              onChange={(e) => setField('answer', e.target.value)}
              required
              rows={4}
              placeholder="Enter the answer..."
            />
          </div>
          
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                className="form-control"
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
                required
                disabled={!!editingId || !!blogIdFilter}
              >
                <option value="home">Home Page</option>
                <option value="blog">Blog Post</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sort Order</label>
              <input
                type="number"
                className={`form-control ${sortOrderError ? 'input-error' : ''}`}
                value={form.sort_order}
                onChange={(e) => {
                  setField('sort_order', parseInt(e.target.value) || 0);
                  if (sortOrderError) setSortOrderError(null);
                }}
              />
              {sortOrderError && (
                <small style={{ color: '#e53e3e', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                  {sortOrderError}
                </small>
              )}
            </div>
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <input 
                type="checkbox" 
                id="faq-published" 
                checked={form.is_active}
                onChange={(e) => setField('is_active', e.target.checked)}
             />
             <label htmlFor="faq-published" style={{ marginBottom: 0 }}>Is Active</label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update FAQ' : 'Add FAQ'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete FAQ"
        message="Delete this FAQ permanently?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
};
