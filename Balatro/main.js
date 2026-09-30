// Minimal Balatro-like Yahtzee core
// - 5 dice, hold toggles
// - rerolls per hand, 3 by default
// - scoring with chips and mult preview

const MAX_DICE = 10;
const START_REROLLS = 3;
const START_DISCARDS = 2;
const START_HANDS = 1;

const state = {
  round: 1,
  target: 10,
  coins: 1,
  score: 0,
  rerolls: START_REROLLS,
  discards: START_DISCARDS,
  hands: START_HANDS,
  numDice: 5,
  dice: Array.from({ length: 2 }, () => ({ value: 1, held: false })),
  jokers: [], // { id, name, type, amount, desc, cost }
  handHistory: [], // array of { id, round, label, chips, mult, total, dice }
  handFinished: false,
  isRolling: false,
  isScoring: false,
};

const el = {
  dice: document.getElementById('dice'),
  round: document.getElementById('round'),
  target: document.getElementById('target'),
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  rerolls: document.getElementById('rerolls'),
  discards: document.getElementById('discards'),
  hands: document.getElementById('hands'),
  rollBtn: document.getElementById('rollBtn'),
  discardBtn: document.getElementById('discardBtn'),
  finishHandBtn: document.getElementById('finishHandBtn'),
  handSummary: document.getElementById('handSummary'),
  chips: document.getElementById('chips'),
  mult: document.getElementById('mult'),
  total: document.getElementById('total'),
  jokers: document.getElementById('jokers'),
  nextRoundBtn: document.getElementById('nextRoundBtn'),
  nextHandBtn: document.getElementById('nextHandBtn'),
  shopModal: document.getElementById('shopModal'),
  closeShopBtn: document.getElementById('closeShopBtn'),
  shopItems: document.getElementById('shopItems'),
  scoringList: document.getElementById('scoringList'),
  soundToggle: document.getElementById('soundToggle'),
  winModal: document.getElementById('winModal'),
  closeWinBtn: document.getElementById('closeWinBtn'),
  winCatImg: document.getElementById('winCatImg'),
  totalDisplay: document.getElementById('totalDisplay'),
  sparklinePath: document.getElementById('sparklinePath'),
  historyBtn: document.getElementById('historyBtn'),
  historyModal: document.getElementById('historyModal'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  historyList: document.getElementById('historyList'),
  toggleScoringBtn: document.getElementById('toggleScoringBtn'),
};

// Sound Effects Engine
let soundOn = true;
let audioCtx;

const soundFiles = {
  roll: new Audio('./sounds/dice-roll.mp3'),
  count: new Audio('./sounds/score-count.mp3'),
};

function playAudioClip(audioObj, volume = 0.5) {
  if (!soundOn || !audioObj) return;
  try {
    const clone = audioObj.cloneNode();
    clone.volume = volume;
    clone.currentTime = 0;
    clone.play().catch(() => {});
  } catch (e) {}
}

function playBeep(frequency, durationMs, volume = 0.03, type = 'sine') {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    osc.disconnect();
    gain.disconnect();
  }, durationMs);
}

function playClick() { playBeep(220, 60, 0.04, 'square'); }
function playRollTick() { playAudioClip(soundFiles.roll, 0.7); }
function playScorePop() { playBeep(880, 90, 0.045, 'sine'); }
function playMultRise() { playBeep(420, 140, 0.04, 'sawtooth'); }
function playTotalCount() { playAudioClip(soundFiles.count, 0.6); }

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const val = typeof num === 'number' ? num : parseFloat(num);
  if (isNaN(val)) return String(num);
  if (Math.abs(val) >= 1000000) {
    const expStr = val.toExponential(2);
    const [mantissa, exp] = expStr.split('e+');
    const expNum = parseInt(exp, 10);
    return `${mantissa} × 10<sup>${expNum}</sup>`;
  }
  return val.toLocaleString();
}

function randDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
  for (let i = 0; i < state.dice.length; i++) {
    if (!state.dice[i].held) {
      state.dice[i].value = randDie();
    }
  }
}

function toggleHold(index) {
  if (state.handFinished || state.isRolling) return;
  state.dice[index].held = !state.dice[index].held;
  playClick();
  render();
}

function computeCounts(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return counts;
}
function evaluateHand(values) {
  // Yahtzee-esque categories; return { name, chips, mult }
  const sorted = [...values].sort((a, b) => a - b);
  const counts = computeCounts(values);
  const countArr = [...counts.values()].sort((a, b) => b - a);
  const isStraight = (arr) => arr.every((v, i) => i === 0 || v - arr[i - 1] === 1);
  const uniq = [...new Set(sorted)];

  let best = { name: 'High Sum', chips: sorted.reduce((a, b) => a + b, 0), mult: 1 };

  if (countArr[0] >= 6) {
    best = { name: '6 of a Kind', chips: 140, mult: 9 };
  } else if (uniq.length >= 6 && isStraight(uniq.slice(0, 6))) {
    best = { name: 'Super Straight', chips: 120, mult: 7 };
  } else if (countArr[0] === 5) {
    best = { name: 'Yahtzee', chips: 50, mult: 5 };
  } else if (countArr[0] === 4) {
    best = { name: 'Four of a Kind', chips: 30, mult: 3 };
  } else if (countArr[0] >= 3 && countArr[1] >= 2) {
    best = { name: 'Full House', chips: 25, mult: 2 };
  } else if (uniq.length >= 5 && (isStraight(uniq.slice(0, 5)) || isStraight(uniq.slice(1, 6)))) {
    best = { name: 'Large Straight', chips: 40, mult: 3 };
  } else {
    // small straight check: any 4-consecutive within
    const consec = (arr) => arr.some((_, i) => i <= arr.length - 4 && arr[i + 3] - arr[i] === 3 && arr.slice(i, i + 4).every((v, k) => k === 0 || v - arr[i + k - 1] === 1));
    if (uniq.length >= 4 && consec(uniq)) {
      best = { name: 'Small Straight', chips: 30, mult: 2 };
    } else if (countArr[0] === 3) {
      best = { name: 'Three of a Kind', chips: 20, mult: 2 };
    } else if (countArr[0] >= 2 && countArr[1] >= 2) {
      best = { name: 'Two Pair', chips: 15, mult: 1.5 };
    } else if (countArr[0] === 2) {
      best = { name: 'One Pair', chips: 10, mult: 1.2 };
    }
  }

  return best;
}

const SCORING_TABLE = [
  { name: '6 of a Kind', chips: 140, mult: 9 },
  { name: 'Super Straight', chips: 120, mult: 7 },
  { name: 'Yahtzee', chips: 50, mult: 5 },
  { name: 'Four of a Kind', chips: 30, mult: 3 },
  { name: 'Full House', chips: 25, mult: 2 },
  { name: 'Large Straight', chips: 40, mult: 3 },
  { name: 'Small Straight', chips: 30, mult: 2 },
  { name: 'Three of a Kind', chips: 20, mult: 2 },
  { name: 'Two Pair', chips: 15, mult: 1.5 },
  { name: 'One Pair', chips: 10, mult: 1.2 },
  { name: 'High Sum', chips: 'sum(dice)', mult: 1 },
];

function applyJokers(base) {
  let chips = base.chips;
  let mult = base.mult;
  const values = state.dice.map((d) => d.value);
  const diceCount = state.dice.length;

  for (const j of state.jokers) {
    if (j.type === 'flatChips') chips += j.amount;
    if (j.type === 'flatMult') mult += j.amount;
    if (j.type === 'percentChips') chips = Math.round(chips * (1 + j.amount));
    if (j.type === 'perFaceChips') {
      const count = values.filter((v) => v === j.face).length;
      chips += count * j.amount;
    }
    if (j.type === 'perFaceMult') {
      const count = values.filter((v) => v === j.face).length;
      for (let i = 0; i < count; i++) {
        mult *= j.factor;
      }
    }
    // >5 dice Jokers
    if (j.type === 'overdrive' && diceCount > 5) {
      chips += diceCount * j.perDie;
    }
    if (j.type === 'hexaMaster' && diceCount >= 6) {
      chips += j.chips;
      mult *= j.factor;
    }
    if (j.type === 'sevenChaos' && diceCount >= 7) {
      mult *= j.factor;
    }
    // Category booster Jokers
    if (j.type === 'categoryBoost' && j.category && j.category.includes(base.name)) {
      if (j.chips) chips += j.chips;
      if (j.mult) mult += j.mult;
    }
  }
  return { chips, mult };
}

function previewScore() {
  const values = state.dice.map((d) => d.value);
  const base = evaluateHand(values);
  const adj = applyJokers(base);
  const total = Math.round(adj.chips * adj.mult);
  return { label: base.name, chips: adj.chips, mult: adj.mult, total };
}

// Build scoring steps for animation
function buildScoringSteps() {
  const values = state.dice.map((d) => d.value);
  const diceCount = state.dice.length;
  const base = evaluateHand(values);
  const steps = [];
  // base chips first
  steps.push({ kind: 'chips', label: base.name, delta: base.chips });
  // joker-derived steps
  for (const j of state.jokers) {
    if (j.type === 'flatChips') {
      steps.push({ kind: 'chips', label: j.name, delta: j.amount });
    } else if (j.type === 'percentChips') {
      const baseSum = steps.filter(s => s.kind === 'chips').reduce((a, s) => a + s.delta, 0);
      const add = Math.round(baseSum * j.amount);
      steps.push({ kind: 'chips', label: j.name, delta: add });
    } else if (j.type === 'perFaceChips') {
      const count = values.filter(v => v === j.face).length;
      if (count > 0) steps.push({ kind: 'chips', label: `${j.name}`, delta: count * j.amount });
    } else if (j.type === 'flatMult') {
      steps.push({ kind: 'multAdd', label: j.name, delta: j.amount });
    } else if (j.type === 'perFaceMult') {
      const count = values.filter(v => v === j.face).length;
      if (count > 0) steps.push({ kind: 'multMul', label: `${j.name}`, factor: Math.pow(j.factor, count) });
    } else if (j.type === 'overdrive' && diceCount > 5) {
      steps.push({ kind: 'chips', label: `${j.name} (+${diceCount * j.perDie})`, delta: diceCount * j.perDie });
    } else if (j.type === 'hexaMaster' && diceCount >= 6) {
      steps.push({ kind: 'chips', label: j.name, delta: j.chips });
      steps.push({ kind: 'multMul', label: j.name, factor: j.factor });
    } else if (j.type === 'sevenChaos' && diceCount >= 7) {
      steps.push({ kind: 'multMul', label: j.name, factor: j.factor });
    } else if (j.type === 'categoryBoost' && j.category && j.category.includes(base.name)) {
      if (j.chips) steps.push({ kind: 'chips', label: `${j.name} (${base.name})`, delta: j.chips });
      if (j.mult) steps.push({ kind: 'multAdd', label: `${j.name} (${base.name})`, delta: j.mult });
    }
  }
  return steps;
}}

function tweenNumber(from, to, durationMs, onUpdate) {
  return new Promise((resolve) => {
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const value = from + (to - from) * t;
      onUpdate(value);
      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    };
    requestAnimationFrame(animate);
  });
}

function onRoll() {
  if (state.rerolls <= 0 || state.handFinished || state.isRolling) return;
  state.isRolling = true;
  render();
  setTimeout(() => {
    rollDice();
    playRollTick();
    state.rerolls -= 1;
    el.finishHandBtn.disabled = false;
    state.isRolling = false;
    render();
  }, 600);
}

async function onFinishHand() {
  if (state.handFinished || state.isScoring) return;
  state.isScoring = true;
  // lock inputs
  el.rollBtn.disabled = true;
  el.discardBtn.disabled = true;
  el.finishHandBtn.disabled = true;

  // Animate scoring
  let chipsDisplay = 0;
  let multDisplay = 1;
  el.chips.textContent = '0';
  el.mult.textContent = '1';
  el.total.textContent = '0';

  // Determine if this is a "winning hand" (Yahtzee)
  const valuesForWinCheck = state.dice.map((d) => d.value);
  const baseForWinCheck = evaluateHand(valuesForWinCheck);
  const isWinningHand = baseForWinCheck.name === 'Yahtzee';

  const steps = buildScoringSteps();
  for (const step of steps) {
    if (step.kind === 'chips') {
      el.handSummary.innerHTML = `+${formatNumber(step.delta)} chips — ${step.label}`;
      el.chips.classList.add('highlight-yellow');
      const from = chipsDisplay;
      const to = chipsDisplay + step.delta;
      await tweenNumber(from, to, 400, (v) => {
        el.chips.innerHTML = formatNumber(Math.round(v));
      });
      el.chips.classList.remove('highlight-yellow');
      chipsDisplay = to;
      playScorePop();
    } else if (step.kind === 'multAdd') {
      el.handSummary.innerHTML = `+${formatNumber(step.delta)} mult — ${step.label}`;
      el.mult.classList.add('highlight-yellow');
      const from = multDisplay;
      const to = multDisplay + step.delta;
      await tweenNumber(from, to, 350, (v) => {
        el.mult.innerHTML = formatNumber(Math.round(v * 100) / 100);
      });
      el.mult.classList.remove('highlight-yellow');
      multDisplay = to;
      playMultRise();
    } else if (step.kind === 'multMul') {
      el.handSummary.innerHTML = `x${formatNumber(step.factor)} mult — ${step.label}`;
      el.mult.classList.add('highlight-yellow');
      const from = multDisplay;
      const to = multDisplay * step.factor;
      await tweenNumber(from, to, 450, (v) => {
        el.mult.innerHTML = formatNumber(Math.round(v * 100) / 100);
      });
      el.mult.classList.remove('highlight-yellow');
      multDisplay = to;
      playMultRise();
    }
  }

  const finalTotal = Math.round(chipsDisplay * multDisplay);
  el.handSummary.innerHTML = `Total: ${formatNumber(finalTotal)}`;
  el.total.classList.add('highlight-yellow');
  await tweenNumber(0, finalTotal, 500, (v) => {
    el.total.innerHTML = formatNumber(Math.round(v));
  });
  el.total.classList.remove('highlight-yellow');
  playTotalCount();

  // Commit results
  state.handFinished = true;
  state.score += finalTotal;
  state.coins += Math.max(15, Math.floor(finalTotal / 25));
  state.isScoring = false;

  // Record in hand history
  state.handHistory.push({
    id: state.handHistory.length + 1,
    round: state.round,
    label: baseForWinCheck.name,
    chips: chipsDisplay,
    mult: Math.round(multDisplay * 100) / 100,
    total: finalTotal,
    dice: state.dice.map((d) => d.value),
  });

  // If winning hand, show celebratory cat modal via CATAAS API
  if (isWinningHand && el.winModal) {
    openCatModal();
  }

  // enable next steps
  if (state.hands > 0) {
    state.hands -= 1;
  }
  const canAdvance = state.score >= state.target && state.hands === 0;
  el.nextRoundBtn.disabled = !canAdvance;
  el.nextHandBtn.disabled = state.hands <= 0;
  render();
}

function onDiscard() {
  if (state.handFinished) return;
  if (state.discards <= 0) return;
  state.discards -= 1;
  // Reset dice/holds and rerolls for this hand only
  state.dice = Array.from({ length: state.numDice }, () => ({ value: 1, held: false }));
  state.rerolls = START_REROLLS;
  el.finishHandBtn.disabled = true;
  render();
}

function renderDice() {
  el.dice.innerHTML = '';
  state.dice.forEach((die, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'die-wrapper' + (die.held ? ' die-wrapper--held' : '') + (state.isRolling && !die.held ? ' die-wrapper--rolling' : '');
    wrapper.innerHTML = `
      <div class="die-cube show-${die.value}">
        <div class="side one"><div class="dot one-1"></div></div>
        <div class="side two"><div class="dot two-1"></div><div class="dot two-2"></div></div>
        <div class="side three"><div class="dot three-1"></div><div class="dot three-2"></div><div class="dot three-3"></div></div>
        <div class="side four"><div class="dot four-1"></div><div class="dot four-2"></div><div class="dot four-3"></div><div class="dot four-4"></div></div>
        <div class="side five"><div class="dot five-1"></div><div class="dot five-2"></div><div class="dot five-3"></div><div class="dot five-4"></div><div class="dot five-5"></div></div>
        <div class="side six"><div class="dot six-1"></div><div class="dot six-2"></div><div class="dot six-3"></div><div class="dot six-4"></div><div class="dot six-5"></div><div class="dot six-6"></div></div>
      </div>
      <div class="die-badge">${die.held ? 'HELD' : 'HOLD'}</div>
    `;
    wrapper.addEventListener('click', () => toggleHold(i));
    el.dice.appendChild(wrapper);
  });
}

function render() {
  el.round.innerHTML = formatNumber(state.round);
  el.target.innerHTML = formatNumber(state.target);
  el.score.innerHTML = formatNumber(state.score);
  el.coins.innerHTML = formatNumber(state.coins);
  el.rerolls.textContent = String(state.rerolls);
  el.discards.textContent = String(state.discards);
  el.hands.textContent = String(state.hands);
  el.rollBtn.disabled = state.rerolls <= 0 || state.handFinished || state.isRolling;
  el.finishHandBtn.disabled = state.rerolls === START_REROLLS && !state.handFinished;
  el.discardBtn.disabled = state.handFinished || state.discards <= 0 || state.isRolling || state.isScoring;
  el.nextHandBtn.disabled = !state.handFinished || state.hands <= 0;
  // Neon state for actionable CTAs
  if (!el.nextHandBtn.disabled) el.nextHandBtn.classList.add('btn--neon');
  else el.nextHandBtn.classList.remove('btn--neon');
  const canAdvance = state.score >= state.target && state.hands === 0 && state.handFinished;
  el.nextRoundBtn.disabled = !canAdvance;
  if (canAdvance) el.nextRoundBtn.classList.add('btn--neon');
  else el.nextRoundBtn.classList.remove('btn--neon');

  renderDice();
  renderScoringGuide();

  const p = previewScore();
  el.handSummary.innerHTML = state.handFinished ? `Scored: ${p.label}` : '';
  el.chips.innerHTML = formatNumber(p.chips);
  el.mult.innerHTML = formatNumber(p.mult);
  el.total.innerHTML = formatNumber(p.total);

  if (el.totalDisplay) el.totalDisplay.innerHTML = formatNumber(state.score) + ' pts';

  renderJokers();
}

function getCategoryBoostFor(categoryName) {
  let addChips = 0;
  let addMult = 0;
  for (const j of state.jokers) {
    if (j.type === 'categoryBoost' && j.category && j.category.includes(categoryName)) {
      if (j.chips) addChips += j.chips;
      if (j.mult) addMult += j.mult;
    }
  }
  return { addChips, addMult };
}

function renderScoringGuide() {
  if (!el.scoringList) return;
  el.scoringList.innerHTML = '';
  const current = previewScore();
  for (const row of SCORING_TABLE) {
    const div = document.createElement('div');
    div.className = 'scoring__row';
    const boost = getCategoryBoostFor(row.name);
    const isBoosted = boost.addChips > 0 || boost.addMult > 0;

    const name = document.createElement('div');
    name.className = 'name';
    name.innerHTML = `${row.name}${isBoosted ? ' <span class="boost-badge">⚡ Boosted</span>' : ''}`;

    const chips = document.createElement('div');
    chips.className = 'chips';
    const baseChipsVal = typeof row.chips === 'number' ? row.chips + boost.addChips : row.chips;
    chips.innerHTML = typeof baseChipsVal === 'string' ? baseChipsVal : `Chips ${formatNumber(baseChipsVal)}`;

    const mult = document.createElement('div');
    mult.className = 'mult';
    const effectiveMult = row.mult + boost.addMult;
    mult.innerHTML = `Mult ${formatNumber(effectiveMult)}`;

    div.appendChild(name);
    div.appendChild(chips);
    div.appendChild(mult);
    if (row.name === current.label) {
      div.classList.add('scoring__row--active');
    }
    el.scoringList.appendChild(div);
  }
}

function resetHand() {
  state.dice = Array.from({ length: state.numDice }, () => ({ value: 1, held: false }));
  state.rerolls = START_REROLLS;
  state.handFinished = false;
  state.isRolling = false;
  el.nextRoundBtn.disabled = true;
  el.nextHandBtn.disabled = true;
  render();
}

function nextRound() {
  state.round += 1;
  state.target = Math.round(state.target * 2.6);
  state.score = 0;
  state.hands = START_HANDS;
  state.discards = START_DISCARDS;
  resetHand();
}

function nextHand() {
  if (!state.handFinished) return;
  resetHand();
}

// Jokers & Shop
const ALL_JOKERS = [
  { id: 'j1', emoji: '🎲', name: 'Extra Die', type: 'addDie', amount: 1, desc: 'Add +1 die (max 10)', cost: 6 },
  { id: 'j2', emoji: '✖️', name: 'Multiplier', type: 'flatMult', amount: 1, desc: '+1 mult to hand result', cost: 6 },
  { id: 'j3', emoji: '🍀', name: 'Lucky Ticket', type: 'percentChips', amount: 0.25, desc: '+25% chips to hand result', cost: 7 },
  { id: 'j4', emoji: '🎲', name: 'Snake Eyes', type: 'perFaceMult', face: 1, factor: 3, desc: 'Each 1 multiplies mult by 3', cost: 8 },
  { id: 'j5', emoji: '🔥', name: 'Six Appeal', type: 'perFaceChips', face: 6, amount: 20, desc: '+20 chips per 6', cost: 5 },
  { id: 'j6', emoji: '🌟', name: 'Flat Flair', type: 'flatChips', amount: 25, desc: '+25 chips to hand result', cost: 7 },
  { id: 'j7', emoji: '💎', name: 'Chip Booster', type: 'flatChips', amount: 10, desc: '+10 chips to hand result', cost: 4 },
  { id: 'j8', emoji: '⚡', name: 'Overdrive Arsenal', type: 'overdrive', perDie: 15, desc: '+15 chips per die when playing >5 dice', cost: 9 },
  { id: 'j9', emoji: '👑', name: 'Hexa-Master', type: 'hexaMaster', chips: 80, factor: 2, desc: '+80 chips & x2 mult when using 6+ dice', cost: 11 },
  { id: 'j10', emoji: '🌀', name: '7-Dice Chaos', type: 'sevenChaos', factor: 3.5, desc: 'x3.5 mult when using 7+ dice', cost: 14 },
  { id: 'j11', emoji: '🏆', name: 'Yahtzee Master', type: 'categoryBoost', category: ['Yahtzee'], chips: 50, mult: 5, desc: '+50 chips & +5 mult for Yahtzee', cost: 10 },
  { id: 'j12', emoji: '🏹', name: 'Straight Shooter', type: 'categoryBoost', category: ['Small Straight', 'Large Straight', 'Super Straight'], chips: 35, mult: 3, desc: '+35 chips & +3 mult for Straights', cost: 9 },
  { id: 'j13', emoji: '👯', name: 'Pair Perfection', type: 'categoryBoost', category: ['One Pair', 'Two Pair'], chips: 20, mult: 2, desc: '+20 chips & +2 mult for Pair hands', cost: 7 },
  { id: 'j14', emoji: '🏠', name: 'Full House Suite', type: 'categoryBoost', category: ['Full House'], chips: 30, mult: 2.5, desc: '+30 chips & +2.5 mult for Full House', cost: 8 },
  { id: 'j15', emoji: '💥', name: 'Kindness Overload', type: 'categoryBoost', category: ['Three of a Kind', 'Four of a Kind', '6 of a Kind'], chips: 40, mult: 4, desc: '+40 chips & +4 mult for X of a Kind hands', cost: 10 },
];

function renderJokers() {
  el.jokers.innerHTML = '';
  if (state.jokers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'joker';
    empty.textContent = 'No Jokers yet. Buy some in the Shop!';
    el.jokers.appendChild(empty);
    return;
  }
  const grouped = new Map();
  for (const j of state.jokers) {
    const key = j.id;
    const cur = grouped.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      grouped.set(key, { ...j, count: 1 });
    }
  }
  for (const g of grouped.values()) {
    const div = document.createElement('div');
    div.className = 'joker';
    const icon = g.emoji ? `${g.emoji} ` : '';
    const countBadge = g.count > 1 ? `<span class="joker__badge">x${g.count}</span>` : '';
    div.innerHTML = `${countBadge}<strong>${icon}${g.name}</strong> — ${g.desc}`;
    el.jokers.appendChild(div);
  }
}

function openShop() {
  // Offer 3 random jokers
  const picks = [...ALL_JOKERS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  el.shopItems.innerHTML = '';
  let purchased = false;
  picks.forEach((j) => {
    const card = document.createElement('div');
    card.className = 'shop__card';
    const left = document.createElement('div');
    const icon = j.emoji ? `${j.emoji} ` : '';
    left.innerHTML = `<h4>${icon}${j.name} — ${j.cost}c</h4><p>${j.desc}</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = state.coins >= j.cost ? 'Buy' : 'Not enough coins';
    btn.disabled = state.coins < j.cost;
    btn.addEventListener('click', () => {
      if (purchased) return;
      if (buyJoker(j)) {
        purchased = true;
        // disable other buttons after purchase
        const allBtns = el.shopItems.querySelectorAll('button');
        allBtns.forEach((b) => (b.disabled = true));
        // advance next round now that a purchase is made
        nextRound();
      }
    });
    card.appendChild(left);
    card.appendChild(btn);
    el.shopItems.appendChild(card);
  });
  el.shopModal.hidden = false;
}

function closeShop() {
  el.shopModal.hidden = true;
}

function buyJoker(j) {
  if (state.coins < j.cost) return false;
  state.coins -= j.cost;
  state.jokers.push({ ...j });
  if (j.type === 'addDie') {
    state.numDice = Math.min(MAX_DICE, state.numDice + (j.amount || 1));
    while (state.dice.length < state.numDice) {
      state.dice.push({ value: randDie(), held: false });
    }
  }
  render();
  closeShop();
  return true;
}

function openHistoryModal() {
  if (!el.historyModal || !el.historyList) return;
  el.historyList.innerHTML = '';
  if (state.handHistory.length === 0) {
    el.historyList.innerHTML = `
      <div style="padding: 32px 20px; text-align: center; color: var(--text-muted); font-size: 14px;">
        No hands recorded yet. Roll dice and click <strong>Score Hand</strong> to build your history!
      </div>
    `;
  } else {
    [...state.handHistory].reverse().forEach((h) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const diceHtml = h.dice.map(v => `<span class="mini-die">${v}</span>`).join('');
      card.innerHTML = `
        <div class="history-card__header">
          <span class="badge-tag" style="margin: 0; padding: 2px 8px; font-size: 11px;">
            Hand #${h.id} (Round ${h.round})
          </span>
          <span class="history-card__title">${h.label}</span>
        </div>
        <div class="history-card__body">
          <div class="history-card__dice">${diceHtml}</div>
          <div class="history-card__score">
            <span>Chips: <strong>${formatNumber(h.chips)}</strong></span>
            <span>×</span>
            <span>Mult: <strong>${formatNumber(h.mult)}</strong></span>
            <span>=</span>
            <span class="history-card__total">${formatNumber(h.total)} pts</span>
          </div>
        </div>
      `;
      el.historyList.appendChild(card);
    });
  }
  el.historyModal.hidden = false;
}

function closeHistoryModal() {
  if (el.historyModal) el.historyModal.hidden = true;
}

function init() {
  el.rollBtn.addEventListener('click', onRoll);
  el.finishHandBtn.addEventListener('click', onFinishHand);
  el.discardBtn.addEventListener('click', onDiscard);
  el.closeShopBtn.addEventListener('click', closeShop);
  if (el.historyBtn) el.historyBtn.addEventListener('click', openHistoryModal);
  if (el.closeHistoryBtn) el.closeHistoryBtn.addEventListener('click', closeHistoryModal);
  if (el.toggleScoringBtn && el.scoringList) {
    el.toggleScoringBtn.addEventListener('click', () => {
      const isCollapsed = el.scoringList.classList.toggle('collapsed');
      el.toggleScoringBtn.textContent = isCollapsed ? 'Expand ▼' : 'Collapse ▲';
      playClick();
    });
  }
  el.nextRoundBtn.addEventListener('click', () => {
    openCatModal();
  });
  el.nextHandBtn.addEventListener('click', nextHand);
  if (el.soundToggle) {
    el.soundToggle.addEventListener('click', () => {
      soundOn = !soundOn;
      el.soundToggle.textContent = `Sound: ${soundOn ? 'On' : 'Off'}`;
      playClick();
    });
  }
  resetHand();
}

function showRandomCat() {
  // Deprecated: replaced by getRandomCatUrl via The Cat API
  getRandomCatUrl().then((url) => {
    if (el.winCatImg && url) el.winCatImg.src = url;
  });
}

function showWinThenNextRound() {
  if (el.winModal) {
    openCatModal(() => {
      nextRound();
    });
  } else {
    nextRound();
  }
}

async function getRandomCatUrl() {
  try {
    const resp = await fetch('https://cataas.com/cat?json=true');
    const data = await resp.json();
    if (data && data.url) {
      return data.url.startsWith('http') ? data.url : `https://cataas.com${data.url}`;
    }
    const catId = data ? (data._id || data.id) : null;
    if (catId) {
      return `https://cataas.com/cat/${catId}`;
    }
  } catch (e) {
    // fall back
  }
  return `https://cataas.com/cat?t=${Date.now()}`;
}

function openCatModal(onClose) {
  if (!el.winModal || !el.closeWinBtn) return;
  if (el.winCatImg) {
    el.winCatImg.removeAttribute('src');
    el.winCatImg.alt = 'A celebratory cat';
  }
  el.winModal.hidden = false;
  getRandomCatUrl().then((url) => {
    if (el.winCatImg && url) el.winCatImg.src = url;
  });
  const handler = () => {
    el.closeWinBtn.removeEventListener('click', handler);
    el.winModal.hidden = true;
    openShop();
    if (typeof onClose === 'function') onClose();
  };
  el.closeWinBtn.addEventListener('click', handler);
}

init();

