export const ATOMIC_SLOT_SECONDS = 15 as const;
export interface SlotAllocationItem { readonly creativeId: string; readonly durationSeconds: number; readonly requiredSlots: number; readonly slotIds: readonly string[]; }
export function requiredAtomicSlots(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("duration must be a finite positive number");
  return Math.ceil(durationSeconds / ATOMIC_SLOT_SECONDS);
}
export function allocateAtomicSlots(input: { readonly availableSlotIds: readonly string[]; readonly items: readonly { readonly creativeId: string; readonly durationSeconds: number }[] }): { readonly items: readonly SlotAllocationItem[]; readonly totalRequiredSlots: number; readonly remainingSlotIds: readonly string[] } {
  const available = [...input.availableSlotIds];
  if (new Set(available).size !== available.length || available.some((id) => id.trim().length === 0)) throw new Error("available slot identities must be unique and non-empty");
  const planned = input.items.map((item) => ({ ...item, requiredSlots: requiredAtomicSlots(item.durationSeconds) }));
  const totalRequiredSlots = planned.reduce((sum, item) => sum + item.requiredSlots, 0);
  if (totalRequiredSlots > available.length) throw new Error("INSUFFICIENT_SLOT_CAPACITY");
  let offset = 0;
  const items = planned.map((item) => { const slotIds = available.slice(offset, offset + item.requiredSlots); offset += item.requiredSlots; return { ...item, slotIds }; });
  return { items, totalRequiredSlots, remainingSlotIds: available.slice(offset) };
}
