import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { useToastContext } from '../context/ToastContext';

// Mock list of pages for now
const defaultPages = [
  { id: 'home', name: 'Home Page' },
  { id: 'collections', name: 'Collections Page' },
  { id: 'products', name: 'Products Page' },
  { id: 'blogs', name: 'Blogs Page' },
  { id: 'contact', name: 'Contact Page' },
  { id: 'best-seller', name: 'Best Seller Page' },
  { id: 'about', name: 'About Page' },
];

interface SeoData {
  title: string;
  description: string;
  schema_markup: string;
}

export const Seo = () => {
  const { show } = useToastContext();
  const [selectedPage, setSelectedPage] = useState(defaultPages[0].id);
  
  // Mock state to hold data for each page
  const [seoData, setSeoData] = useState<Record<string, SeoData>>({});
  const [saving, setSaving] = useState(false);

  const currentData = seoData[selectedPage] || { title: '', description: '', schema_markup: '' };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Simulate API call for now since we don't have the API yet
      await new Promise(resolve => setTimeout(resolve, 500));
      show(`SEO settings for ${defaultPages.find(p => p.id === selectedPage)?.name} saved successfully`, 'success');
    } catch (err) {
      show('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof SeoData>(k: K, v: SeoData[K]) => {
    setSeoData((prev) => ({
      ...prev,
      [selectedPage]: {
        ...(prev[selectedPage] || { title: '', description: '', schema_markup: '' }),
        [k]: v
      }
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>SEO Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage Search Engine Optimization settings for all pages
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar for Pages */}
        <div className="card" style={{ padding: '0.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
            Pages
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {defaultPages.map((page) => (
              <li key={page.id} style={{ marginBottom: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPage(page.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    background: selectedPage === page.id ? 'var(--primary-color)' : 'transparent',
                    color: selectedPage === page.id ? '#fff' : 'inherit',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: selectedPage === page.id ? 500 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {page.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Form for selected page */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            {defaultPages.find(p => p.id === selectedPage)?.name} SEO Settings
          </h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">SEO Title</label>
              <input
                className="form-control"
                value={currentData.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Home | OMRIY"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SEO Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={currentData.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Brief description for search engines..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">SEO Schema Markup (JSON-LD)</label>
              <textarea
                className="form-control"
                rows={8}
                value={currentData.schema_markup}
                onChange={(e) => setField('schema_markup', e.target.value)}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "..."\n}'}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Enter valid JSON-LD schema markup.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
