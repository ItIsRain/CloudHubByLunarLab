/**
 * Triggers a CSV download by opening the export API endpoint in a new tab.
 *
 * @param hackathonId - UUID of the hackathon
 * @param type - Export type: "applications" | "screening" | "scores" | "registrations" | "winners" | "attendance"
 * @param phaseId - Optional phase UUID (only used when type is "scores")
 */
export function downloadExport(
  hackathonId: string,
  type: string,
  phaseId?: string
) {
  const params = new URLSearchParams({ type });
  if (phaseId) params.set("phaseId", phaseId);
  window.open(`/api/hackathons/${hackathonId}/export?${params}`, "_blank");
}

/**
 * Triggers a PDF competition report download.
 */
export function downloadPdfReport(hackathonId: string) {
  window.open(`/api/hackathons/${hackathonId}/report`, "_blank");
}
