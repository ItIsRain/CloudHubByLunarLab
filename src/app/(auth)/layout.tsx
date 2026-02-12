"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex relative bg-secondary overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-secondary to-fuchsia-600/20" />
          <div className="absolute inset-0 grid-bg opacity-20" />
          <motion.div
            className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/40 to-rose-500/30 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-fuchsia-500/35 to-violet-600/25 blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <span className="font-display font-bold text-xl">C</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-2xl font-bold leading-tight">CloudHub</span>
              <span className="text-xs text-white/60">by Lunar Labs</span>
            </div>
          </Link>

          {/* Main Content */}
          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="font-display text-4xl font-bold mb-4">
                Where Ideas Compete & Communities Thrive
              </h1>
              <p className="text-white/70 text-lg">
                Join thousands of event organizers and hackathon participants
                building the future together.
              </p>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex gap-12"
          >
            <div>
              <div className="font-display text-3xl font-bold">10K+</div>
              <div className="text-white/60 text-sm">Events Hosted</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">500K+</div>
              <div className="text-white/60 text-sm">Attendees</div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">2.5K+</div>
              <div className="text-white/60 text-sm">Hackathons</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-white font-display font-bold text-lg">C</span>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-display text-xl font-bold leading-tight">CloudHub</span>
                <span className="text-xs text-muted-foreground">by Lunar Labs</span>
              </div>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
