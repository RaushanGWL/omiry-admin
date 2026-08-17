import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Upload, X } from 'lucide-react';
import { collectionsApi, type Collection, type CollectionPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const emptyForm = (): CollectionPayload => ({
  name: '',
  slug: '',
  description: '',
  image_url: '',
  is_published: false,
  is_featured: false,
  sort_order: 0,
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const Collections = () => {
  const { show } = useToastContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollectionPayload>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await collectionsApi.list();
      setCollections(data);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load collections', 'error');
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

  const openEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.image_url,
      is_published: c.is_published,
      is_featured: c.is_featured,
      sort_order: c.sort_order,
    });
    if (imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(c.image_url || '');
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('slug', form.slug);
      fd.append('description', form.description);
      fd.append('is_published', String(form.is_published));
      fd.append('is_featured', String(form.is_featured));
      fd.append('sort_order', String(form.sort_order));
      if (imageFile) {
        fd.append('image', imageFile);
      } else if (form.image_url) {
        fd.append('image_url', form.image_url);
      }

      if (editingId) {
        const updated = await collectionsApi.update(editingId, fd);
        setCollections((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        show('Collection updated', 'success');
      } else {
        const created = await collectionsApi.create(fd);
        setCollections((prev) => [created, ...prev]);
        show('Collection created', 'success');
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
      await collectionsApi.delete(deleteId);
      setCollections((prev) => prev.filter((c) => c.id !== deleteId));
      show('Collection deleted', 'success');
      setDeleteId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAction = async (
    c: Collection,
    type: 'publish' | 'unpublish' | 'feature' | 'unfeature'
  ) => {
    try {
      const updated = await collectionsApi.action(c.id, type);
      setCollections((prev) => prev.map((item) => (item.id === c.id ? updated : item)));
      show(`Collection ${type}d`, 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const setField = <K extends keyof CollectionPayload>(k: K, v: CollectionPayload[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !editingId) next.slug = slugify(v as string);
      return next;
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Collections</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {collections.length} collection{collections.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn-primary" id="add-collection-btn" onClick={openAdd}>
            <Plus size={18} /> Add Collection
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={5} /></div>
        ) : collections.length === 0 ? (
          <div className="empty-state"><p>No collections found. Create one!</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Sort</th>
                <th>Published</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {c.description.slice(0, 60)}…
                      </div>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                      {c.slug}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.sort_order}</td>
                  <td>
                    <button
                      className="toggle-btn"
                      onClick={() => handleAction(c, c.is_published ? 'unpublish' : 'publish')}
                    >
                      <StatusBadge
                        label={c.is_published ? 'Published' : 'Draft'}
                        variant={c.is_published ? 'published' : 'draft'}
                      />
                    </button>
                  </td>
                  <td>
                    <button
                      className="toggle-btn"
                      onClick={() => handleAction(c, c.is_featured ? 'unfeature' : 'feature')}
                    >
                      <StatusBadge
                        label={c.is_featured ? 'Featured' : 'Regular'}
                        variant={c.is_featured ? 'featured' : 'inactive'}
                      />
                    </button>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-action edit" onClick={() => openEdit(c)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => setDeleteId(c.id)}
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
        title={editingId ? 'Edit Collection' : 'New Collection'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                placeholder="e.g. Summer Collection"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slug</label>
              <input
                className="form-control"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Collection Image</label>
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
                      setField('image_url', '');
                    }}
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Sort Order</label>
            <input
              className="form-control"
              type="number"
              value={form.sort_order}
              onChange={(e) => setField('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="form-row-checks">
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setField('is_published', e.target.checked)}
              />
              <span>Published</span>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setField('is_featured', e.target.checked)}
              />
              <span>Featured</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Collection"
        message="Delete this collection permanently?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
};
