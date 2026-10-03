// Plays whole bouts headlessly, to see whether the game is a game.
//
//   node tools/sim.mjs --bouts 400
import { newBout, step, play, RULES, inDistance, CARDS } from '../src/sim.mjs';
import { makeRng } from '../src/rng.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const BOUTS = arg('--bouts', 200);

/** Someone who understands the rules: close if out, attack if close and they are not parrying. */
function decent(state, rng, memo) {
  const hand = state.you.hand;
  const reach = inDistance(state.measure);
  const has = (c) => hand.includes(c);
  memo.theirParries = memo.theirParries ?? 0;

  if (!reach && has('step')) return { card: 'step', dir: 1 };
  if (reach) {
    if (memo.lastTheirs === 'attack' && has('parry')) return { card: 'parry', dir: 1 };
    if (has('attack')) return { card: 'attack', dir: 1 };
    if (has('parry')) return { card: 'parry', dir: 1 };
  }
  return { card: hand[0], dir: reach ? -1 : 1 };
}

/** Plays the first card in hand, always. The floor. */
function naive(state) { return { card: state.you.hand[0], dir: 1 }; }

function run(seed, policy) {
  const s = newBout(seed);
  const rng = makeRng(seed * 2654435761);
  const memo = {};
  let turns = 0, doubles = 0, guard = 0;
  while (!s.over && guard++ < 20000) {
    if (s.phase === 'choose') {
      const { card, dir } = policy(s, rng, memo);
      memo.lastTheirs = s.foe.card;
      play(s, card, dir);
      turns++;
    }
    step(s);
    for (const e of s.events) if (e.type === 'double') doubles++;
    memo.lastTheirs = s.foe.card ?? memo.lastTheirs;
    s.events.length = 0;
  }
  return { over: s.over, turns, doubles, you: s.you.score, foe: s.foe.score,
           ticks: s.tick };
}

for (const [name, policy] of [['plays it well', decent], ['plays the first card', naive]]) {
  const rows = [];
  for (let i = 1; i <= BOUTS; i++) rows.push(run(i, policy));
  const n = rows.length;
  const pct = (k) => ((rows.filter((r) => r.over === k).length / n) * 100).toFixed(0) + '%';
  const avg = (f) => (rows.reduce((a, r) => a + f(r), 0) / n).toFixed(1);
  console.log(`\n${name}  (${n} bouts)`);
  console.log(`  win ${pct('win')}   lose ${pct('lose')}   both out ${pct('double-out')}`);
  console.log(`  ${avg((r) => r.turns)} turns, ${avg((r) => r.doubles)} doubles, ` +
              `${avg((r) => r.ticks / 60)}s of bout`);
}
