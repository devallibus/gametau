# A130 Defense Design Brief

This document is the source of truth for the battlestation showcase direction.
It defines the intended feel, interaction language, and constraints so outside
contributors can make consistent decisions without additional context.

## Experience Pillars

1. **Command under pressure** - The player reads an evolving tactical picture
   and commits to fire decisions with incomplete information.
2. **Readable urgency** - The interface should feel tense, but never unreadable.
   Every critical event must surface quickly with clear visual and audio cues.
3. **Small decisions, compounding outcomes** - Frequent micro-decisions
   (target selection, fire timing, prioritization) should shape mission
   score and wave survival.
4. **Arena-first identity** - The defense arena is the primary interaction surface.
   Auxiliary UI exists to support arena decisions, not replace them.

## Mission Loop and UX Lexicon

### Core Loop

1. Track enemies as they approach from the arena edges toward the center.
2. Select a high-priority target.
3. Fire a kinetic shot.
4. Observe outcome (hit, kill, or miss feedback).
5. Repeat as wave difficulty increases.

### Shared Terms

- **Enemy** - A hostile entity approaching the center defense cluster.
- **Enemy type** - Archetype bucket: `RED_CUBE`, `HEAVY_RED_CUBE`, `ALIEN_8_BIT`.
- **Fire shot** - Player-issued kinetic attack against the selected enemy.
- **Wave** - Escalating difficulty tier that increases spawn rate and shifts archetype distribution.
- **Defense integrity** - Aggregate health of the friendly cluster at center.

## Feedback Hierarchy

1. **Visual (primary)** - Enemy meshes, HP bars, selection ring, projectile trails,
   friendly cube cluster fading with integrity loss.
2. **Audio (secondary)** - Short tactical tones for hit, kill confirm, miss,
   and integrity damage.
3. **Comms/Textual (tertiary)** - Compact event feed for operator context and replayability.

The player should be able to play with visuals only, while audio/comms improve
confidence and cadence.

## Anti-Goals

- Turning the experience into a twitch shooter or action game.
- Dense UI clutter that competes with arena readability.
- Story-heavy blocking flows that pause tactical cadence.
- Hidden mechanics that make outcomes feel arbitrary.

## Contributor Constraints

- Prefer explicit state transitions over implicit side effects.
- Keep enemy rules deterministic enough for tests/documentation.
- Add a short "design intent delta" note in issue/PR updates when changing
  player-facing behavior.
- Link implementation work back to this brief and roadmap tracker `#28`.
