/**
 * app/site/[subdomain]/blog/page.tsx
 * Blog listing page for subdomain-based clinic sites.
 */

import type { Metadata }  from 'next';
import Link               from 'next/link';
import Image              from 'next/image';
import { notFound }       from 'next/navigation';
import { PublicSiteLayout } from '@/app/site/components/PublicSiteLayout';
import { SchemaScript }   from '@/components/seo/SchemaScript';
import { Breadcrumb }     from '@/components/seo/Breadcrumb';
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

interface BlogListing {
  posts: BlogPostSummary[];
  total: number;
  page:  number;
  pages: number;
}

interface BlogPostSummary {
  id:                  string;
  title:               string;
  slug:                string;
  excerpt:             string | null;
  featuredImage:       string | null;
  authorName:          string | null;
  categories:          string[] | null;
  tags:                string[] | null;
  publishedAt:         string | null;
  readingTimeMinutes:  number;
}

interface SitePayload {
  website: WebsiteData;
  clinic:  ClinicData | null;
}

async function getData(subdomain: string, category?: string, page?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (page)     params.set('page', page);

  const [blogRes, siteRes] = await Promise.all([
    fetch(`${API_BASE}/api/v1/seo/${subdomain}/blog?${params}`,           { next: { revalidate: 60 } }),
    fetch(`${API_BASE}/api/v1/website-builder/public/${subdomain}`,       { next: { revalidate: 300 } }),
    fetch(`${API_BASE}/api/v1/seo/${subdomain}/blog/categories`,          { next: { revalidate: 300 } }),
  ]);

  if (!blogRes.ok || !siteRes.ok) return null;

  const [blog, site] = await Promise.all([
    blogRes.json() as Promise<BlogListing>,
    siteRes.json() as Promise<SitePayload>,
  ]);

  return { blog, site };
}

type BlogIndexProps = {
  params:       Promise<{ subdomain: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: BlogIndexProps): Promise<Metadata> {
  const { subdomain }  = await params;
  const sp             = await searchParams;
  const data           = await getData(subdomain, sp.category, sp.page);
  if (!data) return { title: 'Blog' };

  const { site }   = data;
  const clinicName = site.clinic?.name ?? 'Clinic';
  const city       = site.clinic?.city ?? '';
  const domain     = getCanonicalDomain(site.website);

  return {
    title:       `Blog | ${clinicName}${city ? ` — ${city}` : ''}`,
    description: `Health tips, news, and updates from ${clinicName}. Read our latest articles.`,
    alternates:  { canonical: `${domain}/blog` },
    openGraph: {
      type:        'website',
      title:       `Blog | ${clinicName}`,
      description: `Articles and health tips from ${clinicName}`,
      url:         `${domain}/blog`,
    },
  };
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: BlogIndexProps) {
  const { subdomain } = await params;
  const sp            = await searchParams;
  const data          = await getData(subdomain, sp.category, sp.page);
  if (!data) notFound();

  const { blog, site } = data;
  const theme          = (site?.website as any)?.theme          ?? {};
  const globalSettings = (site?.website as any)?.globalSettings  ?? {};
  const pages          = (site?.website as any)?.pages            ?? [];
  const domain         = getCanonicalDomain(site.website);
  const clinicName     = site.clinic?.name ?? 'Clinic';

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
        { name: clinicName,    url: `${domain}/` },
        { name: 'Blog',        url: `${domain}/blog` },
      ])} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Breadcrumb
          className="mb-6"
          items={[
            { name: clinicName,  href: `/site/${subdomain}` },
            { name: 'Blog',      href: `/site/${subdomain}/blog` },
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
              href={`/site/${subdomain}/blog`}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                !sp.category
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </Link>
            {Array.from(new Set(blog.posts.flatMap(p => p.categories ?? []))).map(cat => (
              <Link
                key={cat}
                href={`/site/${subdomain}/blog?category=${encodeURIComponent(cat)}`}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  sp.category === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}

        {/* Post grid */}
        {blog.posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium mb-1">No posts yet</p>
            <p className="text-sm">Check back soon for health tips and updates.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blog.posts.map(post => (
              <article
                key={post.id}
                className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white"
              >
                {post.featuredImage && (
                  <div className="aspect-video relative overflow-hidden">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                )}

                <div className="p-5">
                  {post.categories?.[0] && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {post.categories[0]}
                    </span>
                  )}

                  <h2 className="font-bold text-gray-900 mt-1.5 mb-2 leading-snug line-clamp-2">
                    <Link
                      href={`/site/${subdomain}/blog/${post.slug}`}
                      className="hover:underline underline-offset-2"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  {post.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                    <span>{post.authorName ?? 'Clinic Team'}</span>
                    <span>{post.readingTimeMinutes} min read</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {blog.pages > 1 && (
          <nav className="flex justify-center gap-2 mt-10" aria-label="Blog pagination">
            {Array.from({ length: blog.pages }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={`/site/${subdomain}/blog?page=${p}${sp.category ? `&category=${encodeURIComponent(sp.category)}` : ''}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  p === blog.page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
