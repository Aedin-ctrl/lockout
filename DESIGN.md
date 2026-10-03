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

Which is a triangle: **attack beats step, parry beats attack, step beats parry** — because a parry
with nothing to parry is a wasted turn and you have used the distance against them.

### Distance is the second axis

Three measures: **out of distance**, **lunge**, **close**. A step moves one measure. An attack only
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

Across four hundred bouts each:

| policy | wins |
|---|---|
| plays it properly | **57%** |
| always parries | 35% |
| always attacks | 30% |
| plays at random | 30% |
| always retreats | 24% |

Which is the shape you want: every single-card strategy loses to the opponent's memory, and
understanding the triangle is worth about twenty-five points.
