import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BlogPostPage from "./page-client";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/blog/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return buildMetadata({ title: "Blog Post Not Found" });
    }

    const { data: post } = await res.json();
    return buildMetadata({
      title: post.title,
      description: post.excerpt,
      path: `/blog/${post.slug}`,
      image: post.cover_image || post.coverImage,
    });
  } catch {
    return buildMetadata({ title: "Blog Post Not Found" });
  }
}

export default function Page() {
  return <BlogPostPage />;
}
