"use client";

import DOMPurify from "dompurify";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

// Only allow http(s) and mailto protocols — blocks javascript:, data:, vbscript: etc.
const SAFE_URI_RE = /^(?:https?|mailto):/i;

// Configure DOMPurify once: force rel="noopener noreferrer" on all <a> tags
// via afterSanitizeAttributes hook (safer than post-processing regex).
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      node.setAttribute("target", "_blank");
    }
  });
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
      "class",
    ],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: SAFE_URI_RE,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
