import { createRaceState, advanceRaceTick, requestPitStop } from './race-engine.js';

let raceState = createRaceState();
let raceTimer = null;

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

function tyreClass(compound) {
  return `tyre-${compound}`;
}

function progressToPoint(progress) {
  const centerX = 50;
  const centerY = 50;
  const radiusX = 36;
  const radiusY = 30;
  const angle = (progress * 2 * Math.PI) - Math.PI / 2;
  return {
    left: `${centerX + Math.cos(angle) * radiusX}%`,
    top: `${centerY + Math.sin(angle) * radiusY}%`
  };
}

function renderTrack() {
  els.carsLayer.innerHTML = raceState.cars.map((car) => {
    const point = progressToPoint(car.progress);
    return `<div class="car-dot ${car.teamColor}" style="left:${point.left}; top:${point.top};" title="${car.driverName}"></div>`;
  }).join('');
}

function renderOrderBoard() {
  els.orderBoard.innerHTML = raceState.cars.map((car, index) => `
    <article class="order-row">
      <strong>${index + 1}. ${car.driverName}</strong>
      <div class="order-meta small">
        <span>${car.teamColor}</span>
        <span>Lap ${Math.min(car.lap, raceState.lapCount)} / ${raceState.lapCount}</span>
        <span class="tyre-badge ${tyreClass(car.tyre.compound)}">${car.tyre.compound}</span>
        <span>Wear ${Math.round(car.tyre.wear)}%</span>
        <span>Pace ${car.paceMode}</span>
        <span>${car.pitState !== 'none' ? 'PIT' : 'TRACK'}</span>
      </div>
    </article>
  `).join('');
}

function setPace(carId, paceMode) {
  raceState = {
    ...raceState,
    cars: raceState.cars.map((car) => car.id === carId ? { ...car, paceMode } : car)
  };
  render();
}

function setNextTyre(carId, compound) {
  raceState = requestPitStop(raceState, carId, compound);
  render();
}

function renderStrategy() {
  const playerCars = raceState.cars.filter((car) => car.controller === 'player');
  els.strategyGrid.innerHTML = playerCars.map((car) => `
    <article class="strategy-card">
      <strong>${car.driverName}</strong>
      <div class="strategy-meta small">
        <span class="tyre-badge ${tyreClass(car.tyre.compound)}">${car.tyre.compound}</span>
        <span>Wear ${Math.round(car.tyre.wear)}%</span>
        <span>Pit ${car.pitIntent?.nextTyreCompound || '-'}</span>
      </div>
      <div class="strategy-actions">
        <button class="pace-button ${car.paceMode === 'push' ? 'active' : ''}" data-car-id="${car.id}" data-pace="push">Push</button>
        <button class="pace-button ${car.paceMode === 'normal' ? 'active' : ''}" data-car-id="${car.id}" data-pace="normal">Normal</button>
        <button class="pace-button ${car.paceMode === 'conserve' ? 'active' : ''}" data-car-id="${car.id}" data-pace="conserve">Conserve</button>
      </div>
      <div class="tyre-row">
        <button class="tyre-button" data-car-id="${car.id}" data-tyre="soft">Soft</button>
        <button class="tyre-button" data-car-id="${car.id}" data-tyre="medium">Medium</button>
        <button class="tyre-button" data-car-id="${car.id}" data-tyre="hard">Hard</button>
        <button class="pit-button" data-car-id="${car.id}" data-pit="1">Pit now</button>
      </div>
    </article>
  `).join('');

  els.strategyGrid.querySelectorAll('[data-pace]').forEach((button) => {
    button.addEventListener('click', () => setPace(button.dataset.carId, button.dataset.pace));
  });
  els.strategyGrid.querySelectorAll('[data-tyre]').forEach((button) => {
    button.addEventListener('click', () => setNextTyre(button.dataset.carId, button.dataset.tyre));
  });
  els.strategyGrid.querySelectorAll('[data-pit]').forEach((button) => {
    button.addEventListener('click', () => setNextTyre(button.dataset.carId, raceState.cars.find((car) => car.id === button.dataset.carId)?.pitIntent?.nextTyreCompound || 'medium'));
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
  els.resultSummary.textContent = `Green ${raceState.result.totals.green || 0} - Orange ${raceState.result.totals.orange || 0}`;
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

render();
