import { useEffect, useState, type FormEvent } from 'react';
import { Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { heroApi, type HeroSection as HeroData } from '../lib/api';
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
      if (hero.id) {
        const updated = await heroApi.update(hero.id, hero);
        setHero(updated);
      } else {
        const created = await heroApi.upsert(hero);
        setHero(created);
      }
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
                <label className="form-label">Heading *</label>
                <input
                  className="form-control"
                  value={hero.heading}
                  onChange={(e) => setField('heading', e.target.value)}
                  required
                  placeholder="e.g. Crafted for the Modern Home"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={hero.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Subheading text..."
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">CTA Button Text</label>
                  <input
                    className="form-control"
                    value={hero.cta_text}
                    onChange={(e) => setField('cta_text', e.target.value)}
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
                <label className="form-label">Image URL</label>
                <input
                  className="form-control"
                  type="url"
                  value={hero.image_url}
                  onChange={(e) => setField('image_url', e.target.value)}
                  placeholder="https://..."
                />
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
