/**
 * components/seo/AnalyticsScripts.tsx
 * Pure server component — renders all <script> / <meta> tags into <head>.
 * Place inside the root layout or PublicSiteLayout.
 */

export interface AnalyticsConfig {
  googleAnalyticsId?:      string | null; // G-XXXXXXXXXX or UA-XXXXXXXX-X
  googleTagManagerId?:     string | null; // GTM-XXXXXXX
  facebookPixelId?:        string | null;
  googleSiteVerification?: string | null; // HTML-tag method
  bingSiteVerification?:   string | null; // msvalidate.01
  yandexVerification?:     string | null;
}

/**
 * AnalyticsScripts — inject into <head> via layout or generateMetadata.
 * Handles GA4, GTM (head snippet), and webmaster verification meta tags.
 */
export function AnalyticsScripts({
  googleAnalyticsId,
  googleTagManagerId,
  facebookPixelId,
  googleSiteVerification,
  bingSiteVerification,
  yandexVerification,
}: AnalyticsConfig) {
  return (
    <>
      {/* ── Webmaster verification meta tags ── */}
      {googleSiteVerification && (
        <meta name="google-site-verification" content={googleSiteVerification} />
      )}
      {bingSiteVerification && (
        <meta name="msvalidate.01" content={bingSiteVerification} />
      )}
      {yandexVerification && (
        <meta name="yandex-verification" content={yandexVerification} />
      )}

      {/* ── Google Tag Manager (head snippet) — preferred over raw GA4 ── */}
      {googleTagManagerId && (
        <script
          id="gtm-head"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${googleTagManagerId}');`,
          }}
        />
      )}

      {/* ── Google Analytics 4 (only when GTM is not configured) ── */}
      {googleAnalyticsId && !googleTagManagerId && (
        <>
          <script
            id="ga4-src"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          />
          <script
            id="ga4-init"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAnalyticsId}',{page_path:window.location.pathname,anonymize_ip:true});`,
            }}
          />
        </>
      )}

      {/* ── Facebook Pixel ── */}
      {facebookPixelId && (
        <script
          id="fb-pixel"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${facebookPixelId}');fbq('track','PageView');`,
          }}
        />
      )}
    </>
  );
}

/**
 * GTMBodyScript — paste immediately after the opening <body> tag.
 * Required for GTM to function in environments where JS is blocked.
 */
export function GTMBodyScript({
  googleTagManagerId,
}: {
  googleTagManagerId?: string | null;
}) {
  if (!googleTagManagerId) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager (noscript)"
      />
    </noscript>
  );
}
