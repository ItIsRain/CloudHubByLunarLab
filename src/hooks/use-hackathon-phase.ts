import { useMemo, useState, useEffect } from "react";
import type { Hackathon } from "@/lib/types";
import {
  getCurrentPhase,
  canRegister,
  canSubmit,
  canJudge,
  canViewResults,
  canFormTeams,
  getPhaseMessage,
  type HackathonTimeline,
} from "@/lib/hackathon-phases";

function hackathonToTimeline(h: Hackathon): HackathonTimeline {
  return {
    registrationStart: h.registrationStart,
    registrationEnd: h.registrationEnd,
    hackingStart: h.hackingStart,
    hackingEnd: h.hackingEnd,
    submissionDeadline: h.submissionDeadline,
    judgingStart: h.judgingStart,
    judgingEnd: h.judgingEnd,
    winnersAnnouncement: h.winnersAnnouncement,
    status: h.status,
  };
}

export function useHackathonPhase(hackathon: Hackathon | undefined | null) {
  // Re-evaluate phase every 60 seconds so UI stays fresh across phase transitions
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!hackathon) {
      return {
        phase: null,
        canRegister: false,
        canSubmit: false,
        canJudge: false,
        canViewResults: false,
        canFormTeams: false,
        getMessage: () => "",
      };
    }

    const timeline = hackathonToTimeline(hackathon);
    const now = new Date();

    return {
      phase: getCurrentPhase(timeline, now),
      canRegister: canRegister(timeline, now),
      canSubmit: canSubmit(timeline, now),
      canJudge: canJudge(timeline, now),
      canViewResults: canViewResults(timeline, now),
      canFormTeams: canFormTeams(timeline, now),
      getMessage: (action: "register" | "submit" | "judge" | "viewResults" | "formTeams") =>
        getPhaseMessage(timeline, action, now),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon, tick]);
}
