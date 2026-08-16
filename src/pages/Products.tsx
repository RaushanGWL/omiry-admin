import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { productsApi, type Product, type ProductPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const emptyForm = (): ProductPayload => ({
  name: '',
  slug: '',
  short_description: '',
  description: '',
  sku: '',
  is_published: false,
  is_best_seller: false,
});

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const Products = () => {
  const { show } = useToastContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductPayload>(emptyForm());

  const load = async () => {
    setLoading(true);
    try {
      const data = await productsApi.list();
      setProducts(data);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load products', 'error');
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

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      sku: p.sku,
      is_published: p.is_published,
      is_best_seller: p.is_best_seller,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const updated = await productsApi.update(editingId, form);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        show('Product updated successfully', 'success');
      } else {
        const created = await productsApi.create(form);
        setProducts((prev) => [created, ...prev]);
        show('Product created successfully', 'success');
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
      await productsApi.delete(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      show('Product deleted', 'success');
      setDeleteId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleField = async (p: Product, field: 'is_published' | 'is_best_seller') => {
    try {
      const updated = await productsApi.update(p.id, { [field]: !p[field] });
      setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      show('Product updated', 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const setField = <K extends keyof ProductPayload>(k: K, v: ProductPayload[K]) => {
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
          <h2>Products Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {products.length} product{products.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn-primary" id="add-product-btn" onClick={openAdd}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '1.5rem' }}><LoadingSkeleton rows={5} /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>No products found. Add your first product!</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name / SKU</th>
                <th>Slug</th>
                <th>Published</th>
                <th>Best Seller</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.sku}</div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                      {p.slug}
                    </code>
                  </td>
                  <td>
                    <button
                      className="toggle-btn"
                      onClick={() => toggleField(p, 'is_published')}
                      title="Toggle published"
                    >
                      <StatusBadge
                        label={p.is_published ? 'Published' : 'Draft'}
                        variant={p.is_published ? 'published' : 'draft'}
                      />
                    </button>
                  </td>
                  <td>
                    <button
                      className="toggle-btn"
                      onClick={() => toggleField(p, 'is_best_seller')}
                      title="Toggle best seller"
                    >
                      <StatusBadge
                        label={p.is_best_seller ? 'Best Seller' : 'Regular'}
                        variant={p.is_best_seller ? 'featured' : 'inactive'}
                      />
                    </button>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="icon-action edit"
                        onClick={() => openEdit(p)}
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-action delete"
                        onClick={() => setDeleteId(p.id)}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSave} id="product-form">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                placeholder="e.g. Royal Oak Dining Table"
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input
                className="form-control"
                value={form.sku}
                onChange={(e) => setField('sku', e.target.value)}
                required
                placeholder="e.g. OMR-TBL-001"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Slug</label>
            <input
              className="form-control"
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              placeholder="auto-generated from name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Short Description</label>
            <input
              className="form-control"
              value={form.short_description}
              onChange={(e) => setField('short_description', e.target.value)}
              placeholder="One-line summary"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Full Description</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Detailed product description..."
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
                checked={form.is_best_seller}
                onChange={(e) => setField('is_best_seller', e.target.checked)}
              />
              <span>Best Seller</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
};
