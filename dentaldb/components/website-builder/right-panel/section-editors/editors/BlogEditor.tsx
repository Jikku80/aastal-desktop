'use client';

import React from 'react';
import { EditorField, EditorSelect, EditorToggle, EditorTabs } from '../EditorComponents';
import type { Props } from './shared';
import { safe, set, font, Stack } from './shared';

export function BlogEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);

  const [allPosts, setAllPosts]     = React.useState<any[]>([]);
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState('');
  const [search, setSearch]         = React.useState('');

  // hidden post IDs (user-controlled)
  const hiddenIds: string[] = s.hiddenPostIds || [];

  const togglePostVisibility = (id: string) => {
    const next = hiddenIds.includes(id)
      ? hiddenIds.filter((p: string) => p !== id)
      : [...hiddenIds, id];
    $set('hiddenPostIds', next);
  };

  // map DB post → shape used by BlogPreview in SectionRenderer
  const mapPost = (p: any) => ({
    id:       p.id,
    title:    p.title || 'Untitled',
    excerpt:  p.excerpt || '',
    category: Array.isArray(p.categories) ? (p.categories[0] || 'General') : (p.category || 'General'),
    author:   p.authorName || p.author || 'Clinic',
    date:     p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    readTime: p.readingTimeMinutes ? `${p.readingTimeMinutes} min` : '3 min',
    image:    p.featuredImage || p.image || '',
    slug:     p.slug || '',
    status:   p.status || 'published',
  });

  // Fetch published posts from the blog API
  React.useEffect(() => {
    setLoading(true);
    setError('');
    import('@/lib/api').then(({ blogApi }) => {
      blogApi.list({ status: 'published', limit: 100 })
        .then((res: any) => {
          const raw = Array.isArray(res) ? res : (res?.data?.posts || res?.data || res?.posts || []);
          const mapped = raw.map(mapPost);
          setAllPosts(mapped);

          // Auto-sync: save ALL published posts to settings so SectionRenderer can render them
          // (filtered by hiddenIds at render time)
          onChange({ ...s, posts: mapped });
        })
        .catch(() => setError('Failed to load blog posts. Make sure you have published posts.'))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When posts change, keep settings.posts up to date
  React.useEffect(() => {
    if (allPosts.length > 0) {
      $set('posts', allPosts);
    }
  }, [allPosts]);

  const filtered = search.trim()
    ? allPosts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : allPosts;

  const maxPosts = s.maxPosts ? Number(s.maxPosts) : 6;

  const tk = {
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    text: '#c9ccd8',
    muted: '#6b7080',
    green: '#10b981',
    red: '#ef4444',
  };

  return (
    <EditorTabs tabs={[
      { label: 'Posts', content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>

          {/* Info banner */}
          <div style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#a5b4fc', lineHeight: 1.6 }}>
            Showing your published blog posts. Toggle visibility to show/hide individual posts on your website. Manage posts in the <strong style={{ color: '#818cf8' }}>Blog</strong> section.
          </div>

          {/* Loading / Error */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: tk.muted, fontSize: 11.5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: 'builder-spin .7s linear infinite', flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Loading blog posts…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {!loading && !error && allPosts.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)', color: tk.muted, fontSize: 11.5, lineHeight: 1.6 }}>
              No published posts found.<br/>
              <span style={{ color: '#6366f1' }}>Go to Blog → create and publish a post</span> to see it here.
            </div>
          )}

          {/* Search */}
          {!loading && allPosts.length > 0 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts…"
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 7, boxSizing: 'border-box',
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                color: '#c9ccd8', fontSize: 11.5, fontFamily: font, outline: 'none',
              }}
            />
          )}

          {/* Post list */}
          {!loading && filtered.map((post: any) => {
            const hidden = hiddenIds.includes(post.id);
            return (
              <button
                key={post.id}
                onClick={() => togglePostVisibility(post.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 11px', borderRadius: 8, textAlign: 'left',
                  border: `1px solid ${hidden ? 'rgba(239,68,68,0.2)' : tk.border}`,
                  background: hidden ? 'rgba(239,68,68,0.05)' : tk.surface,
                  cursor: 'pointer', transition: 'all 0.14s', fontFamily: font,
                }}
              >
                {/* Checkbox indicator */}
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${hidden ? tk.red : tk.green}`,
                  background: hidden ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={tk.green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {hidden  && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={tk.red}   strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                </div>

                {/* Thumbnail */}
                <div style={{
                  width: 40, height: 40, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                  background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {post.image
                    ? <img src={post.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 16, opacity: 0.5 }}>📰</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: hidden ? '#6b7080' : tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 10, color: tk.muted, marginTop: 2 }}>
                    {post.category} · {post.readTime} read
                  </div>
                </div>

                <span style={{ fontSize: 10, fontWeight: 600, color: hidden ? tk.red : tk.green, flexShrink: 0 }}>
                  {hidden ? 'Hidden' : 'Visible'}
                </span>
              </button>
            );
          })}

          {/* Show count */}
          {!loading && allPosts.length > 0 && (
            <div style={{ fontSize: 10.5, color: tk.muted, textAlign: 'center', paddingTop: 4 }}>
              {allPosts.length - hiddenIds.length} of {allPosts.length} posts visible on website
            </div>
          )}
        </div>
      )},

      { label: 'Settings', content: (
        <Stack>
          <EditorField label="Section Title"    value={s.title}    onChange={v => $set('title', v)}    placeholder="Health Articles" />
          <EditorField label="Section Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} placeholder="Latest news and health tips" />
          <EditorField
            label={`Max Posts to Show: ${maxPosts}`}
            type="range" min={2} max={12}
            value={maxPosts}
            onChange={v => $set('maxPosts', Number(v))}
          />
          <EditorToggle label="Show Category Tags"  checked={s.showCategories !== false} onChange={v => $set('showCategories', v)} />
          <EditorToggle label="Show Author Name"    checked={s.showAuthor !== false}     onChange={v => $set('showAuthor', v)} />
          <EditorToggle label="Show Read Time"      checked={s.showReadTime !== false}   onChange={v => $set('showReadTime', v)} />
          <EditorToggle label="Show Date"           checked={s.showDate !== false}       onChange={v => $set('showDate', v)} />
          <EditorToggle label="Show Excerpt"        checked={s.showExcerpt !== false}    onChange={v => $set('showExcerpt', v)} />
        </Stack>
      )},

      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'modern-grid'} onChange={v => $set('variant', v)} options={[
            { value: 'modern-grid',      label: '1. Modern Grid' },
            { value: 'magazine',         label: '2. Magazine Layout' },
            { value: 'bento',            label: '3. Bento Layout' },
            { value: 'featured-article', label: '4. Featured Article' },
            { value: 'carousel',         label: '5. Carousel' },
            { value: 'doctor-articles',  label: '6. Doctor Articles' },
            { value: 'health-tips',      label: '7. Health Tips' },
            { value: 'latest-articles',  label: '8. Latest Articles' },
            { value: 'category-showcase',label: '9. Category Showcase' },
            { value: 'editorial',        label: '10. Editorial Layout' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns || '3')} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' },
            { value: '3', label: '3 Columns' },
            { value: '4', label: '4 Columns' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}
