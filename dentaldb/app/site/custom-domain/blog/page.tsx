/**
 * app/site/_custom/blog/page.tsx
 * Blog index for custom-domain sites — resolves clinic from x-clinic-host header.
 */

import type { Metadata }  from 'next';
import { headers }         from 'next/headers';
import Link                from 'next/link';
import Image               from 'next/image';
import { notFound }        from 'next/navigation';
import { PublicSiteLayout } from '@/app/site/components/PublicSiteLayout';
import { SchemaScript }    from '@/components/seo/SchemaScript';
import { Breadcrumb }      from '@/components/seo/Breadcrumb';
import {
  buildBreadcrumbSchema,
  getCanonicalDomain,
  type WebsiteData,
  type ClinicData,
} from '@/lib/seoUtils';

const API_BASE = (() => {
  const raw = process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? 'http://localhost:4000';
  return raw.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
})();

interface SitePayload { website: WebsiteData; clinic: ClinicData | null }
interface BlogPostSummary {
  id: string; title: string; slug: string; excerpt: string | null;
  featuredImage: string | null; authorName: string | null;
  categories: string[] | null; publishedAt: string | null;
  readingTimeMinutes: number;
}
interface BlogListing { posts: BlogPostSummary[]; total: number; page: number; pages: number }

async function getData(identifier: string, category?: string, page?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page)     params.set('page', page);

  const [blogRes, siteRes] = await Promise.all([
    fetch(`${API_BASE}/api/v1/seo/${identifier}/blog?${params}`, { next: { revalidate: 60 } }),
    fetch(`${API_BASE}/api/v1/website-builder/public/${identifier}`, { next: { revalidate: 300 } }),
  ]);
  if (!blogRes.ok || !siteRes.ok) return null;

  const [blog, site] = await Promise.all([
    blogRes.json() as Promise<BlogListing>,
    siteRes.json() as Promise<SitePayload>,
  ]);
  return { blog, site };
}

type Props = { searchParams: Promise<{ category?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const hdrs  = await headers();
  const host  = hdrs.get('x-clinic-host') ?? '';
  const sp    = await searchParams;
  const data  = await getData(host.replace(/^www\./, ''), sp.category, sp.page);
  if (!data) return { title: 'Blog' };

  const clinicName = data.site.clinic?.name ?? 'Clinic';
  const city       = data.site.clinic?.city ?? '';
  const domain     = getCanonicalDomain(data.site.website);
  return {
    title:       `Blog | ${clinicName}${city ? ` — ${city}` : ''}`,
    description: `Health tips and updates from ${clinicName}.`,
    alternates:  { canonical: `${domain}/blog` },
  };
}

export default async function CustomDomainBlogIndex({ searchParams }: Props) {
  const hdrs = await headers();
  const host = hdrs.get('x-clinic-host') ?? '';
  const sp   = await searchParams;
  if (!host) notFound();

  const identifier = host.replace(/^www\./, '');
  const data       = await getData(identifier, sp.category, sp.page);
  if (!data) notFound();

  const { blog, site } = data;
  const subdomain      = (site?.website as any)?.subdomain ?? '';
  const theme          = (site?.website as any)?.theme          ?? {};
  const globalSettings = (site?.website as any)?.globalSettings  ?? {};
  const pages          = (site?.website as any)?.pages            ?? [];
  const domain     = getCanonicalDomain(site.website);
  const clinicName = site.clinic?.name ?? 'Clinic';

  return (
    <PublicSiteLayout
      globalSettings={globalSettings}
      theme={theme}
      pages={pages}
      subdomain={subdomain}
      clinic={site?.clinic ?? null}
    >
    <>
      <SchemaScript schema={buildBreadcrumbSchema([
        { name: clinicName, url: `${domain}/` },
        { name: 'Blog',     url: `${domain}/blog` },
      ])} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <Breadcrumb
          className="mb-6"
          items={[
            { name: clinicName, href: '/' },
            { name: 'Blog',     href: '/blog' },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{clinicName} Health Blog</h1>
          <p className="text-gray-500">Health tips, updates, and news from our team.</p>
        </header>

        {/* Category pills */}
        {blog.posts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href="/blog"
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                !sp.category ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </Link>
            {Array.from(new Set(blog.posts.flatMap(p => p.categories ?? []))).map(cat => (
              <Link
                key={cat}
                href={`/blog?category=${encodeURIComponent(cat)}`}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  sp.category === cat ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {blog.posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium mb-1">No posts yet</p>
            <p className="text-sm">Check back soon for health tips and updates.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blog.posts.map(post => (
              <article key={post.id} className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white">
                {post.featuredImage && (
                  <div className="aspect-video relative overflow-hidden">
                    <Image src={post.featuredImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" unoptimized />
                  </div>
                )}
                <div className="p-5">
                  {post.categories?.[0] && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{post.categories[0]}</span>
                  )}
                  <h2 className="font-bold text-gray-900 mt-1.5 mb-2 leading-snug line-clamp-2">
                    <Link href={`/blog/${post.slug}`} className="hover:underline underline-offset-2">{post.title}</Link>
                  </h2>
                  {post.excerpt && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{post.authorName ?? 'Clinic Team'}</span>
                    <span>{post.readingTimeMinutes} min read</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {blog.pages > 1 && (
          <nav className="flex justify-center gap-2 mt-10" aria-label="Pagination">
            {Array.from({ length: blog.pages }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/blog?page=${p}${sp.category ? `&category=${encodeURIComponent(sp.category)}` : ''}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  p === blog.page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                aria-current={p === blog.page ? 'page' : undefined}
              >
                {p}
              </Link>
            ))}
          </nav>
        )}
      </main>
    </>
    </PublicSiteLayout>
  );
}
