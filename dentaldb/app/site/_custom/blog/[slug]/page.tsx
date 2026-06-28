/**
 * app/site/_custom/blog/[slug]/page.tsx
 * Blog post detail for custom-domain sites — wraps in the clinic's themed
 * PublicSiteLayout so the full nav/footer/theme apply.
 */

import type { Metadata } from 'next';
import { headers }       from 'next/headers';
import Link              from 'next/link';
import Image             from 'next/image';
import { notFound }      from 'next/navigation';
import { PublicSiteLayout } from '@/app/site/components/PublicSiteLayout';
import { SchemaScript }  from '@/components/seo/SchemaScript';
import { Breadcrumb }    from '@/components/seo/Breadcrumb';
import {
  buildBlogPostSchema,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  getCanonicalDomain,
  buildTableOfContents,
  type WebsiteData,
  type ClinicData,
  type BlogPostSeoData,
} from '@/lib/seoUtils';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

interface BlogPostFull extends BlogPostSeoData {
  id:         string;
  content:    string | null;
  categories: string[] | null;
  status:     string;
  createdAt:  string;
}

interface PostPayload {
  post:          BlogPostFull;
  schema:        Record<string, any>;
  articleSchema: Record<string, any>;
  faqs?:         Array<{ question: string; answer: string }>;
}

interface SitePayload { website: WebsiteData; clinic: ClinicData | null; branches: Record<string, any>[] }
interface RelatedPost  { id: string; title: string; slug: string; featuredImage: string | null; readingTimeMinutes: number }

async function getData(identifier: string, slug: string) {
  const [postRes, siteRes, relatedRes] = await Promise.all([
    fetch(`${API_BASE}/api/v1/seo/${identifier}/blog/${slug}`,         { next: { revalidate: 60 } }),
    fetch(`${API_BASE}/api/v1/website-builder/public/${identifier}`,   { next: { revalidate: 300 } }),
    fetch(`${API_BASE}/api/v1/seo/${identifier}/blog/${slug}/related`, { next: { revalidate: 300 } }),
  ]);
  if (!postRes.ok) return null;

  const [postData, site, related] = await Promise.all([
    postRes.json() as Promise<PostPayload>,
    siteRes.ok ? (siteRes.json() as Promise<SitePayload>) : Promise.resolve(null),
    relatedRes.ok ? (relatedRes.json() as Promise<RelatedPost[]>) : Promise.resolve([]),
  ]);
  return { postData, site, related };
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hdrs = await headers();
  const host = hdrs.get('x-clinic-host') ?? '';
  const { slug } = await params;
  const data = await getData(host.replace(/^www\./, ''), slug);
  if (!data) return { title: 'Blog Post' };

  const { postData, site } = data;
  const post     = postData.post;
  const domain   = site ? getCanonicalDomain(site.website) : `https://${host}`;
  const canonical = `${domain}/blog/${slug}`;

  return {
    title:       post.metaTitle ?? `${post.title} | ${site?.clinic?.name ?? ''}`,
    description: post.metaDescription ?? post.excerpt ?? '',
    keywords:    [...(post.metaKeywords ?? []), ...(post.tags ?? [])].join(', ') || undefined,
    alternates:  { canonical },
    openGraph: {
      type:          'article',
      title:         post.title,
      description:   post.excerpt ?? '',
      url:           canonical,
      images:        post.featuredImage ? [{ url: post.featuredImage, alt: post.title }] : [],
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      modifiedTime:  post.updatedAt   ? new Date(post.updatedAt).toISOString()   : undefined,
      authors:       post.authorName  ? [post.authorName] : [],
      tags:          post.tags ?? [],
    },
    twitter: {
      card:        'summary_large_image',
      title:       post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.excerpt ?? '',
      images:      post.featuredImage ? [post.featuredImage] : [],
    },
    robots: post.indexable === false ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function CustomDomainBlogPost({ params }: Props) {
  const hdrs       = await headers();
  const host       = hdrs.get('x-clinic-host') ?? '';
  const { slug }   = await params;
  if (!host) notFound();

  const identifier = host.replace(/^www\./, '');
  const data       = await getData(identifier, slug);
  if (!data) notFound();

  const { postData, site, related } = data;
  const post       = postData.post;
  const domain     = site ? getCanonicalDomain(site.website) : `https://${host}`;
  const clinicName = site?.clinic?.name ?? 'Clinic';

  const schemas: Record<string, any>[] = [
    buildBlogPostSchema(post, domain, clinicName),
    buildArticleSchema(post, domain, clinicName),
    buildBreadcrumbSchema([
      { name: clinicName, url: `${domain}/` },
      { name: 'Blog',     url: `${domain}/blog` },
      { name: post.title, url: `${domain}/blog/${slug}` },
    ]),
  ];
  if (postData.faqs?.length) schemas.push(buildFaqSchema(postData.faqs));

  const toc = post.content ? buildTableOfContents(post.content) : [];

  let processedContent = post.content ?? '';
  for (const entry of toc) {
    processedContent = processedContent.replace(
      new RegExp(`<h([23])([^>]*)>${entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h\\1>`, 'g'),
      `<h$1$2 id="${entry.id}">${entry.text}</h$1>`,
    );
  }

  const website  = site?.website;
  const theme    = (website as any)?.theme           ?? {};
  const pages    = (website as any)?.pages           ?? [];
  const gs       = (website as any)?.globalSettings  ?? {};
  const branches = site ? ((site as any).branches ?? []) : [];

  return (
    <>
      <SchemaScript schema={schemas} />

      <PublicSiteLayout
        globalSettings={gs}
        theme={theme}
        pages={pages}
        subdomain={identifier}
        clinic={site?.clinic as Record<string, any> | null ?? null}
        branches={branches}
        isCustomDomain
      >
        <div
          style={{
            background: theme.backgroundColor || '#ffffff',
            color:      theme.textColor       || '#111827',
            minHeight:  '60vh',
          }}
        >
          <div className="max-w-5xl mx-auto px-4 py-10">
            <Breadcrumb
              className="mb-6"
              items={[
                { name: clinicName, href: '/' },
                { name: 'Blog',     href: '/blog' },
                { name: post.title, href: `/blog/${slug}` },
              ]}
            />

            <div className="flex gap-10">
              <div className="flex-1 min-w-0">
                {post.categories?.[0] && (
                  <Link
                    href={`/blog?category=${encodeURIComponent(post.categories[0])}`}
                    style={{ color: theme.primaryColor || '#2563eb' }}
                    className="inline-block text-xs font-bold uppercase tracking-widest mb-3 hover:underline"
                  >
                    {post.categories[0]}
                  </Link>
                )}

                <h1
                  className="text-3xl sm:text-4xl font-extrabold leading-tight mb-5"
                  style={{ fontFamily: theme.fontHeading, color: theme.textColor || '#111827' }}
                >
                  {post.title}
                </h1>

                <div
                  className="flex flex-wrap items-center gap-4 text-sm pb-6 mb-6 border-b"
                  style={{ color: theme.textColor ? `${theme.textColor}99` : '#6b7280', borderColor: theme.textColor ? `${theme.textColor}20` : '#f3f4f6' }}
                >
                  <span className="font-medium" style={{ color: theme.textColor || '#374151' }}>{post.authorName ?? 'Clinic Team'}</span>
                  {post.publishedAt && (
                    <time dateTime={new Date(post.publishedAt).toISOString()}>
                      {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </time>
                  )}
                  <span>{post.readingTimeMinutes ?? 1} min read</span>
                  {(post.tags ?? []).map(tag => (
                    <Link
                      key={tag}
                      href={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="px-2 py-0.5 rounded-full text-xs hover:opacity-80"
                      style={{ background: `${theme.primaryColor || '#2563eb'}15`, color: theme.primaryColor || '#2563eb' }}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>

                {post.featuredImage && (
                  <div className="aspect-video relative rounded-2xl overflow-hidden mb-8">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover" priority unoptimized />
                  </div>
                )}

                {toc.length >= 3 && (
                  <details
                    className="lg:hidden mb-6 rounded-xl border overflow-hidden"
                    style={{ background: theme.backgroundColor ? `${theme.backgroundColor}dd` : '#f9fafb', borderColor: theme.textColor ? `${theme.textColor}20` : '#e5e7eb' }}
                  >
                    <summary className="px-4 py-3 text-sm font-semibold cursor-pointer select-none" style={{ color: theme.textColor || '#374151' }}>Contents</summary>
                    <nav className="px-4 pb-3">
                      <ol className="space-y-1 list-decimal list-inside">
                        {toc.map(h => (
                          <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                            <a href={`#${h.id}`} className="text-sm hover:underline" style={{ color: theme.primaryColor || '#2563eb' }}>{h.text}</a>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  </details>
                )}

                {/* Blog content rendered as HTML — preserves h1/h2/h3/p/ul/ol tags */}
                <style>{`
                  .blog-content h1 { font-size: 2rem; font-weight: 700; line-height: 1.25; margin: 1.5rem 0 1rem; }
                  .blog-content h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.3; margin: 1.5rem 0 0.75rem; }
                  .blog-content h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.35; margin: 1.25rem 0 0.625rem; }
                  .blog-content h4 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
                  .blog-content p  { margin: 0 0 1rem; line-height: 1.75; }
                  .blog-content ul { list-style: disc; padding-left: 1.75rem; margin: 0 0 1rem; }
                  .blog-content ol { list-style: decimal; padding-left: 1.75rem; margin: 0 0 1rem; }
                  .blog-content li { margin-bottom: 0.375rem; line-height: 1.6; }
                  .blog-content a  { text-decoration: underline; }
                  .blog-content blockquote { border-left: 4px solid; padding: 0.5rem 0 0.5rem 1rem; margin: 1.5rem 0; font-style: italic; opacity: 0.85; }
                  .blog-content strong, .blog-content b { font-weight: 700; }
                  .blog-content em, .blog-content i { font-style: italic; }
                  .blog-content img { max-width: 100%; border-radius: 0.75rem; margin: 1rem 0; }
                  .blog-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                  .blog-content th, .blog-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; }
                  .blog-content th { background: rgba(0,0,0,0.04); font-weight: 600; }
                  .blog-content pre { background: #1e293b; color: #e2e8f0; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
                  .blog-content code { background: rgba(0,0,0,0.07); border-radius: 0.25rem; padding: 0.1rem 0.35rem; font-size: 0.875em; font-family: monospace; }
                  .blog-content pre code { background: none; padding: 0; }
                  .blog-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
                `}</style>
                <article
                  className="blog-content max-w-none"
                  style={{
                    color:      theme.textColor       || '#374151',
                    fontFamily: theme.fontBody        || 'Inter, sans-serif',
                    fontSize:   '1.0625rem',
                  }}
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />

                {related.length > 0 && (
                  <section className="mt-12 pt-8 border-t" style={{ borderColor: theme.textColor ? `${theme.textColor}15` : '#f3f4f6' }}>
                    <h2 className="text-xl font-bold mb-5" style={{ fontFamily: theme.fontHeading, color: theme.textColor || '#111827' }}>Related Articles</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {related.map((rp: RelatedPost) => (
                        <article key={rp.id} className="rounded-xl overflow-hidden hover:shadow-sm transition-shadow border" style={{ borderColor: theme.textColor ? `${theme.textColor}15` : '#f3f4f6', background: theme.backgroundColor || '#fff' }}>
                          {rp.featuredImage && (
                            <div className="aspect-video relative overflow-hidden">
                              <Image src={rp.featuredImage} alt={rp.title} fill className="object-cover" unoptimized loading="lazy" />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-semibold text-sm line-clamp-2 mb-1" style={{ color: theme.textColor || '#111827' }}>
                              <Link href={`/blog/${rp.slug}`} className="hover:underline">{rp.title}</Link>
                            </h3>
                            <p className="text-xs" style={{ color: theme.textColor ? `${theme.textColor}60` : '#9ca3af' }}>{rp.readingTimeMinutes} min read</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {toc.length >= 3 && (
                <aside className="hidden lg:block w-60 flex-shrink-0">
                  <div className="sticky top-8 rounded-2xl border p-4" style={{ background: theme.backgroundColor ? `${theme.backgroundColor}dd` : '#f9fafb', borderColor: theme.textColor ? `${theme.textColor}15` : '#e5e7eb' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: theme.textColor ? `${theme.textColor}60` : '#9ca3af' }}>On this page</p>
                    <nav>
                      <ol className="space-y-1.5">
                        {toc.map(h => (
                          <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
                            <a href={`#${h.id}`} className="text-sm hover:underline transition-colors leading-snug block" style={{ color: theme.textColor ? `${theme.textColor}80` : '#6b7280' }}>
                              {h.text}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </PublicSiteLayout>
    </>
  );
}