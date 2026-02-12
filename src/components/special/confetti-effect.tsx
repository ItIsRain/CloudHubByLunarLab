"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
  className?: string;
}

const PARTICLE_COUNT = 40;

const COLORS = [
  "hsl(12, 100%, 55%)",   // primary coral
  "hsl(322, 80%, 55%)",   // accent magenta
  "hsl(48, 100%, 55%)",   // gold
  "hsl(200, 80%, 55%)",   // sky blue
  "hsl(150, 70%, 50%)",   // emerald
  "hsl(280, 70%, 60%)",   // purple
];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface Particle {
  id: number;
  color: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  shape: "square" | "circle";
}

export function ConfettiEffect({
  active,
  duration = 3000,
  className,
}: ConfettiEffectProps) {
  const [visible, setVisible] = React.useState(false);
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    if (active) {
      const newParticles: Particle[] = Array.from(
        { length: PARTICLE_COUNT },
        (_, i) => ({
          id: i,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          left: randomBetween(0, 100),
          delay: randomBetween(0, 0.5),
          duration: randomBetween(1.5, 3),
          size: randomBetween(6, 12),
          rotation: randomBetween(0, 360),
          shape: Math.random() > 0.5 ? "square" : "circle",
        })
      );
      setParticles(newParticles);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [active, duration]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-[9999] overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes confetti-sway {
          0%, 100% {
            translateX: 0;
          }
          25% {
            transform: translateX(30px);
          }
          75% {
            transform: translateX(-30px);
          }
        }
      `}</style>

      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-10px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
