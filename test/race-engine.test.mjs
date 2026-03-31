import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TICK_MS,
  TYRE_PRESETS,
  PACE_PRESETS,
  TRACK_ALPHA,
  DEFAULT_GRID,
  createTyreState,
  createCarState,
  createRaceState,
  getTyreGripFactor,
  getWeatherFactor,
  computeEffectivePace,
  applyTyreWear,
  applyTraffic,
  requestPitStop,
  applyPitLogic,
  resolveOvertakes,
  computeOrder,
  computeRaceResult,
  advanceRaceTick
} from '../race-engine.js';

test('createRaceState builds a racing state with four cars', () => {
  const state = createRaceState();
  assert.equal(state.phase, 'racing');
  assert.equal(state.cars.length, 4);
  assert.equal(state.track.id, TRACK_ALPHA.id);
});

test('tyre grip falls after wear thresholds', () => {
  assert.equal(getTyreGripFactor({ wear: 30 }), 1);
  assert.equal(getTyreGripFactor({ wear: 70 }), 0.96);
  assert.equal(getTyreGripFactor({ wear: 85 }), 0.9);
  assert.equal(getTyreGripFactor({ wear: 95 }), 0.8);
});

test('weather factor penalizes wet on dry and helps wet in rain', () => {
  assert.equal(getWeatherFactor('wet', 'dry'), 0.8);
  assert.equal(getWeatherFactor('wet', 'light-rain'), 1.05);
  assert.equal(getWeatherFactor('soft', 'light-rain'), 0.86);
});

test('applyTyreWear increases wear', () => {
  const car = createCarState(DEFAULT_GRID[0], 0);
  const next = applyTyreWear(car, 'dry');
  assert.ok(next.tyre.wear > car.tyre.wear);
});

test('applyTraffic adds dirty air penalty to close follower', () => {
  const cars = [
    { ...createCarState(DEFAULT_GRID[0], 0), lap: 1, progress: 0.5 },
    { ...createCarState(DEFAULT_GRID[1], 1), lap: 1, progress: 0.49 }
  ];
  const result = applyTraffic(cars);
  assert.equal(result[1].dirtyAirPenalty > 0, true);
});

test('requestPitStop sets pit intent', () => {
  const state = createRaceState();
  const next = requestPitStop(state, 'green-a', 'soft');
  assert.equal(next.cars.find((car) => car.id === 'green-a').pitIntent.nextTyreCompound, 'soft');
});

test('applyPitLogic moves car into servicing at pit entry', () => {
  const state = requestPitStop(createRaceState(), 'green-a', 'soft');
  state.cars[0].progress = 0.9;
  const next = applyPitLogic(state);
  assert.equal(next.cars[0].pitState, 'servicing');
});

test('resolveOvertakes swaps faster car in overtaking zone', () => {
  const state = createRaceState();
  state.cars = [
    { ...state.cars[0], id: 'ahead', progress: 0.5, lap: 1, basePace: 0.9 },
    { ...state.cars[1], id: 'behind', progress: 0.49, lap: 1, basePace: 1.1, paceMode: 'push' }
  ];
  state.track = { ...state.track, overtakeZones: [0.48] };
  const next = resolveOvertakes(state);
  assert.equal(next.cars[0].id, 'behind');
});

test('computeRaceResult applies points table', () => {
  const state = createRaceState();
  state.cars = computeOrder(state.cars);
  const result = computeRaceResult(state);
  assert.equal(result.totals.green, 17);
  assert.equal(result.totals.orange, 11);
});

test('advanceRaceTick advances time and tick', () => {
  const state = createRaceState();
  const next = advanceRaceTick(state);
  assert.equal(next.tick, 1);
  assert.equal(next.elapsedMs, TICK_MS);
});
