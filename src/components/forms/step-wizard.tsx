"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onNext?: () => boolean | Promise<boolean>;
  onBack?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}

export function StepWizard({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onBack,
  onSubmit,
  isSubmitting = false,
  children,
  submitLabel = "Publish",
  className,
}: StepWizardProps) {
  const [direction, setDirection] = useState(0);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = useCallback(async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (!canProceed) return;
    }
    if (!isLastStep) {
      setDirection(1);
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLastStep, onNext, onStepChange]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1);
      onBack?.();
      onStepChange(currentStep - 1);
    }
  }, [currentStep, isFirstStep, onBack, onStepChange]);

  const handleStepClick = useCallback(
    (index: number) => {
      if (index < currentStep) {
        setDirection(-1);
        onStepChange(index);
      }
    },
    [currentStep, onStepChange]
  );

  return (
    <div className={cn("space-y-8", className)}>
      {/* Progress bar */}
      <div className="relative">
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <nav className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index < currentStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(index)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-3 group",
                isClickable && "cursor-pointer",
                !isClickable && !isCurrent && "cursor-default opacity-50"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-primary/10 text-primary scale-110",
                  !isCompleted &&
                    !isCurrent &&
                    "border-border bg-background text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon || index + 1
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden lg:block h-px w-8 xl:w-12",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Step content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction >= 0 ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction >= 0 ? -30 : 30 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>

        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            loading={isSubmitting}
            className="gap-2"
          >
            {submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
