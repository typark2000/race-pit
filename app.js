import { createRaceState, advanceRaceTick, requestPitStop, cancelPitStop, setNextTyreCompound } from './race-engine.js';

let raceState = createRaceState();
let raceTimer = null;
let trackPath = null;
let trackPathLength = 0;
let pitLanePath = null;
let pitLanePathLength = 0;
let previousCarsById = new Map();

const els = {
  startRaceButton: document.getElementById('startRaceButton'),
  tickButton: document.getElementById('tickButton'),
  lapLabel: document.getElementById('lapLabel'),
  phaseLabel: document.getElementById('phaseLabel'),
  raceInsight: document.getElementById('raceInsight'),
  raceHud: document.getElementById('raceHud'),
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

function getLeaderScore(car) {
  return (car.lap - 1) + car.progress;
}

function formatGap(car, leader) {
  const gap = Math.max(0, (getLeaderScore(leader) - getLeaderScore(car)) * 60);
  return gap < 0.1 ? 'Leader' : `+${gap.toFixed(1)}s`;
}

function getPitLossEstimate(car) {
  const base = 13.5;
  const wearBonus = car.tyre.wear >= 85 ? 1.4 : car.tyre.wear >= 70 ? 0.6 : 0;
  return `${(base - wearBonus).toFixed(1)}s`;
}

function getUndercutHint(car, rival) {
  if (!rival) return '상대 데이터 없음';
  const wearDiff = car.tyre.wear - rival.tyre.wear;
  if (car.pitIntent) return '이번 랩 언더컷 시도 중';
  if (wearDiff >= 12) return '지금 들어가면 언더컷 각';
  if (wearDiff <= -10) return '상대 언더컷 방어 필요';
  return '아직 스테이 아웃 가능';
}

function renderTrack() {
  const leaderId = raceState.cars[0]?.id;
  els.carsLayer.innerHTML = raceState.cars.map((car) => {
    const point = getCarRenderPoint(car);
    const previous = previousCarsById.get(car.id);
    const hasAdvanced = previous && ((car.lap > previous.lap) || (car.progress > previous.progress));
    const overtakingGlow = car.latestStrategyNote === 'Overtake made';
    return `
      <g class="car-trail ${hasAdvanced ? 'active' : ''}" transform="translate(${point.x} ${point.y}) rotate(${point.angle})">
        <ellipse class="trail-core ${car.teamColor}" cx="-26" cy="0" rx="24" ry="10"></ellipse>
      </g>
      <g class="car-dot ${car.teamColor} ${car.pitState === 'pitlane' ? 'in-pit' : ''} ${leaderId === car.id ? 'leader-car' : ''} ${overtakingGlow ? 'overtake-pop' : ''}" transform="translate(${point.x} ${point.y}) rotate(${point.angle})">
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

function renderRaceHud() {
  const leader = raceState.cars[0];
  const playerCars = raceState.cars.filter((car) => car.controller === 'player');
  if (!leader) return;
  els.raceHud.innerHTML = playerCars.map((car) => {
    const rival = raceState.cars.find((item) => item.controller === 'ai' && item.slot === car.slot) || raceState.cars.find((item) => item.controller === 'ai');
    return `
      <article class="hud-card">
        <strong>${car.driverName}</strong>
        <div class="hud-grid small">
          <span>Gap ${formatGap(car, leader)}</span>
          <span>Pit loss ${getPitLossEstimate(car)}</span>
          <span>${getUndercutHint(car, rival)}</span>
        </div>
      </article>
    `;
  }).join('');

  const headline = raceState.cars.find((car) => car.latestStrategyNote === 'Overtake made')
    ? '추월 발생. 지금 페이스 결정을 다시 봐야 해.'
    : playerCars.some((car) => car.tyre.wear >= 85)
      ? '타이어가 무너진다. 이번 랩 피트 판단 구간.'
      : '지금은 갭과 타이어를 같이 봐야 하는 구간.';

  els.raceInsight.textContent = headline;
}

function renderOrderBoard() {
  const leader = raceState.cars[0];
  els.orderBoard.innerHTML = raceState.cars.map((car, index) => `
    <article class="order-row ${index < 2 ? 'front-runner' : ''}">
      <strong>${index + 1}. ${car.driverName}</strong>
      <div class="order-meta small">
        <span>${car.teamColor}</span>
        <span>${leader ? formatGap(car, leader) : '-'}</span>
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

function snapshotCars() {
  previousCarsById = new Map(raceState.cars.map((car) => [car.id, { lap: car.lap, progress: car.progress }]));
}

function render() {
  renderHeader();
  renderRaceHud();
  renderTrack();
  renderOrderBoard();
  renderStrategy();
  renderResult();
  snapshotCars();
}

function startRace() {
  if (raceTimer) window.clearInterval(raceTimer);
  raceState = createRaceState();
  previousCarsById = new Map();
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
