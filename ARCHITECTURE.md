# ARCHITECTURE.md — race-pit

## Goal
MVP에서는 "실시간처럼 보이는 짧은 레이스 전략 시뮬레이션"을 만든다.
핵심은 물리 엔진이 아니라 **읽기 쉬운 전략 결과 생성기**다.

## High-level architecture
Three layers:

1. **Simulation core**
   - race state
   - tick loop
   - tyre wear
   - pace effects
   - pit resolution
   - overtaking / gap resolution

2. **Presentation layer**
   - top-view track scene
   - order board
   - car status cards
   - pit / pace controls

3. **UI state layer**
   - pre-race
   - countdown
   - racing
   - result

## Recommendation
Use a deterministic simulation loop with a fixed tick interval.
- render frequency can be separate from sim frequency
- sim should be stable and easy to test

### Suggested tick
- simulation tick: `200ms`
- visual interpolation can run smoother if needed later

## Core design principle
The player should feel:
- tyre decisions matter
- pace mode matters
- pit timing matters
- traffic matters

But we do **not** need physically accurate driving.
We need consistent, explainable outcomes.

## Race structure
- 4 cars total
  - player: 2
  - rival AI: 2
- 1 fictional track
- 6–10 laps
- one race result at the end

## Entity model
### RaceState
```ts
interface RaceState {
  phase: 'pre-race' | 'countdown' | 'racing' | 'finished';
  tick: number;
  elapsedMs: number;
  lapCount: number;
  currentWeather: 'dry' | 'light-rain';
  track: TrackModel;
  cars: CarState[];
  events: RaceEvent[];
  result?: RaceResult;
}
```

### CarState
```ts
interface CarState {
  id: string;
  teamColor: 'green' | 'orange' | 'red' | 'navy';
  driverName: string;
  controller: 'player' | 'ai';
  slot: 'A' | 'B';
  positionIndex: number;
  progress: number; // 0..1 on current lap
  lap: number;
  gapMs: number;
  tyre: TyreState;
  paceMode: 'push' | 'normal' | 'conserve';
  pitIntent: null | {
    nextTyreCompound: TyreCompound;
    requestTick: number;
  };
  pitState: 'none' | 'entering' | 'servicing' | 'exiting';
  pitRemainingMs: number;
  basePace: number;
  dirtyAirPenalty: number;
  retired: boolean;
}
```

### TyreState
```ts
interface TyreState {
  compound: 'soft' | 'medium' | 'hard' | 'wet';
  wear: number; // 0..100
  grip: number; // derived value
}
```

### TrackModel
```ts
interface TrackModel {
  id: string;
  name: string;
  laps: number;
  lengthScale: number;
  pitLossMs: number;
  overtakeZones: number[]; // normalized checkpoints
  pitEntryAt: number;
  pitExitAt: number;
}
```

## Simulation rules
### 1. Pace calculation
Each tick, compute effective pace from:
- basePace
- tyre grip
- pace mode multiplier
- dirty air / traffic penalty
- weather mismatch penalty

Suggested formula:
```ts
effectivePace =
  basePace
  * tyreGripFactor
  * paceModeFactor
  * trafficFactor
  * weatherFactor
```

### 2. Tyre wear
Tyre wear increases each tick.
Wear rate depends on:
- compound
- pace mode
- weather

Suggested baseline:
- soft: fast wear
- medium: mid wear
- hard: slow wear
- wet on dry: very fast wear

### 3. Tyre cliff
At high wear, grip drops non-linearly.
Suggested breakpoints:
- 0–60: stable
- 60–80: mild drop
- 80–92: stronger drop
- 92+: cliff

### 4. Traffic model
If a car is within a small progress delta behind another car:
- apply traffic penalty
- chance to overtake only in overtake zones
- push mode slightly improves pass chance

### 5. Overtake model
Not continuous physics.
Use checkpoints/zones.
At an overtake zone:
- compare effective pace
- compare tyre advantage
- compare pace mode
- resolve pass probability

### 6. Pit stop model
Pit command does not teleport instantly.
Flow:
- user sets next tyre + pit now
- on next pit entry point, car enters pit
- car unavailable for overtake order while servicing
- rejoin with pit loss applied

### 7. Double stack penalty
If both same-team cars enter pit too close together:
- second car waits
- extra pit delay applies

## Rival AI
MVP AI should be readable, not smart-genius.

### AI heuristics
- pit when wear above threshold
- prefer one-stop strategy on medium/hard
- use push when close to overtake zone or final lap
- use conserve when tyre cliff risk high

## Win model recommendation
For MVP:
- simplest: finishing order ranks 1–4
- player wins if best player car finishes ahead of best rival car **and** average finish is better

Alternative:
- classic points table (12/8/5/3)

### Recommendation
Use **points table**.
Reason: easy to read, good for two-car team fantasy.
Suggested points:
- 1st: 12
- 2nd: 8
- 3rd: 5
- 4th: 3

## UI data the simulation must expose
- live rank
- gaps
- tyre wear
- tyre compound
- pace mode
- pit status
- lap progress
- pit recommendation signal (derived UI hint)

## MVP implementation order
1. static track + fake car positions
2. simulation loop with progress and order
3. tyre wear + pace modes
4. pit stop flow
5. AI strategy
6. result scoring
7. tuning pass

## Testability
The simulation core should be pure/data-driven.
Prefer functions like:
- `createRaceState()`
- `advanceRaceTick(state, commands)`
- `resolveOvertakes(cars, track)`
- `applyPitLogic(cars, track)`
- `computeRaceResult(state)`

This will let us unit-test the race without rendering.
