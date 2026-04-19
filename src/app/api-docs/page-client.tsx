"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Copy, Check, ChevronRight,
  Shield, Calendar, Trophy, Users,
  Key, User, BarChart3, Globe, ArrowRight, Menu, X,
  Zap, Lock, Code2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import {
  apiRegistry,
  getTotalEndpoints,
  type ApiEndpoint,
  type ApiParam,
  type ApiSection,
} from "@/lib/api-registry";

// =====================================================
// Icon map
// =====================================================
const iconMap: Record<string, React.ElementType> = {
  Shield, Calendar, Trophy, Users, Key, User, BarChart3, Globe,
};

// =====================================================
// Method badge
// =====================================================
const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  PATCH: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/25",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border tracking-wide",
        METHOD_COLORS[method] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/25"
      )}
    >
      {method}
    </span>
  );
}

// =====================================================
// Copy button
// =====================================================
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors",
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// =====================================================
// Code block with syntax-ish coloring
// =====================================================
function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg border border-white/[0.06] bg-[#0a0a0c] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="font-mono text-zinc-300 whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

// =====================================================
// Param table
// =====================================================
function ParamTable({ params, title }: { params: ApiParam[]; title: string }) {
  if (!params.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">{title}</h4>
      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.015]">
              <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs hidden sm:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <code className="text-xs font-mono text-primary">{p.name}</code>
                  {p.required && <span className="text-red-400 ml-1 text-[10px] font-semibold">required</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  <code className="text-xs font-mono text-zinc-400">{p.type}</code>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                  {p.description}
                  {p.default && (
                    <span className="text-zinc-600 ml-1">
                      Default: <code className="text-[11px] font-mono text-zinc-500">{p.default}</code>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// Single endpoint card
// =====================================================
function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"response" | "curl">("response");

  const baseUrl = "https://1i1.ae";
  const curlExample = React.useMemo(() => {
    const lines = [`curl -X ${endpoint.method}`];
    lines.push(`  -H "Authorization: Bearer ch_key_YOUR_KEY_HERE"`);
    if (endpoint.requestExample) {
      lines.push(`  -H "Content-Type: application/json"`);
      // compact the JSON for curl
      const compact = endpoint.requestExample.replace(/\n/g, "").replace(/\s{2,}/g, " ");
      lines.push(`  -d '${compact}'`);
    }
    lines.push(`  ${baseUrl}${endpoint.path}`);
    return lines.join(" \\\n");
  }, [endpoint]);

  return (
    <div
      id={`${endpoint.method}-${endpoint.path.replace(/[/{}/]/g, "-")}`}
      className={cn(
        "rounded-xl border bg-white/[0.01] transition-all overflow-hidden",
        expanded ? "border-white/[0.1] shadow-lg shadow-black/20" : "border-white/[0.06] hover:border-white/[0.1]"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-zinc-200 group-hover:text-white transition-colors truncate">
          {endpoint.path}
        </code>
        <span className="ml-auto text-xs text-zinc-500 hidden md:block flex-shrink-0 max-w-[280px] truncate">
          {endpoint.summary}
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-zinc-600 transition-transform flex-shrink-0",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-5 border-t border-white/[0.06] pt-5">
              {/* Summary & meta */}
              <div className="space-y-3">
                <p className="text-sm text-zinc-300 font-medium">{endpoint.summary}</p>
                {endpoint.description && (
                  <p className="text-sm text-zinc-500 leading-relaxed">{endpoint.description}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="text-[11px] gap-1 py-0.5 border-white/[0.08]">
                    <Key className="h-3 w-3" />
                    Scope: {endpoint.scope}
                  </Badge>
                  {endpoint.rateLimit && (
                    <Badge variant="outline" className="text-[11px] gap-1 py-0.5 border-white/[0.08]">
                      <Zap className="h-3 w-3" />
                      {endpoint.rateLimit}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Params */}
              {endpoint.queryParams && (
                <ParamTable params={endpoint.queryParams} title="Query Parameters" />
              )}
              {endpoint.bodyParams && (
                <ParamTable params={endpoint.bodyParams} title="Request Body (JSON)" />
              )}

              {/* Code examples */}
              {(endpoint.responseExample || endpoint.requestExample) && (
                <div>
                  <div className="flex items-center gap-1 mb-3 border-b border-white/[0.04] pb-2">
                    {endpoint.responseExample && (
                      <button
                        onClick={() => setActiveTab("response")}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                          activeTab === "response"
                            ? "bg-white/10 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Response
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("curl")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                        activeTab === "curl"
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      cURL
                    </button>
                  </div>
                  {activeTab === "response" && endpoint.responseExample && (
                    <CodeBlock code={endpoint.responseExample} language="json" />
                  )}
                  {activeTab === "curl" && (
                    <CodeBlock code={curlExample} language="bash" />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// Section block
// =====================================================
function SectionBlock({ section }: { section: ApiSection }) {
  const Icon = iconMap[section.icon] || Globe;
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">{section.title}</h2>
        </div>
        <Badge variant="secondary" className="text-[11px] ml-auto py-0.5">
          {section.endpoints.length} endpoint{section.endpoints.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <p className="text-sm text-zinc-500 mb-6 ml-12">{section.description}</p>
      <div className="space-y-3">
        {section.endpoints.map((ep, i) => (
          <EndpointCard key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
        ))}
      </div>
    </section>
  );
}

// =====================================================
// Sidebar
// =====================================================
function Sidebar({
  search,
  onSearchChange,
  activeSection,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  activeSection: string;
}) {
  const filteredSections = React.useMemo(() => {
    if (!search) return apiRegistry;
    const q = search.toLowerCase();
    return apiRegistry
      .map((s) => ({
        ...s,
        endpoints: s.endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            ep.summary.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.endpoints.length > 0 || s.title.toLowerCase().includes(q));
  }, [search]);

  return (
    <nav className="space-y-0.5">
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search endpoints..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] pl-9 pr-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Guide links */}
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Guide</p>
      {[
        { id: "getting-started", label: "Getting Started" },
        { id: "authentication-guide", label: "Authentication" },
        { id: "rate-limiting", label: "Rate Limiting" },
        { id: "errors", label: "Error Codes" },
        { id: "pagination", label: "Pagination" },
      ].map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "block px-3 py-1.5 rounded-lg text-sm transition-colors",
            activeSection === item.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
          )}
        >
          {item.label}
        </a>
      ))}

      <div className="border-t border-white/[0.06] my-3" />

      {/* API sections */}
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Endpoints</p>
      {filteredSections.map((section) => {
        const Icon = iconMap[section.icon] || Globe;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              activeSection === section.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {section.title}
            <span className="ml-auto text-[11px] text-zinc-600">{section.endpoints.length}</span>
          </a>
        );
      })}
    </nav>
  );
}

// =====================================================
// Main Page
// =====================================================
export default function ApiDocsPage() {
  const [search, setSearch] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("getting-started");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Intersection observer for active section tracking
  React.useEffect(() => {
    const sectionIds = [
      "getting-started", "authentication-guide", "rate-limiting", "errors", "pagination",
      ...apiRegistry.map((s) => s.id),
    ];
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const filteredSections = React.useMemo(() => {
    if (!search) return apiRegistry;
    const q = search.toLowerCase();
    return apiRegistry
      .map((s) => ({
        ...s,
        endpoints: s.endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            ep.summary.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.endpoints.length > 0);
  }, [search]);

  const totalEndpoints = getTotalEndpoints();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden pt-24 pb-14 border-b border-white/[0.06]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-fuchsia-500/5" />
          <div className="absolute inset-0 grid-bg opacity-25" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <Badge variant="outline" className="px-3 py-1 text-[11px] gap-1.5 border-primary/30">
                <Code2 className="h-3 w-3 text-primary" />
                Enterprise REST API
              </Badge>
              <Badge variant="secondary" className="px-2.5 py-1 text-[11px]">v1</Badge>
              <Badge variant="secondary" className="px-2.5 py-1 text-[11px]">{totalEndpoints} endpoints</Badge>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              API <span className="gradient-text">Reference</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Integrate CloudHub into your workflows. Create and manage events and hackathons
              programmatically with scoped API keys.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <a
                href="#getting-started"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/dashboard/settings/api-keys"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm font-medium text-zinc-400 hover:text-white hover:border-white/[0.2] transition-colors"
              >
                <Key className="h-4 w-4" />
                Manage API Keys
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== MAIN LAYOUT ===================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* Mobile nav toggle */}
          <button
            className="lg:hidden flex items-center gap-2 mb-6 px-3 py-2 rounded-lg border border-white/[0.06] text-sm text-zinc-500 hover:text-zinc-300"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Navigation
          </button>

          {/* Sidebar */}
          <aside
            className={cn(
              "lg:block lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pb-12 scrollbar-thin",
              mobileNavOpen ? "block mb-8" : "hidden"
            )}
          >
            <Sidebar search={search} onSearchChange={setSearch} activeSection={activeSection} />
          </aside>

          {/* Content */}
          <main className="min-w-0 space-y-20">
            {/* ============ Getting Started ============ */}
            <section id="getting-started" className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold mb-6">Getting Started</h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                The CloudHub API is a REST API that returns JSON responses. The base URL for
                all requests is <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">https://1i1.ae/api</code>.
                Enterprise plan required.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    step: "1",
                    icon: Key,
                    color: "emerald",
                    title: "Create an API Key",
                    desc: (
                      <>
                        Generate a key from your{" "}
                        <Link href="/dashboard/settings/api-keys" className="text-primary hover:underline">
                          dashboard settings
                        </Link>
                        . Choose scopes for the resources you need.
                      </>
                    ),
                  },
                  {
                    step: "2",
                    icon: Shield,
                    color: "blue",
                    title: "Authenticate",
                    desc: "Include your key in the Authorization header as a Bearer token with every request.",
                  },
                  {
                    step: "3",
                    icon: Zap,
                    color: "primary",
                    title: "Make Requests",
                    desc: "Send JSON requests. Your key's scopes determine which endpoints are accessible.",
                  },
                ].map((item) => (
                  <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-5 relative overflow-hidden">
                    <span className="absolute top-3 right-4 text-[64px] font-display font-bold text-white/[0.03] leading-none">
                      {item.step}
                    </span>
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3", `bg-${item.color}-500/10 border border-${item.color}-500/20`)}>
                      <item.icon className={cn("h-[18px] w-[18px]", `text-${item.color}-400`)} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <CodeBlock
                language="bash"
                code={`# Quick test — list your events
curl -H "Authorization: Bearer ch_key_YOUR_KEY_HERE" \\
  https://1i1.ae/api/events?organizerId=YOUR_USER_ID&pageSize=5`}
              />
            </section>

            {/* ============ Authentication ============ */}
            <section id="authentication-guide" className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold mb-6">Authentication</h2>
              <div className="space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  All API requests require a valid API key passed as a Bearer token in the
                  <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] mx-1">Authorization</code>
                  header.
                </p>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Bearer Token</h3>
                      <p className="text-xs text-zinc-500">Include in every request</p>
                    </div>
                  </div>
                  <CodeBlock
                    language="http"
                    code={`Authorization: Bearer ch_key_AbCdEfGhIjKlMnOpQrStUvWxYz012345`}
                  />
                  <div className="text-xs space-y-2 text-zinc-500">
                    <p className="font-medium text-zinc-300">Available scopes:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { scope: "events", desc: "Events CRUD" },
                        { scope: "hackathons", desc: "Competitions CRUD" },
                        { scope: "users", desc: "User profiles" },
                        { scope: "analytics", desc: "Platform stats" },
                      ].map((s) => (
                        <div key={s.scope} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                          <code className="text-[11px] font-mono text-primary font-semibold">{s.scope}</code>
                          <p className="text-[11px] text-zinc-600 mt-0.5">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80 flex items-start gap-2.5">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div>
                    <strong className="text-amber-300">Security note:</strong> Your API key is shown in full only once when created.
                    Store it securely. Never expose it in client-side code, public repos, or browser requests.
                    If compromised, revoke immediately from your dashboard.
                  </div>
                </div>
              </div>
            </section>

            {/* ============ Rate Limiting ============ */}
            <section id="rate-limiting" className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold mb-6">Rate Limiting</h2>
              <div className="space-y-4 text-sm text-zinc-400">
                <p className="leading-relaxed">
                  API requests are rate-limited to ensure fair usage. When you exceed a limit, the API returns
                  <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] mx-1">429 Too Many Requests</code>
                  with a <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">Retry-After</code> header in seconds.
                </p>
                <CodeBlock
                  language="http"
                  code={`HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{ "error": "Too many requests. Please try again later." }`}
                />
              </div>
            </section>

            {/* ============ Error Codes ============ */}
            <section id="errors" className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold mb-6">Error Codes</h2>
              <div className="space-y-4 text-sm text-zinc-400">
                <p className="leading-relaxed">
                  Errors return a JSON body with an <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">error</code> field.
                  Some include a <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">code</code> for programmatic handling.
                </p>
                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs w-20">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-zinc-500 text-xs">Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      {[
                        ["400", "Bad Request", "Invalid parameters or validation failed"],
                        ["401", "Unauthorized", "Missing or invalid API key"],
                        ["403", "Forbidden", "Insufficient permissions, wrong scope, or plan limit reached"],
                        ["404", "Not Found", "Resource doesn't exist or is not accessible"],
                        ["409", "Conflict", "Resource already exists or concurrent modification"],
                        ["429", "Too Many Requests", "Rate limit exceeded — check Retry-After header"],
                        ["500", "Server Error", "Something went wrong on our end"],
                      ].map(([code, title, desc]) => (
                        <tr key={code} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-4 py-2.5">
                            <code className="text-xs font-mono font-bold">{code}</code>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-zinc-200">{title}</span>
                            <span className="text-zinc-500 ml-1.5 text-xs">— {desc}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <CodeBlock
                  language="json"
                  code={`{
  "error": "You've reached your monthly limit of 10 events on the enterprise plan.",
  "code": "PLAN_LIMIT_REACHED"
}`}
                />
              </div>
            </section>

            {/* ============ Pagination ============ */}
            <section id="pagination" className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold mb-6">Pagination</h2>
              <div className="space-y-4 text-sm text-zinc-400">
                <p className="leading-relaxed">
                  All list endpoints return paginated results. Use <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">page</code> and
                  <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] ml-1">pageSize</code> query
                  parameters to navigate through results (max 100 per page).
                </p>
                <CodeBlock
                  language="json"
                  code={`{
  "data": [...],
  "total": 142,
  "page": 2,
  "pageSize": 20,
  "totalPages": 8,
  "hasMore": true
}`}
                />
                <p>
                  Check <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">hasMore</code> to
                  determine if more pages exist. Increment <code className="text-xs font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">page</code> to fetch the next batch.
                </p>
              </div>
            </section>

            <div className="border-t border-white/[0.06]" />

            {/* ============ API Sections ============ */}
            {filteredSections.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}

            {filteredSections.length === 0 && search && (
              <div className="text-center py-20">
                <Search className="h-10 w-10 mx-auto text-zinc-700 mb-4" />
                <p className="text-zinc-500 text-sm">
                  No endpoints match &ldquo;<span className="text-zinc-300">{search}</span>&rdquo;
                </p>
              </div>
            )}

            {/* Footer CTA */}
            <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/5 to-fuchsia-500/5 p-8 text-center">
              <h3 className="font-display text-xl font-bold mb-2">Need help?</h3>
              <p className="text-sm text-zinc-500 mb-5">
                If you have questions about the API or need assistance with your integration, reach out to our team.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/dashboard/settings/api-keys"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm font-medium text-zinc-400 hover:text-white hover:border-white/[0.2] transition-colors"
                >
                  <Key className="h-4 w-4" />
                  API Keys Dashboard
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
