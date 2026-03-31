# DATA_MODEL.md — race-pit

## Team palette
MVP teams:
- Green
- Orange
- Red
- Navy

## Driver set (placeholder)
- Green A / Green B
- Orange A / Orange B
- Red A / Red B
- Navy A / Navy B

For MVP duel, use:
- player: Green A, Green B
- rival: Orange A, Orange B

## Tyre compounds
```ts
type TyreCompound = 'soft' | 'medium' | 'hard' | 'wet';
```

## Pace modes
```ts
type PaceMode = 'push' | 'normal' | 'conserve';
```

## Compound baselines
Suggested starting values:

```ts
const TYRE_PRESETS = {
  soft:   { grip: 1.00, wearPerLap: 18 },
  medium: { grip: 0.96, wearPerLap: 12 },
  hard:   { grip: 0.92, wearPerLap: 8 },
  wet:    { grip: 0.85, wearPerLap: 14 }
}
```

## Pace mode multipliers
```ts
const PACE_PRESETS = {
  push:     { speed: 1.05, wear: 1.25 },
  normal:   { speed: 1.00, wear: 1.00 },
  conserve: { speed: 0.96, wear: 0.82 }
}
```

## Track seed
One fictional track for MVP:
```ts
const TRACK_ALPHA = {
  id: 'track-alpha',
  name: 'Coastal Ring',
  laps: 8,
  lengthScale: 1,
  pitLossMs: 13500,
  pitEntryAt: 0.88,
  pitExitAt: 0.08,
  overtakeZones: [0.12, 0.48, 0.76]
}
```

## Car baselines
Use slight stat variance only.
```ts
const CAR_PRESETS = {
  greenA:  { basePace: 1.00 },
  greenB:  { basePace: 0.99 },
  orangeA: { basePace: 1.00 },
  orangeB: { basePace: 0.985 }
}
```

## MVP simplification
- no fuel
- no damage
- no safety car
- no tyre temperature
- no DRS/KERS naming
- no licensing-sensitive terminology
