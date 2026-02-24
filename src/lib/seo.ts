import type { Metadata } from "next";

// ── Constants ──────────────────────────────────────────────────
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "CloudHub by Lunar Limited";
export const SITE_DESCRIPTION =
  "The modern platform for hosting events and hackathons. Build communities, manage participants, and create unforgettable experiences.";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// ── Base metadata (used in root layout) ────────────────────────
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Modern Event & Hackathon Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "events",
    "hackathons",
    "conferences",
    "meetups",
    "ticketing",
    "community",
    "event management",
    "hackathon platform",
  ],
  icons: {
    icon: "/CloudHub-Favicon.svg",
    shortcut: "/CloudHub-Favicon.svg",
    apple: "/CloudHub-Favicon.svg",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Modern Event & Hackathon Platform`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ── Per-page metadata builder ──────────────────────────────────
export function buildMetadata(overrides: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = overrides.path ? `${SITE_URL}${overrides.path}` : undefined;
  const image = overrides.image ?? DEFAULT_OG_IMAGE;

  return {
    title: overrides.title,
    description: overrides.description ?? SITE_DESCRIPTION,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title: overrides.title,
      description: overrides.description ?? SITE_DESCRIPTION,
      url,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: overrides.title,
      description: overrides.description ?? SITE_DESCRIPTION,
      images: [image],
    },
    robots: overrides.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

// ── JSON-LD Builders ───────────────────────────────────────────

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: "Lunar Limited",
      url: "https://lnr.ae",
    },
  };
}

export function buildEventJsonLd(event: {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  location?: { venue?: string; address?: string; city?: string; country?: string };
  type?: string;
  organizer?: { name: string };
  tickets?: { name: string; price: number; currency?: string }[];
  slug?: string;
}) {
  const isOnline = event.type === "online";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    image: event.coverImage,
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : event.type === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: isOnline
      ? { "@type": "VirtualLocation", url: `${SITE_URL}/events/${event.slug}` }
      : {
          "@type": "Place",
          name: event.location?.venue,
          address: {
            "@type": "PostalAddress",
            streetAddress: event.location?.address,
            addressLocality: event.location?.city,
            addressCountry: event.location?.country,
          },
        },
    organizer: event.organizer
      ? { "@type": "Organization", name: event.organizer.name }
      : undefined,
    offers: event.tickets?.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: t.price,
      priceCurrency: t.currency ?? "USD",
      availability: "https://schema.org/InStock",
    })),
    url: `${SITE_URL}/events/${event.slug}`,
  };
}

export function buildHackathonJsonLd(hackathon: {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  type?: string;
  organizer?: { name: string };
  slug?: string;
  prizePool?: number;
}) {
  const isOnline = hackathon.type === "online";
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: hackathon.name,
    description: hackathon.description,
    startDate: hackathon.startDate,
    endDate: hackathon.endDate,
    image: hackathon.coverImage,
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : hackathon.type === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: hackathon.organizer
      ? { "@type": "Organization", name: hackathon.organizer.name }
      : undefined,
    url: `${SITE_URL}/hackathons/${hackathon.slug}`,
  };
}

export function buildProfileJsonLd(user: {
  name: string;
  username: string;
  headline?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: user.name,
    url: `${SITE_URL}/profile/${user.username}`,
    image: user.avatar,
    jobTitle: user.headline,
    description: user.bio,
    sameAs: [user.website, user.github, user.twitter, user.linkedin].filter(
      Boolean
    ),
  };
}
