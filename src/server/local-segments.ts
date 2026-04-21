import { updateApiState, type LocalSegmentRecord } from "./local-store";
import type { SegmentPreviewCondition } from "./segment-preview";

function hasUnresolvedVariable(value: unknown) {
  return typeof value === "string" && (value.includes("{{") || value.includes("}}"));
}

function generatedSegmentId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `SEG-${slug || "segment"}-${Date.now()}`;
}

export async function saveLocalSegment(input: {
  id?: string;
  name: string;
  description?: string | null;
  logicMode?: "AND" | "OR";
  conditions?: SegmentPreviewCondition[];
  memberIds?: string[];
}) {
  return updateApiState((state) => {
    const normalizedName = input.name.trim().toLowerCase();
    const existingByName = Object.values(state.segments).find(
      (segment) => segment.name.trim().toLowerCase() === normalizedName,
    );
    const id = input.id && !hasUnresolvedVariable(input.id) ? input.id : existingByName?.id || generatedSegmentId(input.name);
    const existing = state.segments[id];
    const now = new Date().toISOString();
    const segment: LocalSegmentRecord = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_system: false,
      created_at: existing?.created_at || now,
      updated_at: now,
      logicMode: input.logicMode,
      conditions: input.conditions,
      memberIds: input.memberIds ?? existing?.memberIds ?? [],
    };
    state.segments[id] = segment;
    return segment;
  });
}

export async function listLocalSegments() {
  return updateApiState((state) =>
    Object.values(state.segments)
      .filter((segment) => !hasUnresolvedVariable(segment.id))
      .sort((left, right) => left.name.localeCompare(right.name)),
  );
}
