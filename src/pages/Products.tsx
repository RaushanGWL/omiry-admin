import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, Upload, X, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi, type Product, type ProductPayload } from '../lib/api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const MAX_IMAGES = 5;

// Each image entry has a preview URL and optionally a File for new uploads.
// Entries without a File are existing server-side images.
interface ImageEntry {
  preview: string; // blob URL (new) or server URL (existing)
  file?: File;     // only for newly picked files
  id?: string;     // the image id from the backend
}

const emptyForm = (): ProductPayload => ({
  sku: '',
  name: '',
  slug: '',
  short_description: '',
  description: '',
  alt_text: '',
  is_published: false,
  is_best_seller: false,
  collection_ids: '',
  material: '',
  origin: '',
  finish: '',
  dimensions: '',
  weight: '',
  authenticity: '',
  rating: '',
  rating_count: '',
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

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductPayload>(emptyForm());
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs when entries are removed to avoid memory leaks
  const revokeBlobUrls = (entries: ImageEntry[]) => {
    entries.forEach((e) => {
      if (e.file) URL.revokeObjectURL(e.preview);
    });
  };

  const load = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const { collectionsApi } = await import('../lib/api');
      const [res, colls] = await Promise.all([
        productsApi.listPaginated(targetPage, 20),
        collectionsApi.list().catch(() => [])
      ]);
      setProducts(res.data);
      setTotalPages(res.pagination.total_pages || 1);
      setTotal(res.pagination.total || res.data.length);
      setCollections(colls);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    revokeBlobUrls(imageEntries);
    setImageEntries([]);
    setDeletedImages([]);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku ?? '',
      name: p.name,
      slug: p.slug,
      short_description: p.short_description,
      description: p.description,
      alt_text: p.alt_text ?? '',
      is_published: p.is_published,
      is_best_seller: p.is_best_seller,
      collection_ids: p.collection_ids ?? p.collection_products?.[0]?.collections?.id ?? '',
      material: p.material ?? '',
      origin: p.origin ?? '',
      finish: p.finish ?? '',
      dimensions: p.dimensions ?? '',
      weight: p.weight ?? '',
      authenticity: p.authenticity ?? '',
      rating: p.rating ?? '',
      rating_count: p.rating_count ?? '',
    });
    revokeBlobUrls(imageEntries);
    // Existing server images — extract ID if available
    const entries: ImageEntry[] = [];
    if (p.product_images && p.product_images.length > 0) {
      p.product_images.forEach(img => entries.push({ preview: img.image_url, id: img.id }));
    } else if (p.images) {
      p.images.forEach(url => entries.push({ preview: url }));
    }
    setImageEntries(entries);
    setDeletedImages([]);
    setModalOpen(true);
  };

  /** Build FormData from current form state + image entries */
  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (form.sku) fd.append('sku', form.sku);
    fd.append('name', form.name);
    fd.append('slug', form.slug);
    fd.append('short_description', form.short_description || '');
    fd.append('description', form.description || '');
    fd.append('alt_text', form.alt_text || '');
    fd.append('is_published', String(form.is_published));
    fd.append('is_best_seller', String(form.is_best_seller));
    if (form.collection_ids) fd.append('collection_ids', form.collection_ids);
    if (form.material) fd.append('material', form.material);
    if (form.origin) fd.append('origin', form.origin);
    if (form.finish) fd.append('finish', form.finish);
    if (form.dimensions) fd.append('dimensions', form.dimensions);
    if (form.weight) fd.append('weight', form.weight);
    if (form.authenticity) fd.append('authenticity', form.authenticity);
    if (form.rating) fd.append('rating', form.rating);
    if (form.rating_count) fd.append('rating_count', form.rating_count);
    imageEntries.forEach((entry) => {
      if (entry.file) {
        fd.append('images', entry.file);
      } else if (entry.preview) {
        fd.append('existing_images', entry.preview);
      }
    });
    deletedImages.forEach((url) => {
      fd.append('deleted_images', url);
    });
    return fd;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (imageEntries.length === 0) {
      show('Please upload at least 1 image', 'error');
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editingId) {
        await productsApi.update(editingId, fd);
        
        // Fire deletes for valid image IDs
        const idsToDelete = deletedImages.filter(val => val && !val.startsWith('http'));
        if (idsToDelete.length > 0) {
          await Promise.allSettled(idsToDelete.map(id => productsApi.deleteImage(id)));
        }

        show('Product updated successfully', 'success');
      } else {
        await productsApi.create(fd);
        show('Product created successfully', 'success');
      }
      setModalOpen(false);
      await load(page);
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

  /** Quick JSON-only patch for published / best-seller toggles */
  const toggleField = async (p: Product, field: 'is_published' | 'is_best_seller') => {
    try {
      const updated = await productsApi.patch(p.id, { [field]: !p[field] });
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

  // ── Image handlers ────────────────────────────────────────────────────────

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - imageEntries.length;
    if (remaining <= 0) {
      show(`You can upload a maximum of ${MAX_IMAGES} images`, 'error');
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newEntries: ImageEntry[] = [];
    toAdd.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        show(`"${file.name}" is not an image file`, 'error');
        return;
      }
      newEntries.push({ preview: URL.createObjectURL(file), file });
    });
    setImageEntries((prev) => [...prev, ...newEntries]);
    // Reset file input so same file can be picked again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageEntries((prev) => {
      const entry = prev[index];
      if (entry.file) {
        URL.revokeObjectURL(entry.preview);
      } else if (entry.id) {
        setDeletedImages((d) => [...d, entry.id!]);
      } else {
        setDeletedImages((d) => [...d, entry.preview]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleImageFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Products Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {total} product{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary icon-btn-sm" onClick={() => load(page)} title="Refresh">
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
                <th>Name</th>
                <th>SKU</th>
                <th>Slug</th>
                <th>Collection</th>
                <th>Published</th>
                <th>Best Seller</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {(p.product_images && p.product_images[0]) || (p.images && p.images[0]) ? (
                        <img
                          src={p.product_images?.[0]?.image_url || p.images?.[0]}
                          alt={p.alt_text || p.name}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e5e7eb' }}
                        />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Image size={16} color="#9ca3af" />
                        </div>
                      )}
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {p.sku || '—'}
                    </code>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                      {p.slug}
                    </code>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                      {p.collection_products?.[0]?.collections?.name || '—'}
                    </span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSave} id="product-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Product Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Product Name *</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                placeholder="e.g. Royal Oak Dining Table"
              />
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category *</label>
              <select
                className="form-control"
                value={form.collection_ids}
                onChange={(e) => setField('collection_ids', e.target.value)}
                required
              >
                <option value="">Select a category...</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ height: '1.25rem' }}></div>

          {/* ── Image Upload Section ── */}
          <div className="form-group">
            <label className="form-label">
              Product Images *
              <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                ({imageEntries.length}/{MAX_IMAGES}) — at least 1 required
              </span>
            </label>

            {/* Drop zone — hidden when limit reached */}
            {imageEntries.length < MAX_IMAGES && (
              <div
                className="img-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.currentTarget.classList.add('drag-over')}
                onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
              >
                <Upload size={22} color="#6b7280" />
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  Click or drag &amp; drop images here
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                  PNG, JPG, WEBP · up to {MAX_IMAGES - imageEntries.length} more
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageFiles(e.target.files)}
                />
              </div>
            )}

            {/* Preview grid */}
            {imageEntries.length > 0 && (
              <div className="img-preview-grid">
                {imageEntries.map((entry, i) => (
                  <div key={i} className="img-preview-item">
                    <img src={entry.preview} alt={`Product image ${i + 1}`} />
                    {i === 0 && <span className="img-badge">Cover</span>}
                    {!entry.file && (
                      <span className="img-badge" style={{ left: 'auto', right: 4, background: '#6b7280' }}>
                        Saved
                      </span>
                    )}
                    <button
                      type="button"
                      className="img-remove-btn"
                      onClick={() => removeImage(i)}
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alt Text */}
          <div className="form-group">
            <label className="form-label">Image Alt Text</label>
            <input
              className="form-control"
              value={form.alt_text}
              onChange={(e) => setField('alt_text', e.target.value)}
              placeholder="e.g. Milano Sofa"
            />
          </div>

          {/* SKU */}
          <div className="form-group">
            <label className="form-label">SKU Code</label>
            <input
              className="form-control"
              value={form.sku}
              readOnly
              disabled
              placeholder="Auto-generated"
              style={{ background: '#f9fafb', cursor: 'not-allowed', color: '#6b7280' }}
            />
          </div>

          {/* Slug */}
          <div className="form-group">
            <label className="form-label">Slug</label>
            <input
              className="form-control"
              value={form.slug}
              onChange={(e) => setField('slug', e.target.value)}
              placeholder="auto-generated from name"
            />
          </div>

          {/* Short Description */}
          <div className="form-group">
            <label className="form-label">Short Description</label>
            <input
              className="form-control"
              value={form.short_description}
              onChange={(e) => setField('short_description', e.target.value)}
              placeholder="One-line summary"
            />
          </div>

          {/* Full Description */}
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

          <div style={{ margin: '2rem 0 1.5rem', borderTop: '1px solid #e5e7eb' }}></div>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '1.5rem', color: 'var(--text-primary)', fontFamily: 'serif' }}>Product Specifications</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Material</label>
              <input
                className="form-control"
                value={form.material}
                onChange={(e) => setField('material', e.target.value)}
                placeholder="e.g. Natural Clear Quartz, 24K Gold Accents"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Origin</label>
              <input
                className="form-control"
                value={form.origin}
                onChange={(e) => setField('origin', e.target.value)}
                placeholder="e.g. India"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Finish</label>
              <input
                className="form-control"
                value={form.finish}
                onChange={(e) => setField('finish', e.target.value)}
                placeholder="e.g. Polished with Hand-Gilded Detailing"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dimensions</label>
              <input
                className="form-control"
                value={form.dimensions}
                onChange={(e) => setField('dimensions', e.target.value)}
                placeholder="e.g. H 9.5 in x W 8.2 in x D 6.0 in"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Weight</label>
              <input
                className="form-control"
                value={form.weight || ''}
                onChange={(e) => setField('weight', e.target.value)}
                placeholder="e.g. 6.2 kg"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Authenticity</label>
              <input
                className="form-control"
                value={form.authenticity || ''}
                onChange={(e) => setField('authenticity', e.target.value)}
                placeholder="e.g. Includes Certificate of Authenticity"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rating</label>
              <input
                className="form-control"
                value={form.rating || ''}
                onChange={(e) => setField('rating', e.target.value)}
                placeholder="e.g. 4.8"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Rating Count</label>
              <input
                className="form-control"
                value={form.rating_count || ''}
                onChange={(e) => setField('rating_count', e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
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
            <label className="check-label" style={{ marginLeft: '1rem' }}>
              <input
                type="checkbox"
                checked={form.is_best_seller}
                onChange={(e) => setField('is_best_seller', e.target.checked)}
              />
              <span>Best Seller</span>
            </label>
          </div>

          <div className="modal-footer" style={{ marginTop: '2rem' }}>
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
