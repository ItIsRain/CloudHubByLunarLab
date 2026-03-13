import type { Metadata } from "next";
import { buildMetadata, SITE_URL, SITE_NAME } from "@/lib/seo";
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
    const image = post.cover_image || post.coverImage;

    return {
      ...buildMetadata({
        title: post.title,
        description: post.excerpt,
        path: `/blog/${post.slug}`,
        image,
      }),
      // Enhanced blog-specific metadata
      keywords: [
        ...(post.tags || []),
        post.category,
        "CloudHub",
        "blog",
      ].filter(Boolean),
      authors: post.author ? [{ name: post.author.name }] : undefined,
      openGraph: {
        type: "article",
        title: post.title,
        description: post.excerpt,
        url: `${SITE_URL}/blog/${post.slug}`,
        siteName: SITE_NAME,
        images: image
          ? [{ url: image, width: 1200, height: 630, alt: post.title }]
          : undefined,
        publishedTime: post.publishedAt || post.published_at,
        modifiedTime: post.updatedAt || post.updated_at,
        authors: post.author ? [post.author.name] : undefined,
        section: post.category,
        tags: post.tags,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.excerpt,
        images: image ? [image] : undefined,
      },
      alternates: {
        canonical: `${SITE_URL}/blog/${post.slug}`,
      },
    };
  } catch {
    return buildMetadata({ title: "Blog Post Not Found" });
  }
}

export default function Page() {
  return <BlogPostPage />;
}
