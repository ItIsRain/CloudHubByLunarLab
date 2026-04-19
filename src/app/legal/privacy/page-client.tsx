"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

const sections = [
  { id: "information-collect", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Information" },
  { id: "information-sharing", title: "Information Sharing" },
  { id: "data-storage", title: "Data Storage & Region" },
  { id: "data-retention", title: "Data Retention" },
  { id: "data-security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "consent", title: "Consent Collection" },
  { id: "cookies", title: "Cookies" },
  { id: "children", title: "Children's Privacy" },
  { id: "changes", title: "Changes to Policy" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = React.useState("information-collect");

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
              Privacy Policy
            </h1>
            <p className="mt-3 text-muted-foreground">
              Last updated: March 17, 2026
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
                At CloudHub (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. By using CloudHub, you consent to the data practices described in this policy.
              </p>

              <section id="information-collect" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  1. Information We Collect
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We collect information that you provide directly to us, information we obtain automatically when you use the Service, and information from third-party sources.
                </p>
                <h3 className="mt-6 font-display text-lg font-semibold mb-2">
                  Information You Provide
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Account Information:</strong> When you register, we collect your name, email address, username, password, and optional profile details such as bio, location, skills, and social media links.</li>
                  <li><strong>Event and Competition Data:</strong> When you create events or competitions, we collect event details, descriptions, images, schedules, and configuration settings.</li>
                  <li><strong>Submissions:</strong> Project submissions including titles, descriptions, source code links, demo URLs, images, and related materials.</li>
                  <li><strong>Communications:</strong> Messages sent through the platform, feedback, and support requests.</li>
                  <li><strong>Payment Information:</strong> When you purchase tickets or subscribe to paid plans, payment details are processed securely through our third-party payment processor. We do not store full credit card numbers.</li>
                </ul>
                <h3 className="mt-6 font-display text-lg font-semibold mb-2">
                  Information Collected Automatically
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Usage Data:</strong> Pages visited, features used, actions taken, time spent on pages, and navigation patterns.</li>
                  <li><strong>Device Information:</strong> Browser type, operating system, device type, screen resolution, and language preferences.</li>
                  <li><strong>Log Data:</strong> IP address, access times, referring URLs, and error logs.</li>
                  <li><strong>Cookies and Tracking:</strong> We use cookies and similar technologies as described in our <Link href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</Link>.</li>
                </ul>
              </section>

              <section id="how-we-use" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  2. How We Use Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use the information we collect to:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li>Provide, maintain, and improve the Service, including personalizing your experience.</li>
                  <li>Process transactions, send related information, and manage your account.</li>
                  <li>Facilitate event discovery, team formation, and competition participation.</li>
                  <li>Send notifications about events, competitions, team activity, and submission updates.</li>
                  <li>Communicate with you about products, services, and events offered by us and others, including promotional communications (which you can opt out of).</li>
                  <li>Monitor and analyze trends, usage, and activities in connection with the Service.</li>
                  <li>Detect, investigate, and prevent fraudulent transactions, abuse, and other illegal activities.</li>
                  <li>Comply with legal obligations and enforce our Terms of Service.</li>
                </ul>
              </section>

              <section id="information-sharing" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  3. Information Sharing
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell your personal information. We may share your information in the following circumstances:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>With Your Consent:</strong> We share information when you direct us to, such as when you join a team or submit a project to a competition.</li>
                  <li><strong>Public Profile:</strong> Your profile name, username, avatar, bio, and participation history are visible to other users as part of the platform&apos;s community features.</li>
                  <li><strong>Event Organizers:</strong> When you register for events or competitions, organizers may receive your registration information.</li>
                  <li><strong>Service Providers:</strong> We share data with third-party vendors who perform services on our behalf, such as hosting, analytics, email delivery, and payment processing.</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, legal process, or governmental request.</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred.</li>
                </ul>
              </section>

              <section id="data-storage" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  4. Data Storage &amp; Region
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your data is stored and processed in the United Arab Emirates and Middle East region. Our infrastructure is hosted on servers located in this region to ensure compliance with UAE data protection regulations and the Abu Dhabi Global Market (ADGM) data protection framework.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  In some cases, data may be processed by third-party service providers located outside the UAE. When this occurs, we ensure appropriate safeguards are in place, such as standard contractual clauses or equivalent mechanisms, to protect your personal data.
                </p>
              </section>

              <section id="data-retention" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  5. Data Retention
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected. Specific retention periods include:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Account Data:</strong> Retained for the lifetime of your account plus 30 days after account deletion to allow for recovery.</li>
                  <li><strong>Competition Data:</strong> Registration details, submissions, and team data are retained for 2 years after the competition ends to allow for verification of results, certificates, and portfolio purposes.</li>
                  <li><strong>Event Registration Data:</strong> Retained for 1 year after the event concludes.</li>
                  <li><strong>Marketing Consent Records:</strong> Retained for as long as the consent is valid, plus 1 year after withdrawal for audit purposes.</li>
                  <li><strong>Data Deletion Requests:</strong> Processed within 30 days of the request. Backup copies may take up to 90 days to be fully purged.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  After the retention period expires, your data will be securely deleted or anonymized so that it can no longer be associated with you.
                </p>
              </section>

              <section id="data-security" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  6. Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit and at rest, regular security assessments, access controls, and secure development practices.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  However, no method of transmission over the Internet or method of electronic storage is completely secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials.
                </p>
              </section>

              <section id="your-rights" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  7. Your Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Under applicable data protection laws (including GDPR and ADGM Data Protection Regulations), you have the following rights regarding your personal information:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Access &amp; Export:</strong> You can download a copy of all your personal data at any time through your account settings or by using our <Link href="/dashboard/settings" className="text-primary hover:underline">self-service data export</Link> feature. Your data is provided in machine-readable JSON format.</li>
                  <li><strong>Correction:</strong> You can update or correct inaccurate personal information through your account settings or by contacting us.</li>
                  <li><strong>Deletion:</strong> You can request deletion of your personal information through our <Link href="/dashboard/settings" className="text-primary hover:underline">account settings</Link> or by contacting us. Deletion requests are processed within 30 days.</li>
                  <li><strong>Data Portability:</strong> You can request a machine-readable copy of your data via our data export API.</li>
                  <li><strong>Opt-Out:</strong> You can opt out of marketing communications at any time through your notification settings or by using the unsubscribe link in emails.</li>
                  <li><strong>Restriction:</strong> You can request that we restrict the processing of your personal information in certain circumstances.</li>
                  <li><strong>Withdraw Consent:</strong> Where processing is based on your consent, you may withdraw it at any time without affecting the lawfulness of processing carried out before withdrawal.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  To exercise any of these rights, please contact us at hello@lnr.ae or use the self-service tools in your account settings. We will respond to your request within 30 days.
                </p>
              </section>

              <section id="consent" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  8. Consent Collection
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We collect explicit consent for the processing of your personal data at key points in the platform:
                </p>
                <ul className="mt-4 space-y-2 text-muted-foreground list-disc pl-6">
                  <li><strong>Competition Registration:</strong> When you register for a competition, you are asked to provide explicit consent for data processing. Consent to data processing is required to participate. Marketing communications and third-party data sharing are optional.</li>
                  <li><strong>Marketing Communications:</strong> You may optionally consent to receiving marketing communications. This consent can be withdrawn at any time.</li>
                  <li><strong>Third-Party Sharing:</strong> For competitions with sponsors or partners, you may optionally consent to sharing your data with those partners. This consent is separate from data processing consent and can be withdrawn independently.</li>
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  All consent records are stored with timestamps and can be reviewed or updated through your account settings. We maintain audit trails of consent changes for compliance purposes.
                </p>
              </section>

              <section id="cookies" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  9. Cookies
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar tracking technologies to collect and track information about your use of the Service. Cookies are small data files stored on your device that help us improve the Service, remember your preferences, and understand how you interact with our platform.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  For detailed information about the cookies we use and how to manage them, please see our <Link href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
                </p>
              </section>

              <section id="children" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  10. Children&apos;s Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If we become aware that a child under 16 has provided us with personal information, we will take steps to delete such information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at hello@lnr.ae.
                </p>
              </section>

              <section id="changes" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  11. Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date above. For significant changes, we may also send you a notification via email or through the Service. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                </p>
              </section>

              <section id="contact" className="mb-10">
                <h2 className="font-display text-2xl font-bold mb-4">
                  12. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="mt-4 rounded-xl border border-border bg-muted/50 p-6">
                  <p className="font-medium">Lunar Limited - Privacy Team</p>
                  <p className="mt-1 text-muted-foreground">
                    Email: hello@lnr.ae
                  </p>
                  <p className="text-muted-foreground">
                    Address: Al Reem Island, Addax Office Tower, Office 3507, Abu Dhabi, UAE (ADGM)
                  </p>
                  <p className="text-muted-foreground">
                    Data Protection Officer: hello@lnr.ae
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
