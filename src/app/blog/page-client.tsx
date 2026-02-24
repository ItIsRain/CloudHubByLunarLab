"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, ArrowRight, BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDate, getInitials } from "@/lib/utils";
import { mockBlogPosts } from "@/lib/mock-data";

const categories = ["All", "Tips", "Trends", "Teams", "Stories", "Guides"];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = React.useState("All");

  const filteredPosts =
    activeCategory === "All"
      ? mockBlogPosts
      : mockBlogPosts.filter((post) => post.category === activeCategory);

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Badge variant="gradient" className="mb-4">
                <BookOpen className="mr-1.5 h-3 w-3" />
                CloudHub Blog
              </Badge>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Insights & <span className="gradient-text">Stories</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Tips, trends, and stories from the CloudHub community. Learn from
                hackathon winners, event organizers, and industry leaders.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
          {/* Category Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-10 flex flex-wrap gap-2"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Featured Post Hero */}
          {featuredPost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-12"
            >
              <Link href={`/blog/${featuredPost.slug}`}>
                <Card hover className="overflow-hidden">
                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px]">
                      {featuredPost.coverImage && (
                        <Image
                          src={featuredPost.coverImage}
                          alt={featuredPost.title}
                          fill

                          className="object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                    </div>
                    <CardContent className="flex flex-col justify-center p-8">
                      <Badge variant="secondary" className="mb-3 w-fit">
                        {featuredPost.category}
                      </Badge>
                      <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                        {featuredPost.title}
                      </h2>
                      <p className="mt-3 text-muted-foreground line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                      <div className="mt-6 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage
                              src={featuredPost.author.avatar}
                              alt={featuredPost.author.name}
                            />
                            <AvatarFallback>
                              {getInitials(featuredPost.author.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {featuredPost.author.name}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(featuredPost.publishedAt)}
                        </span>
                        <Badge variant="muted" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {featuredPost.readTime} min read
                        </Badge>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                        Read article <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )}

          {/* Posts Grid */}
          {remainingPosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {remainingPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <Card hover className="group h-full overflow-hidden">
                      <div className="relative aspect-[2/1] overflow-hidden">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            width={400}
                            height={200}
  
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <BookOpen className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="backdrop-blur-sm">
                            {post.category}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="font-display text-lg font-bold leading-tight line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar size="xs">
                              <AvatarImage
                                src={post.author.avatar}
                                alt={post.author.name}
                              />
                              <AvatarFallback>
                                {getInitials(post.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">
                              {post.author.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(post.publishedAt)}
                            </span>
                            <Badge variant="muted" className="gap-1 text-[10px] px-1.5 py-0">
                              <Clock className="h-2.5 w-2.5" />
                              {post.readTime}m
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-bold">No posts found</h3>
              <p className="mt-2 text-muted-foreground">
                No blog posts in this category yet. Check back soon!
              </p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
