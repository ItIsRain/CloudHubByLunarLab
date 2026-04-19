import { buildWebsiteJsonLd, SITE_NAME } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import HomePage from "./page-client";

export const metadata = {
  title: `${SITE_NAME} | Modern Event & Competition Platform`,
};

export default function Page() {
  return (
    <>
      <JsonLd data={buildWebsiteJsonLd()} />
      <HomePage />
    </>
  );
}
