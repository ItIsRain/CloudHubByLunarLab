"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "accounts", title: "User Accounts" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "limitation", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact" },
];

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = React.useState("introduction");

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
              Terms of Service
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
              <section id="introduction" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  1. Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to CloudHub, operated by Lunar Labs (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of our platform, including our website, applications, APIs, and all related services (collectively, the &quot;Service&quot;). By accessing or using CloudHub, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  CloudHub provides an event management and hackathon platform that enables users to create, discover, and participate in events and hackathons. Our Service includes event creation tools, team formation features, submission management, judging systems, and community interaction capabilities.
                </p>
              </section>

              <section id="acceptance" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  2. Acceptance of Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By creating an account, accessing, or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. You represent that you are at least 16 years of age and have the legal capacity to enter into these Terms.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms. In such cases, &quot;you&quot; and &quot;your&quot; will refer to both you individually and the organization.
                </p>
              </section>

              <section id="accounts" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  3. User Accounts
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  To use certain features of the Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for safeguarding your account credentials and for all activities that occur under your account.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  You must not share your account credentials with any third party. You must notify us immediately of any unauthorized access or use of your account. We reserve the right to suspend or terminate accounts that violate these Terms or engage in suspicious activity. Each individual may maintain only one account on the platform.
                </p>
              </section>

              <section id="acceptable-use" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  4. Acceptable Use
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not use the Service to:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li>Violate any applicable local, state, national, or international law or regulation.</li>
                  <li>Transmit any material that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, or otherwise objectionable.</li>
                  <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
                  <li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
                  <li>Engage in any activity that could damage, disable, overburden, or impair the functionality of the Service.</li>
                  <li>Attempt to gain unauthorized access to any portion of the Service, other accounts, or any systems or networks connected to the Service.</li>
                  <li>Use the Service to send unsolicited promotional or commercial content (spam).</li>
                  <li>Scrape, crawl, or use automated means to access the Service without our prior written consent.</li>
                </ul>
              </section>

              <section id="intellectual-property" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  5. Intellectual Property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Lunar Labs and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  You retain ownership of any intellectual property rights that you hold in content you submit, post, or display on or through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute such content solely for the purpose of operating, promoting, and improving the Service. For hackathon submissions, intellectual property rights remain with the submitting team unless otherwise specified in the specific hackathon rules.
                </p>
              </section>

              <section id="limitation" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  6. Limitation of Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  To the fullest extent permitted by applicable law, in no event shall Lunar Labs, its affiliates, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, use, goodwill, or other intangible losses, resulting from:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li>Your access to or use of, or inability to access or use, the Service.</li>
                  <li>Any conduct or content of any third party on the Service.</li>
                  <li>Any content obtained from the Service.</li>
                  <li>Unauthorized access, use, or alteration of your transmissions or content.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Our total liability to you for all claims arising out of or relating to the use of the Service shall not exceed the amount you paid us, if any, during the twelve (12) months preceding the claim.
                </p>
              </section>

              <section id="termination" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  7. Termination
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so by contacting us or using the account deletion feature in your account settings.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification obligations, and limitations of liability.
                </p>
              </section>

              <section id="changes" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  8. Changes to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised Terms.
                </p>
              </section>

              <section id="contact" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  9. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <div className="mt-4 rounded-xl border border-border bg-muted/50 p-6">
                  <p className="font-medium">Lunar Labs</p>
                  <p className="mt-1 text-muted-foreground">
                    Email: legal@cloudhub.io
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
                      href="/legal/privacy"
                      className="block text-sm text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    <Link
                      href="/legal/cookies"
                      className="block text-sm text-primary hover:underline"
                    >
                      Cookie Policy
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
