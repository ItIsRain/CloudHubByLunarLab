"use client";

import DOMPurify from "dompurify";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

// Only allow http(s) and mailto protocols — blocks javascript:, data:, vbscript: etc.
const SAFE_URI_RE = /^(?:https?|mailto):/i;

// Allowlisted iframe domains for embedded content (YouTube only)
const IFRAME_ALLOW_RE = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\//i;

// Configure DOMPurify once via afterSanitizeAttributes hook.
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      node.setAttribute("target", "_blank");
    }
    // Strip iframes whose src is not in the allowlist
    if (node.tagName === "IFRAME") {
      const src = node.getAttribute("src") || "";
      if (!IFRAME_ALLOW_RE.test(src)) {
        node.parentNode?.removeChild(node);
      }
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
      "p", "br", "strong", "em", "b", "i", "u", "s", "mark",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "hr",
      "iframe",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class",
      // iframe attrs for YouTube embeds
      "allowfullscreen", "frameborder", "allow",
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
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
