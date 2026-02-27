# Battlestation Radar Design Brief

This document is the source of truth for the battlestation showcase direction.
It defines the intended feel, interaction language, and constraints so outside
contributors can make consistent decisions without additional context.

## Experience Pillars

1. **Command under pressure** - The player reads an evolving tactical picture
   and commits to support decisions with incomplete information.
2. **Readable urgency** - The interface should feel tense, but never unreadable.
   Every critical event must surface quickly with clear visual and audio cues.
3. **Small decisions, compounding outcomes** - Frequent micro-decisions
   (target selection, dispatch timing, prioritization) should shape mission
   score and threat escalation.
4. **Radar-first identity** - The radar is the primary interaction surface.
   Auxiliary UI exists to support radar decisions, not replace them.

## Mission Loop and UX Lexicon

### Core Loop

1. Track contacts as they move through radar space.
2. Select a high-priority target.
3. Dispatch one support action.
4. Observe outcome (mitigated, delayed, or missed threat).
5. Repeat as threat pressure increases.

### Shared Terms

- **Contact** - A detected object represented as a radar blip.
- **Threat class** - Severity bucket: `LOW`, `MED`, `HIGH`, `CRITICAL`.
- **Support dispatch** - Player-issued mitigation action against the selected contact.
- **Escalation** - Automatic threat growth over time when unhandled.
- **Mission integrity** - Aggregate health/safety score of the defended zone.

## Feedback Hierarchy

1. **Visual (primary)** - Radar sweep, blip color/intensity, selected target ring,
   threat badges, and mission integrity meter.
2. **Audio (secondary)** - Short tactical tones for escalation, successful dispatch,
   and integrity damage.
3. **Comms/Textual (tertiary)** - Compact event feed for operator context and replayability.

The player should be able to play with visuals only, while audio/comms improve
confidence and cadence.

## Phase Boundaries

### Phase 1 (`#26`) - Stub Vertical Slice

Must include:

- Radar sweep and contact blips.
- Threat class presentation and basic escalation.
- One dispatch action (`Authorize Support`) against selected contact.
- Keyboard-first controls and minimal atmospheric cues.
- Mission outcome states (success/failure) for the short loop.

May defer:

- Persistent profile/settings.
- Rich comms narrative.
- Multi-input/gamepad polish.
- Advanced visual treatment.

### Phase 2 (`#27`) - Flagship Polish

Must include:

- Full module story integration (`input`, `audio`, `assets`, `fs/path`, `event`, `app`).
- Atmosphere polish (visual hierarchy, audio language, clearer tactical telemetry).
- Persistent profile/settings and mission history.
- Public walkthrough docs mapping features to `webtau` modules.
- README/site positioning as flagship showcase.

## Anti-Goals

- Turning the experience into a twitch shooter or action game.
- Dense UI clutter that competes with radar readability.
- Story-heavy blocking flows that pause tactical cadence.
- Hidden mechanics that make outcomes feel arbitrary.

## Contributor Constraints

- Prefer explicit state transitions over implicit side effects.
- Keep threat rules deterministic enough for tests/documentation.
- Add a short "design intent delta" note in issue/PR updates when changing
  player-facing behavior.
- Link implementation work back to this brief and roadmap tracker `#28`.
