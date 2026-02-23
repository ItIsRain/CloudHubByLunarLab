export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape HTML-sensitive characters to prevent XSS via </script> injection
  const safeJson = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
