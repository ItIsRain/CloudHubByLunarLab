"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Send,
  Archive,
  Undo2,
} from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { categories } from "@/lib/constants";
import type { BlogPost, PaginatedResponse } from "@/lib/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import { toast } from "sonner";

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
// Blog Post Dialog (Create / Edit)
// ---------------------------------------------------------------------------

function BlogPostDialog({
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

  const [form, setForm] = React.useState<BlogFormState>(EMPTY_FORM);

  React.useEffect(() => {
    if (open) {
      setForm(editingPost ? blogPostToFormState(editingPost) : EMPTY_FORM);
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

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          slug: editingPost.slug,
          ...formStateToPayload(form),
        });
        toast.success("Blog post updated");
      } else {
        await createMutation.mutateAsync(formStateToPayload(form));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Blog Post" : "Create Blog Post"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the blog post details below."
              : "Fill in the details to create a new blog post."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter blog post title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Excerpt
            </label>
            <textarea
              className={textareaClass}
              rows={2}
              placeholder="Brief summary of the post"
              value={form.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Content <span className="text-destructive">*</span>
            </label>
            <textarea
              className={textareaClass}
              rows={8}
              placeholder="Write your blog post content here..."
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Cover Image URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Cover Image URL
            </label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={form.coverImage}
              onChange={(e) => updateField("coverImage", e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
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

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
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

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update Post"
                : "Create Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

      {/* Create / Edit Dialog */}
      <BlogPostDialog
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
