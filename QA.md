# QA.md — race-pit

## Purpose
프로토타입 QA 게이트 기록용 문서.

## QA Run — 2026-03-31 / Pit UX + AI + result feedback
### Scope
- what changed: Split next-tyre selection from pit confirmation, added cancelable pit requests, introduced first-pass AI pace/pit logic, and expanded the result screen with a readable winning-move summary.
- build/validation target: simulation correctness, strategy UX clarity, result readability
- surfaces checked: pit queue flow, AI pit decisions, AI pace updates, result summary generation, tests

### Checks
- [x] next tyre and pit action separated
- [x] pit request can be cancelled
- [x] AI now changes pace / pits by wear conditions
- [x] result screen includes winning move summary
- [x] verify passed

### Commands run
```bash
npm run verify
```

### Result
- status: PASS
- summary: The prototype now feels much closer to a strategy game instead of a passive animation, because pit calls are clearer, AI reacts to tyre wear, and the result screen explains the outcome better.

### Push decision
- allowed to push: yes
- reason: verify passed.
