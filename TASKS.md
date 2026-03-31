# TASKS.md — race-pit

## Phase 1 — planning
- [x] Create project directory
- [x] Write SPEC.md
- [x] Write UX.md
- [x] Write TASKS.md
- [ ] Decide final project name
- [x] Decide scoring/win model

## Phase 2 — prototype architecture
- [x] Define race state model
- [x] Define car/tyre/pace data model
- [x] Define lap simulation tick loop
- [x] Define pit stop timing model
- [x] Define overtake / gap model
- [x] Write architecture docs

## Phase 3 — UI prototype
- [ ] Build top-view track prototype
- [ ] Build live order board
- [ ] Build strategy controls for 2 cars
- [ ] Build result screen

## Phase 4 — QA
- [ ] Validate readability on mobile
- [ ] Validate one race can be understood without tutorial
- [ ] Validate strategy changes affect result
- [ ] Add QA.md

## Open questions
- [ ] 1v1 duel only or solo AI first?
- [ ] weather in MVP or after MVP?
- [ ] one-track prototype first or track generator first?

## Resolved direction
- MVP scoring: points table
  - 1st = 12
  - 2nd = 8
  - 3rd = 5
  - 4th = 3
- MVP prototype: one fictional track first
- MVP race: player 2 cars vs AI 2 cars

## Recommendation
Next build step should be the simulation core before polished visuals.
Do not start with meta progression or unlock systems.
