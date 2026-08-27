'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle } from '../EditorComponents';
import type { Props } from './shared';
import { set, font } from './shared';

export function ProductsEditor({ settings, onChange, clinicId }: Props) {
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = React.useState<Array<{ id: string; name: string; branchId?: string | null; price: number; unit?: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [productsLoading, setProductsLoading] = React.useState(false);

  const s = settings || {};
  const $set = (k: string, v: any) => onChange({ ...s, [k]: v });

  // Selected branch IDs (array)
  const selectedBranchIds: string[] = s.branchIds || [];
  // Hidden product IDs (array)
  const hiddenProductIds: string[] = s.hiddenProductIds || [];

  // Fetch branches on mount
  React.useEffect(() => {
    setLoading(true);
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getBranchesForBuilder()
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.branches || data?.data || []);
          setBranches(list.filter((b: any) => b.isActive !== false));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  // Fetch products when branch selection changes
  React.useEffect(() => {
    setProductsLoading(true);
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getProductsForBuilder()
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.products || data?.data || []);
          const active = list.filter((p: any) => p.isActive !== false);
          // If branch filter active, filter products
          if (selectedBranchIds.length > 0) {
            setProducts(active.filter((p: any) =>
              !p.branchId || selectedBranchIds.includes(p.branchId)
            ));
          } else {
            setProducts(active);
          }
        })
        .catch(() => {})
        .finally(() => setProductsLoading(false));
    });
  }, [selectedBranchIds.join(',')]);

  const toggleBranch = (id: string) => {
    const next = selectedBranchIds.includes(id)
      ? selectedBranchIds.filter(b => b !== id)
      : [...selectedBranchIds, id];
    $set('branchIds', next);
  };

  const toggleProductVisibility = (id: string) => {
    const next = hiddenProductIds.includes(id)
      ? hiddenProductIds.filter(p => p !== id)
      : [...hiddenProductIds, id];
    $set('hiddenProductIds', next);
  };

  const tk = {
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    accentLight: 'rgba(99,102,241,0.15)',
    text: '#c9ccd8',
    muted: '#6b7080',
    font: "'Inter','Geist','Segoe UI',system-ui,sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>

      {/* Title/Subtitle */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EditorField label="Section Title" value={s.title} onChange={v => $set('title', v)} placeholder="Our Products" />
        <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} placeholder="Browse our clinic inventory" />
        <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
          { value: 'grid',                label: 'Grid (Default)' },
          { value: 'featured',            label: 'Featured Hero' },
          { value: 'pharmacy',            label: 'Pharmacy / Categories' },
          { value: 'category-tabs',       label: 'Category Tabs' },
          { value: 'carousel',            label: 'Carousel Scroll' },
          { value: 'supplement-showcase', label: 'Supplement Showcase' },
          { value: 'premium-layout',      label: 'Premium Dark' },
        ]} />
        <EditorSelect label="Columns" value={String(s.columns || '3')} onChange={v => $set('columns', Number(v))} options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ]} />
        <EditorField label="Button Label" value={s.ctaText} onChange={v => $set('ctaText', v)} placeholder="Order" />
        <EditorToggle label="Show Search Bar" checked={s.showSearch !== false} onChange={v => $set('showSearch', v)} />
        <EditorToggle label="Show Stock Badge" checked={s.showStockBadge !== false} onChange={v => $set('showStockBadge', v)} />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />

      {/* Branch Selection */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: tk.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: tk.font }}>
          Show Products From Branches
        </div>
        {loading && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>Loading branches…</p>
        )}
        {!loading && branches.length === 0 && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>No branches found. Products from all branches will be shown.</p>
        )}
        {!loading && branches.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: '0 0 8px' }}>
              Select branches to show their inventory. Leave all unselected to show everything.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {branches.map((branch: any) => {
                const selected = selectedBranchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranch(branch.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, border: `1px solid ${selected ? tk.accent : tk.border}`,
                      background: selected ? tk.accentLight : tk.surface,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: tk.font,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? tk.accent : tk.muted}`,
                      background: selected ? tk.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: selected ? '#a5b4fc' : tk.text }}>{branch.name}</div>
                      {branch.address && <div style={{ fontSize: 10, color: tk.muted, marginTop: 1 }}>{branch.address}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />

      {/* Product Visibility */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: tk.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: tk.font }}>
          Products to Show / Hide
        </div>
        {productsLoading && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>Loading products…</p>
        )}
        {!productsLoading && products.length === 0 && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>
            {selectedBranchIds.length > 0 ? 'No active products found for the selected branches.' : 'No active products found in your inventory.'}
          </p>
        )}
        {!productsLoading && products.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: '0 0 8px' }}>
              Toggle products to show or hide them on your website.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }} className="builder-scrollbar">
              {products.map((product: any) => {
                const hidden = hiddenProductIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProductVisibility(product.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7,
                      border: `1px solid ${hidden ? 'rgba(239,68,68,0.25)' : tk.border}`,
                      background: hidden ? 'rgba(239,68,68,0.06)' : tk.surface,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: tk.font,
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${hidden ? '#ef4444' : '#10b981'}`,
                      background: hidden ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {!hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: hidden ? '#9ca3af' : tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 10, color: tk.muted, marginTop: 1 }}>
                        NPR {Number(product.price).toLocaleString()} · {product.unit || 'unit'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: hidden ? '#ef4444' : '#10b981', fontWeight: 600, flexShrink: 0 }}>
                      {hidden ? 'Hidden' : 'Visible'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
