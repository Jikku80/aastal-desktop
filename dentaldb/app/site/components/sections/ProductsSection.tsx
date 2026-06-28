'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import type { SecProps } from './siteRendererHelpers';
import { resolveImageUrl } from './siteRendererHelpers';
import { publicProductsApi, websitePublicApi } from '@/lib/api/websiteApi';

export function ProductsSection({ s, theme, subdomain, isPreview }: SecProps) {
  const [search, setSearch]             = React.useState('');
  const [cart, setCart]                 = React.useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [orderSuccess, setOrderSuccess] = React.useState(false);
  const [orderError, setOrderError]     = React.useState('');
  const [submitting, setSubmitting]     = React.useState(false);
  const [form, setForm] = React.useState({
    customerName: '', customerPhone: '', customerAddress: '', orderNotes: '',
  });

  const sectionBranchIds: string[] = (s as any).branchIds || [];
  const hiddenProductIds: string[]  = (s as any).hiddenProductIds || [];

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['public-products', subdomain, sectionBranchIds.join(','), isPreview],
    queryFn:  async () => {
      // Preview uses authenticated endpoint
      if (isPreview) {
        const { websiteApi } = await import('@/lib/api/websiteApi');
        const all: any[] = await websiteApi.getPreviewProducts(sectionBranchIds.length > 0 ? sectionBranchIds : undefined);
        return all.filter((p: any) => !hiddenProductIds.includes(p.id));
      }
      // Public: always fetch from public endpoint unless explicitly manual
      if (s.dataSource === 'manual') {
        // Manual items stored in s.items (rarely used for products, but supported)
        return Array.isArray(s.items) ? (s.items as any[]).filter((p: any) => !hiddenProductIds.includes(p.id)) : [];
      }
      const rawBase = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
      const apiRoot = rawBase.replace(/\/api\/v1\/?$/, '');
      const params  = new URLSearchParams();
      if (sectionBranchIds.length > 0) params.set('branchIds', sectionBranchIds.join(','));
      const qs  = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${apiRoot}/api/v1/website-builder/public/${subdomain}/products${qs}`);
      if (!res.ok) return [];
      const all: any[] = await res.json();
      return all.filter(p => !hiddenProductIds.includes(p.id));
    },
    // Always enabled for preview or live-api; disabled only for manual mode
    enabled:   isPreview ? true : s.dataSource !== 'manual',
    staleTime: 60_000,
  });

  const filtered = React.useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return (products as any[]).filter((p: any) =>
      p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = (products as any[]).find((pr: any) => pr.id === id);
    return sum + (p ? Number(p.price) * qty : 0);
  }, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart    = (id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart(prev => {
    const next = { ...prev };
    if (next[id] > 1) next[id]--;
    else delete next[id];
    return next;
  });

  const handlePlaceOrder = async () => {
    if (!form.customerName || !form.customerPhone || !form.customerAddress) {
      setOrderError('Please fill in all required fields.');
      return;
    }
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));
    if (items.length === 0) return;
    setSubmitting(true);
    setOrderError('');
    try {
      await publicProductsApi.placeOrder(subdomain, { ...form, items });
      setOrderSuccess(true);
      setCart({});
      setShowCheckout(false);
    } catch (err: any) {
      setOrderError(err?.response?.data?.message || err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const primary = theme.primaryColor;
  const bg      = theme.backgroundColor;
  const text    = theme.textColor;
  // Normalize variant — 'classic'/'list' are aliases for 'grid'
  const rawVariant = (s.variant as string) ?? 'grid';
  const variant    = (rawVariant === 'classic' || rawVariant === 'list') ? 'grid' : rawVariant;
  const cols    = (s.columns as number) || 3;

  const resolveImg = (pr: any) => resolveImageUrl(pr.imageUrl);

  const ProductCard = ({ pr }: { pr: any }) => {
    const qty = cart[pr.id] || 0;
    const img = resolveImg(pr);
    return (
      <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${primary}22`, background: bg, boxShadow: `0 2px 8px ${primary}11` }}>
        <div style={{ height: 160, background: `${primary}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {img
            ? <img src={img} alt={pr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={`${primary}66`} strokeWidth="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          }
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: text, flex: 1, lineHeight: 1.3 }}>{pr.name}</h3>
            {s.showStockBadge !== false && (
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 600, flexShrink: 0, background: pr.inStock ? '#dcfce7' : '#fee2e2', color: pr.inStock ? '#16a34a' : '#dc2626' }}>
                {pr.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            )}
          </div>
          {pr.description && <p style={{ fontSize: 12, color: `${text}88`, marginBottom: 8, lineHeight: 1.5 }}>{pr.description.slice(0, 60)}{pr.description.length > 60 ? '…' : ''}</p>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontWeight: 800, color: primary, fontSize: 15 }}>NPR {Number(pr.price).toLocaleString()}</span>
            {pr.inStock ? (
              qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => removeFromCart(pr.id)} style={{ width: 28, height: 28, borderRadius: 8, background: `${primary}22`, color: primary, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>−</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: 'center', color: text }}>{qty}</span>
                  <button onClick={() => addToCart(pr.id)} style={{ width: 28, height: 28, borderRadius: 8, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>+</button>
                </div>
              ) : (
                <button onClick={() => addToCart(pr.id)} style={{ padding: '6px 14px', borderRadius: 10, background: primary, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                  {(s.ctaText as string) || 'Add to Cart'}
                </button>
              )
            ) : (
              <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 10, background: `${text}11`, color: `${text}55` }}>Unavailable</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CartButton = () => cartCount > 0 ? (
    <button onClick={() => setShowCheckout(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: primary, color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
      Cart ({cartCount}) · NPR {cartTotal.toLocaleString()}
    </button>
  ) : null;

  const CheckoutModal = () => showCheckout ? (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.6)' }}>
      <div style={{ width: '100%', maxWidth: 480, borderRadius: 20, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${primary}22` }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: text }}>Place Your Order</h3>
          <button onClick={() => setShowCheckout(false)} style={{ background: `${text}11`, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: text, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: `${primary}08`, borderRadius: 12, padding: 16, border: `1px solid ${primary}22` }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: text, marginBottom: 10 }}>Order Summary</p>
            {Object.entries(cart).map(([id, qty]) => {
              const pr = (products as any[]).find((p: any) => p.id === id);
              if (!pr) return null;
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: `${text}cc` }}>{pr.name} × {qty}</span>
                  <span style={{ fontWeight: 600, color: text }}>NPR {(Number(pr.price) * qty).toLocaleString()}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 10, borderTop: `1px solid ${primary}22`, color: text }}>
              <span>Total</span><span style={{ color: primary }}>NPR {cartTotal.toLocaleString()}</span>
            </div>
          </div>
          {([['customerName', 'Full Name *', 'text'], ['customerPhone', 'Phone Number *', 'tel'], ['customerAddress', 'Delivery Address *', 'textarea']] as [string, string, string][]).map(([key, label, type]) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: `${text}aa`, display: 'block', marginBottom: 6 }}>{label}</label>
              {type === 'textarea'
                ? <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${primary}44`, background: bg, color: text, fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                : <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${primary}44`, background: bg, color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              }
            </div>
          ))}
          {orderError && <p style={{ color: '#ef4444', fontSize: 13 }}>{orderError}</p>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${primary}22`, display: 'flex', gap: 10 }}>
          <button onClick={() => setShowCheckout(false)} style={{ flex: 1, padding: 12, borderRadius: 10, background: `${text}11`, color: text, border: 'none', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handlePlaceOrder} disabled={submitting} style={{ flex: 1, padding: 12, borderRadius: 10, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Placing…' : 'Place Order (COD)'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (orderSuccess) {
    return (
      <div className="py-20 text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: primary + '20' }}>
          <CheckCircle size={32} style={{ color: primary }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: text }}>Order Placed!</h2>
        <p className="text-base mb-6 max-w-md mx-auto" style={{ color: text + 'aa' }}>
          Thank you for your order. We will contact you shortly to confirm delivery.
        </p>
        <button onClick={() => setOrderSuccess(false)} className="px-6 py-2.5 rounded-xl font-semibold text-white" style={{ background: primary }}>
          Continue Shopping
        </button>
      </div>
    );
  }

  // ── Variant: featured ──────────────────────────────────────────────────────
  if (variant === 'featured') {
    const [featured, ...rest] = filtered as any[];
    const img = featured ? resolveImg(featured) : null;
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2" style={{ color: text, fontFamily: theme.fontHeading }}>{(s.title as string) || 'Featured Products'}</h2>
            {s.subtitle && <p style={{ color: `${text}bb` }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><CartButton /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, alignItems: 'start' }}>
            {featured && (
              <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: `0 4px 24px ${primary}18`, border: `1px solid ${primary}22`, background: bg, gridRow: 'span 2' }}>
                <div style={{ height: 240, background: `${primary}15`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {img ? <img src={img} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 60, opacity: 0.3 }}>💊</span>}
                </div>
                <div style={{ padding: 24 }}>
                  <span style={{ fontSize: 11, background: `${primary}15`, color: primary, padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>⭐ Featured</span>
                  <h3 style={{ fontWeight: 700, color: text, margin: '12px 0 6px', fontSize: 18 }}>{featured.name}</h3>
                  {featured.description && <p style={{ fontSize: 14, color: `${text}88`, marginBottom: 14 }}>{featured.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <span style={{ fontWeight: 800, color: primary, fontSize: 20 }}>NPR {Number(featured.price).toLocaleString()}</span>
                    {featured.inStock ? (
                      cart[featured.id] > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => removeFromCart(featured.id)} style={{ width: 32, height: 32, borderRadius: 8, background: `${primary}22`, color: primary, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}>−</button>
                          <span style={{ fontWeight: 700, color: text, minWidth: 24, textAlign: 'center' }}>{cart[featured.id]}</span>
                          <button onClick={() => addToCart(featured.id)} style={{ width: 32, height: 32, borderRadius: 8, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(featured.id)} style={{ padding: '10px 24px', borderRadius: 10, background: primary, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>{(s.ctaText as string) || 'Add to Cart'}</button>
                      )
                    ) : <span style={{ color: '#9ca3af', fontSize: 13 }}>Out of Stock</span>}
                  </div>
                </div>
              </div>
            )}
            {(rest as any[]).slice(0, 4).map((pr: any) => <ProductCard key={pr.id} pr={pr} />)}
          </div>
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Variant: pharmacy ──────────────────────────────────────────────────────
  if (variant === 'pharmacy') {
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: '1.75rem', fontWeight: 700, color: text }}>{(s.title as string) || 'Pharmacy'}</h2>
              {s.subtitle && <p style={{ fontSize: 14, color: `${text}88`, marginTop: 4 }}>{s.subtitle as string}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {s.showSearch !== false && (
                <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${primary}40`, fontSize: 13, outline: 'none', background: bg, color: text }} />
              )}
              <CartButton />
            </div>
          </div>
          {isLoading ? (
            <div className="text-center py-16"><div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} /></div>
          ) : (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 4 ? '200px' : cols === 2 ? '320px' : '240px'}, 1fr))` }}>
              {(filtered as any[]).map((pr: any) => <ProductCard key={pr.id} pr={pr} />)}
            </div>
          )}
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Variant: category-tabs ─────────────────────────────────────────────────
  if (variant === 'category-tabs') {
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: `${primary}06` }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: text, marginBottom: 6 }}>{(s.title as string) || 'Shop'}</h2>
            {s.subtitle && <p style={{ color: `${text}88` }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
            {['All Products', 'Supplements', 'Skincare', 'Devices', 'Medicine'].map((cat, i) => (
              <button key={cat} style={{ padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: 'none', background: i === 0 ? primary : '#fff', color: i === 0 ? '#fff' : text, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {s.showSearch !== false && <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${primary}40`, fontSize: 13, outline: 'none', background: '#fff', color: text }} />}
            <CartButton />
          </div>
          {isLoading ? <div className="text-center py-12 text-gray-400">Loading products…</div> : (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {(filtered as any[]).map((pr: any) => <ProductCard key={pr.id} pr={pr} />)}
            </div>
          )}
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Variant: carousel ──────────────────────────────────────────────────────
  if (variant === 'carousel') {
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: bg }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: theme.fontHeading, fontSize: '1.75rem', fontWeight: 700, color: text }}>{(s.title as string) || 'Our Products'}</h2>
              {s.subtitle && <p style={{ fontSize: 14, color: `${text}88`, marginTop: 4 }}>{s.subtitle as string}</p>}
            </div>
            <CartButton />
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12 }}>
            {isLoading ? <p style={{ color: `${text}66` }}>Loading…</p> : (filtered as any[]).map((pr: any) => (
              <div key={pr.id} style={{ minWidth: 220, flexShrink: 0 }}><ProductCard pr={pr} /></div>
            ))}
          </div>
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Variant: supplement-showcase ───────────────────────────────────────────
  if (variant === 'supplement-showcase') {
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: `${primary}06` }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: text, marginBottom: 6 }}>{(s.title as string) || 'Supplements & Wellness'}</h2>
            {s.subtitle && <p style={{ color: `${text}88` }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><CartButton /></div>
          {isLoading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {(filtered as any[]).map((pr: any) => {
                const img = resolveImg(pr);
                const qty = cart[pr.id] || 0;
                return (
                  <div key={pr.id} style={{ background: '#fff', borderRadius: 20, padding: 20, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${primary}10` }}>
                    <div style={{ width: 80, height: 80, borderRadius: 16, background: `${primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', overflow: 'hidden' }}>
                      {img ? <img src={img} alt={pr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 30 }}>💊</span>}
                    </div>
                    <div style={{ fontWeight: 700, color: text, fontSize: 13, marginBottom: 4 }}>{pr.name}</div>
                    <div style={{ fontWeight: 800, color: primary, fontSize: 15, marginBottom: 12 }}>NPR {Number(pr.price).toLocaleString()}</div>
                    {pr.inStock ? (
                      qty > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <button onClick={() => removeFromCart(pr.id)} style={{ width: 28, height: 28, borderRadius: 6, background: `${primary}22`, color: primary, border: 'none', cursor: 'pointer', fontWeight: 700 }}>−</button>
                          <span style={{ fontWeight: 700, color: text }}>{qty}</span>
                          <button onClick={() => addToCart(pr.id)} style={{ width: 28, height: 28, borderRadius: 6, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(pr.id)} style={{ width: '100%', padding: '8px', borderRadius: 10, background: primary, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>{(s.ctaText as string) || 'Add to Cart'}</button>
                      )
                    ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>Out of Stock</span>}
                  </div>
                );
              })}
            </div>
          )}
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Variant: premium-layout ────────────────────────────────────────────────
  if (variant === 'premium-layout') {
    return (
      <div className="py-16 px-4 md:px-8" style={{ background: '#0f172a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.3rem,2.5vw,2rem)', fontWeight: 700, color: '#fff', marginBottom: 8 }}>{(s.title as string) || 'Premium Products'}</h2>
            {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.5)' }}>{s.subtitle as string}</p>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><CartButton /></div>
          {isLoading ? <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</div> : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 4 ? '200px' : cols === 2 ? '320px' : '240px'}, 1fr))` }}>
              {(filtered as any[]).map((pr: any) => {
                const img = resolveImg(pr);
                const qty = cart[pr.id] || 0;
                return (
                  <div key={pr.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: 150, background: `${primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {img ? <img src={img} alt={pr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40, opacity: 0.5 }}>💊</span>}
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 4 }}>{pr.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <span style={{ fontWeight: 800, color: primary, fontSize: 15 }}>NPR {Number(pr.price).toLocaleString()}</span>
                        {pr.inStock ? (
                          qty > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button onClick={() => removeFromCart(pr.id)} style={{ width: 26, height: 26, borderRadius: 6, background: `${primary}33`, color: primary, border: 'none', cursor: 'pointer', fontWeight: 700 }}>−</button>
                              <span style={{ color: '#fff', fontWeight: 700 }}>{qty}</span>
                              <button onClick={() => addToCart(pr.id)} style={{ width: 26, height: 26, borderRadius: 6, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(pr.id)} style={{ padding: '6px 12px', borderRadius: 8, background: primary, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>Order</button>
                          )
                        ) : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Out of Stock</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <CheckoutModal />
        </div>
      </div>
    );
  }

  // ── Default: grid ──────────────────────────────────────────────────────────
  return (
    <div className="py-16 px-4 md:px-8" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: text, fontFamily: theme.fontHeading }}>
            {(s.title as string) || 'Our Products'}
          </h2>
          {s.subtitle && <p className="text-base max-w-xl mx-auto" style={{ color: text + 'bb' }}>{s.subtitle as string}</p>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
          {s.showSearch !== false && (
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
              style={{ borderColor: primary + '44', background: bg, color: text }} />
          )}
          <CartButton />
        </div>
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: primary + '44', borderTopColor: primary }} />
          </div>
        ) : (filtered as any[]).length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg font-medium" style={{ color: text + '88' }}>No products found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: `repeat(auto-fill, minmax(${cols === 4 ? '200px' : cols === 2 ? '320px' : '250px'}, 1fr))` }}>
            {(filtered as any[]).map((pr: any) => <ProductCard key={pr.id} pr={pr} />)}
          </div>
        )}
      </div>
      <CheckoutModal />
    </div>
  );
}