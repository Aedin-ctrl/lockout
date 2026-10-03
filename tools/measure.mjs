// Does the new machinery actually happen, and how often?
//
// A rule that is never reached is the same as a rule that does not exist, and both of the things
// changed here — the parry drawn onto nothing, and the tell — are easy to write and never see.
import { newBout, step, play, inDistance } from '../src/sim.mjs';
import { makeRng } from '../src/rng.mjs';

const N = 1200;
let turns = 0, drawn = 0, punished = 0, openTurns = 0;
let tellShown = 0, tellTrue = 0, noTell = 0, noTellAttack = 0, exchanges = 0;

for (let seed = 1; seed <= N; seed++) {
  const s = newBout(seed);
  const rng = makeRng(seed * 7919);
  let guard = 0;
  while (!s.over && guard++ < 40000) {
    if (s.phase === 'choose') {
      if (s.tell === null) { step(s); s.events.length = 0; continue; }   // let the tell land
      if (s.tell === 'weight') tellShown++; else noTell++;
      const willAttack = s.foe.intent === 'attack' && inDistance(s.measure);
      if (s.tell === 'weight' && willAttack) tellTrue++;
      if (s.tell !== 'weight' && willAttack) noTellAttack++;
      exchanges++;
      if (s.you.open) openTurns++;
      play(s, rng.pick(s.you.hand), rng.chance(0.6) ? 1 : -1);
      turns++;
    }
    step(s);
    for (const e of s.events) {
      if (e.type === 'result') {
        if (e.kind === 'drawn-you' || e.kind === 'drawn-foe') drawn++;
        if (e.kind === 'open-you' || e.kind === 'open-foe') punished++;
      }
    }
    s.events.length = 0;
  }
}

const pc = (a, b) => `${((a / b) * 100).toFixed(1)}%`;
console.log(`${N} bouts, ${turns} exchanges`);
console.log(`  a parry drawn onto nothing   ${drawn}  (${pc(drawn, turns)} of exchanges)`);
console.log(`  and punished next exchange   ${punished}  (${pc(punished, Math.max(1, drawn))} of those)`);
console.log(`  exchanges fenced while open  ${openTurns}`);
console.log(`\ntell shown ${tellShown}/${exchanges} (${pc(tellShown, exchanges)})`);
console.log(`  when shown, it was a real attack  ${pc(tellTrue, Math.max(1, tellShown))}`);
console.log(`  when NOT shown, attack anyway     ${pc(noTellAttack, Math.max(1, noTell))}`);
