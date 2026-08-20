import { requiredAtomicSlots as requiredSlots } from "./slot-allocation.ts";
import type { EdgeMediaType } from "./cloud-contracts.ts";

export const DAILY_SLOT_SECONDS = 15 as const;
export const DAILY_SLOT_COUNT = 24 * 60 * 60 / DAILY_SLOT_SECONDS;
export const MAX_ADVERTISER_SLOT_RATIO = 0.7 as const;
// Keep the 70% ceiling exact instead of relying on binary floating-point 0.7.
export const MAX_ADVERTISER_SLOT_COUNT = DAILY_SLOT_COUNT * 7 / 10;

/** Parses lab-only selected slot indices without guessing invalid values. */
export function parseDailySlotIndices(raw: string | undefined): readonly number[] {
  if (raw === undefined || raw.trim() === "") return [];
  const values = raw.split(/[;,]/).map((value) => Number(value.trim()));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value >= DAILY_SLOT_COUNT)) {
    throw new Error(`E2E_AD_START_SLOT_INVALID:${raw}`);
  }
  if (new Set(values).size !== values.length) throw new Error(`E2E_AD_START_SLOT_DUPLICATE:${raw}`);
  return values;
}

export type ScheduleActor = "ADVERTISER" | "MOSTARDA" | "SPACE_OWNER" | "INFLUENCER";

export interface AdvertiserScheduleInput {
  readonly campaignId: string;
  /** Commercial slot identity chosen by the campaign. */
  readonly slotId: string;
  readonly creativeId: string;
  readonly durationSeconds: number;
  /** Optional physical slot identities reserved for consecutive segments. */
  readonly segmentSlotIds?: readonly string[];
  /** Optional slot-of-day chosen by the campaign; omitted values use first-fit allocation. */
  readonly startSlotIndex?: number;
  readonly mediaType?: EdgeMediaType;
  readonly assetId?: string;
}

export interface InstitutionalFallback {
  readonly actor: Exclude<ScheduleActor, "ADVERTISER">;
  readonly contentId: string;
  readonly durationSeconds: number;
  readonly mediaType?: EdgeMediaType;
  readonly assetId?: string;
}

export interface DailySlotContent {
  readonly actor: ScheduleActor;
  readonly contentId: string;
  readonly campaignId?: string;
  readonly slotId: string;
  readonly creativeId?: string;
  readonly offsetSeconds: number;
  readonly durationSeconds: number;
  readonly segmentDurationSeconds: number;
  readonly mediaType: EdgeMediaType;
  readonly assetId: string;
}

export interface DailySlot {
  readonly slotIndex: number;
  readonly slotId: string;
  readonly startsAtSeconds: number;
  readonly content: DailySlotContent;
}

export interface DailySlotSchedule {
  readonly slots: readonly DailySlot[];
  readonly advertiserSlotCount: number;
  readonly institutionalSlotCount: number;
  readonly timezone: string;
}

export function requiredAtomicSlots(durationSeconds: number): number {
  return requiredSlots(durationSeconds);
}

export function buildDailySlotSchedule(input: {
  readonly advertiser: readonly AdvertiserScheduleInput[];
  readonly fallbacks: readonly InstitutionalFallback[];
  readonly timezone?: string;
}): DailySlotSchedule {
  const timezone = input.timezone ?? "local";
  const slots: Array<DailySlot | undefined> = Array.from({ length: DAILY_SLOT_COUNT });
  const identities = new Set<string>();
  let advertiserSlotCount = 0;
  let firstFitCursor = 0;
  for (const item of input.advertiser) {
    requireIdentity(item.campaignId, "campaignId");
    requireIdentity(item.slotId, "slotId");
    requireIdentity(item.creativeId, "creativeId");
    if (identities.has(item.slotId)) throw new Error(`DUPLICATE_ADVERTISER_SLOT:${item.slotId}`);
    identities.add(item.slotId);
    const count = requiredSlots(item.durationSeconds);
    if (item.segmentSlotIds !== undefined && item.segmentSlotIds.length !== count) throw new Error("segment slot count does not match creative duration");
    if (advertiserSlotCount + count > MAX_ADVERTISER_SLOT_COUNT) throw new Error("ADVERTISER_CAPACITY_EXCEEDED");
    const startSlotIndex = item.startSlotIndex ?? findFirstFit(slots, firstFitCursor, count);
    if (!Number.isInteger(startSlotIndex) || startSlotIndex < 0 || startSlotIndex + count > DAILY_SLOT_COUNT) throw new Error("ADVERTISER_SLOT_INDEX_INVALID");
    if (Array.from({ length: count }, (_, offset) => slots[startSlotIndex + offset]).some((slot) => slot !== undefined)) throw new Error("ADVERTISER_SLOT_POSITION_CONFLICT");
    for (let offset = 0; offset < count; offset += 1) {
      const slotIndex = startSlotIndex + offset;
      const slotId = item.segmentSlotIds?.[offset] ?? (count === 1 ? item.slotId : `${item.slotId}#${offset + 1}`);
      slots[slotIndex] = {
        slotIndex,
        slotId,
        startsAtSeconds: slotIndex * DAILY_SLOT_SECONDS,
        content: {
          actor: "ADVERTISER",
          contentId: item.creativeId,
          campaignId: item.campaignId,
          slotId,
          creativeId: item.creativeId,
          offsetSeconds: offset * DAILY_SLOT_SECONDS,
          durationSeconds: item.durationSeconds,
          segmentDurationSeconds: Math.min(DAILY_SLOT_SECONDS, item.durationSeconds - offset * DAILY_SLOT_SECONDS),
          mediaType: item.mediaType ?? "video/mp4",
          assetId: item.assetId ?? `${item.creativeId}:asset`,
        },
      };
    }
    advertiserSlotCount += count;
    firstFitCursor = startSlotIndex + count;
  }

  const fallbacks = normalizeFallbacks(input.fallbacks);
  let fallbackIndex = 0;
  for (let slotIndex = 0; slotIndex < DAILY_SLOT_COUNT; slotIndex += 1) {
    if (slots[slotIndex] !== undefined) continue;
    const fallback = fallbacks[fallbackIndex % fallbacks.length]!;
    fallbackIndex += 1;
    slots[slotIndex] = {
      slotIndex,
      slotId: `fallback-${fallback.actor.toLowerCase()}-${String(slotIndex).padStart(4, "0")}`,
      startsAtSeconds: slotIndex * DAILY_SLOT_SECONDS,
      content: {
        actor: fallback.actor,
        contentId: fallback.contentId,
        slotId: `fallback-${fallback.actor.toLowerCase()}-${String(slotIndex).padStart(4, "0")}`,
        offsetSeconds: 0,
        durationSeconds: fallback.durationSeconds,
        segmentDurationSeconds: Math.min(DAILY_SLOT_SECONDS, fallback.durationSeconds),
        mediaType: fallback.mediaType ?? "text/html",
        assetId: fallback.assetId ?? `${fallback.contentId}:asset`,
      },
    };
  }
  return {
    slots: slots as DailySlot[],
    advertiserSlotCount,
    institutionalSlotCount: DAILY_SLOT_COUNT - advertiserSlotCount,
    timezone,
  };
}

export function currentDailySlot(schedule: DailySlotSchedule, now: Date = new Date(), timezone = schedule.timezone === "local" ? undefined : schedule.timezone): DailySlot {
  if (Number.isNaN(now.getTime())) throw new Error("current time is invalid");
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timezone === undefined ? {} : { timeZone: timezone }),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const slotIndex = Math.min(DAILY_SLOT_COUNT - 1, Math.floor((value("hour") * 3600 + value("minute") * 60 + value("second")) / DAILY_SLOT_SECONDS));
  return schedule.slots[slotIndex]!;
}

function normalizeFallbacks(fallbacks: readonly InstitutionalFallback[]): readonly InstitutionalFallback[] {
  if (fallbacks.length === 0) throw new Error("FALLBACK_CONTENT_REQUIRED");
  const actors = new Set<string>();
  for (const fallback of fallbacks) {
    requireIdentity(fallback.contentId, "fallback contentId");
    if (!Number.isFinite(fallback.durationSeconds) || fallback.durationSeconds <= 0) throw new Error("fallback duration must be positive");
    if (actors.has(fallback.actor)) throw new Error(`DUPLICATE_FALLBACK_ACTOR:${fallback.actor}`);
    actors.add(fallback.actor);
  }
  return fallbacks;
}

function requireIdentity(value: string, name: string): void {
  if (value.trim().length === 0) throw new Error(`${name} is required`);
}

function findFirstFit(slots: readonly (DailySlot | undefined)[], from: number, count: number): number {
  for (let start = from; start + count <= DAILY_SLOT_COUNT; start += 1) {
    if (Array.from({ length: count }, (_, offset) => slots[start + offset]).every((slot) => slot === undefined)) return start;
  }
  throw new Error("ADVERTISER_SLOT_CAPACITY_EXCEEDED");
}
