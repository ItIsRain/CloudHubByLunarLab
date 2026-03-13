"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import { marked } from "marked";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo,
  Redo,
  Minus,
  ImageIcon,
  Link2,
  Link2Off,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  Youtube as YoutubeIcon,
  Type,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="h-6 w-px bg-border mx-1" />;
}

// ---------------------------------------------------------------------------
// Image insert popover
// ---------------------------------------------------------------------------
function ImageInsertPopover({
  onInsert,
  onClose,
}: {
  onInsert: (url: string, alt: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-80 rounded-xl border border-border bg-popover p-3 shadow-lg space-y-2">
      <p className="text-xs font-medium text-foreground">Insert Image</p>
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Image URL (https://...)"
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) {
            onInsert(url.trim(), alt.trim());
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <input
        type="text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Alt text (optional)"
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) {
            onInsert(url.trim(), alt.trim());
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => url.trim() && onInsert(url.trim(), alt.trim())}
          disabled={!url.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Insert
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Link insert popover
// ---------------------------------------------------------------------------
function LinkInsertPopover({
  initialUrl,
  onInsert,
  onClose,
}: {
  initialUrl?: string;
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = React.useState(initialUrl || "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border border-border bg-popover p-3 shadow-lg space-y-2">
      <p className="text-xs font-medium text-foreground">Insert Link</p>
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) onInsert(url.trim());
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => url.trim() && onInsert(url.trim())}
          disabled={!url.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Insert
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// YouTube insert popover
// ---------------------------------------------------------------------------
function YoutubeInsertPopover({
  onInsert,
  onClose,
}: {
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute top-full right-0 mt-1 z-50 w-80 rounded-xl border border-border bg-popover p-3 shadow-lg space-y-2">
      <p className="text-xs font-medium text-foreground">Embed YouTube Video</p>
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) onInsert(url.trim());
          if (e.key === "Escape") onClose();
        }}
      />
      <p className="text-[10px] text-muted-foreground">
        Paste a YouTube, Vimeo, or video URL
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => url.trim() && onInsert(url.trim())}
          disabled={!url.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          Embed
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color picker
// ---------------------------------------------------------------------------
const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
];

function ColorPickerPopover({
  mode,
  onSelect,
  onClose,
}: {
  mode: "text" | "highlight";
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const colors = mode === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS;

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-48 rounded-xl border border-border bg-popover p-2 shadow-lg">
      <p className="text-xs font-medium text-foreground px-1 mb-1.5">
        {mode === "text" ? "Text Color" : "Highlight"}
      </p>
      <div className="grid grid-cols-4 gap-1">
        {colors.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => {
              onSelect(c.value);
              onClose();
            }}
            title={c.name}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:ring-2 hover:ring-ring transition-all"
          >
            {c.value ? (
              <span
                className="h-5 w-5 rounded-full border border-border"
                style={{
                  backgroundColor:
                    mode === "highlight" ? c.value : "transparent",
                  ...(mode === "text" ? { color: c.value } : {}),
                }}
              >
                {mode === "text" && (
                  <Type className="h-5 w-5" style={{ color: c.value }} />
                )}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {mode === "text" ? "Aa" : "—"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Heading dropdown
// ---------------------------------------------------------------------------
function HeadingDropdown({
  editor,
  onClose,
}: {
  editor: ReturnType<typeof useEditor>;
  onClose: () => void;
}) {
  if (!editor) return null;
  const items = [
    {
      label: "Normal text",
      icon: Pilcrow,
      action: () => editor.chain().focus().setParagraph().run(),
      active: !editor.isActive("heading"),
    },
    {
      label: "Heading 1",
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive("heading", { level: 1 }),
    },
    {
      label: "Heading 2",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "Heading 3",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
  ];

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-xl border border-border bg-popover p-1 shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.action();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
              item.active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown detection — returns true if text looks like it contains markdown
// ---------------------------------------------------------------------------
const MD_PATTERNS = [
  /^#{1,6}\s/m,           // headings
  /\*\*.+?\*\*/,          // bold
  /\*.+?\*/,              // italic
  /~~.+?~~/,              // strikethrough
  /^\s*[-*+]\s/m,         // unordered list
  /^\s*\d+\.\s/m,         // ordered list
  /^\s*>\s/m,             // blockquote
  /```[\s\S]*?```/,       // fenced code block
  /`[^`]+`/,              // inline code
  /\[.+?\]\(.+?\)/,       // links
  /!\[.*?\]\(.+?\)/,      // images
  /^---+$/m,              // horizontal rule
  /^\|.*\|.*\|/m,         // tables
];

function looksLikeMarkdown(text: string): boolean {
  let matches = 0;
  for (const pattern of MD_PATTERNS) {
    if (pattern.test(text)) matches++;
    if (matches >= 2) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main Editor
// ---------------------------------------------------------------------------
export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  className,
  minHeight = "300px",
}: RichTextEditorProps) {
  const [showImagePopover, setShowImagePopover] = React.useState(false);
  const [showLinkPopover, setShowLinkPopover] = React.useState(false);
  const [showYoutubePopover, setShowYoutubePopover] = React.useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState<
    "text" | "highlight" | null
  >(null);

  // Ref to access editor inside paste handler closure
  const editorRef = React.useRef<ReturnType<typeof useEditor>>(null);

  // Close all popovers
  const closeAll = () => {
    setShowImagePopover(false);
    setShowLinkPopover(false);
    setShowYoutubePopover(false);
    setShowHeadingDropdown(false);
    setShowColorPicker(null);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full mx-auto my-4",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 hover:text-primary/80",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: "rounded-lg overflow-hidden my-4",
        },
        width: 640,
        height: 360,
      }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none px-5 py-4 focus:outline-none",
          "[&_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_p.is-editor-empty:first-child::before]:float-left",
          "[&_p.is-editor-empty:first-child::before]:h-0",
          "[&_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_img]:rounded-lg [&_img]:mx-auto [&_img]:my-4",
          "[&_iframe]:rounded-lg [&_iframe]:mx-auto [&_iframe]:my-4"
        ),
        style: `min-height: ${minHeight}`,
      },
      handlePaste: (_view, event) => {
        // If the clipboard already has HTML, let Tiptap handle it natively
        const html = event.clipboardData?.getData("text/html");
        if (html && html.trim().length > 0) return false;

        const text = event.clipboardData?.getData("text/plain");
        if (!text || !looksLikeMarkdown(text)) return false;

        // Convert markdown to HTML
        const converted = marked.parse(text, { async: false }) as string;
        if (!converted || converted === text) return false;

        event.preventDefault();

        // Use the editor ref (captured in closure) to insert converted HTML
        if (editorRef.current) {
          editorRef.current.chain().focus().insertContent(converted).run();
        }
        return true;
      },
    },
  });

  // Keep ref in sync so the paste handler can access the editor
  editorRef.current = editor;

  // Sync external value into editor when it changes from outside
  // (e.g. switching from create → edit, or form reset)
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const currentHTML = editor.getHTML();
    // Only update if the value actually differs (avoid cursor jump)
    if (value !== currentHTML) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Close popovers on click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-toolbar-popover]")) {
        closeAll();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-xl border border-input bg-background shimmer",
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  const currentHeadingLabel = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
      ? "H2"
      : editor.isActive("heading", { level: 3 })
        ? "H3"
        : "¶";

  return (
    <div
      className={cn(
        "rounded-xl border border-input bg-background overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-primary",
        className
      )}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Toolbar Row 1 — Text formatting & Structure                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
        {/* Heading dropdown */}
        <div className="relative" data-toolbar-popover>
          <button
            type="button"
            onClick={() => {
              closeAll();
              setShowHeadingDropdown(!showHeadingDropdown);
            }}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors",
              editor.isActive("heading")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Text style"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">{currentHeadingLabel}</span>
          </button>
          {showHeadingDropdown && (
            <HeadingDropdown
              editor={editor}
              onClose={() => setShowHeadingDropdown(false)}
            />
          )}
        </div>

        <ToolbarDivider />

        {/* Bold */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Strikethrough */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Color */}
        <div className="relative" data-toolbar-popover>
          <ToolbarButton
            onClick={() => {
              closeAll();
              setShowColorPicker(showColorPicker === "text" ? null : "text");
            }}
            title="Text color"
          >
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          {showColorPicker === "text" && (
            <ColorPickerPopover
              mode="text"
              onSelect={(color) => {
                if (color) {
                  editor.chain().focus().setColor(color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
              }}
              onClose={() => setShowColorPicker(null)}
            />
          )}
        </div>

        {/* Highlight */}
        <div className="relative" data-toolbar-popover>
          <ToolbarButton
            onClick={() => {
              closeAll();
              setShowColorPicker(
                showColorPicker === "highlight" ? null : "highlight"
              );
            }}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          {showColorPicker === "highlight" && (
            <ColorPickerPopover
              mode="highlight"
              onSelect={(color) => {
                if (color) {
                  editor
                    .chain()
                    .focus()
                    .toggleHighlight({ color })
                    .run();
                } else {
                  editor.chain().focus().unsetHighlight().run();
                }
              }}
              onClose={() => setShowColorPicker(null)}
            />
          )}
        </div>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          isActive={editor.isActive({ textAlign: "justify" })}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <div className="relative" data-toolbar-popover>
          {editor.isActive("link") ? (
            <ToolbarButton
              onClick={() => editor.chain().focus().unsetLink().run()}
              isActive
              title="Remove link"
            >
              <Link2Off className="h-4 w-4" />
            </ToolbarButton>
          ) : (
            <ToolbarButton
              onClick={() => {
                closeAll();
                setShowLinkPopover(!showLinkPopover);
              }}
              title="Insert link"
            >
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
          )}
          {showLinkPopover && (
            <LinkInsertPopover
              initialUrl={
                editor.isActive("link")
                  ? (editor.getAttributes("link").href as string)
                  : ""
              }
              onInsert={(url) => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: url })
                  .run();
                setShowLinkPopover(false);
              }}
              onClose={() => setShowLinkPopover(false)}
            />
          )}
        </div>

        {/* Image */}
        <div className="relative" data-toolbar-popover>
          <ToolbarButton
            onClick={() => {
              closeAll();
              setShowImagePopover(!showImagePopover);
            }}
            title="Insert image"
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          {showImagePopover && (
            <ImageInsertPopover
              onInsert={(url, alt) => {
                editor.chain().focus().setImage({ src: url, alt }).run();
                setShowImagePopover(false);
              }}
              onClose={() => setShowImagePopover(false)}
            />
          )}
        </div>

        {/* YouTube */}
        <div className="relative" data-toolbar-popover>
          <ToolbarButton
            onClick={() => {
              closeAll();
              setShowYoutubePopover(!showYoutubePopover);
            }}
            title="Embed YouTube video"
          >
            <YoutubeIcon className="h-4 w-4" />
          </ToolbarButton>
          {showYoutubePopover && (
            <YoutubeInsertPopover
              onInsert={(url) => {
                editor.commands.setYoutubeVideo({ src: url });
                setShowYoutubePopover(false);
              }}
              onClose={() => setShowYoutubePopover(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Editor Content                                                      */}
      {/* ------------------------------------------------------------------ */}
      <EditorContent editor={editor} />
    </div>
  );
}
