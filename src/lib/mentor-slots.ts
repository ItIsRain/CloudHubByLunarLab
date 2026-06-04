import type { MentorAvailabilityBlock, MentorBookableSlot } from "@/lib/types";

/**
 * Mentor availability slot generation.
 *
 * A mentor's availability is stored as date-based blocks
 * ({date, start_time, end_time, slot_duration_minutes, timezone}). Each block
 * is split into discrete, back-to-back slots of `slot_duration_minutes`. The
 * wall-clock (date + time in the block's timezone) is converted to a UTC
 * instant so slots can be compared against `mentor_sessions.session_date`
 * (stored as `timestamptz`). Shared by the API (validation + open-slot listing)
 * and the client (live preview), so booking and preview never diverge.
 */

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Offset (ms) between the given UTC instant and the same wall-clock reading in
 * `timeZone`: `wallClockAsUTC - instant`. Used to invert a wall-clock time in a
 * named timezone back to the correct UTC instant.
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  // Intl can emit hour "24" at midnight in some engines — normalize to 0.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asUTC - instant.getTime();
}

/**
 * Convert a wall-clock `date` (YYYY-MM-DD) + `time` (HH:mm) in `timeZone` to the
 * corresponding UTC `Date`. Two-pass to stay correct across DST boundaries.
 */
export function zonedWallClockToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi || 0, 0);
  const offset1 = tzOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset1;
  const offset2 = tzOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset1) utc = guess - offset2;
  return new Date(utc);
}

/**
 * Generate every slot for an availability block (ignores existing bookings).
 * A trailing remainder shorter than a full slot is dropped.
 */
export function generateBlockSlots(block: MentorAvailabilityBlock): MentorBookableSlot[] {
  const startMin = timeToMinutes(block.startTime);
  const endMin = timeToMinutes(block.endTime);
  const dur = block.slotDurationMinutes;
  const slots: MentorBookableSlot[] = [];

  for (let s = startMin; s + dur <= endMin; s += dur) {
    const startTime = minutesToTime(s);
    const endTime = minutesToTime(s + dur);
    const startUtc = zonedWallClockToUtc(block.date, startTime, block.timezone);
    const endUtc = zonedWallClockToUtc(block.date, endTime, block.timezone);
    slots.push({
      blockId: block.id,
      date: block.date,
      startTime,
      endTime,
      start: startUtc.toISOString(),
      end: endUtc.toISOString(),
      timezone: block.timezone,
      durationMinutes: dur,
      isBooked: false,
    });
  }

  return slots;
}

/**
 * Generate open slots across many blocks: drops slots already held (by UTC
 * start instant) and slots that start at/before `now`.
 *
 * @param heldStartIsos UTC ISO start instants already held by pending/confirmed sessions.
 */
export function generateOpenSlots(
  blocks: MentorAvailabilityBlock[],
  heldStartIsos: Iterable<string>,
  now: Date
): MentorBookableSlot[] {
  const held = new Set<number>();
  for (const iso of heldStartIsos) held.add(new Date(iso).getTime());

  const open: MentorBookableSlot[] = [];
  for (const block of blocks) {
    for (const slot of generateBlockSlots(block)) {
      const startMs = new Date(slot.start).getTime();
      if (startMs <= now.getTime()) continue;
      if (held.has(startMs)) continue;
      open.push(slot);
    }
  }
  open.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return open;
}

/**
 * Find the slot in a block matching a requested UTC start instant (validates a
 * booking is aligned to a real slot boundary). Returns null if no match.
 */
export function findSlotByStart(
  block: MentorAvailabilityBlock,
  startIso: string
): MentorBookableSlot | null {
  const target = new Date(startIso).getTime();
  if (Number.isNaN(target)) return null;
  for (const slot of generateBlockSlots(block)) {
    if (new Date(slot.start).getTime() === target) return slot;
  }
  return null;
}
