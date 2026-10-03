# LOCKOUT

> Épée is the one weapon where both lights can come on at once.
>
> Forty milliseconds after the first lamp fires, the box stops listening. If you both landed inside
> that window, you both landed, and there is nothing to argue about.

A card duel on a strip of piste. Third in the set, on the same engine as
[Filament](../Filament/DESIGN.md) and [The Far Light](../FarLight/DESIGN.md), and the one that is
not a platformer or a builder — the brief asked for a deck game as one of the options, and this is
the genre those two do not cover.

---

## 1. The shape of it

Two fencers, one piste, and a scoring box between you. First to **five touches** takes the bout.

Each turn you both choose one card and reveal at the same time. There is no hidden information
except the choice itself, and no randomness in the resolution — the deck is the only luck, and you
can see what is left of it.

### The three cards

| | what it does |
|---|---|
| **ATTACK** | lands, if you are close enough and they did not parry |
| **PARRY** | beats an attack, and you score the riposte. Does nothing against anything else. |
| **STEP** | closes or opens the distance. Scores nothing, risks nothing. |

Which is a triangle: **attack beats step, parry beats attack, step beats parry**.

That third edge was a lie for the first version of this game, and §7.3 is the story of finding out.
A parry with nothing to parry was simply a turn where nothing happened, and a turn where nothing
happens costs nothing at all in a game with no clock and a reshuffling discard. So the rule now
says what the sport says: **a parry that catches nothing leaves you open.** Draw the parry with a
step and the next parry they attempt fails, which is one exchange in which an attack cannot be
stopped. Step beats parry — a beat later, and only if you follow it up.

### Distance is the second axis

**Four** measures: **out of distance**, **long**, **lunge**, **close**. A step moves one measure.
(This section said three for a long time, and three is what the first build had — with three, two
fencers both stepping in crossed from out of distance to close in a single turn, so every bout
opened in a brawl and the manoeuvring never happened.) An attack only
reaches from **lunge** or **close**; from out of distance it falls short and you have shown them
your hand for nothing.

So the triangle only applies when you are close enough for it to, and most of the bout is spent
deciding whether to be.

### The double

**If you both attack from inside distance, you both score.** That is the whole reason this is épée
and not foil, it is the only way two lights come on at once, and it is the one outcome that can end
the bout for both of you at 4–4.

---

## 2. The deck

Fifteen cards: **6 attack, 4 parry, 5 step**. You draw a hand of three and play one a turn; the
discard reshuffles when the deck runs out.

The counts are the game. Parries are scarce, so a parry is a read rather than a reflex — and
because the deck is visible, both of you know roughly how many are left. Playing your last parry
is information you are giving away.

## 3. The opponent

Not random, and not perfect. It keeps a short memory of what you have done from each distance and
leans toward the answer — so repeating yourself gets punished, and the way to beat it is to
notice that it noticed.

It also has a tell. It is a fencer: before it attacks, it shifts its weight.

## 4. The look

Same hard constraints: **256 × 240, 25 colours, 8 × 8 grid**, indexed framebuffer, no asset files.

The screen is one picture: the piste across the middle with both fencers on it at their real
distance, the scoring box above with its two lamps, and your hand of three cards along the bottom.
Nothing else. The lamps are the score — red for you, green for them, as a real box is wired — and
they fire the way a real box fires, with the forty-millisecond lockout drawn as the gap between
them when it is a double.

## 5. Sound

The same four-voice APU. The sound that matters is the box: a real scoring box is a buzzer and two
lamps, and the double has to sound like one buzzer, not two.

## 6. Log

**2026-10-03 01:50** — Started after Filament and The Far Light were both finished, verified and
deployed. The third of three, and the one chosen because it shares no genre with either.

---

# 7. Verification

| tool | question | result |
|---|---|---|
| `tools/stress.mjs` | can the bookkeeping break? | **2000 bouts, 963 hours of fencing, five policies, nothing broken** |
| `tools/sim.mjs` | is it a game? | playing well wins **54%**; playing the first card in hand wins **31%** |
| `tools/robust.mjs` | does the browser half survive? | ten restarts, 1×1 to 1600×1000, backgrounding, blur, six mute toggles — no leaks, no errors |

A card game has almost no physics to get wrong and a great deal of **bookkeeping** to get wrong,
and bookkeeping errors are silent: a card that quietly stops existing, a hand refilled from
nowhere, a score creeping past the target. So the invariant that matters counts the deck on every
single tick — all fifteen cards, by type, across deck, hand, discard and in-play — rather than
trusting that it balances.

## 7.1 The bug the soak found, and the rule that fixed it

A policy that **simply retreats for ever** produced a bout that never ended. Neither fencer could
score, because the player kept backing out of distance and the opponent kept following, and the
harness sat there until its guard counter stopped it.

The fix is a real rule rather than an invented one. Fencing has **non-combativity**: a referee
halts a passive bout and brings both fencers back on guard. So after four turns with nobody
scoring, the referee closes the distance for you — and there is a hard backstop at forty turns,
because a rule that triggers on scoring cannot rescue a bout where neither side ever can. A bout
that goes to time is decided on touches, and the ending says so.

## 7.2 No dominant strategy

Across two thousand bouts each — **16,000 bouts, 7,354 hours of fencing, nothing broken**:

| policy | wins | what it is |
|---|---|---|
| draws the parry out | **64.2%** | step to pull the parry, attack the opening it leaves |
| reads the tell | 59.1% | waits a beat, parries when the opponent shifts its weight |
| never attacks | 55.5% | step when out of distance, parry when in |
| plays it properly | 54.3% | the reference player |
| always parries | 33.0% | |
| always attacks | 31.8% | |
| plays at random | 28.3% | |
| always retreats | 21.1% | |

The shape you want is the top of that table, not the bottom. Every single-card strategy losing is
easy; what matters is that the best line is the one that uses all three cards and the information,
and that it is about ten points ahead of simply playing sensibly rather than thirty.

## 7.3 What the council found, and why the soak could not

A reviewer went through the game with fresh eyes and a real browser, and almost everything it found
was in the half of the codebase no tool in this repo imports. 2,000 bouts of soak proved the
bookkeeping was sound and proved nothing whatsoever about the game.

**The game had a dominant strategy and the harness's five policies all missed it.** Parry weakly
dominated step from inside distance — 82% of all turns — because parry against step resolved to
"nothing happens", and nothing happening is free. Write out the net touches from inside distance
against an opponent playing attack `a`, parry `p`, step `s`:

| my card | net touches |
|---|---|
| attack | `s − p` |
| parry | `+a` |
| step | `−a` |

Step is strictly dominated, so a third of the deck was dead a third of the time. A player who
**simply never attacked** beat the reference player 64% to 56%. `turtle`, which was in the harness,
missed it only because it parried out of distance too, where parry is bad; add one line and it
jumps from 35% to 64%. A human finds this in about five minutes.

The fix is the one the sport already uses, above: a parry drawn onto nothing leaves you open for
one exchange. The measurement that says it worked is not that the numbers moved, it is that a
policy which **deliberately** draws the parry and hits the opening is now the best in the table.
If no play could convert the opening, the rule would be decoration.

**The tell was not a tell.** The opponent shifts its weight before it attacks — but the check was
gated on `phaseT > sec(0.4)`, so at 24 ticks of thinking you saw nothing and at 25 you saw a 97%
accurate oracle. Identical logic, with and without the pause: 31.6% versus 60.0%. **Twenty-eight
points of win rate for the act of waiting half a second.** Worse, it was computed from a throwaway
call to `chooseFoe` that the game then discarded and made a *different* decision from; the two
agreed 97% of the time by luck of the score gaps. And no harness exercised it at all — every policy
played on the first tick of its turn, so in 2,000 bouts the tell was shown zero times. The strongest
line in the game was completely untested code.

It now decides once, on the first tick, from the opponent's real committed choice, and it lies:
measured over 14,767 exchanges it shows on **74%** of attacks and on **18%** of things that are not
attacks. A tell you can trust completely is not a tell, it is a scoreboard.

**Four browser bugs, none reachable from the simulation.**

- The second lamp of a double was a wall-clock `setTimeout` that `restart()` never cancelled. The
  end-of-bout panel says *press space*; press it within 260ms and the new 0–0 bout opened with the
  opponent's lamp lit. It is a tick counter now, counting `RULES.lockout` — which had been declared
  in `sim.mjs` and never read while `main.mjs` hardcoded `260` beside it.
- The opponent's score pip lit on the same tick as the **first** lamp, so the scoreboard announced
  the double a quarter of a second before the second lamp did. The game is named after that beat and
  was giving it away itself.
- The card hit boxes were 44 wide with an 8px gap against the 56 and 6 actually drawn. On a phone
  the outer third of the left and right cards was dead and a tap in the gap played card one. This is
  the same mistake as The Far Light's verifier reimplementing its physics: `render.mjs` now exports
  the layout and `main.mjs` asks it.
- Every keystroke during the 2.3 seconds a touch takes to resolve was spliced out of the buffer and
  dropped in silence. And hiding the tab set `paused` while returning never cleared it.

**Forty per cent of the frame was painted black on black.** The hall atmosphere, the far wall and
the ceiling were all drawn in palette entries holding the same `$0F` as the backdrop. This is the
third time that exact trap has been hit in this project, and it is why `palette.mjs` now carries a
comment next to the offending entry.

**The lamps and the fencers used different colours for the same two people.** Red and green lamps
over ochre and blue fencers: the one thing the game asks of you — look up at the box and read who
landed — needed a translation step nothing on screen provided, and only left-versus-right was
carrying it, which the screen shake moves. You are red and they are green now, everywhere.

The honest summary: **an invariant can check that what happens is legal and can never check that
anything happens at all** — and a soak harness, however many hours it runs, only ever exercises the
code its policies reach.
