import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Upload, X, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { blogsApi, storageApi, faqsApi, type Blog, type BlogPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';
import Editor from 'react-simple-wysiwyg';

const emptyForm = (): BlogPayload => ({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category: '',
  author: '',
  date: '',
  status: 'draft',
  seo_title: '',
  seo_description: '',
  seo_schema_markup: '',
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const Blogs = () => {
  const navigate = useNavigate();
  const { show } = useToastContext();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPayload>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', sort_order: 1, is_active: true });
  const [savingFaq, setSavingFaq] = useState(false);
  const [faqSortOrderError, setFaqSortOrderError] = useState<string | null>(null);

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
    if (imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  const openEdit = (b: Blog) => {
    setEditingId(b.id);
    setForm({
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      content: b.content,
      cover_image_url: b.cover_image_url || '',
      category: b.category || '',
      author: b.author || '',
      date: b.date || '',
      status: b.status,
      seo_title: b.seo_title || '',
      seo_description: b.seo_description || '',
      seo_schema_markup: b.seo_schema_markup || '',
    });
    if (imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(b.cover_image_url || '');
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ── Step 1: Upload image to blog-images bucket if a new file was selected ──
      let coverImageUrl = form.cover_image_url;
      if (imageFile) {
        show('Uploading image…', 'success');
        coverImageUrl = await storageApi.uploadBlogImage(imageFile);
      }

      if (editingId) {
        // ── UPDATE: PATCH only accepts JSON ──────────────────────
        const payload: Partial<BlogPayload> = {
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt,
          content: form.content,
          category: form.category,
          author: form.author,
          date: form.date,
          status: form.status,
          cover_image_url: coverImageUrl,
          seo_title: form.seo_title,
          seo_description: form.seo_description,
          seo_schema_markup: form.seo_schema_markup,
        };
        const updated = await blogsApi.update(
          editingId,
          payload,
          form.status === 'published' ? 'publish' : 'draft'
        );
        setBlogs((prev) => prev.map((b) => (b.id === editingId ? updated : b)));
        show('Blog updated', 'success');
      } else {
        // ── CREATE: POST with JSON body ───────────────────────────
        const payload: BlogPayload = {
          title: form.title,
          slug: form.slug,
          excerpt: form.excerpt,
          content: form.content,
          category: form.category,
          author: form.author,
          date: form.date,
          status: form.status,
          cover_image_url: coverImageUrl,
          seo_title: form.seo_title,
          seo_description: form.seo_description,
          seo_schema_markup: form.seo_schema_markup,
        };
        const created = await blogsApi.create(payload);
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

  const openFaqModal = () => {
    setFaqForm({ question: '', answer: '', sort_order: 1, is_active: true });
    setFaqSortOrderError(null);
    setFaqModalOpen(false); // Reset to ensure modal triggers open correctly
    setTimeout(() => setFaqModalOpen(true), 10);
  };

  const handleFaqSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSavingFaq(true);
    try {
      await faqsApi.create({
        question: faqForm.question,
        answer: faqForm.answer,
        type: 'blog',
        blog_id: editingId,
        sort_order: faqForm.sort_order,
        is_active: faqForm.is_active,
      });
      show('FAQ added to this blog', 'success');
      setFaqModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('faqs_blog_sort_order_unique') || msg.includes('faqs_type_sort_order_unique') || msg.includes('duplicate key value violates unique constraint')) {
        setFaqSortOrderError('This sort order is already in use. Please choose a different order.');
      } else {
        show(msg, 'error');
      }
    } finally {
      setSavingFaq(false);
    }
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
                <th>Category</th>
                <th>Author</th>
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
                  <td style={{ maxWidth: '260px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '240px',
                      }}
                      title={b.title}
                    >
                      {b.title}
                    </div>
                    <code
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        maxWidth: '240px',
                      }}
                      title={`/${b.slug}`}
                    >
                      /{b.slug}
                    </code>
                  </td>
                  <td
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={b.category || ''}
                  >
                    {b.category || '—'}
                  </td>
                  <td
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={b.author || ''}
                  >
                    {b.author || '—'}
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
                    {b.date ? b.date : (b.created_at ? new Date(b.created_at).toLocaleDateString() : '—')}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="icon-action"
                        onClick={() => navigate(`/faqs?blog_id=${b.id}`)}
                        data-tooltip="Manage FAQs for this blog"
                      >
                        <HelpCircle size={15} />
                      </button>
                      <button className="icon-action edit" onClick={() => openEdit(b)} data-tooltip="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => setDeleteId(b.id)}
                        data-tooltip="Delete"
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
              maxLength={120}
              placeholder="Blog post title..."
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {form.title.length}/120
            </small>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input
                className="form-control"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                maxLength={150}
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
              maxLength={200}
            />
            <small style={{ color: form.excerpt.length > 180 ? '#e53e3e' : 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {form.excerpt.length}/200
            </small>
          </div>

          <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)' }}>SEO Settings</h4>
            
            <div className="form-group">
              <label className="form-label">SEO Title</label>
              <input
                className="form-control"
                value={form.seo_title || ''}
                onChange={(e) => setField('seo_title', e.target.value)}
                placeholder="Custom SEO Title (defaults to blog title)"
                maxLength={80}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SEO Description</label>
              <textarea
                className="form-control"
                value={form.seo_description || ''}
                onChange={(e) => setField('seo_description', e.target.value)}
                placeholder="Brief description for search engines..."
                rows={2}
                maxLength={160}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">SEO Schema Markup (JSON-LD)</label>
              <textarea
                className="form-control"
                value={form.seo_schema_markup || ''}
                onChange={(e) => setField('seo_schema_markup', e.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "BlogPosting",\n  "headline": "..."\n}'}
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                className="form-control"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                placeholder="e.g. Craftsmanship"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Author</label>
              <input
                className="form-control"
                value={form.author}
                onChange={(e) => setField('author', e.target.value)}
                placeholder="Author Name"
                maxLength={80}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-control"
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Blog Image</label>
              {!imagePreview ? (
                <div
                  className="img-dropzone"
                  style={{ padding: '2rem 1rem' }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload size={22} color="#6b7280" />
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                    Click to upload image
                  </p>
                </div>
              ) : (
                <div className="img-preview-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="img-preview-item" style={{ height: '180px', width: '100%', maxWidth: '240px' }}>
                    <img src={imagePreview} alt="Preview" style={{ objectFit: 'contain' }} />
                    <button
                      type="button"
                      className="img-remove-btn"
                      onClick={() => {
                        if (imageFile) URL.revokeObjectURL(imagePreview);
                        setImageFile(null);
                        setImagePreview('');
                        setField('cover_image_url', '');
                      }}
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ paddingBottom: '10px' }}>
            <label className="form-label">Content</label>
            <Editor
              value={form.content}
              onChange={(e) => setField('content', e.target.value)}
              containerProps={{ style: { height: '200px', overflowY: 'auto' } }}
            />
          </div>



          {editingId && (
            <div className="form-group" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: 0 }}>Blog FAQs</label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Add FAQs specifically for this blog post.
                  </p>
                </div>
                <button type="button" className="btn-secondary icon-btn-sm" onClick={openFaqModal} style={{ fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add FAQ
                </button>
              </div>
            </div>
          )}

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

      <Modal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        title="Add FAQ for this Blog"
        size="md"
      >
        <form onSubmit={handleFaqSave}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input
              className="form-control"
              value={faqForm.question}
              onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
              required
              placeholder="Enter the FAQ question..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea
              className="form-control"
              value={faqForm.answer}
              onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
              required
              rows={3}
              placeholder="Enter the FAQ answer..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sort Order</label>
            <input
              type="number"
              className={`form-control ${faqSortOrderError ? 'input-error' : ''}`}
              value={faqForm.sort_order}
              onChange={(e) => {
                setFaqForm({ ...faqForm, sort_order: parseInt(e.target.value) || 0 });
                if (faqSortOrderError) setFaqSortOrderError(null);
              }}
              style={{ maxWidth: '100px' }}
            />
            {faqSortOrderError && (
              <small style={{ color: '#e53e3e', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                {faqSortOrderError}
              </small>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setFaqModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={savingFaq}>
              {savingFaq ? 'Saving…' : 'Save FAQ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
