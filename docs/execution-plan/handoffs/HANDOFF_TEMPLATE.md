# Handoff — Phase <N>: <phase name>

<!--
Copy this file to HANDOFF_PHASE_<N>.md at the END of the session and fill every section.
If HANDOFF_PHASE_<N>.md already exists (a previous partial/blocked run of the same phase),
do NOT overwrite it: append a new "## Session of <date>" block below the existing content.
Write for a reader with zero context beyond 00_OVERVIEW.md and the phase documents.
-->

- **Phase:** <N> — <phase name>
- **Date:** <YYYY-MM-DD>
- **Outcome:** complete | partial | blocked

## 1. Completed

<!-- What was done, task by task, and the verification results — actual command outcomes
     (suite green? e2e passed? payload size measured?), not intentions. If the outcome is
     partial/blocked, state exactly which tasks are done and which are not. -->

## 2. Notes, observations, implementation details

<!-- Decisions taken within the bounds of the Specifications (and why), deviations from the
     phase document's letter (and why), gotchas discovered (library quirks, emulator
     behaviour, UI-library specifics — Radix primitives, headless-hook behaviours),
     anything that would save the next session time. -->

## 3. Blockers and unresolved issues

<!-- Anything unmet, failing, or deferred; any conflict found between a task and the
     Specifications (per the compliance rule in 00_OVERVIEW.md §5). State what would
     unblock each item and who can do it (agent vs operator). Write "None." if none. -->

## 4. Carry-over for the next phase

<!-- The exact state the next session inherits: branch/commit, commands known to work
     (and any that don't), environment facts (emulator ports, .env keys set, seeded data
     state), and anything the next phase's entry criteria depend on. -->
