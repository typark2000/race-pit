export const TICK_MS = 200;

export const TYRE_PRESETS = {
  soft: { grip: 1.0, wearPerLap: 18 },
  medium: { grip: 0.96, wearPerLap: 12 },
  hard: { grip: 0.92, wearPerLap: 8 },
  wet: { grip: 0.85, wearPerLap: 14 }
};

export const PACE_PRESETS = {
  push: { speed: 1.05, wear: 1.25 },
  normal: { speed: 1.0, wear: 1.0 },
  conserve: { speed: 0.96, wear: 0.82 }
};

export const TRACK_ALPHA = {
  id: 'track-alpha',
  name: 'Coastal Ring',
  laps: 8,
  lengthScale: 1,
  pitLossMs: 13500,
  overtakeZones: [0.12, 0.48, 0.76],
  pitWindows: [0.86, 1.0],
  pitExitAt: 0.08
};

export const DEFAULT_GRID = [
  { id: 'green-a', teamColor: 'green', driverName: 'Green A', controller: 'player', slot: 'A', basePace: 1.0, tyreCompound: 'medium' },
  { id: 'orange-a', teamColor: 'orange', driverName: 'Orange A', controller: 'ai', slot: 'A', basePace: 1.0, tyreCompound: 'medium' },
  { id: 'green-b', teamColor: 'green', driverName: 'Green B', controller: 'player', slot: 'B', basePace: 0.99, tyreCompound: 'hard' },
  { id: 'orange-b', teamColor: 'orange', driverName: 'Orange B', controller: 'ai', slot: 'B', basePace: 0.985, tyreCompound: 'hard' }
];

export function createTyreState(compound) {
  const preset = TYRE_PRESETS[compound];
  return { compound, wear: 0, grip: preset.grip };
}

export function createCarState(car, index) {
  return {
    id: car.id,
    teamColor: car.teamColor,
    driverName: car.driverName,
    controller: car.controller,
    slot: car.slot,
    positionIndex: index,
    progress: 0,
    lap: 1,
    gapMs: index * 500,
    tyre: createTyreState(car.tyreCompound),
    paceMode: 'normal',
    nextTyreCompound: car.tyreCompound,
    pitIntent: false,
    pitState: 'none',
    pitRemainingMs: 0,
    basePace: car.basePace,
    dirtyAirPenalty: 0,
    retired: false,
    finishTimeMs: null,
    points: 0,
    lastPitLap: 0,
    latestStrategyNote: ''
  };
}

export function createRaceState({ track = TRACK_ALPHA, grid = DEFAULT_GRID, weather = 'dry' } = {}) {
  return {
    phase: 'racing',
    tick: 0,
    elapsedMs: 0,
    lapCount: track.laps,
    currentWeather: weather,
    track,
    cars: grid.map(createCarState),
    events: [],
    result: null
  };
}

export function getTyreGripFactor(tyre) {
  const wear = tyre.wear;
  if (wear <= 60) return 1;
  if (wear <= 80) return 0.96;
  if (wear <= 92) return 0.9;
  return 0.8;
}

export function getWeatherFactor(compound, weather) {
  if (weather === 'light-rain') {
    if (compound === 'wet') return 1.05;
    if (compound === 'soft') return 0.86;
    return 0.9;
  }
  if (compound === 'wet') return 0.8;
  return 1;
}

export function computeEffectivePace(car, weather) {
  const tyreGripFactor = getTyreGripFactor(car.tyre);
  const paceModeFactor = PACE_PRESETS[car.paceMode].speed;
  const trafficFactor = 1 - car.dirtyAirPenalty;
  const weatherFactor = getWeatherFactor(car.tyre.compound, weather);
  return car.basePace * tyreGripFactor * paceModeFactor * trafficFactor * weatherFactor;
}

export function applyTyreWear(car, weather) {
  const tyrePreset = TYRE_PRESETS[car.tyre.compound];
  const wearFactor = PACE_PRESETS[car.paceMode].wear;
  const weatherMultiplier = weather === 'dry' && car.tyre.compound === 'wet' ? 1.5 : 1;
  const wearDelta = (tyrePreset.wearPerLap / (60_000 / TICK_MS)) * wearFactor * weatherMultiplier;
  const nextWear = Math.min(100, car.tyre.wear + wearDelta);
  return {
    ...car,
    tyre: {
      ...car.tyre,
      wear: nextWear,
      grip: TYRE_PRESETS[car.tyre.compound].grip * getTyreGripFactor({ wear: nextWear })
    }
  };
}

export function applyTraffic(cars) {
  const sorted = [...cars].sort((a, b) => (b.lap + b.progress) - (a.lap + a.progress));
  return sorted.map((car, index) => {
    if (index === 0) return { ...car, dirtyAirPenalty: 0 };
    const ahead = sorted[index - 1];
    const delta = (ahead.lap + ahead.progress) - (car.lap + car.progress);
    return { ...car, dirtyAirPenalty: delta < 0.02 ? 0.06 : 0 };
  });
}

export function chooseRecommendedTyre(car) {
  if (car.tyre.wear > 84) return 'hard';
  if (car.tyre.compound === 'hard') return 'medium';
  return 'hard';
}

export function setNextTyreCompound(state, carId, nextTyreCompound) {
  return {
    ...state,
    cars: state.cars.map((car) => car.id === carId ? { ...car, nextTyreCompound } : car)
  };
}

export function requestPitStop(state, carId) {
  return {
    ...state,
    cars: state.cars.map((car) => car.id === carId ? {
      ...car,
      pitIntent: true,
      latestStrategyNote: `Pit requested for ${car.nextTyreCompound}`
    } : car)
  };
}

export function cancelPitStop(state, carId) {
  return {
    ...state,
    cars: state.cars.map((car) => car.id === carId ? {
      ...car,
      pitIntent: false,
      latestStrategyNote: 'Pit request cleared'
    } : car)
  };
}

export function shouldAiPit(car, state) {
  if (car.controller !== 'ai' || car.pitState !== 'none' || car.finishTimeMs != null) return false;
  if (car.pitIntent) return true;
  const lateRace = car.lap >= state.lapCount - 1;
  if (lateRace) return false;
  if (car.tyre.wear >= 82) return true;
  if (car.tyre.wear >= 68 && car.tyre.compound === 'soft') return true;
  return false;
}

export function chooseAiPace(car, state) {
  if (car.pitState !== 'none') return car.paceMode;
  const finalLap = car.lap >= state.lapCount;
  if (finalLap && car.tyre.wear < 90) return 'push';
  if (car.tyre.wear >= 86) return 'conserve';
  if (car.dirtyAirPenalty > 0 && car.tyre.wear < 72) return 'push';
  return 'normal';
}

export function applyAiStrategy(state) {
  return {
    ...state,
    cars: state.cars.map((car) => {
      if (car.controller !== 'ai') return car;
      const paceMode = chooseAiPace(car, state);
      const pitIntent = shouldAiPit(car, state);
      const nextTyreCompound = pitIntent ? chooseRecommendedTyre(car) : car.nextTyreCompound;
      return {
        ...car,
        paceMode,
        pitIntent,
        nextTyreCompound,
        latestStrategyNote: pitIntent ? `AI boxing for ${nextTyreCompound}` : `AI running ${paceMode}`
      };
    })
  };
}

export function applyPitLogic(state) {
  const sameTeamPitBusy = new Map();
  const cars = state.cars.map((car) => {
    if (car.retired || car.finishTimeMs != null) return car;

    if (car.pitState === 'servicing') {
      const remaining = Math.max(0, car.pitRemainingMs - TICK_MS);
      if (remaining === 0) {
        return {
          ...car,
          pitState: 'none',
          pitRemainingMs: 0,
          tyre: createTyreState(car.nextTyreCompound || car.tyre.compound),
          pitIntent: false,
          progress: state.track.pitExitAt,
          lastPitLap: car.lap,
          latestStrategyNote: `Rejoined on ${car.nextTyreCompound}`
        };
      }
      return { ...car, pitRemainingMs: remaining };
    }

    if (car.pitIntent && car.pitState === 'none' && car.progress >= state.track.pitWindows[0] && car.progress <= state.track.pitWindows[1]) {
      const extraDelay = sameTeamPitBusy.get(car.teamColor) ? 2500 : 0;
      sameTeamPitBusy.set(car.teamColor, true);
      return {
        ...car,
        pitState: 'servicing',
        pitRemainingMs: state.track.pitLossMs + extraDelay,
        latestStrategyNote: extraDelay ? 'Double stack delay' : 'Into the pits'
      };
    }

    return car;
  });

  return { ...state, cars };
}

export function resolveOvertakes(state) {
  let cars = [...state.cars].sort((a, b) => (b.lap + b.progress) - (a.lap + a.progress));
  for (let i = 1; i < cars.length; i += 1) {
    const behind = cars[i];
    const ahead = cars[i - 1];
    const zoneHit = state.track.overtakeZones.some((zone) => behind.progress >= zone && behind.progress < zone + 0.03);
    if (!zoneHit) continue;
    const paceDiff = computeEffectivePace(behind, state.currentWeather) - computeEffectivePace(ahead, state.currentWeather);
    if (paceDiff > 0.035) {
      cars[i - 1] = { ...behind, latestStrategyNote: 'Overtake made' };
      cars[i] = ahead;
    }
  }
  return { ...state, cars };
}

export function updateCarProgress(car, weather, elapsedMs) {
  if (car.retired || car.finishTimeMs != null || car.pitState === 'servicing') return car;
  const effectivePace = computeEffectivePace(car, weather);
  const delta = (effectivePace * TICK_MS) / 60_000;
  let progress = car.progress + delta;
  let lap = car.lap;
  let finishTimeMs = car.finishTimeMs;

  while (progress >= 1) {
    progress -= 1;
    lap += 1;
  }

  if (lap > TRACK_ALPHA.laps && finishTimeMs == null) {
    finishTimeMs = elapsedMs;
  }

  return {
    ...car,
    progress,
    lap,
    finishTimeMs
  };
}

export function computeOrder(cars) {
  return [...cars]
    .sort((a, b) => {
      const aDone = a.finishTimeMs != null;
      const bDone = b.finishTimeMs != null;
      if (aDone && bDone) return a.finishTimeMs - b.finishTimeMs;
      if (aDone) return -1;
      if (bDone) return 1;
      return (b.lap + b.progress) - (a.lap + a.progress);
    })
    .map((car, index) => ({ ...car, positionIndex: index }));
}

export function computeRaceResult(state) {
  const pointsTable = [12, 8, 5, 3];
  const ordered = computeOrder(state.cars);
  const cars = ordered.map((car, index) => ({ ...car, points: pointsTable[index] || 0 }));
  const totals = cars.reduce((acc, car) => {
    acc[car.teamColor] = (acc[car.teamColor] || 0) + car.points;
    return acc;
  }, {});
  const winner = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const winningMove = [...cars]
    .sort((a, b) => b.tyre.wear - a.tyre.wear)
    .map((car) => `${car.driverName}: ${car.latestStrategyNote || 'steady run'}`)[0] || 'No standout move';
  return { winner, totals, order: cars.map((car) => car.id), summary: cars, winningMove };
}

export function advanceRaceTick(state) {
  if (state.phase !== 'racing') return state;

  let next = {
    ...state,
    tick: state.tick + 1,
    elapsedMs: state.elapsedMs + TICK_MS
  };

  next = applyAiStrategy(next);
  next = {
    ...next,
    cars: applyTraffic(next.cars)
      .map((car) => applyTyreWear(car, next.currentWeather))
      .map((car) => updateCarProgress(car, next.currentWeather, next.elapsedMs))
  };
  next = applyPitLogic(next);
  next = resolveOvertakes(next);
  next = { ...next, cars: computeOrder(next.cars) };

  const finishedCars = next.cars.filter((car) => car.finishTimeMs != null);
  if (finishedCars.length === next.cars.length) {
    return {
      ...next,
      phase: 'finished',
      result: computeRaceResult(next)
    };
  }

  return next;
}
