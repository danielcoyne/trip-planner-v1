import { addDays, differenceInCalendarDays, isAfter, isBefore, isEqual, startOfDay } from "date-fns";

export type TripSegment = {
  id: string;
  startDate: Date;
  endDate: Date;
  placeName: string;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
  notes?: string | null;
};

export function normalizeDay(d: Date) {
  return startOfDay(d);
}

export function dayIndexFromTripStart(tripStart: Date, day: Date) {
  // 1-based day number
  return differenceInCalendarDays(normalizeDay(day), normalizeDay(tripStart)) + 1;
}

export function isDayInRange(day: Date, start: Date, end: Date) {
  const d = normalizeDay(day);
  const s = normalizeDay(start);
  const e = normalizeDay(end);

  const gteStart = isEqual(d, s) || isAfter(d, s);
  const lteEnd = isEqual(d, e) || isBefore(d, e);
  return gteStart && lteEnd;
}

export function findSegmentForDay(segments: TripSegment[], day: Date) {
  const d = normalizeDay(day);
  return segments.find(seg => isDayInRange(d, seg.startDate, seg.endDate)) ?? null;
}

export function buildSegmentSummary(
  segments: TripSegment[],
  tripStart: Date,
  tripEnd: Date
) {
  // Returns list of { placeName, dayStart, dayEnd } for display like "Rome (Days 1–4)"
  // Clamps segment dates within trip range in case of imperfect data.
  const tripS = normalizeDay(tripStart);
  const tripE = normalizeDay(tripEnd);

  return segments
    .slice()
    .sort((a, b) => +normalizeDay(a.startDate) - +normalizeDay(b.startDate))
    .map(seg => {
      const s = normalizeDay(seg.startDate);
      const e = normalizeDay(seg.endDate);

      const clampedStart = isBefore(s, tripS) ? tripS : s;
      const clampedEnd = isAfter(e, tripE) ? tripE : e;

      const dayStart = dayIndexFromTripStart(tripS, clampedStart);
      const dayEnd = dayIndexFromTripStart(tripS, clampedEnd);

      return {
        id: seg.id,
        placeName: seg.placeName,
        dayStart,
        dayEnd,
      };
    })
    .filter(x => x.dayEnd >= x.dayStart);
}

export function validateNoOverlap(segments: TripSegment[]) {
  // Lightweight overlap check (server-side guard)
  const sorted = segments
    .slice()
    .sort((a, b) => +normalizeDay(a.startDate) - +normalizeDay(b.startDate));

  for (let i = 0; i < sorted.length - 1; i++) {
    const currEnd = normalizeDay(sorted[i].endDate);
    const nextStart = normalizeDay(sorted[i + 1].startDate);

    // overlap if nextStart <= currEnd
    if (isEqual(nextStart, currEnd) || isBefore(nextStart, currEnd)) {
      // NOTE: Adjacent segments sharing a day is an overlap because end is inclusive.
      // If you want to allow "endDate = Jan 4" and next "startDate = Jan 5", that's fine.
      // This condition allows that already (Jan 5 is after Jan 4).
      throw new Error("Trip segments overlap or touch on the same day. Adjust start/end dates.");
    }
  }
}

export function generateTripDays(tripStart: Date, tripEnd: Date) {
  const start = normalizeDay(tripStart);
  const end = normalizeDay(tripEnd);

  const total = differenceInCalendarDays(end, start) + 1;
  return Array.from({ length: total }, (_, i) => addDays(start, i));
}
