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
};

// Simple webaudio helper
let audioCtx;
let soundOn = true;
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
function playRollTick() { playBeep(520 + Math.random() * 120, 40, 0.03, 'triangle'); }
function playScorePop() { playBeep(880, 90, 0.045, 'sine'); }
function playMultRise() { playBeep(420, 140, 0.04, 'sawtooth'); }
function playTotalCount() { playBeep(300, 400, 0.035, 'sine'); }

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

  // Base chips by sum; mult 1 default
  let best = { name: 'High Sum', chips: sorted.reduce((a, b) => a + b, 0), mult: 1 };

  if (countArr[0] === 5) {
    best = { name: 'Yahtzee', chips: 50, mult: 5 };
  } else if (countArr[0] === 4) {
    best = { name: 'Four of a Kind', chips: 30, mult: 3 };
  } else if (countArr[0] === 3 && countArr[1] === 2) {
    best = { name: 'Full House', chips: 25, mult: 2 };
  } else if (isStraight(sorted) && new Set(sorted).size === 5) {
    best = { name: 'Large Straight', chips: 40, mult: 3 };
  } else {
    // small straight check: any 4-consecutive within
    const uniq = [...new Set(sorted)];
    const consec = (arr) => arr.some((_, i) => i <= arr.length - 4 && arr[i + 3] - arr[i] === 3 && arr.slice(i, i + 4).every((v, k) => k === 0 || v - arr[i + k - 1] === 1));
    if (uniq.length >= 4 && consec(uniq)) {
      best = { name: 'Small Straight', chips: 30, mult: 2 };
    } else if (countArr[0] === 3) {
      best = { name: 'Three of a Kind', chips: 20, mult: 2 };
    } else if (countArr[0] === 2 && countArr[1] === 2) {
      best = { name: 'Two Pair', chips: 15, mult: 1.5 };
    } else if (countArr[0] === 2) {
      best = { name: 'One Pair', chips: 10, mult: 1.2 };
    }
  }

  return best;
}

const SCORING_TABLE = [
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
    // addDie affects hand setup, not scoring; handled on purchase
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
    }
  }
  return steps;
}

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
  const diceEls = el.dice.querySelectorAll('.die');
  diceEls.forEach((d) => d.classList.add('die--rolling'));
  setTimeout(() => {
    rollDice();
    playRollTick();
    state.rerolls -= 1;
    el.finishHandBtn.disabled = false;
    state.isRolling = false;
    render();
  }, 500);
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
      el.handSummary.textContent = `+${step.delta} chips — ${step.label}`;
      el.chips.classList.add('highlight-yellow');
      const from = chipsDisplay;
      const to = chipsDisplay + step.delta;
      await tweenNumber(from, to, 400, (v) => {
        el.chips.textContent = String(Math.round(v));
      });
      el.chips.classList.remove('highlight-yellow');
      chipsDisplay = to;
      playScorePop();
    } else if (step.kind === 'multAdd') {
      el.handSummary.textContent = `+${step.delta} mult — ${step.label}`;
      el.mult.classList.add('highlight-yellow');
      const from = multDisplay;
      const to = multDisplay + step.delta;
      await tweenNumber(from, to, 350, (v) => {
        el.mult.textContent = String(Math.round(v * 100) / 100);
      });
      el.mult.classList.remove('highlight-yellow');
      multDisplay = to;
      playMultRise();
    } else if (step.kind === 'multMul') {
      el.handSummary.textContent = `x${step.factor} mult — ${step.label}`;
      el.mult.classList.add('highlight-yellow');
      const from = multDisplay;
      const to = multDisplay * step.factor;
      await tweenNumber(from, to, 450, (v) => {
        el.mult.textContent = String(Math.round(v * 100) / 100);
      });
      el.mult.classList.remove('highlight-yellow');
      multDisplay = to;
      playMultRise();
    }
  }

  const finalTotal = Math.round(chipsDisplay * multDisplay);
  el.handSummary.textContent = `Total: ${finalTotal}`;
  el.total.classList.add('highlight-yellow');
  await tweenNumber(0, finalTotal, 500, (v) => {
    el.total.textContent = String(Math.round(v));
  });
  el.total.classList.remove('highlight-yellow');
  playTotalCount();

  // Commit results
  state.handFinished = true;
  state.score += finalTotal;
  state.coins += Math.max(15, Math.floor(finalTotal / 25));
  state.isScoring = false;

  // If winning hand, show cat.gif celebration modal
  if (isWinningHand && el.winModal && el.winCatImg && el.closeWinBtn) {
    el.winCatImg.src = './cat.gif';
    el.winModal.hidden = false;
    const onCloseWin = () => {
      el.closeWinBtn.removeEventListener('click', onCloseWin);
      el.winModal.hidden = true;
    };
    el.closeWinBtn.addEventListener('click', onCloseWin);
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
    const div = document.createElement('div');
    div.className = 'die' + (die.held ? ' die--held' : '');
    div.innerHTML = `
      <div class="die__value">${die.value}</div>
      <div class="die__label">${die.held ? 'Held' : 'Tap to hold'}</div>
    `;
    div.addEventListener('click', () => toggleHold(i));
    el.dice.appendChild(div);
  });
}

function render() {
  el.round.textContent = String(state.round);
  el.target.textContent = String(state.target);
  el.score.textContent = String(state.score);
  el.coins.textContent = String(state.coins);
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
  el.handSummary.textContent = state.handFinished ? `Scored: ${p.label}` : '';
  el.chips.textContent = String(p.chips);
  el.mult.textContent = String(p.mult);
  el.total.textContent = String(p.total);

  renderJokers();
}

function renderScoringGuide() {
  if (!el.scoringList) return;
  el.scoringList.innerHTML = '';
  const current = previewScore();
  for (const row of SCORING_TABLE) {
    const div = document.createElement('div');
    div.className = 'scoring__row';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = row.name;
    const chips = document.createElement('div');
    chips.className = 'chips';
    chips.textContent = typeof row.chips === 'string' ? row.chips : `Chips ${row.chips}`;
    const mult = document.createElement('div');
    mult.className = 'mult';
    mult.textContent = `Mult ${row.mult}`;
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
  { id: 'j7', emoji: '💎', name: 'Chip Booster', type: 'flatChips', amount: 10, desc: '+10 chips to hand result', cost: 4 },
  { id: 'j2', emoji: '✖️', name: 'Multiplier', type: 'flatMult', amount: 1, desc: '+1 mult to hand result', cost: 6 },
  { id: 'j3', emoji: '🍀', name: 'Lucky Ticket', type: 'percentChips', amount: 0.25, desc: '+25% chips to hand result', cost: 7 },
  { id: 'j4', emoji: '🎲', name: 'Snake Eyes', type: 'perFaceMult', face: 1, factor: 3, desc: 'Each 1 multiplies mult by 3', cost: 8 },
  { id: 'j5', emoji: '🔥', name: 'Six Appeal', type: 'perFaceChips', face: 6, amount: 20, desc: '+20 chips per 6', cost: 5 },
  { id: 'j6', emoji: '🌟', name: 'Flat Flair', type: 'flatChips', amount: 25, desc: '+25 chips to hand result', cost: 7 },
  { id: 'j1', emoji: '➕', name: 'Extra Die', type: 'addDie', amount: 1, desc: 'Add +1 die (max 5)', cost: 6 },
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
  }
  render();
  closeShop();
  return true;
}

function init() {
  el.rollBtn.addEventListener('click', onRoll);
  el.finishHandBtn.addEventListener('click', onFinishHand);
  el.discardBtn.addEventListener('click', onDiscard);
  el.closeShopBtn.addEventListener('click', closeShop);
  el.nextRoundBtn.addEventListener('click', () => {
    // open shop first; after closing, advance round
    openShop();
    const onClose = () => {
      el.closeShopBtn.removeEventListener('click', onClose);
      // if user closes without purchase, still advance
      showWinThenNextRound();
    };
    el.closeShopBtn.addEventListener('click', onClose);
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
    const resp = await fetch('https://api.thecatapi.com/v1/images/search?size=small&mime_types=jpg,png,gif&order=RANDOM&limit=1');
    const data = await resp.json();
    if (Array.isArray(data) && data[0] && data[0].url) {
      return data[0].url;
    }
  } catch (e) {
    // ignore and fall back
  }
  return null;
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
    if (typeof onClose === 'function') onClose();
  };
  el.closeWinBtn.addEventListener('click', handler);
}

init();

