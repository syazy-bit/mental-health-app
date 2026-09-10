/**
 * Frontend tool registry for What Helped.
 *
 * Maps the stable backend tool ids (see backend/app/tools.py) to the real
 * production tools on the Tools page (`app/(student)/resources`), so My
 * Story can resolve registry ids to names, descriptions, and deep links
 * without a backend endpoint. Display copy lives here; the backend stores
 * and returns ids only, so copy changes never touch the database.
 *
 * The `need` field matches the Tools page tab that hosts each tool, used
 * for "Try again" deep links (`/resources?tool=<id>`).
 */

import type { HelpfulToolId } from '@/lib/types';

export type ToolNeed = 'calm' | 'ground' | 'focus' | 'explore';

export interface ToolMeta {
  id: HelpfulToolId;
  name: string;
  description: string;
  need: ToolNeed;
}

export const TOOL_REGISTRY: Record<HelpfulToolId, ToolMeta> = {
  box_breathing: {
    id: 'box_breathing',
    name: 'Box Breathing Exercise',
    description: 'Guided pacing · 4-4-4-4 method. A simple rhythmic breathing exercise to slow down.',
    need: 'calm',
  },
  sensory_grounding: {
    id: 'sensory_grounding',
    name: '5-4-3-2-1 Sensory Grounding',
    description: 'Interactive grounding · 5-step scan through the senses.',
    need: 'ground',
  },
  study_reset: {
    id: 'study_reset',
    name: 'Study Pause & Deliberate Rest',
    description: 'Academic pacing · 2-minute reset for focused work.',
    need: 'focus',
  },
  grounding_hunt: {
    id: 'grounding_hunt',
    name: 'Grounding Hunt',
    description: 'Sensory attention · 60–90 second noticing exercise.',
    need: 'explore',
  },
};

export const TOOL_IDS = Object.keys(TOOL_REGISTRY) as HelpfulToolId[];

/** Deep link that opens the Tools page on the tab hosting the tool. */
export function toolHref(toolId: HelpfulToolId): string {
  return `/resources?tool=${encodeURIComponent(toolId)}`;
}

/** Resolve a registry id received from the API; unknown ids yield null. */
export function lookupTool(toolId: string): ToolMeta | null {
  return (TOOL_REGISTRY as Record<string, ToolMeta>)[toolId] ?? null;
}
