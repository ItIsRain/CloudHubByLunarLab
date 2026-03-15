"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCompetitionForm } from "@/hooks/use-competitions";
import CreateCompetitionPage from "../../create/page-client";

export default function EditCompetitionPage() {
  const params = useParams();
  const formId = params.formId as string;
  const { data, isLoading } = useCompetitionForm(formId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl font-bold mb-2">Form not found</p>
          <p className="text-muted-foreground">This competition form doesn&apos;t exist or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  return <CreateCompetitionPage initialData={data.data} mode="edit" />;
}
