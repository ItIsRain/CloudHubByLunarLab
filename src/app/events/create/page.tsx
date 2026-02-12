"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Ticket,
  Users,
  Eye,
  Plus,
  Trash2,
  DollarSign,
  HelpCircle,
} from "lucide-react";
import { useEventFormStore } from "@/store/event-form-store";
import { StepWizard, type WizardStep } from "@/components/forms/step-wizard";
import { ImageUpload } from "@/components/forms/image-upload";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { TagSelector } from "@/components/forms/tag-selector";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { LocationPicker } from "@/components/forms/location-picker";
import { AddSpeakerDialog } from "@/components/dialogs/add-speaker-dialog";
import { AddSessionDialog } from "@/components/dialogs/add-session-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, generateId, formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { categories } from "@/lib/mock-data";
import type { EventType } from "@/lib/types";

const wizardSteps: WizardStep[] = [
  { id: "basics", title: "Basics", icon: <FileText className="h-4 w-4" /> },
  { id: "datetime", title: "Date & Location", icon: <Calendar className="h-4 w-4" /> },
  { id: "tickets", title: "Tickets", icon: <Ticket className="h-4 w-4" /> },
  { id: "additional", title: "Additional", icon: <Users className="h-4 w-4" /> },
  { id: "review", title: "Review", icon: <Eye className="h-4 w-4" /> },
];

export default function CreateEventPage() {
  const router = useRouter();
  const store = useEventFormStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpeakerDialog, setShowSpeakerDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  // Ticket form state
  const [ticketName, setTicketName] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [ticketQty, setTicketQty] = useState("");

  // FAQ form state
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");

  const handleNext = (): boolean => {
    if (store.currentStep === 0) {
      if (!store.title.trim()) {
        toast.error("Event title is required");
        return false;
      }
      if (!store.category) {
        toast.error("Please select a category");
        return false;
      }
    }
    if (store.currentStep === 1) {
      if (!store.startDate) {
        toast.error("Start date is required");
        return false;
      }
    }
    return true;
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Event published successfully!");
    store.resetForm();
    setIsSubmitting(false);
    router.push("/explore");
  };

  const addTicket = () => {
    if (!ticketName.trim()) return;
    store.addTicket({
      id: generateId(),
      name: ticketName,
      price: Number(ticketPrice) || 0,
      currency: "USD",
      quantity: Number(ticketQty) || 100,
      sold: 0,
      maxPerOrder: 5,
    });
    setTicketName("");
    setTicketPrice("");
    setTicketQty("");
  };

  const addFaq = () => {
    if (!faqQ.trim() || !faqA.trim()) return;
    store.addFaq({ question: faqQ, answer: faqA });
    setFaqQ("");
    setFaqA("");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">
            Create Event
          </h1>
          <p className="text-muted-foreground mb-8">
            Fill in the details to create your event. You can save and come back later.
          </p>

          <StepWizard
            steps={wizardSteps}
            currentStep={store.currentStep}
            onStepChange={store.setStep}
            onNext={handleNext}
            onSubmit={handlePublish}
            isSubmitting={isSubmitting}
            submitLabel="Publish Event"
          >
            {/* Step 1: Basics */}
            {store.currentStep === 0 && (
              <div className="space-y-6">
                <ImageUpload
                  value={store.coverImage}
                  onChange={(url) => store.updateField("coverImage", url)}
                  label="Cover Image"
                  aspectRatio="video"
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Title *</label>
                  <Input
                    value={store.title}
                    onChange={(e) => store.updateField("title", e.target.value)}
                    placeholder="e.g. AI Summit 2024"
                    className="text-lg font-display"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    value={store.tagline}
                    onChange={(e) => store.updateField("tagline", e.target.value)}
                    placeholder="A catchy one-liner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() =>
                          store.updateField("category", cat.value as EventFormStore["category"])
                        }
                        className={cn(
                          "rounded-xl border-2 p-3 text-center text-sm font-medium transition-all",
                          store.category === cat.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <RichTextEditor
                    value={store.description}
                    onChange={(val) => store.updateField("description", val)}
                    placeholder="Tell attendees about your event..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <TagSelector
                    value={store.tags}
                    onChange={(tags) => store.updateField("tags", tags)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Date & Location */}
            {store.currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date & Time *</label>
                    <DateTimePicker
                      value={store.startDate}
                      onChange={(val) => store.updateField("startDate", val)}
                      showTimezone
                      timezone={store.timezone}
                      onTimezoneChange={(tz) => store.updateField("timezone", tz)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date & Time</label>
                    <DateTimePicker
                      value={store.endDate}
                      onChange={(val) => store.updateField("endDate", val)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <LocationPicker
                    value={{
                      type: store.locationType,
                      address: store.address,
                      city: store.city,
                      country: store.country,
                      platform: store.platform,
                      meetingUrl: store.meetingUrl,
                    }}
                    onChange={(data) => {
                      store.updateField("locationType", data.type as EventType);
                      store.updateField("address", data.address || "");
                      store.updateField("city", data.city || "");
                      store.updateField("country", data.country || "");
                      store.updateField("platform", data.platform || "");
                      store.updateField("meetingUrl", data.meetingUrl || "");
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Tickets */}
            {store.currentStep === 2 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-border p-4 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Ticket Type
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="Ticket name"
                    />
                    <Input
                      type="number"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value)}
                      placeholder="Price (0 = free)"
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                    <Input
                      type="number"
                      value={ticketQty}
                      onChange={(e) => setTicketQty(e.target.value)}
                      placeholder="Quantity"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={addTicket} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Ticket
                  </Button>
                </div>

                {store.tickets.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-border">
                    <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">No tickets yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add at least one ticket type
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {store.tickets.map((ticket) => (
                      <Card key={ticket.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-semibold">{ticket.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.price === 0
                                ? "Free"
                                : formatCurrency(ticket.price, ticket.currency)}{" "}
                              &middot; {ticket.quantity} available
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => store.removeTicket(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Additional */}
            {store.currentStep === 3 && (
              <div className="space-y-8">
                {/* Speakers */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Speakers</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSpeakerDialog(true)}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Speaker
                    </Button>
                  </div>
                  {store.speakers.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-border">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No speakers added yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {store.speakers.map((speaker) => (
                        <Card key={speaker.id}>
                          <CardContent className="flex items-center gap-3 p-4">
                            <Avatar>
                              <AvatarImage src={speaker.avatar} />
                              <AvatarFallback>{getInitials(speaker.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{speaker.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {speaker.title}{speaker.company ? ` @ ${speaker.company}` : ""}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => store.removeSpeaker(speaker.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agenda */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">Agenda</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSessionDialog(true)}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Session
                    </Button>
                  </div>
                  {store.agenda.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border border-dashed border-border">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No sessions added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {store.agenda.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="flex items-center justify-between p-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{session.title}</p>
                                <Badge variant="muted" className="text-xs">{session.type}</Badge>
                              </div>
                              {session.room && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Room: {session.room}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => store.removeSession(session.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* FAQ */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    FAQ
                  </h3>
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <Input
                      value={faqQ}
                      onChange={(e) => setFaqQ(e.target.value)}
                      placeholder="Question"
                    />
                    <Input
                      value={faqA}
                      onChange={(e) => setFaqA(e.target.value)}
                      placeholder="Answer"
                    />
                    <Button type="button" size="sm" onClick={addFaq} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add FAQ
                    </Button>
                  </div>
                  {store.faq.map((item, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-start justify-between p-4">
                        <div>
                          <p className="font-medium">{item.question}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{item.answer}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => store.removeFaq(i)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {store.currentStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {store.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.coverImage}
                        alt="Cover"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Title</p>
                        <p className="font-semibold">{store.title || "Untitled"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Category</p>
                        <p className="font-semibold capitalize">{store.category || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</p>
                        <p className="font-semibold">
                          {store.startDate ? formatDate(store.startDate) : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                        <p className="font-semibold capitalize">{store.locationType}</p>
                      </div>
                    </div>

                    {store.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {store.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{store.tickets.length}</p>
                        <p className="text-xs text-muted-foreground">Ticket Types</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{store.speakers.length}</p>
                        <p className="text-xs text-muted-foreground">Speakers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{store.agenda.length}</p>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </StepWizard>
        </motion.div>
      </div>

      <AddSpeakerDialog
        open={showSpeakerDialog}
        onOpenChange={setShowSpeakerDialog}
        onAdd={store.addSpeaker}
      />
      <AddSessionDialog
        open={showSessionDialog}
        onOpenChange={setShowSessionDialog}
        onAdd={store.addSession}
        speakers={store.speakers}
      />
    </div>
  );
}

type EventFormStore = ReturnType<typeof useEventFormStore.getState>;
