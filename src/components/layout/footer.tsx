"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Linkedin, Instagram, Mail, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const footerLinks = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "/changelog" },
    { label: "API", href: "/api-docs" },
  ],
  // resources: [
  //   { label: "Blog", href: "/blog" },
  //   { label: "Help Center", href: "/help" },
  //   { label: "Guides", href: "/guides" },
  //   { label: "Community", href: "/community" },
  // ],
  // company: [
  //   { label: "About", href: "/about" },
  //   { label: "Careers", href: "/careers" },
  //   { label: "Contact", href: "/contact" },
  //   { label: "Press", href: "/press" },
  // ],
  legal: [
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Cookies", href: "/legal/cookies" },
  ],
};

const socialLinks = [
  { icon: Linkedin, href: "https://www.linkedin.com/company/lunarltd/", label: "LinkedIn" },
  { icon: Instagram, href: "https://instagram.com/1i1.ae", label: "Instagram" },
];

function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
      } else {
        setSubscribed(true);
        toast.success(data.message === "Already subscribed" ? "You're already subscribed!" : "Subscribed!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <Check className="h-4 w-4" />
        You&apos;re subscribed!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter your email"
        className="max-w-[240px]"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />
      <Button size="default" type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
      </Button>
    </form>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand & Newsletter */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <Image
                src="/CloudHubLight.svg"
                alt="CloudHub"
                width={140}
                height={40}
                className="h-9 w-auto dark:hidden"
              />
              <Image
                src="/CloudHubDark.svg"
                alt="CloudHub"
                width={140}
                height={40}
                className="h-9 w-auto hidden dark:block"
              />
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              The modern platform for hosting events and hackathons. Build communities, manage participants, and create unforgettable experiences.
            </p>

            {/* Newsletter */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Subscribe to our newsletter</h4>
              <NewsletterForm />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources and Company sections temporarily hidden */}

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CloudHub by Lunar Labs. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={social.label}
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
