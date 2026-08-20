import assert from "node:assert/strict";
import test from "node:test";

import {
  DAILY_SLOT_COUNT,
  MAX_ADVERTISER_SLOT_RATIO,
  buildDailySlotSchedule,
  currentDailySlot,
  parseDailySlotIndices,
  requiredAtomicSlots,
  type InstitutionalFallback,
} from "../../packages/edge-runtime/src/daily-slot-schedule.ts";
import { createDailyScheduleContentServer } from "../../packages/edge-runtime/src/daily-schedule-content-server.ts";
import { assetDigest, EDGE_CLOUD_CONTRACT_VERSION, type EdgeAsset } from "../../packages/edge-runtime/src/cloud-contracts.ts";
import { PLAYER_HTML } from "../../packages/edge-runtime/src/player-html.ts";

const fallbacks: readonly InstitutionalFallback[] = [
  { actor: "MOSTARDA", contentId: "institutional-mostarda", durationSeconds: 15 },
  { actor: "SPACE_OWNER", contentId: "institutional-space", durationSeconds: 15 },
  { actor: "INFLUENCER", contentId: "institutional-influencer", durationSeconds: 15 },
];

test("keeps native video chrome hidden until playback is actually running", () => {
  assert.match(PLAYER_HTML, /video\.style\.visibility='hidden'/);
  assert.match(PLAYER_HTML, /video\.removeAttribute\('controls'\)/);
  assert.match(PLAYER_HTML, /video\.addEventListener\('playing'/);
  assert.match(PLAYER_HTML, /video::\-webkit-media-controls-overlay-play-button/);
});

test("keeps one Player document across slot boundaries", () => {
  assert.doesNotMatch(PLAYER_HTML, /window\.location\.reload\(\)/);
});

test("builds all 5760 local-time slots and fills empty inventory with equal institutional fallback", () => {
  const schedule = buildDailySlotSchedule({ advertiser: [], fallbacks });
  assert.equal(schedule.slots.length, DAILY_SLOT_COUNT);
  assert.equal(new Set(schedule.slots.map((slot) => slot.slotIndex)).size, DAILY_SLOT_COUNT);
  const counts = new Map(schedule.slots.map((slot) => [slot.content.actor, 0]));
  for (const slot of schedule.slots) counts.set(slot.content.actor, (counts.get(slot.content.actor) ?? 0) + 1);
  assert.deepEqual([...counts.values()], [1920, 1920, 1920]);
});

test("redistributes the remaining slots equally and reaches 10/10/10 at the 70 percent ad ceiling", () => {
  const schedule = buildDailySlotSchedule({
    advertiser: [{ campaignId: "campaign-70", slotId: "ad-70", creativeId: "creative-70", durationSeconds: 4032 * 15 }],
    fallbacks,
  });
  const counts = new Map<string, number>();
  for (const slot of schedule.slots) counts.set(slot.content.actor, (counts.get(slot.content.actor) ?? 0) + 1);
  assert.equal(counts.get("ADVERTISER"), 4032);
  assert.equal(counts.get("MOSTARDA"), 576);
  assert.equal(counts.get("SPACE_OWNER"), 576);
  assert.equal(counts.get("INFLUENCER"), 576);
});

test("rejects a campaign that would consume more than 70 percent of the daily grid", () => {
  assert.throws(() => buildDailySlotSchedule({
    advertiser: [{ campaignId: "campaign-too-large", slotId: "ad-too-large", creativeId: "creative-too-large", durationSeconds: 4033 * 15 }],
    fallbacks,
  }), /ADVERTISER_CAPACITY_EXCEEDED/);
});

test("preserves long-video segments across consecutive slots without restarting the creative", () => {
  const schedule = buildDailySlotSchedule({ advertiser: [{ campaignId: "campaign-long", slotId: "ad-long", creativeId: "creative-long", durationSeconds: 31 }], fallbacks });
  const segments = schedule.slots.slice(0, requiredAtomicSlots(31)).map((slot) => ({ slot: slot.slotIndex, id: slot.content.contentId, offset: slot.content.offsetSeconds }));
  assert.deepEqual(segments, [
    { slot: 0, id: "creative-long", offset: 0 },
    { slot: 1, id: "creative-long", offset: 15 },
    { slot: 2, id: "creative-long", offset: 30 },
  ]);
});

test("places a campaign creative in its selected time-of-day slots", () => {
  const schedule = buildDailySlotSchedule({
    advertiser: [{ campaignId: "campaign-selected", slotId: "ad-selected", creativeId: "creative-selected", durationSeconds: 15, startSlotIndex: 120 }],
    fallbacks,
  });
  assert.notEqual(schedule.slots[119]?.content.actor, "ADVERTISER");
  assert.equal(schedule.slots[120]?.content.creativeId, "creative-selected");
  assert.notEqual(schedule.slots[121]?.content.actor, "ADVERTISER");
});

test("parses multiple configured local-time ad slots deterministically", () => {
  assert.deepEqual(parseDailySlotIndices("5102;5104"), [5102, 5104]);
});

test("selects the slot using the configured local timezone", () => {
  const schedule = buildDailySlotSchedule({ advertiser: [], fallbacks });
  const selected = currentDailySlot(schedule, new Date("2026-08-19T12:34:07.000Z"), "America/Sao_Paulo");
  assert.equal(selected.slotIndex, ((9 * 60 + 34) * 60 + 7) / 15 | 0);
});

test("uses two-way equal fallback when no influencer is configured", () => {
  const schedule = buildDailySlotSchedule({ advertiser: [], fallbacks: fallbacks.slice(0, 2) });
  const counts = new Map<string, number>();
  for (const slot of schedule.slots) counts.set(slot.content.actor, (counts.get(slot.content.actor) ?? 0) + 1);
  assert.equal(counts.get("MOSTARDA"), 2880);
  assert.equal(counts.get("SPACE_OWNER"), 2880);
});

test("serves the content selected by the configured local-time slot", async () => {
  const schedule = buildDailySlotSchedule({
    advertiser: [{ campaignId: "campaign-current", slotId: "ad-current", creativeId: "creative-current", durationSeconds: 15 }],
    fallbacks,
    timezone: "America/Sao_Paulo",
  });
  const content = "<main>Mostarda fallback</main>";
  const asset: EdgeAsset = {
    contractVersion: EDGE_CLOUD_CONTRACT_VERSION,
    assetId: "institutional-mostarda:asset",
    creativeId: "institutional-mostarda",
    mediaType: "text/html",
    content,
    digest: assetDigest("text/html", content),
  };
  let playbackSlot: string | undefined;
  const server = createDailyScheduleContentServer({
    schedule,
    assets: new Map([[asset.assetId, asset]]),
    onPlayback: async (slot) => { playbackSlot = slot.slotId; },
  });
  await new Promise<void>((resolve) => server.listen({ host: "127.0.0.1", port: 0 }, () => resolve()));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("schedule server did not expose a TCP address");
  try {
    const selected = await fetch(`http://127.0.0.1:${address.port}/schedule/current?at=2026-08-19T12:34:07.000Z`);
    assert.equal(selected.status, 200);
    const body = await selected.json() as { slotIndex: number; slotId: string; playbackKey: string; content: { actor: string; contentId: string; slotId: string }; nextSlotInMs: number };
    assert.equal(body.slotIndex, 2296);
    assert.equal(body.content.actor, "MOSTARDA");
    assert.ok(body.nextSlotInMs > 0 && body.nextSlotInMs <= 15_000);
    const served = await fetch(`http://127.0.0.1:${address.port}/assets/${body.content.contentId}:asset`);
    assert.equal(served.status, 200);
    assert.match(await served.text(), /Mostarda fallback/);
    const playback = await fetch(`http://127.0.0.1:${address.port}/playback/${body.content.slotId}?playbackKey=${encodeURIComponent(body.playbackKey)}`, { method: "POST" });
    assert.equal(playback.status, 202);
    assert.equal(playbackSlot, body.content.slotId);
    const replay = await fetch(`http://127.0.0.1:${address.port}/playback/${body.content.slotId}?playbackKey=${encodeURIComponent(body.playbackKey)}`, { method: "POST" });
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).deduplicated, true);
  } finally {
    await server.close();
  }
});
