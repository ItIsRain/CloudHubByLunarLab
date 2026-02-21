import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildMetadata, buildProfileJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import PublicProfilePage from "./page-client";

type Props = { params: Promise<{ username: string }> };

async function getProfileMeta(username: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("profiles")
    .select("id, username, name, headline, bio, avatar, website, github, twitter, linkedin")
    .eq("username", username)
    .single();

  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getProfileMeta(username);
  if (!user) return buildMetadata({ title: "Profile Not Found" });

  return buildMetadata({
    title: user.name ?? user.username,
    description: user.headline ?? user.bio?.slice(0, 160) ?? `${user.name}'s profile on CloudHub.`,
    path: `/profile/${user.username}`,
    image: user.avatar ?? undefined,
  });
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  const user = await getProfileMeta(username);

  return (
    <>
      {user && (
        <JsonLd
          data={buildProfileJsonLd({
            name: user.name ?? user.username,
            username: user.username,
            headline: user.headline ?? undefined,
            bio: user.bio ?? undefined,
            avatar: user.avatar ?? undefined,
            website: user.website ?? undefined,
            github: user.github ?? undefined,
            twitter: user.twitter ?? undefined,
            linkedin: user.linkedin ?? undefined,
          })}
        />
      )}
      <PublicProfilePage />
    </>
  );
}
