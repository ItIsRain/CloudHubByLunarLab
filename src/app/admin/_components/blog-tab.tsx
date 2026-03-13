"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Send,
  Archive,
  Undo2,
  ArrowLeft,
  Loader2,
  FileText,
  BarChart3,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { categories } from "@/lib/constants";
import type { BlogPost, PaginatedResponse } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageUpload } from "@/components/forms/image-upload";
import { BlogAnalytics } from "./blog-analytics";

// ---------------------------------------------------------------------------
// Admin-specific hooks (hit /api/admin/blog instead of /api/blog)
// ---------------------------------------------------------------------------

function useAdminBlogPosts() {
  return useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["admin-blog"],
    queryFn: () =>
      fetchJson<PaginatedResponse<BlogPost>>("/api/admin/blog?pageSize=100"),
  });
}

function useAdminCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create blog post");
      }
      return res.json() as Promise<{ data: BlogPost }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

function useAdminUpdateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slug,
      ...updates
    }: Record<string, unknown> & { slug: string }) => {
      const res = await fetch(`/api/admin/blog/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update blog post");
      }
      return res.json() as Promise<{ data: BlogPost }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

function useAdminDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/admin/blog/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete blog post");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const statusBadgeVariant: Record<
  string,
  "default" | "success" | "secondary" | "destructive" | "warning"
> = {
  draft: "secondary",
  published: "success",
  archived: "default",
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface BlogFormState {
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  status: "draft" | "published";
}

const EMPTY_FORM: BlogFormState = {
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "",
  tags: "",
  status: "draft",
};

function blogPostToFormState(post: BlogPost): BlogFormState {
  return {
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage || "",
    category: post.category,
    tags: post.tags.join(", "),
    status: post.status === "archived" ? "draft" : post.status,
  };
}

function formStateToPayload(form: BlogFormState): Record<string, unknown> {
  return {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content,
    coverImage: form.coverImage.trim() || undefined,
    category: form.category || undefined,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: form.status,
  };
}

// ---------------------------------------------------------------------------
// Shared input class (match Input component style without requiring ref)
// ---------------------------------------------------------------------------

const inputClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y";

// ---------------------------------------------------------------------------
// Blog Post Full-Page Editor (Create / Edit)
// ---------------------------------------------------------------------------

function BlogPostEditor({
  open,
  onOpenChange,
  editingPost,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPost: BlogPost | null;
  onSaved: () => void;
}) {
  const createMutation = useAdminCreateBlogPost();
  const updateMutation = useAdminUpdateBlogPost();

  const [form, setForm] = React.useState<BlogFormState>(() =>
    editingPost ? blogPostToFormState(editingPost) : EMPTY_FORM
  );
  const [isPreview, setIsPreview] = React.useState(false);

  // Re-sync form when the dialog opens or the post changes
  React.useEffect(() => {
    if (open) {
      setForm(editingPost ? blogPostToFormState(editingPost) : EMPTY_FORM);
      setIsPreview(false);
    }
  }, [open, editingPost]);

  const isEditing = editingPost !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof BlogFormState>(
    key: K,
    value: BlogFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (overrideStatus?: "draft" | "published") => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    const payload = formStateToPayload({
      ...form,
      status: overrideStatus || form.status,
    });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          slug: editingPost.slug,
          ...payload,
        });
        toast.success("Blog post updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Blog post created");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save blog post"
      );
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background overflow-y-auto"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
          {/* ---- Header ---- */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h2 className="font-display text-xl font-bold">
                {isEditing ? "Edit Post" : "New Blog Post"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {isPreview ? "Edit" : "Preview"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave("draft")}
                disabled={isSaving}
              >
                {isSaving && form.status === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave("published")}
                disabled={isSaving}
              >
                {isSaving && form.status === "published" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Publish
              </Button>
            </div>
          </div>

          {isPreview ? (
            /* ---- Preview Mode ---- */
            <Card>
              <CardContent className="p-8">
                {form.coverImage && (
                  <div className="relative aspect-[2/1] rounded-xl overflow-hidden mb-6">
                    <Image
                      src={form.coverImage}
                      alt={form.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {form.category && (
                  <Badge variant="secondary" className="mb-3">
                    {form.category}
                  </Badge>
                )}
                <h1 className="font-display text-3xl font-bold mb-3">
                  {form.title || "Untitled Post"}
                </h1>
                {form.excerpt && (
                  <p className="text-lg text-muted-foreground mb-6">
                    {form.excerpt}
                  </p>
                )}
                {form.tags && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {form.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none [&_img]:rounded-lg [&_img]:mx-auto [&_img]:my-4 [&_iframe]:rounded-lg [&_iframe]:mx-auto [&_iframe]:my-4"
                  dangerouslySetInnerHTML={{
                    __html: form.content || "<p>No content yet...</p>",
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            /* ---- Editor Mode ---- */
            <div className="space-y-6">
              {/* Cover Image */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Cover Image
                </label>
                <ImageUpload
                  value={form.coverImage}
                  onChange={(url) => updateField("coverImage", url)}
                  onRemove={() => updateField("coverImage", "")}
                  aspectRatio="video"
                  label="Cover Image"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Write an engaging title..."
                  disabled={isSaving}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-display font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Excerpt{" "}
                  <span className="text-muted-foreground font-normal">
                    (brief summary shown in cards and SEO)
                  </span>
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => updateField("excerpt", e.target.value)}
                  placeholder="A brief summary of your post..."
                  rows={2}
                  disabled={isSaving}
                  className={textareaClass}
                />
              </div>

              {/* Category + Tags + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Category
                  </label>
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    disabled={isSaving}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Tags{" "}
                    <span className="text-muted-foreground font-normal">
                      (comma-separated)
                    </span>
                  </label>
                  <Input
                    placeholder="React, TypeScript, Next.js"
                    value={form.tags}
                    onChange={(e) => updateField("tags", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Status
                  </label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) =>
                      updateField(
                        "status",
                        e.target.value as "draft" | "published"
                      )
                    }
                    disabled={isSaving}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {/* Content — Rich Text Editor */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Content <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use the toolbar to format text, add headings, images, videos,
                  links, and more. Select text for quick formatting options.
                </p>
                <RichTextEditor
                  value={form.content}
                  onChange={(val) => updateField("content", val)}
                  placeholder="Start writing your blog post... Use headings to create sections, add images and videos to enrich your content."
                  minHeight="400px"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  onOpenChange,
  post,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Blog Post</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{post?.title}&quot;? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Column helper
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<BlogPost>();

// ---------------------------------------------------------------------------
// BlogTab
// ---------------------------------------------------------------------------

export function BlogTab() {
  const [subTab, setSubTab] = React.useState<"posts" | "analytics">("posts");

  return (
    <div>
      {/* Sub-tab navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 mb-6"
      >
        <button
          onClick={() => setSubTab("posts")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            subTab === "posts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Posts
        </button>
        <button
          onClick={() => setSubTab("analytics")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            subTab === "analytics"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </button>
      </motion.div>

      {subTab === "posts" ? <BlogPostsView /> : <BlogAnalytics />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blog Posts View (extracted from old BlogTab)
// ---------------------------------------------------------------------------

function BlogPostsView() {
  const { data: postsData, isLoading } = useAdminBlogPosts();
  const posts = postsData?.data || [];

  const updateMutation = useAdminUpdateBlogPost();
  const deleteMutation = useAdminDeleteBlogPost();

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<BlogPost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingPost, setDeletingPost] = React.useState<BlogPost | null>(
    null
  );

  const openCreate = () => {
    setEditingPost(null);
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setDialogOpen(true);
  };

  const openDelete = (post: BlogPost) => {
    setDeletingPost(post);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    try {
      await deleteMutation.mutateAsync(deletingPost.slug);
      toast.success(`"${deletingPost.title}" deleted`);
      setDeleteDialogOpen(false);
      setDeletingPost(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete blog post"
      );
    }
  };

  const handleStatusChange = async (
    post: BlogPost,
    newStatus: "published" | "draft" | "archived"
  ) => {
    try {
      await updateMutation.mutateAsync({ slug: post.slug, status: newStatus });
      const label =
        newStatus === "published"
          ? "published"
          : newStatus === "archived"
            ? "archived"
            : "unpublished";
      toast.success(`"${post.title}" ${label}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = React.useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="min-w-[180px]">
              <p className="font-medium text-sm line-clamp-1">{post.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 md:hidden">
                {post.excerpt || "No excerpt"}
              </p>
            </div>
          );
        },
      }),
      columnHelper.accessor(
        (row) => row.author?.name || "Unknown",
        {
          id: "author",
          header: "Author",
          cell: ({ row }) => {
            const author = row.original.author;
            return (
              <div className="flex items-center gap-2 min-w-[120px]">
                {author?.avatar ? (
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {(author?.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                  {author?.name || "Unknown"}
                </span>
              </div>
            );
          },
        }
      ),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge
              variant={statusBadgeVariant[status] || "secondary"}
              className="capitalize text-xs"
            >
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("viewCount", {
        header: "Views",
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            {getValue().toLocaleString()}
          </div>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Created",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground hidden lg:inline">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                title="Edit"
                onClick={() => openEdit(post)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {post.status === "draft" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-green-500 hover:text-green-600"
                  title="Publish"
                  onClick={() => handleStatusChange(post, "published")}
                  disabled={updateMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}

              {post.status === "published" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-yellow-500 hover:text-yellow-600"
                  title="Unpublish (draft)"
                  onClick={() => handleStatusChange(post, "draft")}
                  disabled={updateMutation.isPending}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}

              {post.status !== "archived" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  title="Archive"
                  onClick={() => handleStatusChange(post, "archived")}
                  disabled={updateMutation.isPending}
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}

              {post.status === "archived" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-blue-500 hover:text-blue-600"
                  title="Restore to draft"
                  onClick={() => handleStatusChange(post, "draft")}
                  disabled={updateMutation.isPending}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-500 hover:text-red-600"
                title="Delete"
                onClick={() => openDelete(post)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateMutation.isPending]
  );

  if (isLoading) {
    return <div className="shimmer rounded-xl h-96 w-full" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <DataTable
        columns={columns}
        data={posts}
        searchable={true}
        searchPlaceholder="Search blog posts by title or excerpt..."
        emptyTitle="No blog posts yet"
        emptyDescription="Create your first blog post to get started."
        emptyIcon={<BookOpen className="h-6 w-6 text-muted-foreground" />}
        toolbar={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        }
      />

      {/* Create / Edit Full-Page Editor */}
      <BlogPostEditor
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingPost={editingPost}
        onSaved={() => {
          setEditingPost(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        post={deletingPost}
        onConfirm={handleDelete}
      />
    </motion.div>
  );
}
