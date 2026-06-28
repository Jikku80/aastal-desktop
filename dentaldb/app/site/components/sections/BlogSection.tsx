'use client';

import React from 'react';
import type { SecProps } from './siteRendererHelpers';
import { isColorDark, resolveImageUrl } from './siteRendererHelpers';
import { SectionTitle } from './SectionTitle';

export function BlogSection({ s, theme, subdomain, containerClass }: SecProps) {
  const isDark    = isColorDark(theme.backgroundColor);
  const sectionBg = isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb';
  const cardBg    = isDark ? 'rgba(255,255,255,0.07)' : '#ffffff';
  const cardBorder= isDark ? 'rgba(255,255,255,0.1)'  : '#f0f0f0';
  const titleCol  = isDark ? 'rgba(255,255,255,0.95)' : '#111827';
  const metaCol   = isDark ? 'rgba(255,255,255,0.45)' : '#9ca3af';
  const excerptCol= isDark ? 'rgba(255,255,255,0.6)'  : '#6b7280';
  const p         = theme.primaryColor;

  const allPosts: any[]   = (s.posts as any[]) || [];
  const hiddenIds: string[]= (s.hiddenPostIds as string[]) || [];
  const maxPosts           = s.maxPosts ? Number(s.maxPosts) : 6;
  const posts              = allPosts.filter(post => !hiddenIds.includes(post.id)).slice(0, maxPosts);

  const [livePosts, setLivePosts] = React.useState<any[]>([]);
  const [fetched, setFetched]     = React.useState(false);

  React.useEffect(() => {
    if (posts.length > 0) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
    const apiRoot = base.replace(/\/api\/v1\/?$/, '');
    const subdomainFetch = subdomain
      ? fetch(`${apiRoot}/api/v1/seo/${subdomain}/blog?limit=12`)
      : fetch(`${apiRoot}/api/v1/blog?status=published&limit=12`);
    subdomainFetch
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const raw: any[] = Array.isArray(data) ? data : (data?.posts || data?.data || []);
        setLivePosts(raw.map(post => ({
          id:       post.id,
          title:    post.title || 'Untitled',
          excerpt:  post.excerpt || '',
          category: Array.isArray(post.categories) ? (post.categories[0] || 'General') : (post.category || 'General'),
          author:   post.authorName || 'Clinic',
          date:     post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          readTime: post.readingTimeMinutes ? `${post.readingTimeMinutes} min` : '3 min',
          image:    post.featuredImage || '',
          slug:     post.slug || '',
        })));
      })
      .catch(() => {})
      .finally(() => setFetched(true));
  }, []);

  const displayPosts = posts.length > 0 ? posts : livePosts.filter(p => !hiddenIds.includes(p.id)).slice(0, maxPosts);
  const columns = s.columns ? Number(s.columns) : 3;

  const PostCard = ({ post }: { post: any }) => {
    const imgUrl = resolveImageUrl(post.image);
    const href   = post.slug ? `/blog/${post.slug}` : '#';
    return (
      <a
        href={href}
        style={{ textDecoration: 'none', display: 'block', background: cardBg, borderRadius: 16, overflow: 'hidden', border: `1px solid ${cardBorder}`, boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = isDark ? 'none' : '0 8px 24px rgba(0,0,0,0.1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)'; }}
      >
        <div style={{ height: 180, background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          {imgUrl
            ? <img src={imgUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 40, opacity: 0.3 }}>📰</span>
          }
        </div>
        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {s.showCategories !== false && post.category && (
              <span style={{ fontSize: 10, fontWeight: 700, color: p, background: `${p}14`, padding: '2px 8px', borderRadius: 999 }}>
                {post.category}
              </span>
            )}
            {s.showReadTime !== false && post.readTime && (
              <span style={{ fontSize: 11, color: metaCol }}>⏱ {post.readTime}</span>
            )}
          </div>
          <h3 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: titleCol, fontSize: 15, lineHeight: 1.4, marginBottom: 8 }}>
            {post.title}
          </h3>
          {s.showExcerpt !== false && post.excerpt && (
            <p style={{ fontSize: 13, color: excerptCol, lineHeight: 1.55, marginBottom: 12 }}>
              {post.excerpt.length > 100 ? post.excerpt.slice(0, 100) + '…' : post.excerpt}
            </p>
          )}
          {(s.showAuthor !== false || s.showDate !== false) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: `1px solid ${cardBorder}` }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: p }}>
                {(post.author?.[0] || 'D').toUpperCase()}
              </div>
              <span style={{ fontSize: 11, color: metaCol }}>
                {s.showAuthor !== false && post.author}{s.showAuthor !== false && s.showDate !== false && post.date ? ' · ' : ''}{s.showDate !== false && post.date}
              </span>
            </div>
          )}
        </div>
      </a>
    );
  };

  const variant = (s.variant as string) ?? 'grid';

  if (variant === 'featured-article' || variant === 'editorial') {
    const [featured, ...rest] = displayPosts;
    if (!featured) return <div className="py-14" style={{ background: sectionBg }}><div className={containerClass}><SectionTitle title={(s.title as string) || 'Health Articles'} subtitle={s.subtitle as string} theme={theme} /><p style={{ textAlign: 'center', color: metaCol, fontSize: 14 }}>No published posts yet.</p></div></div>;
    const featImgUrl = resolveImageUrl(featured.image);
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Health Articles'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
            <a href={featured.slug ? `/blog/${featured.slug}` : '#'} style={{ textDecoration: 'none', borderRadius: 20, overflow: 'hidden', background: cardBg, border: `1px solid ${cardBorder}`, display: 'block' }}>
              <div style={{ height: 320, background: `${p}18`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {featImgUrl ? <img src={featImgUrl} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 60, opacity: 0.3 }}>📰</span>}
              </div>
              <div style={{ padding: '20px 24px' }}>
                {featured.category && <span style={{ fontSize: 10, fontWeight: 700, color: p, background: `${p}14`, padding: '3px 10px', borderRadius: 999, marginBottom: 10, display: 'inline-block' }}>{featured.category}</span>}
                <h2 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: titleCol, fontSize: '1.2rem', lineHeight: 1.4, marginBottom: 8 }}>{featured.title}</h2>
                {featured.excerpt && <p style={{ fontSize: 14, color: excerptCol, lineHeight: 1.6 }}>{featured.excerpt.slice(0, 150)}…</p>}
              </div>
            </a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {rest.slice(0, 3).map((post: any, i: number) => (
                <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'flex', gap: 14, background: cardBg, borderRadius: 14, overflow: 'hidden', border: `1px solid ${cardBorder}` }}>
                  <div style={{ width: 80, flexShrink: 0, background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {resolveImageUrl(post.image) ? <img src={resolveImageUrl(post.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20, opacity: 0.4 }}>📰</span>}
                  </div>
                  <div style={{ padding: '12px 14px 12px 0' }}>
                    <div style={{ fontSize: 10, color: p, fontWeight: 700, marginBottom: 4 }}>{post.category}</div>
                    <div style={{ fontWeight: 600, color: titleCol, fontSize: 13, lineHeight: 1.4 }}>{post.title}</div>
                    <div style={{ fontSize: 11, color: metaCol, marginTop: 4 }}>{post.readTime}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'magazine') {
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Health Magazine'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(14px,3vw,32px)' }}>
            <div>
              {displayPosts.slice(0, 1).map((post: any, i: number) => (
                <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'block', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ height: 280, background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {resolveImageUrl(post.image) ? <img src={resolveImageUrl(post.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 60, opacity: 0.3 }}>📰</span>}
                  </div>
                  <div style={{ padding: '18px 0' }}><h2 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: titleCol, fontSize: '1.3rem', marginBottom: 6 }}>{post.title}</h2><p style={{ color: excerptCol, fontSize: 14 }}>{post.excerpt?.slice(0, 120)}…</p></div>
                </a>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {displayPosts.slice(1, 3).map((post: any, i: number) => <PostCard key={i} post={post} />)}
              </div>
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: titleCol, fontSize: 14, borderBottom: `2px solid ${p}`, paddingBottom: 10, marginBottom: 16 }}>More Articles</h3>
              {displayPosts.slice(3, 7).map((post: any, i: number) => (
                <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'block', paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${cardBorder}` }}>
                  <div style={{ fontWeight: 600, color: titleCol, fontSize: 13, lineHeight: 1.4, marginBottom: 4 }}>{post.title}</div>
                  <div style={{ fontSize: 11, color: metaCol }}>{post.date}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-showcase') {
    const cats: string[] = [...new Set(displayPosts.map((p: any) => p.category as string).filter(Boolean))].slice(0, 4);
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Browse by Category'} subtitle={s.subtitle as string} theme={theme} />
          {cats.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: p, background: `${p}14`, padding: '3px 10px', borderRadius: 999 }}>{cat}</span>
                <div style={{ flex: 1, height: 1, background: cardBorder }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 16 }}>
                {displayPosts.filter((pp: any) => pp.category === cat).slice(0, columns).map((post: any, i: number) => <PostCard key={i} post={post} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'health-tips') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Health Tips'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayPosts.map((post: any, i: number) => (
              <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'flex', gap: 20, alignItems: 'center', background: cardBg, borderRadius: 16, padding: 20, border: `1px solid ${cardBorder}`, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: p, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: titleCol, fontSize: 14, marginBottom: 4 }}>{post.title}</div>
                  {post.excerpt && <div style={{ fontSize: 12, color: excerptCol, lineHeight: 1.5 }}>{post.excerpt.slice(0, 90)}…</div>}
                </div>
                <div style={{ fontSize: 11, color: metaCol, flexShrink: 0 }}>{post.readTime}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-articles') {
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Articles by Our Doctors'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 20 }}>
            {displayPosts.map((post: any, i: number) => (
              <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'block', background: cardBg, borderRadius: 16, overflow: 'hidden', border: `1px solid ${cardBorder}` }}>
                <div style={{ height: 160, background: `${p}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {resolveImageUrl(post.image) ? <img src={resolveImageUrl(post.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 40, opacity: 0.3 }}>📰</span>}
                </div>
                <div style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👨‍⚕️</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: p }}>{post.author}</div>
                  </div>
                  <h3 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: titleCol, fontSize: 14, lineHeight: 1.4, marginBottom: 6 }}>{post.title}</h3>
                  <div style={{ fontSize: 11, color: metaCol }}>{post.date} · {post.readTime}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'latest-articles' || variant === 'modern-grid') {
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
              {s.title && <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', fontWeight: 700, color: titleCol }}>{s.title as string}</h2>}
              {s.subtitle && <p style={{ color: metaCol, marginTop: 4 }}>{s.subtitle as string}</p>}
            </div>
            <a href="/blog" style={{ fontSize: 13, fontWeight: 600, color: p, textDecoration: 'none' }}>View All →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns},1fr)`, gap: 20 }}>
            {displayPosts.map((post: any, i: number) => <PostCard key={i} post={post} />)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'medical-guide' || variant === 'article') {
    return (
      <div className="py-14 sm:py-20" style={{ background: '#fff' }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Medical Guides'} subtitle={s.subtitle as string} theme={theme} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {displayPosts.map((post: any, i: number) => (
              <a key={i} href={post.slug ? `/blog/${post.slug}` : '#'} style={{ textDecoration: 'none', display: 'grid', gridTemplateColumns: '120px 1fr', gap: 20, background: cardBg, borderRadius: 16, overflow: 'hidden', border: `1px solid ${cardBorder}` }}>
                <div style={{ background: `${p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {resolveImageUrl(post.image) ? <img src={resolveImageUrl(post.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32, opacity: 0.4 }}>📄</span>}
                </div>
                <div style={{ padding: '16px 20px 16px 0' }}>
                  {post.category && <span style={{ fontSize: 10, fontWeight: 700, color: p, background: `${p}14`, padding: '2px 8px', borderRadius: 999, marginBottom: 8, display: 'inline-block' }}>{post.category}</span>}
                  <h3 style={{ fontFamily: theme.fontHeading, fontWeight: 700, color: titleCol, fontSize: 15, lineHeight: 1.4, marginBottom: 6 }}>{post.title}</h3>
                  {post.excerpt && <p style={{ fontSize: 13, color: excerptCol, lineHeight: 1.55 }}>{post.excerpt.slice(0, 100)}…</p>}
                  <div style={{ fontSize: 11, color: metaCol, marginTop: 8 }}>{post.author} · {post.date} · {post.readTime} read</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    const [hero, ...rest] = displayPosts;
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Health Articles'} subtitle={s.subtitle as string} theme={theme} />
          {displayPosts.length === 0 && fetched && (
            <p style={{ textAlign: 'center', color: metaCol, fontSize: 14 }}>No published blog posts yet.</p>
          )}
          {hero && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20 }}>
              {/* Hero post */}
              <a href={hero.slug ? `/blog/${hero.slug}` : '#'} style={{ gridColumn: rest.length > 0 ? '1 / -1' : undefined, borderRadius: 20, overflow: 'hidden', background: cardBg, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textDecoration: 'none', display: 'block' }}>
                {hero.image && <img src={hero.image} alt={hero.title} style={{ width: '100%', height: 240, objectFit: 'cover' }} />}
                <div style={{ padding: '20px 24px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: p, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{hero.category}</span>
                  <h2 style={{ fontFamily: theme.fontHeading, fontSize: 'clamp(1.1rem,2vw,1.5rem)', fontWeight: 700, color: theme.textColor, margin: '8px 0 10px' }}>{hero.title}</h2>
                  {hero.excerpt && <p style={{ fontSize: 14, color: metaCol, lineHeight: 1.6 }}>{hero.excerpt}</p>}
                  <div style={{ marginTop: 14, fontSize: 12, color: metaCol }}>{hero.date} · {hero.readTime} read</div>
                </div>
              </a>
              {/* Remaining posts in a smaller grid */}
              {rest.slice(0, 4).map((post: any, i: number) => (
                <PostCard key={post.id || i} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
        <div className={containerClass}>
          <SectionTitle title={(s.title as string) || 'Health Articles'} subtitle={s.subtitle as string} theme={theme} />
          {displayPosts.length === 0 && fetched && (
            <p style={{ textAlign: 'center', color: metaCol, fontSize: 14 }}>No published blog posts yet.</p>
          )}
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
            {displayPosts.map((post: any, i: number) => (
              <a key={post.id || i} href={post.slug ? `/blog/${post.slug}` : '#'}
                style={{ minWidth: 280, maxWidth: 320, flexShrink: 0, scrollSnapAlign: 'start', borderRadius: 16, overflow: 'hidden', background: cardBg, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textDecoration: 'none', display: 'block' }}>
                {post.image && <img src={post.image} alt={post.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                <div style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: p, textTransform: 'uppercase' }}>{post.category}</span>
                  <h3 style={{ fontFamily: theme.fontHeading, fontSize: 14, fontWeight: 700, color: theme.textColor, margin: '6px 0 8px', lineHeight: 1.4 }}>{post.title}</h3>
                  <div style={{ fontSize: 11, color: metaCol }}>{post.date} · {post.readTime} read</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default: grid / classic
  return (
    <div className="py-14 sm:py-20" style={{ background: sectionBg }}>
      <div className={containerClass}>
        <SectionTitle title={(s.title as string) || 'Health Articles'} subtitle={s.subtitle as string} theme={theme} />
        {displayPosts.length === 0 && fetched && (
          <p style={{ textAlign: 'center', color: metaCol, fontSize: 14 }}>No published blog posts yet.</p>
        )}
        {displayPosts.length > 0 && (
          <div
            className="grid gap-5 sm:gap-6"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${columns === 2 ? '320px' : columns === 4 ? '220px' : '280px'}, 1fr))` }}
          >
            {displayPosts.map((post: any, i: number) => (
              <PostCard key={post.id || i} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}