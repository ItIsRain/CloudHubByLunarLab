"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Clock,
  FileText,
  Send,
  Archive,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import {
  useMyBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
} from "@/hooks/use-blog";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { ImageUpload } from "@/components/forms/image-upload";
import type { BlogPost } from "@/lib/types";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-yellow-500/10 text-yellow-600", icon: FileText },
  published: { label: "Published", color: "bg-green-500/10 text-green-600", icon: Send },
  archived: { label: "Archived", color: "bg-gray-500/10 text-gray-500", icon: Archive },
};

const blogCategories = [
  "Tips",
  "Trends",
  "Teams",
  "Stories",
  "Guides",
  "Engineering",
  "Product",
  "Community",
];

export default function DashboardBlogPage() {
  const { data, isLoading } = useMyBlogPosts();
  const posts = data?.data || [];

  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<BlogPost | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState<"all" | "draft" | "published" | "archived">("all");

  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter((p) => p.status === filter);

  const draftCount = posts.filter((p) => p.status === "draft").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setIsEditorOpen(true);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setIsEditorOpen(true);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-display text-3xl font-bold">Blog Posts</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your blog content
              </p>
            </div>
            <Button onClick={handleNewPost}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display">{posts.length}</p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-green-600">
                  {publishedCount}
                </p>
                <p className="text-sm text-muted-foreground">Published</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display text-yellow-600">
                  {draftCount}
                </p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-display">
                  {posts.reduce((sum, p) => sum + (p.viewCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {(["all", "draft", "published", "archived"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 capitalize",
                  filter === status
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </motion.div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Posts List */}
          {!isLoading && filteredPosts.length > 0 && (
            <div className="space-y-4">
              {filteredPosts.map((post, i) => (
                <PostRow
                  key={post.id}
                  post={post}
                  index={i}
                  onEdit={() => handleEdit(post)}
                  onDelete={() => setDeleteConfirmId(post.slug)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                {filter === "all"
                  ? "No blog posts yet"
                  : `No ${filter} posts`}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {filter === "all"
                  ? "Start writing your first blog post and share your knowledge with the community."
                  : `You don't have any ${filter} posts. Try a different filter.`}
              </p>
              {filter === "all" && (
                <Button onClick={handleNewPost}>
                  <Plus className="h-4 w-4 mr-2" />
                  Write Your First Post
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Blog Editor Dialog */}
      <AnimatePresence>
        {isEditorOpen && (
          <BlogEditorDialog
            post={editingPost}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingPost(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        slug={deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
      />
    </>
  );
}

function PostRow({
  post,
  index,
  onEdit,
  onDelete,
}: {
  post: BlogPost;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const config = statusConfig[post.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.03 }}
    >
      <Card hover>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div className="h-16 w-24 rounded-lg bg-muted overflow-hidden shrink-0 hidden sm:block">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  width={96}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display font-bold text-sm truncate">
                  {post.title}
                </h3>
                <Badge
                  variant="muted"
                  className={cn("text-[10px] shrink-0", config.color)}
                >
                  <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {post.excerpt || "No excerpt"}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {post.category && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {post.category}
                  </Badge>
                )}
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {post.readTime}m
                </span>
                {post.viewCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />
                    {post.viewCount}
                  </span>
                )}
                {post.publishedAt && (
                  <span>{formatDate(post.publishedAt)}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {post.status === "published" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/blog/${post.slug}`} target="_blank">
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BlogEditorDialog({
  post,
  onClose,
}: {
  post: BlogPost | null;
  onClose: () => void;
}) {
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();

  const [title, setTitle] = React.useState(post?.title || "");
  const [excerpt, setExcerpt] = React.useState(post?.excerpt || "");
  const [content, setContent] = React.useState(post?.content || "");
  const [coverImage, setCoverImage] = React.useState(post?.coverImage || "");
  const [category, setCategory] = React.useState(post?.category || "");
  const [tagsInput, setTagsInput] = React.useState(
    (post?.tags || []).join(", ")
  );
  const [status, setStatus] = React.useState<"draft" | "published">(
    post?.status === "published" ? "published" : "draft"
  );
  const [isPreview, setIsPreview] = React.useState(false);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      coverImage: coverImage || undefined,
      category: category || undefined,
      tags,
      status,
    };

    try {
      if (post) {
        await updateMutation.mutateAsync({ slug: post.slug, ...payload });
        toast.success("Blog post updated!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Blog post created!");
      }
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save blog post"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h2 className="font-display text-xl font-bold">
              {post ? "Edit Post" : "New Post"}
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
              onClick={() => {
                setStatus("draft");
                handleSave();
              }}
              disabled={isPending}
            >
              {isPending && status === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <FileText className="h-4 w-4 mr-1" />
              )}
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setStatus("published");
                handleSave();
              }}
              disabled={isPending}
            >
              {isPending && status === "published" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publish
            </Button>
          </div>
        </div>

        {isPreview ? (
          /* Preview Mode */
          <Card>
            <CardContent className="p-8">
              {coverImage && (
                <div className="relative aspect-[2/1] rounded-xl overflow-hidden mb-6">
                  <Image
                    src={coverImage}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              {category && (
                <Badge variant="secondary" className="mb-3">
                  {category}
                </Badge>
              )}
              <h1 className="font-display text-3xl font-bold mb-3">
                {title || "Untitled Post"}
              </h1>
              {excerpt && (
                <p className="text-lg text-muted-foreground mb-6">{excerpt}</p>
              )}
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content || "<p>No content yet...</p>" }}
              />
            </CardContent>
          </Card>
        ) : (
          /* Editor Mode */
          <div className="space-y-6">
            {/* Cover Image */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Cover Image
              </label>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                onRemove={() => setCoverImage("")}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Write an engaging title..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg font-display font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief summary of your post..."
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Category + Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select category...</option>
                  {blogCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="React, TypeScript, Next.js"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Content <span className="text-destructive">*</span>
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog post content..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  slug,
  onClose,
}: {
  slug: string | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteBlogPost();

  const handleDelete = async () => {
    if (!slug) return;
    try {
      await deleteMutation.mutateAsync(slug);
      toast.success("Blog post deleted");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete blog post"
      );
    }
  };

  return (
    <Dialog open={!!slug} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Blog Post</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this blog post? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
