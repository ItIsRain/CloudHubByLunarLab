"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Mail,
  MapPin,
  Send,
  Twitter,
  Github,
  Linkedin,
  MessageSquare,
  Sparkles,
  Globe,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactInfo = [
  {
    icon: Mail,
    title: "Email Us",
    description: "Our team typically responds within 24 hours.",
    value: "hello@cloudhub.io",
    href: "mailto:hello@cloudhub.io",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    description: "Come say hello at our headquarters.",
    value: "548 Market St, Suite 42\nSan Francisco, CA 94104",
  },
  {
    icon: Globe,
    title: "Social",
    description: "Follow us for updates and community news.",
    socials: [
      { icon: Twitter, href: "https://twitter.com/cloudhub", label: "Twitter" },
      { icon: Github, href: "https://github.com/cloudhub", label: "GitHub" },
      { icon: Linkedin, href: "https://linkedin.com/company/cloudhub", label: "LinkedIn" },
    ],
  },
];

const subjectOptions = [
  { value: "", label: "Select a subject..." },
  { value: "general", label: "General Inquiry" },
  { value: "sales", label: "Sales & Pricing" },
  { value: "support", label: "Technical Support" },
  { value: "partnership", label: "Partnership Opportunities" },
  { value: "press", label: "Press & Media" },
  { value: "feedback", label: "Product Feedback" },
];

export default function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Message sent! We'll get back to you soon.");
    reset();
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 dot-bg opacity-40" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Contact
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Get in{" "}
              <span className="gradient-text">Touch</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have a question, feedback, or want to partner with us? We would love to hear from you.
              Drop us a message and we will get back to you quickly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-3"
            >
              <Card>
                <CardContent className="pt-8 pb-8">
                  <h2 className="font-display text-2xl font-bold mb-6">
                    Send Us a Message
                  </h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      {/* Name */}
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium mb-2"
                        >
                          Full Name
                        </label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          {...register("name")}
                          className={cn(errors.name && "border-destructive")}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.name.message}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium mb-2"
                        >
                          Email Address
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          {...register("email")}
                          className={cn(errors.email && "border-destructive")}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium mb-2"
                      >
                        Subject
                      </label>
                      <select
                        id="subject"
                        {...register("subject")}
                        className={cn(
                          "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
                          errors.subject && "border-destructive"
                        )}
                      >
                        {subjectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors.subject && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium mb-2"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder="Tell us how we can help..."
                        {...register("message")}
                        className={cn(
                          "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none",
                          errors.message && "border-destructive"
                        )}
                      />
                      {errors.message && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    <Button type="submit" size="lg" loading={isSubmitting}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              {contactInfo.map((info, i) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="pt-6 pb-6">
                      <div className="flex gap-4">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <info.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display font-bold mb-1">
                            {info.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {info.description}
                          </p>
                          {info.href ? (
                            <a
                              href={info.href}
                              className="text-sm text-primary hover:underline font-medium"
                            >
                              {info.value}
                            </a>
                          ) : info.value ? (
                            <p className="text-sm font-medium whitespace-pre-line">
                              {info.value}
                            </p>
                          ) : null}
                          {info.socials && (
                            <div className="flex items-center gap-3 mt-2">
                              {info.socials.map((social) => (
                                <a
                                  key={social.label}
                                  href={social.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                  aria-label={social.label}
                                >
                                  <social.icon className="h-4 w-4" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Map Placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="overflow-hidden">
                  <div className="relative h-48 bg-muted">
                    <div className="absolute inset-0 grid-bg opacity-60" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">San Francisco, CA</p>
                      <p className="text-xs text-muted-foreground">
                        548 Market St, Suite 42
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
