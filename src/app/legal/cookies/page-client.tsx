"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

const sections = [
  { id: "what-are-cookies", title: "What Are Cookies" },
  { id: "types-of-cookies", title: "Types of Cookies We Use" },
  { id: "managing-cookies", title: "Managing Cookies" },
  { id: "third-party", title: "Third-Party Cookies" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact" },
];

export default function CookiePolicyPage() {
  const [activeSection, setActiveSection] = React.useState("what-are-cookies");

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Cookie Policy
            </h1>
            <p className="mt-3 text-muted-foreground">
              Last updated: January 15, 2026
            </p>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-none"
            >
              <p className="mb-10 text-muted-foreground leading-relaxed">
                This Cookie Policy explains how CloudHub, operated by Lunar Labs (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), uses cookies and similar tracking technologies when you visit or use our platform. This policy should be read alongside our <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>

              <section id="what-are-cookies" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  1. What Are Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information about how their site is being used.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Cookies can be &quot;persistent&quot; or &quot;session&quot; cookies. Persistent cookies remain on your device after you close your browser until they expire or you delete them. Session cookies are temporary and are deleted when you close your browser. We use both types on our platform.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  In addition to cookies, we may use other similar technologies such as web beacons (also known as pixel tags or clear GIFs), local storage, and similar technologies to collect information about your browsing activity.
                </p>
              </section>

              <section id="types-of-cookies" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  2. Types of Cookies We Use
                </h2>

                <div className="space-y-8">
                  <div className="rounded-xl border border-border p-6">
                    <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-500 text-sm font-bold">E</span>
                      Essential Cookies
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      These cookies are strictly necessary for the Service to function. They enable core features such as authentication, session management, security, and accessibility. Without these cookies, the Service cannot operate properly. Essential cookies do not require your consent.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left font-medium text-foreground">Cookie</th>
                            <th className="pb-2 text-left font-medium text-foreground">Purpose</th>
                            <th className="pb-2 text-left font-medium text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">ch_session</td>
                            <td className="py-2">Maintains your login session</td>
                            <td className="py-2">Session</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">ch_csrf</td>
                            <td className="py-2">Prevents cross-site request forgery</td>
                            <td className="py-2">Session</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-mono text-xs">ch_auth</td>
                            <td className="py-2">Stores authentication token</td>
                            <td className="py-2">30 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-6">
                    <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 text-sm font-bold">A</span>
                      Analytics Cookies
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      These cookies help us understand how visitors interact with the Service by collecting and reporting information anonymously. They allow us to measure traffic, identify popular pages, and understand user behavior to improve the platform experience.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left font-medium text-foreground">Cookie</th>
                            <th className="pb-2 text-left font-medium text-foreground">Purpose</th>
                            <th className="pb-2 text-left font-medium text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">_ch_analytics</td>
                            <td className="py-2">Tracks page views and user journeys</td>
                            <td className="py-2">1 year</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-mono text-xs">_ch_perf</td>
                            <td className="py-2">Measures page load performance</td>
                            <td className="py-2">30 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-6">
                    <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 text-sm font-bold">P</span>
                      Preferences Cookies
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      These cookies remember your settings and preferences to provide a more personalized experience. They store choices like your preferred theme (light or dark mode), language settings, notification preferences, and dashboard layout configurations.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left font-medium text-foreground">Cookie</th>
                            <th className="pb-2 text-left font-medium text-foreground">Purpose</th>
                            <th className="pb-2 text-left font-medium text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">ch_theme</td>
                            <td className="py-2">Stores your preferred color theme</td>
                            <td className="py-2">1 year</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-mono text-xs">ch_locale</td>
                            <td className="py-2">Stores your language preference</td>
                            <td className="py-2">1 year</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-6">
                    <h3 className="font-display text-lg font-semibold mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-sm font-bold">M</span>
                      Marketing Cookies
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      These cookies are used to deliver relevant advertisements and track the effectiveness of our marketing campaigns. They may be set by us or by third-party advertising partners. These cookies track your browsing activity across websites to build a profile of your interests and show you relevant ads.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="pb-2 text-left font-medium text-foreground">Cookie</th>
                            <th className="pb-2 text-left font-medium text-foreground">Purpose</th>
                            <th className="pb-2 text-left font-medium text-foreground">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">_ch_mkt</td>
                            <td className="py-2">Tracks marketing campaign attribution</td>
                            <td className="py-2">90 days</td>
                          </tr>
                          <tr>
                            <td className="py-2 font-mono text-xs">_ch_ref</td>
                            <td className="py-2">Tracks referral source</td>
                            <td className="py-2">30 days</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              <section id="managing-cookies" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  3. Managing Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You have several options for managing cookies:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Browser Settings:</strong> Most web browsers allow you to control cookies through their settings. You can set your browser to refuse all cookies, accept only certain cookies, or delete cookies when you close the browser. The process varies by browser; consult your browser&apos;s help documentation for instructions.</li>
                  <li><strong>Cookie Preferences:</strong> You can manage your cookie preferences on CloudHub through the cookie settings banner that appears on your first visit, or at any time through the cookie settings link in the footer of our website.</li>
                  <li><strong>Opt-Out Links:</strong> For third-party analytics and marketing cookies, you can opt out through industry opt-out mechanisms such as the Digital Advertising Alliance (DAA) at youradchoices.com or the Network Advertising Initiative (NAI) at optout.networkadvertising.org.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Please note that disabling certain cookies may affect the functionality of the Service. Essential cookies cannot be disabled as they are necessary for the platform to function. If you disable all cookies, some features of CloudHub may not work as intended.
                </p>
              </section>

              <section id="third-party" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  4. Third-Party Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Some cookies on our platform are placed by third-party services that we use to enhance your experience. These third parties have their own privacy and cookie policies which govern their use of your data. Third-party services we use include:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Analytics Providers:</strong> We use analytics services to understand how our platform is used, which pages are most popular, and where users encounter issues.</li>
                  <li><strong>Authentication Services:</strong> If you sign in using a third-party provider (such as Google or GitHub), those providers may set their own cookies.</li>
                  <li><strong>Payment Processors:</strong> Our payment processors may use cookies to facilitate secure transactions and prevent fraud.</li>
                  <li><strong>Content Delivery Networks:</strong> We use CDNs to deliver static assets efficiently, which may involve cookies for load balancing and performance optimization.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  We do not control the cookies set by third parties and are not responsible for their use. We encourage you to review the privacy and cookie policies of any third-party services you interact with through our platform.
                </p>
              </section>

              <section id="changes" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  5. Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. When we make changes, we will update the &quot;Last updated&quot; date at the top of this page. For significant changes, we may provide a more prominent notice, including a banner on the platform or an email notification. We encourage you to review this Cookie Policy periodically.
                </p>
              </section>

              <section id="contact" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  6. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
                </p>
                <div className="mt-4 rounded-xl border border-border bg-muted/50 p-6">
                  <p className="font-medium">Lunar Labs - Privacy Team</p>
                  <p className="mt-1 text-muted-foreground">
                    Email: privacy@cloudhub.io
                  </p>
                  <p className="text-muted-foreground">
                    Address: 123 Innovation Drive, San Francisco, CA 94105
                  </p>
                </div>
              </section>
            </motion.div>

            {/* Sidebar TOC */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="sticky top-28">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  On this page
                </h3>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 border-t border-border pt-6">
                  <p className="text-xs text-muted-foreground">
                    See also:
                  </p>
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/legal/terms"
                      className="block text-sm text-primary hover:underline"
                    >
                      Terms of Service
                    </Link>
                    <Link
                      href="/legal/privacy"
                      className="block text-sm text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
