// app/site/layout.tsx
import SiteProviders from './SiteProviders';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteProviders>{children}</SiteProviders>;
}