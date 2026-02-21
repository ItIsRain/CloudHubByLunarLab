import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { mockBlogPosts } from "@/lib/mock-data";
import BlogPostPage from "./page-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = mockBlogPosts.find((p) => p.slug === slug);
  if (!post) return buildMetadata({ title: "Blog Post Not Found" });

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImage,
  });
}

export default function Page() {
  return <BlogPostPage />;
}
