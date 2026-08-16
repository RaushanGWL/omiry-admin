import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { blogsApi, type Blog, type BlogPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const emptyForm = (): BlogPayload => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  status: 'draft',
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const Blogs = () => {
  const { show } = useToastContext();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPayload>(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const data = await blogsApi.list();
      setBlogs(data);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load blogs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (b: Blog) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      cover_image_url: b.cover_image_url,
      status: b.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const updated = await blogsApi.update(editingId, form);
        setBlogs((prev) => prev.map((b) => (b.id === editingId ? updated : b)));
        show('Blog updated', 'success');
      } else {
        const created = await blogsApi.create(form);
        setBlogs((prev) => [created, ...prev]);
        show('Blog created', 'success');
      }
      setModalOpen(false);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await blogsApi.delete(deleteId);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteId));
      show('Blog deleted', 'success');
      setDeleteId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (b: Blog) => {
    const action = b.status === 'published' ? 'draft' : 'publish';
    try {
      const updated = await blogsApi.action(b.id, action);
      setBlogs((prev) => prev.map((item) => (item.id === b.id ? updated : item)));
      show(`Blog ${action === 'publish' ? 'published' : 'moved to draft'}`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const setField = <K extends keyof BlogPayload>(k: K, v: BlogPayload[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'title' && !editingId) next.slug = slugify(v as string);
      return next;
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Blogs &amp; Journal</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {blogs.length} post{blogs.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn-primary" id="add-blog-btn" onClick={openAdd}>
            <Plus size={18} /> New Post
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={5} /></div>
        ) : blogs.length === 0 ? (
          <div className="empty-state"><p>No blog posts yet. Write your first post!</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Title</th>
                <th>Excerpt</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.cover_image_url ? (
                      <img
                        src={b.cover_image_url}
                        alt={b.title}
                        style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48, height: 36, borderRadius: 6,
                          background: '#f0f0f0', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 18
                        }}
                      >📄</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.title}</div>
                    <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/{b.slug}</code>
                  </td>
                  <td style={{ maxWidth: 220, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {b.excerpt?.slice(0, 70)}{b.excerpt?.length > 70 ? '…' : ''}
                  </td>
                  <td>
                    <button className="toggle-btn" onClick={() => toggleStatus(b)}>
                      <StatusBadge
                        label={b.status === 'published' ? 'Published' : 'Draft'}
                        variant={b.status === 'published' ? 'published' : 'draft'}
                      />
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-action edit" onClick={() => openEdit(b)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => setDeleteId(b.id)}
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Blog Post' : 'New Blog Post'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
              placeholder="Blog post title..."
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input
                className="form-control"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setField('status', e.target.value as 'draft' | 'published')}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Excerpt</label>
            <input
              className="form-control"
              value={form.excerpt}
              onChange={(e) => setField('excerpt', e.target.value)}
              placeholder="Short summary..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cover Image URL</label>
            <input
              className="form-control"
              type="url"
              value={form.cover_image_url}
              onChange={(e) => setField('cover_image_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content (HTML)</label>
            <textarea
              className="form-control"
              rows={6}
              value={form.content}
              onChange={(e) => setField('content', e.target.value)}
              placeholder="<h2>...</h2><p>...</p>"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Blog Post"
        message="Delete this blog post permanently?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
};
