"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDate, getInitials } from "@/lib/utils";
import { mockBlogPosts } from "@/lib/mock-data";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const post = mockBlogPosts.find((p) => p.slug === slug);

  const relatedPosts = mockBlogPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  if (!post) {
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
              unoptimized
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
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link href="/blog">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Button>
            </Link>
          </motion.div>

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
                    src={post.author.avatar}
                    alt={post.author.name}
                  />
                  <AvatarFallback>
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{post.author.name}</p>
                  {post.author.headline && (
                    <p className="text-xs text-muted-foreground">
                      {post.author.headline}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime} min read
                </span>
              </div>
            </div>

            {/* Post Content */}
            <div className="mt-8 max-w-none text-foreground/90 leading-relaxed text-[16px]">
              <div className="whitespace-pre-wrap font-body">{post.content}</div>
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
                    <Link href={`/blog/${related.slug}`}>
                      <Card hover className="group h-full overflow-hidden">
                        <div className="relative aspect-[2/1] overflow-hidden">
                          {related.coverImage ? (
                            <Image
                              src={related.coverImage}
                              alt={related.title}
                              width={400}
                              height={200}
                              unoptimized
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
                                src={related.author.avatar}
                                alt={related.author.name}
                              />
                              <AvatarFallback>
                                {getInitials(related.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {related.author.name}
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
