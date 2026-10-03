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

/**
 * Never attacks: step when out of distance, parry when in.
 *
 * The council found this and it beat the reference player 64% to 56%, because parry weakly
 * dominated step from inside distance and nothing punished a parry that caught nothing. `turtle`
 * missed it by parrying out of distance too, where parry is simply bad. It is here permanently so
 * that the degenerate line cannot come back unnoticed.
 */
function parryWall(state) {
  const hand = state.you.hand;
  const reach = inDistance(state.measure);
  if (!reach) return { card: hand.includes('step') ? 'step' : hand[0], dir: 1 };
  if (hand.includes('parry')) return { card: 'parry', dir: 1 };
  return { card: hand.includes('step') ? 'step' : hand[0], dir: -1 };
}

/**
 * Waits long enough to see the opponent shift its weight, then answers it.
 *
 * Every other policy plays on the first tick of its turn, so before this one existed the tell —
 * the single strongest piece of information in the game — was covered by exactly zero of the
 * 2000 bouts. `thinks` makes the harness let a tick pass first.
 */
function tellReader(state) {
  const hand = state.you.hand;
  const reach = inDistance(state.measure);
  if (state.tell === 'weight' && hand.includes('parry')) return { card: 'parry', dir: 1 };
  if (!reach) return { card: hand.includes('step') ? 'step' : hand[0], dir: 1 };
  if (hand.includes('attack')) return { card: 'attack', dir: 1 };
  return { card: hand[0], dir: 1 };
}
tellReader.thinks = true;

/**
 * Uses the feint on purpose: draw the parry with a step, then hit the opening.
 *
 * This is the policy that has to exist. The point of making a parry-onto-nothing leave you open
 * was to give `step` a job from inside distance; if no play can actually convert that opening into
 * a touch, the rule is decoration and the turtle is still unanswerable. This beating `parryWall`
 * is the evidence that the triangle closed.
 */
function feint(state, rng, memo) {
  const hand = state.you.hand;
  const reach = inDistance(state.measure);
  const has = (c) => hand.includes(c);
  if (state.foe.open && reach && has('attack')) return { card: 'attack', dir: 1 };
  if (!reach) return { card: has('step') ? 'step' : hand[0], dir: 1 };
  if (state.tell === 'weight' && has('parry')) return { card: 'parry', dir: 1 };
  // from inside distance, draw rather than commit — unless they have just been stepping, in which
  // case there is nothing to draw and an attack is simply free
  if (memo.lastTheirs === 'step' && has('attack')) return { card: 'attack', dir: 1 };
  if (has('step')) return { card: 'step', dir: 1 };
  return { card: has('attack') ? 'attack' : hand[0], dir: 1 };
}
feint.thinks = true;

const POLICIES = { decent, chaos, coward, berserk, turtle, parryWall, tellReader, feint };
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
        // a policy that reads the tell has to let a tick pass before it decides
        if (policy.thinks && s.tell === null) { step(s); s.events.length = 0; ticks++; continue; }
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
// Win rates per policy, because "nothing broke" says the bookkeeping is sound and says nothing at
// all about whether one strategy quietly beats every other one.
for (const name of names) {
  const w = out[`${name}/win`] || 0, l = out[`${name}/lose`] || 0, d = out[`${name}/double-out`] || 0;
  const tot = w + l + d;
  if (!tot) continue;
  console.log(`  ${name.padEnd(12)} win ${((w / tot) * 100).toFixed(1).padStart(5)}%` +
              `  lose ${((l / tot) * 100).toFixed(1).padStart(5)}%` +
              `  both out ${((d / tot) * 100).toFixed(1).padStart(5)}%`);
}
console.log(fails ? `\n${fails} FAILURES` : '\nnothing broken');
process.exit(fails ? 1 : 0);
