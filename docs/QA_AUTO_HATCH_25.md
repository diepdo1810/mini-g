# Issue #25 — Auto Hatch + Reserve Queue: Android/Vercel Playtest

Status: IMPLEMENTED ON PR BRANCH; **REAL ANDROID PLAYTEST NOT RUN**.

## Rules accepted 26/10/2026
- 5×5 grid unchanged. Manual move, drag-to-egg, tap/drag merge (same kind + tier), sword combat and boss rules unchanged.
- Broken egg immediately resets with incremented hatchCount and HP; reward snapshot enters FIFO incubator.
- Head reward incubates 2.5s; later rewards WAIT. Countdown stops on Pause/Game Over/Victory.
- Only one Hero automatically deploys per tick. Reserve one board cell; reward waits READY if <=1 empty cell.
- When merging while a reward is READY, allow 0.6s positioning grace before deployment.
- HUD shows up to three queue badges + overflow +N; egg identity revealed after incubation.
- No Claim button or Auto Receive toggle.
- No auto-merge, forced recycling or arbitrary drop of rewards.

## Mobile manual steps (owner, Vercel preview or production)
1. Open Level 1 on Android Chrome (portrait 9:16); confirm entire 5×5 board, eggs and queue fit.
2. Drag Hero A onto egg until it breaks. **Do not** press any receive button. Confirm new HP egg appears immediately.
3. Watch first queue slot count down ~2.5s; confirm one A/ATK1 spawns near bottom row. Repeat egg attacks before queue is empty.
4. Merge two A/ATK1 by tap and by drag. Verify both work. Move Hero, defend multiple waves.
5. Open Level 6 after unlock: test four concurrent eggs, overflow +N, queue FIFO and countdown.
6. If board reaches 24 Heroes, confirm one empty cell remains and queued Hero does not appear until enough merges have freed space.
7. Pause during incubation: timer stops; resume timer continues. Restart clears queue and timers.
8. Run Boss Level 5/10 and observe actual difficulty. Do not conclude balance from automated CI alone.
9. If queue grows too quickly or board becomes stuck without compatible merges, record phone model, level, queue length, board screenshot and reproduction steps.

## Outstanding
- Android Chrome touch, 360×640 and 412×915 physical layout: **NOT RUN**.
- Campaign difficulty and Boss balance: **NOT RUN**.
- Rescue rule for board with no mergeable pairs: **NOT AGREED; out of scope**.
- Vercel availability: depends on Git integration/deployment. A passing CI does not prove deployment or phone usability.
