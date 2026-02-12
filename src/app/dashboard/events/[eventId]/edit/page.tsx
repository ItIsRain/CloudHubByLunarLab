"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mockEvents } from "@/lib/mock-data";
import { toast } from "sonner";

const eventCategories = [
  "tech",
  "ai-ml",
  "web3",
  "design",
  "business",
  "health",
  "music",
  "social",
  "workshop",
  "conference",
  "meetup",
  "networking",
] as const;

const eventTypes = ["in-person", "online", "hybrid"] as const;

const editEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  type: z.string().min(1, "Please select a type"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
});

type EditEventForm = z.infer<typeof editEventSchema>;

function toDateInputValue(isoStr: string): string {
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const event = mockEvents.find((e) => e.id === eventId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditEventForm>({
    resolver: zodResolver(editEventSchema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description,
          category: event.category,
          type: event.type,
          startDate: toDateInputValue(event.startDate),
          endDate: toDateInputValue(event.endDate),
          location: event.location.city || event.location.address || "",
          capacity: event.capacity || 100,
          price: event.tickets[0]?.price || 0,
        }
      : undefined,
  });

  const onSubmit = async (_data: EditEventForm) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success("Event updated successfully!");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <h2 className="font-display text-2xl font-bold mb-2">
                Event not found
              </h2>
              <p className="text-muted-foreground mb-6">
                The event you are looking for does not exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/dashboard/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Events
                </Link>
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/events/${eventId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Link>
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Edit Event</h1>
            <p className="text-muted-foreground mt-1">
              Update the details of &ldquo;{event.title}&rdquo;
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Event Title
                    </label>
                    <Input
                      {...register("title")}
                      placeholder="Enter event title"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      {...register("description")}
                      rows={6}
                      placeholder="Describe your event..."
                      className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Category & Type row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category
                      </label>
                      <select
                        {...register("category")}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {eventCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.replace("-", " / ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.category.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Event Type
                      </label>
                      <select
                        {...register("type")}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {eventTypes.map((type) => (
                          <option key={type} value={type}>
                            {type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                      {errors.type && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.type.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dates row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Start Date
                      </label>
                      <Input type="date" {...register("startDate")} />
                      {errors.startDate && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.startDate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        End Date
                      </label>
                      <Input type="date" {...register("endDate")} />
                      {errors.endDate && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.endDate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Location
                    </label>
                    <Input
                      {...register("location")}
                      placeholder="City or venue name"
                    />
                  </div>

                  {/* Capacity & Price row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Capacity
                      </label>
                      <Input
                        type="number"
                        {...register("capacity", { valueAsNumber: true })}
                        placeholder="100"
                      />
                      {errors.capacity && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.capacity.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Price (USD)
                      </label>
                      <Input
                        type="number"
                        {...register("price", { valueAsNumber: true })}
                        placeholder="0"
                      />
                      {errors.price && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.price.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4 border-t">
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/dashboard/events/${eventId}`}>Cancel</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
