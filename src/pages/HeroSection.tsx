import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Save, RefreshCw, Eye, EyeOff, UploadCloud, X } from 'lucide-react';
import { heroApi, storageApi, type HeroSection as HeroData } from '../lib/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { useToastContext } from '../context/ToastContext';

const emptyHero = (): HeroData => ({
  heading: '',
  description: '',
  cta_text: '',
  cta_url: '',
  image_url: '',
  is_active: true,
});

export const HeroSection = () => {
  const { show } = useToastContext();
  const [hero, setHero] = useState<HeroData>(emptyHero());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await heroApi.get();
      const h = Array.isArray(data) ? data[0] : data;
      if (h) setHero(h);
    } catch {
      // first time - use empty form
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Always POST — with ?id= when record already exists
      // Matches: POST /functions/v1/hero_section?id=<id>  body: { heading, description, ... }
      const saved = await heroApi.upsert(hero);
      setHero(saved);
      show('Hero section saved successfully', 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof HeroData>(k: K, v: HeroData[K]) => {
    setHero((h) => ({ ...h, [k]: v }));
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      show('Please select an image file', 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await storageApi.uploadHeroImage(file);
      setField('image_url', url);
      show('Image uploaded successfully', 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Hero Section</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage the homepage hero banner content
          </p>
        </div>
        <button className="btn-secondary icon-btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="card"><LoadingSkeleton rows={6} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Form */}
          <div className="card">
            <form onSubmit={handleSave}>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="form-label">Heading *</label>
                  <span style={{
                    fontSize: '0.72rem',
                    color: hero.heading.length > 72 ? (hero.heading.length >= 80 ? '#dc2626' : '#d97706') : 'var(--text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {hero.heading.length}/80
                  </span>
                </div>
                <input
                  className="form-control"
                  value={hero.heading}
                  onChange={(e) => setField('heading', e.target.value)}
                  required
                  maxLength={80}
                  placeholder="e.g. Crafted for the Modern Home"
                />
                {hero.heading.length >= 80 && (
                  <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem' }}>
                    Character limit reached. Keep headings concise so the hero layout stays intact.
                  </p>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label className="form-label">Description</label>
                  <span style={{
                    fontSize: '0.72rem',
                    color: (hero.description ?? '').length > 180 ? ((hero.description ?? '').length >= 200 ? '#dc2626' : '#d97706') : 'var(--text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {(hero.description ?? '').length}/200
                  </span>
                </div>
                <textarea
                  className="form-control"
                  rows={4}
                  value={hero.description}
                  onChange={(e) => setField('description', e.target.value)}
                  maxLength={200}
                  placeholder="Subheading text..."
                />
                {(hero.description ?? '').length >= 200 && (
                  <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem' }}>
                    Character limit reached. Shorter descriptions look better on the hero banner.
                  </p>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label className="form-label">CTA Button Text</label>
                    <span style={{
                      fontSize: '0.72rem',
                      color: (hero.cta_text ?? '').length > 25 ? ((hero.cta_text ?? '').length >= 30 ? '#dc2626' : '#d97706') : 'var(--text-secondary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {(hero.cta_text ?? '').length}/30
                    </span>
                  </div>
                  <input
                    className="form-control"
                    value={hero.cta_text}
                    onChange={(e) => setField('cta_text', e.target.value)}
                    maxLength={30}
                    placeholder="e.g. Shop Now"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CTA URL</label>
                  <input
                    className="form-control"
                    value={hero.cta_url}
                    onChange={(e) => setField('cta_url', e.target.value)}
                    placeholder="/products"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hero Image</label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                    e.target.value = '';
                  }}
                />

                {uploading ? (
                  /* ── Uploading spinner ── */
                  <div style={{
                    border: '2px dashed var(--border)', borderRadius: 10,
                    padding: '2rem 1rem', textAlign: 'center',
                    background: 'var(--bg-secondary, #f9f9f9)',
                  }}>
                    <div style={{
                      width: 36, height: 36, border: '3px solid var(--border)',
                      borderTopColor: 'var(--primary, #36284A)',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 0.75rem',
                    }} />
                    <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text-secondary)' }}>
                      Uploading to Supabase…
                    </p>
                  </div>

                ) : hero.image_url ? (
                  /* ── Preview + always-visible actions ── */
                  <div style={{ border: '2px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ position: 'relative', background: '#f0f0f0' }}>
                      <img
                        src={hero.image_url}
                        alt="Hero preview"
                        style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Always-visible action bar */}
                    <div style={{
                      display: 'flex', gap: '0.5rem', padding: '0.6rem 0.75rem',
                      background: 'var(--bg-secondary, #f9f9f9)',
                      borderTop: '1px solid var(--border)',
                      alignItems: 'center',
                    }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#36284A', color: '#fff',
                          border: 'none', borderRadius: 6,
                          padding: '0.4rem 0.85rem', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <UploadCloud size={14} /> Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setField('image_url', '')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: 'transparent', color: '#dc2626',
                          border: '1px solid #dc2626', borderRadius: 6,
                          padding: '0.4rem 0.85rem', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <X size={14} /> Remove
                      </button>
                      <span style={{
                        marginLeft: 'auto', fontSize: '0.7rem',
                        color: 'var(--text-secondary)', wordBreak: 'break-all',
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={hero.image_url}>
                        🔗 {hero.image_url.split('/').pop()}
                      </span>
                    </div>
                  </div>

                ) : (
                  /* ── Empty drop zone ── */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 10,
                      padding: '2.5rem 1rem', textAlign: 'center',
                      cursor: 'pointer', background: 'var(--bg-secondary, #f9f9f9)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#36284A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <UploadCloud size={36} style={{ marginBottom: '0.6rem', opacity: 0.45, color: '#36284A' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Click to upload or drag &amp; drop
                    </p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      JPG, PNG, WebP — max 10 MB
                    </p>
                  </div>
                )}
              </div>


              <div className="form-row-checks" style={{ marginBottom: '1.5rem' }}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={hero.is_active}
                    onChange={(e) => setField('is_active', e.target.checked)}
                  />
                  <span>Active (visible on website)</span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary"
                id="hero-save-btn"
                disabled={saving}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Save size={18} />
                {saving ? 'Saving…' : 'Save Hero Section'}
              </button>
            </form>
          </div>

          {/* Preview Card */}
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #36284A 0%, #5a4070 100%)',
                  padding: '2rem 1.5rem',
                  position: 'relative',
                  minHeight: '200px',
                }}
              >
                {hero.image_url && (
                  <img
                    src={hero.image_url}
                    alt="hero preview"
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', opacity: 0.3,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{ color: '#F7F2EA', fontSize: '1.3rem', lineHeight: 1.3 }}>
                    {hero.heading || 'Your heading here'}
                  </h3>
                  <p style={{ color: 'rgba(247,242,234,0.75)', fontSize: '0.85rem', margin: '0.75rem 0 1rem' }}>
                    {hero.description || 'Description text...'}
                  </p>
                  {hero.cta_text && (
                    <span
                      style={{
                        background: '#F7F2EA', color: '#36284A',
                        padding: '0.5rem 1rem', borderRadius: 6,
                        fontSize: '0.8rem', fontWeight: 600, display: 'inline-block',
                      }}
                    >
                      {hero.cta_text}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  borderTop: '1px solid #f0f0f0',
                  fontSize: '0.8rem', color: 'var(--text-secondary)',
                }}
              >
                {hero.is_active ? (
                  <><Eye size={14} color="#16a34a" /> <span style={{ color: '#16a34a' }}>Visible on website</span></>
                ) : (
                  <><EyeOff size={14} /> <span>Hidden</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
