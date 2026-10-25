# Phase 8 — Balance baseline / Playtest log

Status: **STATIC BASELINE ONLY** (not a claim that the game is fun or balanced). Source: `PHASE6_9_CAMPAIGN_PLAN.md` and `src/game/config/levels.ts`.

## Initial 10-level profile

| Level | Waves | Normal monsters | Boss | Total configured enemy HP | Eggs | Effective egg tier |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| 1 | 3 | 5 | — | 21 | 1 | 1 |
| 2 | 3 | 7 | — | 36 | 2 | 1 |
| 3 | 4 | 10 | — | 57 | 2 | 1 |
| 4 | 4 | 12 | — | 81 | 3 | 1 |
| 5 | 5 | 14 | HP 40 | 139 | 3 | 1 |
| 6 | 4 | 14 | — | 111 | 4 | 2 |
| 7 | 4 | 16 | — | 148 | 4 | 2 |
| 8 | 4 | 18 | — | 187 | 4 | 2 |
| 9 | 4 | 20 | — | 235 | 4 | 2 |
| 10 | 5 | 23 | HP 85 | 405 | 4 | 2 |

- One enemy traverses one rectangular loop; escaped normal costs 1 Base HP, boss costs 2.
- Base HP starts at 3. Egg-tier progression unlocks after winning boss 5 and boss 10; the campaign ends at Level 10, so tier 3 applies to future levels only.
- Level 6 has lower configured enemy HP than Boss Level 5 intentionally; stronger eggs arrive immediately after boss 5.
- These are totals of **spawn HP**, not actual player damage or a difficulty score.

## Manual playtest still required

Test on Android Chrome, portrait 9:16 (several widths if possible). For each level record:

| Level | Attempts to clear | Highest wave | Base HP on victory | Eggs hatched | Hero ATK max | Time spent | Friction/bug |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | NOT TESTED | — | — | — | — | — | — |
| 2 | NOT TESTED | — | — | — | — | — | — |
| 3 | NOT TESTED | — | — | — | — | — | — |
| 4 | NOT TESTED | — | — | — | — | — | — |
| 5 | NOT TESTED | — | — | — | — | — | — |
| 6 | NOT TESTED | — | — | — | — | — | — |
| 7 | NOT TESTED | — | — | — | — | — | — |
| 8 | NOT TESTED | — | — | — | — | — | — |
| 9 | NOT TESTED | — | — | — | — | — | — |
| 10 | NOT TESTED | — | — | — | — | — | — |

Track especially: first hero/egg reachability, whether a user can open eggs before initial wave completes, excessive drag frequency, early-game fail loops, 4-egg tap targets, boss visibility, and whether all levels are feasible without exploiting the game.

## Adjusting balance later

1. Change only `src/game/config/levels.ts` or approved constants in `GameBalance.ts`.
2. Explain each changed value using recorded playtest observations.
3. Update `tests/level_balance.test.ts` expected config *only* after owner approves tuning.
4. Re-run typecheck/test/build and regression tests for all ten levels.

No claim of full Phase 8 acceptance without manual playtest results.
