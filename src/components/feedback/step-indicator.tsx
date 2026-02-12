"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: "horizontal" | "vertical";
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  variant = "horizontal",
  className,
}: StepIndicatorProps) {
  if (variant === "vertical") {
    return (
      <div className={cn("flex flex-col", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex gap-4">
              {/* Circle + Line column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-background text-primary ring-4 ring-primary/20 animate-pulse",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[2rem] my-1 transition-colors duration-300",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>

              {/* Text column */}
              <div className="pb-8">
                <p
                  className={cn(
                    "font-semibold text-sm leading-9",
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div
            key={index}
            className={cn(
              "flex items-center",
              index < steps.length - 1 && "flex-1"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-background text-primary ring-4 ring-primary/20 animate-pulse",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[100px]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-3 mt-[-1.5rem] transition-colors duration-300",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
