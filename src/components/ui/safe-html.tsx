"use client";

import DOMPurify from "dompurify";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

/**
 * Renders user-supplied HTML safely by sanitizing it with DOMPurify.
 * Use this instead of raw `dangerouslySetInnerHTML` for any user-generated content.
 */
export function SafeHtml({ content, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "b", "i", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "hr",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class", "style",
    ],
    ALLOW_DATA_ATTR: false,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
