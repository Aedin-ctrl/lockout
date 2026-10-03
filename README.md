# Lockout

**[Play it](https://www.aedinlai.com/lockout/)** · [all four games](https://www.aedinlai.com/games/)

An épée duel as a card game.

Attack beats step, parry beats attack, and a parry that catches nothing leaves you **open** for one
exchange — the sport's own answer, and the rule that makes the third edge of the triangle real. All
of it only applies from inside distance, and if you both attack from inside distance **you both
score**. That last part is the entire reason this is épée and not foil.

**Verified** across 16,000 bouts and 7,354 hours of simulated fencing against eight policies. The
strongest line is the one that uses all three cards and the opponent's tell; never attacking is
merely level with playing sensibly, which it was not before — it used to win by eight points.

## Run it

No build step and no dependencies. Serve the folder and open it:

```sh
python3 -m http.server 8000
```

Add `?dev` for a state hook on `window` and palette validation in the console.

## How it is checked

`tools/` holds the harnesses. They are the point of the project as much as the game is, and
`DESIGN.md` records what each of them caught.

```sh
node tools/stress.mjs     # soak, with invariants on every tick
node tools/robust.mjs     # restarts, resizes, backgrounding, audio-node leaks
```

One lesson is worth stating here rather than only in the design document: **a test that passes may
simply never have run.** Several harnesses in this project reported success while exercising almost
nothing — one pressed no buttons for three hundred runs, another never climbed past the first of
eleven screens. They now report how much they actually did, and fail loudly when that is near zero.


## The design document

[`DESIGN.md`](DESIGN.md) is the real record: the plot, the decisions and the reasoning behind them, and a candid log of every bug with the check that now prevents it. Most of those bugs were found by review rather than by the test suite, because **no tool in this repository imports `render.mjs` or `main.mjs`** — the simulation is well covered and the half of the code a player actually experiences is not.
