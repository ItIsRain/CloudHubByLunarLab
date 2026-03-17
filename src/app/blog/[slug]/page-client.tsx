"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, BookOpen, Eye, Loader2, Share2, LinkIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { useBlogPost, useBlogPosts } from "@/hooks/use-blog";
import { SafeHtml } from "@/components/ui/safe-html";
import { useBlogEngagement } from "@/hooks/use-blog-engagement";
import { buildBlogPostJsonLd, buildBreadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: postData, isLoading, error } = useBlogPost(slug);
  const post = postData?.data;

  // Engagement tracking
  const { trackRelatedClick, trackShare } = useBlogEngagement({
    slug,
    enabled: !!post && post.status === "published",
  });

  // Fetch related posts (same category, exclude current)
  const { data: relatedData } = useBlogPosts({
    category: post?.category,
    pageSize: 4,
  });
  const relatedPosts = (relatedData?.data || [])
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="flex items-center justify-center pt-40 pb-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!post || error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <BookOpen className="h-16 w-16 text-muted-foreground mb-6" />
              <h1 className="font-display text-3xl font-bold">Post Not Found</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                The blog post you are looking for does not exist or has been removed.
              </p>
              <Link href="/blog" className="mt-6">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {/* JSON-LD: BlogPosting */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBlogPostJsonLd({
              title: post.title,
              excerpt: post.excerpt,
              slug: post.slug,
              coverImage: post.coverImage,
              publishedAt: post.publishedAt,
              updatedAt: post.updatedAt,
              author: post.author
                ? { name: post.author.name, avatar: post.author.avatar }
                : undefined,
              category: post.category,
              tags: post.tags,
              readTime: post.readTime,
            })
          ),
        }}
      />
      {/* JSON-LD: Breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title },
            ])
          ),
        }}
      />
      <main className="min-h-screen bg-background">
        {/* Cover Image Hero */}
        {post.coverImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative h-[300px] sm:h-[400px] lg:h-[480px] w-full"
          >
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </motion.div>
        )}

        <div
          className={cn(
            "mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-16",
            post.coverImage ? "-mt-32 relative z-10" : "pt-24"
          )}
        >
          {/* Breadcrumbs */}
          <motion.nav
            aria-label="Breadcrumb"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">/</li>
              <li>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">/</li>
              <li className="text-foreground font-medium truncate max-w-[200px] sm:max-w-xs">
                {post.title}
              </li>
            </ol>
          </motion.nav>

          {/* Post Header */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{post.category}</Badge>
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Author Info */}
            <div className="mt-6 flex flex-wrap items-center gap-4 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <Avatar size="md">
                  <AvatarImage
                    src={post.author?.avatar}
                    alt={post.author?.name || "Author"}
                  />
                  <AvatarFallback>
                    {getInitials(post.author?.name || "A")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">
                    {post.author?.name || "Unknown Author"}
                  </p>
                  {post.author?.headline && (
                    <p className="text-xs text-muted-foreground">
                      {post.author.headline}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(post.publishedAt)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime} min read
                </span>
                {post.viewCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.viewCount} views
                  </span>
                )}
              </div>
            </div>

            {/* Share Bar */}
            <div className="mt-6 flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Share:</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Share on Twitter/X"
                onClick={() => {
                  trackShare();
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${SITE_URL}/blog/${post.slug}`)}`,
                    "_blank",
                    "noopener"
                  );
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-label="X">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Share on LinkedIn"
                onClick={() => {
                  trackShare();
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE_URL}/blog/${post.slug}`)}`,
                    "_blank",
                    "noopener"
                  );
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-label="LinkedIn">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Copy link"
                onClick={() => {
                  trackShare();
                  navigator.clipboard.writeText(
                    `${SITE_URL}/blog/${post.slug}`
                  );
                }}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Post Content */}
            <div className="mt-8 max-w-none text-foreground/90 leading-relaxed text-[16px]">
              <SafeHtml
                content={post.content}
                className="prose dark:prose-invert max-w-none font-body [&_p]:mb-4 [&_p]:leading-relaxed [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:mb-4 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:my-4 [&_pre]:my-4 [&_hr]:my-6 [&_img]:rounded-lg [&_img]:mx-auto [&_img]:my-4 [&_iframe]:rounded-lg [&_iframe]:mx-auto [&_iframe]:my-4"
              />
            </div>

            {/* Tags Footer */}
            <div className="mt-12 border-t border-border pt-6">
              <p className="mb-3 text-sm font-semibold text-muted-foreground">
                Tagged with
              </p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="muted" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16"
            >
              <h2 className="font-display text-2xl font-bold mb-6">
                Related Posts
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((related, i) => (
                  <motion.div
                    key={related.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 + i * 0.05 }}
                  >
                    <Link
                      href={`/blog/${related.slug}`}
                      onClick={() => trackRelatedClick()}
                    >
                      <Card hover className="group h-full overflow-hidden">
                        <div className="relative aspect-[2/1] overflow-hidden">
                          {related.coverImage ? (
                            <Image
                              src={related.coverImage}
                              alt={related.title}
                              width={400}
                              height={200}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <BookOpen className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <Badge variant="muted" className="mb-2 text-[10px]">
                            {related.category}
                          </Badge>
                          <h3 className="font-display text-sm font-bold leading-tight line-clamp-2">
                            {related.title}
                          </h3>
                          <div className="mt-3 flex items-center gap-2">
                            <Avatar size="xs">
                              <AvatarImage
                                src={related.author?.avatar}
                                alt={related.author?.name || "Author"}
                              />
                              <AvatarFallback>
                                {getInitials(related.author?.name || "A")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {related.author?.name || "Unknown Author"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {related.readTime}m read
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
