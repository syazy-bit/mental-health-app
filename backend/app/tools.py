"""Stable server-side registry of markable wellbeing tools.

These IDs are the database identity for What Helped marks. They correspond
1:1 to the real interactive tools in ``frontend/src/app/(student)/resources``:

- ``box_breathing``    — Box Breathing Exercise (4-4-4-4, calm tab)
- ``sensory_grounding``— 5-4-3-2-1 Sensory Grounding (ground tab)
- ``study_reset``      — Study Pause & Deliberate Rest (focus tab)
- ``grounding_hunt``   — Grounding Hunt (explore tab)

Rules (do not relax without a product decision):
- IDs are stable, deterministic, lowercase snake_case, never user-generated.
- Once production data exists, an ID must never be renamed or reused for a
  different tool. Retiring a tool means removing it from this set in code
  (rows referencing retired IDs remain valid history and keep rendering
  only if the frontend still knows the ID).
- Display names and descriptions live in the frontend; the backend stores
  and returns IDs only, so copy changes never touch the database.
- Helpline cards and counseling CTAs on the Tools page are support
  pathways, not tools, and are intentionally NOT markable.
"""

TOOL_IDS: frozenset[str] = frozenset(
    {
        "box_breathing",
        "sensory_grounding",
        "study_reset",
        "grounding_hunt",
    }
)


def is_known_tool(tool_id: str) -> bool:
    """True if ``tool_id`` is a currently markable tool."""
    return tool_id in TOOL_IDS
