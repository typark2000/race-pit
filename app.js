import { createRaceState, advanceRaceTick, requestPitStop, cancelPitStop, setNextTyreCompound } from './race-engine.js';

let raceState = createRaceState();
let raceTimer = null;
let trackPath = null;
let trackPathLength = 0;
let pitLanePath = null;
let pitLanePathLength = 0;

const els = {
  startRaceButton: document.getElementById('startRaceButton'),
  tickButton: document.getElementById('tickButton'),
  lapLabel: document.getElementById('lapLabel'),
  phaseLabel: document.getElementById('phaseLabel'),
  carsLayer: document.getElementById('carsLayer'),
  orderBoard: document.getElementById('orderBoard'),
  strategyGrid: document.getElementById('strategyGrid'),
  resultCard: document.getElementById('resultCard'),
  resultTitle: document.getElementById('resultTitle'),
  resultSummary: document.getElementById('resultSummary')
};

function initTrackGeometry() {
  trackPath = document.getElementById('raceTrackPath');
  trackPathLength = trackPath?.getTotalLength?.() || 0;
  pitLanePath = document.getElementById('pitLanePath');
  pitLanePathLength = pitLanePath?.getTotalLength?.() || 0;
}

function tyreClass(compound) {
  return `tyre-${compound}`;
}

function clampProgress(progress) {
  const normalized = progress % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function samplePathPoint(path, pathLength, normalizedProgress, laneOffset = 0) {
  if (!path || !pathLength) {
    return { x: 500, y: 310, angle: 0 };
  }
  const distance = clampProgress(normalizedProgress) * pathLength;
  const point = path.getPointAtLength(distance);
  const lookAhead = path.getPointAtLength(Math.min(pathLength, distance + 3));
  const lookBehind = path.getPointAtLength(Math.max(0, distance - 3));
  const dx = lookAhead.x - lookBehind.x;
  const dy = lookAhead.y - lookBehind.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;

  return {
    x: point.x + normalX * laneOffset,
    y: point.y + normalY * laneOffset,
    angle
  };
}

function getCarRenderPoint(car) {
  const laneOffsetsByCar = {
    'green-a': -6,
    'orange-a': 6,
    'green-b': -6,
    'orange-b': 6
  };
  if (car.pitState === 'pitlane') {
    return samplePathPoint(pitLanePath, pitLanePathLength, car.pitVisualProgress, 0);
  }
  return samplePathPoint(trackPath, trackPathLength, car.progress, laneOffsetsByCar[car.id] ?? 0);
}

function renderTrack() {
  els.carsLayer.innerHTML = raceState.cars.map((car) => {
    const point = getCarRenderPoint(car);
    return `
      <g class="car-dot ${car.teamColor} ${car.pitState === 'pitlane' ? 'in-pit' : ''}" transform="translate(${point.x} ${point.y}) rotate(${point.angle})">
        <rect class="car-body" x="-24" y="-14" width="48" height="28" rx="14" ry="14"></rect>
        <rect class="wheel wheel-front-left" x="-22" y="-17" width="8" height="8"></rect>
        <rect class="wheel wheel-front-right" x="14" y="-17" width="8" height="8"></rect>
        <rect class="wheel wheel-rear-left" x="-22" y="9" width="8" height="8"></rect>
        <rect class="wheel wheel-rear-right" x="14" y="9" width="8" height="8"></rect>
        <rect class="cockpit" x="-6" y="-8" width="16" height="16" rx="5"></rect>
      </g>
    `;
  }).join('');
}

function renderOrderBoard() {
  els.orderBoard.innerHTML = raceState.cars.map((car, index) => `
    <article class="order-row ${index < 2 ? 'front-runner' : ''}">
      <strong>${index + 1}. ${car.driverName}</strong>
      <div class="order-meta small">
        <span>${car.teamColor}</span>
        <span>Lap ${Math.min(car.lap, raceState.lapCount)} / ${raceState.lapCount}</span>
        <span class="tyre-badge ${tyreClass(car.tyre.compound)}">${car.tyre.compound}</span>
        <span>Wear ${Math.round(car.tyre.wear)}%</span>
        <span>Pace ${car.paceMode}</span>
        <span>${car.pitState !== 'none' ? 'PIT' : 'TRACK'}</span>
      </div>
      <p class="small note">${car.latestStrategyNote || 'Running clean'}</p>
    </article>
  `).join('');
}

function setPace(carId, paceMode) {
  raceState = {
    ...raceState,
    cars: raceState.cars.map((car) => car.id === carId ? { ...car, paceMode, latestStrategyNote: `Pace set to ${paceMode}` } : car)
  };
  render();
}

function chooseTyre(carId, compound) {
  raceState = setNextTyreCompound(raceState, carId, compound);
  raceState = {
    ...raceState,
    cars: raceState.cars.map((car) => car.id === carId ? { ...car, latestStrategyNote: `Next tyre ${compound}` } : car)
  };
  render();
}

function togglePit(carId) {
  const car = raceState.cars.find((item) => item.id === carId);
  if (!car) return;
  raceState = car.pitIntent ? cancelPitStop(raceState, carId) : requestPitStop(raceState, carId);
  render();
}

function strategyStatus(car) {
  if (car.pitState !== 'none') return `In pit · ${Math.ceil(car.pitRemainingMs / 1000)}s`;
  if (car.pitIntent) return `Pit queued · ${car.nextTyreCompound}`;
  if (car.tyre.wear >= 85) return 'Pit window open';
  return 'Stay out';
}

function renderStrategy() {
  const playerCars = raceState.cars.filter((car) => car.controller === 'player');
  els.strategyGrid.innerHTML = playerCars.map((car) => `
    <article class="strategy-card ${car.pitIntent ? 'pit-queued' : ''}">
      <strong>${car.driverName}</strong>
      <div class="strategy-meta small">
        <span class="tyre-badge ${tyreClass(car.tyre.compound)}">${car.tyre.compound}</span>
        <span>Wear ${Math.round(car.tyre.wear)}%</span>
        <span>${strategyStatus(car)}</span>
      </div>
      <p class="small note">${car.latestStrategyNote || 'Waiting for your call'}</p>
      <div class="strategy-actions">
        <button class="pace-button ${car.paceMode === 'push' ? 'active' : ''}" data-car-id="${car.id}" data-pace="push">Push</button>
        <button class="pace-button ${car.paceMode === 'normal' ? 'active' : ''}" data-car-id="${car.id}" data-pace="normal">Normal</button>
        <button class="pace-button ${car.paceMode === 'conserve' ? 'active' : ''}" data-car-id="${car.id}" data-pace="conserve">Conserve</button>
      </div>
      <div class="tyre-row">
        <button class="tyre-button ${car.nextTyreCompound === 'soft' ? 'active' : ''}" data-car-id="${car.id}" data-tyre="soft">Soft</button>
        <button class="tyre-button ${car.nextTyreCompound === 'medium' ? 'active' : ''}" data-car-id="${car.id}" data-tyre="medium">Medium</button>
        <button class="tyre-button ${car.nextTyreCompound === 'hard' ? 'active' : ''}" data-car-id="${car.id}" data-tyre="hard">Hard</button>
        <button class="pit-button ${car.pitIntent ? 'active' : ''}" data-car-id="${car.id}" data-pit="1">${car.pitIntent ? 'Cancel pit' : 'Pit now'}</button>
      </div>
    </article>
  `).join('');

  els.strategyGrid.querySelectorAll('[data-pace]').forEach((button) => {
    button.addEventListener('click', () => setPace(button.dataset.carId, button.dataset.pace));
  });
  els.strategyGrid.querySelectorAll('[data-tyre]').forEach((button) => {
    button.addEventListener('click', () => chooseTyre(button.dataset.carId, button.dataset.tyre));
  });
  els.strategyGrid.querySelectorAll('[data-pit]').forEach((button) => {
    button.addEventListener('click', () => togglePit(button.dataset.carId));
  });
}

function renderHeader() {
  const maxLap = Math.max(...raceState.cars.map((car) => Math.min(car.lap, raceState.lapCount)));
  els.lapLabel.textContent = `Lap ${maxLap} / ${raceState.lapCount}`;
  els.phaseLabel.textContent = raceState.phase;
}

function renderResult() {
  if (raceState.phase !== 'finished' || !raceState.result) {
    els.resultCard.hidden = true;
    return;
  }
  els.resultCard.hidden = false;
  els.resultTitle.textContent = `${raceState.result.winner} wins`;
  els.resultSummary.innerHTML = `
    <strong>Score:</strong> Green ${raceState.result.totals.green || 0} - Orange ${raceState.result.totals.orange || 0}<br />
    <strong>Winning move:</strong> ${raceState.result.winningMove}
  `;
}

function render() {
  renderHeader();
  renderTrack();
  renderOrderBoard();
  renderStrategy();
  renderResult();
}

function startRace() {
  if (raceTimer) window.clearInterval(raceTimer);
  raceState = createRaceState();
  render();
  raceTimer = window.setInterval(() => {
    raceState = advanceRaceTick(raceState);
    render();
    if (raceState.phase === 'finished') {
      window.clearInterval(raceTimer);
      raceTimer = null;
    }
  }, 200);
}

function stepRace() {
  raceState = advanceRaceTick(raceState);
  render();
}

els.startRaceButton.addEventListener('click', startRace);
els.tickButton.addEventListener('click', stepRace);

initTrackGeometry();
render();
