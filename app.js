import { createRaceState, advanceRaceTick, requestPitStop, cancelPitStop, setNextTyreCompound } from './race-engine.js';

let raceState = createRaceState();
let raceTimer = null;
let trackPath = null;
let trackPathLength = 0;

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
}

function tyreClass(compound) {
  return `tyre-${compound}`;
}

function clampProgress(progress) {
  const normalized = progress % 1;
  return normalized < 0 ? normalized + 1 : normalized;
}

function progressToTrackPoint(progress, laneOffset = 0) {
  if (!trackPath || !trackPathLength) {
    return { left: '50%', top: '50%', angle: 0 };
  }

  const normalized = clampProgress(progress);
  const distance = normalized * trackPathLength;
  const point = trackPath.getPointAtLength(distance);
  const lookAhead = trackPath.getPointAtLength(Math.min(trackPathLength, distance + 2));
  const lookBehind = trackPath.getPointAtLength(Math.max(0, distance - 2));
  const dx = lookAhead.x - lookBehind.x;
  const dy = lookAhead.y - lookBehind.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const shiftedX = point.x + normalX * laneOffset;
  const shiftedY = point.y + normalY * laneOffset;

  return {
    left: `${(shiftedX / 1000) * 100}%`,
    top: `${(shiftedY / 620) * 100}%`,
    angle
  };
}

function renderTrack() {
  const laneOffsets = [-10, 10, -10, 10];
  els.carsLayer.innerHTML = raceState.cars.map((car, index) => {
    const point = progressToTrackPoint(car.progress, laneOffsets[index] || 0);
    return `
      <div
        class="car-dot ${car.teamColor}"
        style="left:${point.left}; top:${point.top}; transform: translate(-50%, -50%) rotate(${point.angle}deg);"
        title="${car.driverName}"
      >
        <span class="car-body"></span>
      </div>
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
