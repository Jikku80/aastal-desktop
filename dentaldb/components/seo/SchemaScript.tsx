/**
 * components/seo/SchemaScript.tsx
 * Renders one or more Schema.org JSON-LD objects as <script type="application/ld+json">.
 * Safe in both Server and Client components.
 */

interface SchemaScriptProps {
  /** One schema object or an array of schema objects */
  schema: Record<string, any> | Record<string, any>[];
}

export function SchemaScript({ schema }: SchemaScriptProps) {
  const schemas = Array.isArray(schema) ? schema : [schema];

  // Filter out empty objects
  const nonEmpty = schemas.filter(s => s && Object.keys(s).length > 0);
  if (!nonEmpty.length) return null;

  return (
    <>
      {nonEmpty.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s),
          }}
        />
      ))}
    </>
  );
}
