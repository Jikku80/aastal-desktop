/**
 * components/seo/Breadcrumb.tsx
 * Accessible breadcrumb navigation with proper aria-label and semantic HTML.
 * The JSON-LD schema is handled separately via buildBreadcrumbSchema().
 */

import Link from 'next/link';

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbProps {
  items:     BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 list-none p-0 m-0 text-sm text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-gray-300 select-none">/</span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="text-gray-900 font-medium max-w-[220px] truncate"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-blue-600 hover:underline underline-offset-2 transition-colors whitespace-nowrap"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
