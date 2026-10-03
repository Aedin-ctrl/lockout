// Thousands of bouts, with no browser.
//
//   node tools/stress.mjs --bouts 2000 --policy all
//
// Invariants every tick. A card game's failures are silent bookkeeping ones — a card that ceases
// to exist, a hand refilled from nowhere, a score creeping past the target — so the harness counts
// the deck on every single tick rather than trusting that it balances.

import { newBout, step, play, RULES, inDistance, CARDS } from '../src/sim.mjs';
import { checkInvariants } from '../src/invariants.mjs';
import { makeRng } from '../src/rng.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const BOUTS = Number(arg('--bouts', 500));
const wanted = arg('--policy', 'all');

/** Understands the rules. */
function decent(state, rng, memo) {
  const hand = state.you.hand;
  const reach = inDistance(state.measure);
  const has = (c) => hand.includes(c);
  if (!reach && has('step')) return { card: 'step', dir: 1 };
  if (reach) {
    if (memo.lastTheirs === 'attack' && has('parry')) return { card: 'parry', dir: 1 };
    if (has('attack')) return { card: 'attack', dir: 1 };
    if (has('parry')) return { card: 'parry', dir: 1 };
  }
  return { card: hand[0], dir: reach ? -1 : 1 };
}
/** Plays whatever, whenever. */
function chaos(state, rng) {
  return { card: rng.pick(state.you.hand), dir: rng.chance(0.5) ? 1 : -1 };
}
/** Never closes, only backs away. Should lose, and must never break. */
function coward(state) {
  const hand = state.you.hand;
  return { card: hand.includes('step') ? 'step' : hand[0], dir: -1 };
}
/** Only ever attacks, from any distance. */
function berserk(state) {
  const hand = state.you.hand;
  return { card: hand.includes('attack') ? 'attack' : hand[0], dir: 1 };
}
/** Only ever parries. */
function turtle(state) {
  const hand = state.you.hand;
  return { card: hand.includes('parry') ? 'parry' : hand[0], dir: 1 };
}

const POLICIES = { decent, chaos, coward, berserk, turtle };
const names = wanted === 'all' ? Object.keys(POLICIES) : [wanted];

let bouts = 0, fails = 0, ticks = 0;
const out = {};
const t0 = Date.now();

for (const name of names) {
  const policy = POLICIES[name];
  for (let seed = 1; seed <= BOUTS; seed++) {
    const s = newBout(seed);
    const rng = makeRng(seed * 40503);
    const memo = {};
    let guard = 0, broke = null;

    while (!s.over && guard++ < 40000) {
      if (s.phase === 'choose') {
        const { card, dir } = policy(s, rng, memo);
        memo.lastTheirs = s.foe.card ?? memo.lastTheirs;
        play(s, card, dir);
      }
      step(s);
      memo.lastTheirs = s.foe.card ?? memo.lastTheirs;
      s.events.length = 0;
      ticks++;
      const bad = checkInvariants(s);
      if (bad.length) { broke = { tick: s.tick, bad }; break; }
    }
    if (!broke && guard >= 40000) broke = { tick: s.tick, bad: ['bout never ended — soft-locked'] };

    bouts++;
    if (broke) {
      fails++;
      console.log(`\nFAIL  ${name} seed ${seed} at tick ${broke.tick}`);
      for (const b of broke.bad.slice(0, 4)) console.log('   ' + b);
      if (fails >= 6) break;
    } else {
      const k = `${name}/${s.over}`;
      out[k] = (out[k] || 0) + 1;
    }
  }
  if (fails >= 6) break;
}

const secs = (Date.now() - t0) / 1000;
console.log(`\n${bouts} bouts, ${(ticks / 60 / 60).toFixed(1)} hours of fencing in ${secs.toFixed(1)}s`);
for (const [k, n] of Object.entries(out).sort()) console.log(`  ${k.padEnd(22)} ${n}`);
console.log(fails ? `\n${fails} FAILURES` : '\nnothing broken');
process.exit(fails ? 1 : 0);
