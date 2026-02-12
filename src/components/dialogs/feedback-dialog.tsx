"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onSubmit: (rating: number, comment: string) => void;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  itemTitle,
  onSubmit,
}: FeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
  const displayRating = hoveredRating || rating;

  const isValid = rating > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    onSubmit(rating, comment);
    setIsSubmitting(false);
    toast.success("Thank you for your feedback!", {
      description: `You rated "${itemTitle}" ${rating}/5 stars.`,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Leave Feedback
          </DialogTitle>
          <DialogDescription>
            How was your experience with {itemTitle}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Star rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform duration-150 hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 transition-colors duration-150",
                        star <= displayRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
              {displayRating > 0 && (
                <span className="text-sm font-medium text-muted-foreground">
                  {ratingLabels[displayRating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comment <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Share your thoughts..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>

          {/* Submit button */}
          <Button
            className="w-full"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
