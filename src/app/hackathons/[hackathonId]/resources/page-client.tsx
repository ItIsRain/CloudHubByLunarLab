"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowLeft,
  ExternalLink,
  Github,
  Key,
  FileText,
  Code2,
  Wrench,
  Download,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHackathon } from "@/hooks/use-hackathons";

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "doc" | "repo" | "tool";
}

const documentationResources: Resource[] = [
  {
    id: "doc-1",
    title: "API Documentation",
    description:
      "Complete reference for all available APIs, endpoints, and authentication methods.",
    url: "https://docs.example.com/api",
    type: "doc",
  },
  {
    id: "doc-2",
    title: "Design Guidelines",
    description:
      "Brand assets, color palettes, typography, and component guidelines for your project.",
    url: "https://docs.example.com/design",
    type: "doc",
  },
  {
    id: "doc-3",
    title: "Submission Guide",
    description:
      "Step-by-step instructions on how to submit your project, including required fields and demo tips.",
    url: "https://docs.example.com/submit",
    type: "doc",
  },
];

const starterKitResources: Resource[] = [
  {
    id: "kit-1",
    title: "React + TypeScript Template",
    description:
      "Production-ready React template with TypeScript, Tailwind CSS, and CI/CD configured.",
    url: "https://github.com/example/react-template",
    type: "repo",
  },
  {
    id: "kit-2",
    title: "Python Flask Starter",
    description:
      "Flask API boilerplate with SQLAlchemy, JWT auth, and Docker setup included.",
    url: "https://github.com/example/flask-starter",
    type: "repo",
  },
  {
    id: "kit-3",
    title: "Node.js API Boilerplate",
    description:
      "Express.js REST API with TypeScript, Prisma ORM, and testing configured out of the box.",
    url: "https://github.com/example/node-api",
    type: "repo",
  },
];

const toolResources: Resource[] = [
  {
    id: "tool-1",
    title: "OpenAI API Key",
    description:
      "$100 in free credits for GPT-4 and DALL-E APIs. Claim via the link below.",
    url: "https://example.com/openai-credits",
    type: "tool",
  },
  {
    id: "tool-2",
    title: "AWS Credits",
    description:
      "$50 in AWS credits for compute, storage, and AI/ML services during the hackathon.",
    url: "https://example.com/aws-credits",
    type: "tool",
  },
  {
    id: "tool-3",
    title: "Figma Pro Access",
    description:
      "Complimentary Figma Pro for the duration of the hackathon. Design and prototype for free.",
    url: "https://example.com/figma-pro",
    type: "tool",
  },
];

const iconMap: Record<string, React.ElementType> = {
  doc: FileText,
  repo: Github,
  tool: Key,
};

const categoryConfig = [
  {
    title: "Documentation",
    description: "Guides and references to help you build",
    icon: FileText,
    resources: documentationResources,
  },
  {
    title: "Starter Kits",
    description: "Get a head start with these templates",
    icon: Code2,
    resources: starterKitResources,
  },
  {
    title: "Tools & APIs",
    description: "Free credits and tools from our sponsors",
    icon: Wrench,
    resources: toolResources,
  },
];

export default function HackathonResourcesPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">
              Hackathon Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/hackathons">Browse Hackathons</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link
              href={`/hackathons/${hackathonId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {hackathon.name}
            </Link>
          </motion.div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="font-display text-4xl font-bold mb-2">Resources</h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to build your project at {hackathon.name}
            </p>
          </motion.div>

          {/* Resource Categories */}
          <div className="space-y-12">
            {categoryConfig.map((category, ci) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.1 }}
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      {category.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Resource Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.resources.map((resource, ri) => {
                    const ResourceIcon = iconMap[resource.type] || ExternalLink;

                    return (
                      <motion.div
                        key={resource.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: ci * 0.1 + ri * 0.05 }}
                      >
                        <Card className="h-full hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <ResourceIcon className="h-4.5 w-4.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">
                                  {resource.title}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] mt-1"
                                >
                                  {resource.type === "doc"
                                    ? "Documentation"
                                    : resource.type === "repo"
                                      ? "Starter Kit"
                                      : "Tool / API"}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                              {resource.description}
                            </p>

                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                              >
                                {resource.type === "repo" ? (
                                  <>
                                    <Github className="h-4 w-4" />
                                    View Repository
                                  </>
                                ) : resource.type === "tool" ? (
                                  <>
                                    <Download className="h-4 w-4" />
                                    Claim Access
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-4 w-4" />
                                    Open Docs
                                  </>
                                )}
                              </Button>
                            </a>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
