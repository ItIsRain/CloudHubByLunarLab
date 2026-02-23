"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronDown,
  Bell,
  Plus,
  Calendar,
  Trophy,
  Users,
  Compass,
  LogIn,
  UserPlus,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { useTheme } from "@/providers/theme-provider";

interface NavLink {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string; description: string }[];
  guestOnly?: boolean;
}

const navLinks: NavLink[] = [
  {
    label: "Explore",
    href: "/explore",
    icon: Compass,
    children: [
      { label: "All Events", href: "/explore/events", description: "Browse upcoming events" },
      { label: "Hackathons", href: "/explore/hackathons", description: "Join competitions" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    icon: Calendar,
  },
  {
    label: "Hackathons",
    href: "/hackathons",
    icon: Trophy,
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, hasRole } = useAuthStore();
  const { toggleNotificationPanel, toggleMobileMenu, mobileMenuOpen } = useUIStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering theme toggle after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const canCreate = hasRole("organizer") || hasRole("admin");
  const visibleNavLinks = navLinks.filter(
    (link) => !("guestOnly" in link && link.guestOnly && isAuthenticated)
  );

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
            : "bg-transparent"
        )}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/CloudHubLight.svg"
                alt="CloudHub"
                width={140}
                height={40}
                className="h-9 w-auto dark:hidden"
                priority
              />
              <Image
                src="/CloudHubDark.svg"
                alt="CloudHub"
                width={140}
                height={40}
                className="h-9 w-auto hidden dark:block"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {visibleNavLinks.map((link) => (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive(link.href)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {link.label}
                    {link.children && (
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </Link>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {link.children && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 pt-2"
                      >
                        <div className="w-64 rounded-xl border bg-popover p-2 shadow-lg">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="block rounded-lg p-3 hover:bg-muted transition-colors"
                            >
                              <div className="font-medium text-sm">
                                {child.label}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {child.description}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {mounted ? (
                  resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )
                ) : (
                  <div className="h-4 w-4" />
                )}
              </Button>

              {isAuthenticated && user ? (
                <>
                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={toggleNotificationPanel}
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                  </Button>

                  {/* Create Dropdown — organizers & admins only */}
                  {canCreate && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="hidden sm:flex gap-1.5">
                          <Plus className="h-4 w-4" />
                          Create
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href="/events/create" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Create Event
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/hackathons/create" className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Create Hackathon
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar size="sm">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {user.email}
                          </span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/profile/${user.username}`}>Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/billing">Billing</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-destructive">
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-1.5" />
                      Sign In
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Get Started
                    </Link>
                  </Button>
                </>
              )}

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-16 z-40 bg-background border-b shadow-lg lg:hidden"
          >
            <nav className="p-4 space-y-2">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => toggleMobileMenu()}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {link.icon && <link.icon className="h-5 w-5" />}
                  <span className="font-medium">{link.label}</span>
                </Link>
              ))}

              {!isAuthenticated && (
                <div className="pt-4 border-t space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/login" onClick={() => toggleMobileMenu()}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href="/register" onClick={() => toggleMobileMenu()}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
