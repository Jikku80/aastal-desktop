import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import ModernTemplate  from './templates/ModernTemplate';
import ClassicTemplate from './templates/ClassicTemplate';
import MinimalTemplate from './templates/MinimalTemplate';
import { BoldTemplate, WarmTemplate } from './templates/BoldWarmTemplate';
import type { SiteData } from './templates/types';

const API_BASE = process.env.NEXT_PUBLIC_API_FULL_URL || 'http://localhost:4000/api/v1';

async function getClinicWebsite(subdomain: string): Promise<{ data?: SiteData; notFound?: boolean }> {
  try {
    const res = await fetch(
      `${API_BASE}/website-builder/public/${encodeURIComponent(subdomain)}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return { notFound: true };
    const text = await res.text();
    if (!text?.trim() || !text.trim().startsWith('{')) return { notFound: true };

    // The API returns { website, clinic, branches }. Flatten so downstream
    // code can access top-level fields (isPublished, theme, clinic, etc.)
    const json = JSON.parse(text);
    const data: SiteData = json.website
      ? { ...json.website, clinic: json.clinic, branches: json.branches }
      : json;
    return { data };
  } catch {
    return { notFound: true };
  }
}

function renderTemplate(data: SiteData, page: string): string {
  switch (data.templateId) {
    case 'classic': return ClassicTemplate({ data, page });
    case 'minimal': return MinimalTemplate({ data });
    case 'bold':    return BoldTemplate({ data, page });
    case 'warm':    return WarmTemplate({ data, page });
    default:        return ModernTemplate({ data });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { subdomain: string } },
) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') || 'home';

  const result = await getClinicWebsite(params.subdomain);

  if (result.notFound || !result.data) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Not Found</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#08090f;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e2e8f0}
    .w{text-align:center;padding:48px 24px;max-width:460px}
    h1{font-size:26px;font-weight:700;margin-bottom:10px;color:#fff}
    p{color:#64748b;font-size:15px;line-height:1.65}
    code{font-family:monospace;font-size:12px;color:#475569;background:rgba(255,255,255,.04);padding:4px 10px;border-radius:6px;display:inline-block;margin-top:16px}
  </style>
</head>
<body>
  <div class="w">
    <h1>Website Not Found</h1>
    <p>No clinic website exists at this address, or it hasn't been published yet.</p>
    <code>/${params.subdomain}</code>
  </div>
</body>
</html>`;
    return new NextResponse(html, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const data = result.data;

  if (!data.isPublished) {
    const P  = data.theme?.primaryColor   || '#0e9de8';
    const S  = data.theme?.secondaryColor || '#1a1d27';
    const FH = data.theme?.fontHeading    || 'Georgia';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${data.clinic.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,${S},#08090f);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff}
    .w{text-align:center;padding:56px 28px;max-width:560px}
    h1{font-family:'${FH}',serif;font-size:clamp(30px,5vw,48px);font-weight:800;margin-bottom:14px;letter-spacing:-.02em}
    p{color:rgba(255,255,255,.6);font-size:16px;line-height:1.7}
    .pill{display:inline-block;background:${P};color:#fff;padding:11px 32px;border-radius:999px;font-size:14px;font-weight:600;margin-top:36px;box-shadow:0 8px 28px ${P}44}
  </style>
</head>
<body>
  <div class="w">
    <h1>${data.clinic.name}</h1>
    <p>We're putting the finishing touches on our website. We'll be ready soon!</p>
    ${(data.clinic.phone || data.clinic.email) ? `
    <p style="margin-top:18px;font-size:14px;color:rgba(255,255,255,.4)">
      ${data.clinic.phone ? `<span>📞 ${data.clinic.phone}</span>` : ''}
      ${data.clinic.phone && data.clinic.email ? '<span> · </span>' : ''}
      ${data.clinic.email ? `<span>✉ ${data.clinic.email}</span>` : ''}
    </p>` : ''}
    <div class="pill">Coming Soon</div>
  </div>
</body>
</html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const fullHtml = renderTemplate(data, page);

  return new NextResponse(fullHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}