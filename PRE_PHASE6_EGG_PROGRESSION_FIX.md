# MERGE DEFENSE — PRE-PHASE 6 FIX: MULTI-EGG & BOSS EGG EVOLUTION

**Document ID:** MD-FIX-EGG-01  
**Status:** APPROVED DESIGN — IMPLEMENT BEFORE NEXT PHASE  
**Scope:** Sửa gameplay trứng trên project đang có. Chưa triển khai Phase 6–9.  
**Tech:** Phaser 3 + TypeScript + Vite + pnpm; offline trước, online sau.  
**Related:** `GAME_PLAN.md`, `PHASE3_FEEDBACK_EGG_COMBAT.md`, `PHASE5_QA_PLAYTEST.md`, `PHASE6_9_CAMPAIGN_PLAN.md`.

> **Precedence:** Với các quy tắc liên quan **số lượng trứng, cấp trứng, tỷ lệ nở, HP trứng, lưu tiến trình trứng và replay**, tài liệu này **ghi đè** tài liệu cũ. Những cơ chế còn lại giữ nguyên nếu không có xung đột. Đây là một bản fix/chỉnh thiết kế độc lập, phải PASS trước khi bắt đầu Phase 6–9.

## 1. Mục tiêu và giới hạn

### Mục tiêu

1. Khắc phục nhịp phát triển đội hình chậm khi mỗi trận chỉ có **1 quả trứng**.
2. Tăng số trứng theo **mốc level**, tối đa **5 trứng đồng thời**.
3. Vượt qua level Boss sẽ **mở khóa cấp trứng cao hơn**; trứng cấp cao có thể nở ra hero ATK lớn hơn.
4. Giữ hai cách gây damage lên trứng: **kiếm xoay tự chạm** hoặc **kéo hero thả lên trứng**; hero không rời ô khi đập trứng.
5. Bảo toàn gameplay, tests và save hiện tại; kiến trúc hỗ trợ nhiều level sau này.

### Không làm trong bản fix

- Không viết mới Level Map, scheduler/boss, bộ 10 màn, kết quả Victory/Defeat, online, tài khoản, sprite, skill hoặc animation phức tạp.
- Không thay đổi quy tắc merge `same kind + same tier => tier+1`.
- Không tăng phạm vi kiếm bất thường để đánh tất cả trứng.
- Không thay game engine hiện tại bằng project khác.

> **Phụ thuộc quan trọng:** Nếu Phase 6 chưa có LevelConfig/CampaignProgress, tạo lớp resolver/config thuần và **test bằng levelId/mốc boss mô phỏng**. Không tự triển khai Phase 6. Khi Phase 6 có tiến trình thật, tích hợp resolver này; chỉ persist sau kết quả thắng hợp lệ.

## 2. Quy tắc gameplay đã chốt

### 2.1 Số trứng trong mỗi level

| Level | Trứng hoạt động | Lý do |
|---|---:|---|
| 1 | 1 | Học cơ chế |
| 2–3 | 2 | Tăng tốc mở hero từ sớm |
| 4–5 | 3 | Chuẩn bị Boss 5 |
| 6–10 | 4 | Mốc sau Boss 5 |
| 11 trở đi | 5 | Mốc sau Boss 10; **giới hạn cứng 5** |

- Số trứng **cố định trong một trận**, không cộng thêm trong lúc đánh wave.
- Trứng đã nở **hồi sinh tại cùng slot**, không tạo trứng thứ 6.
- `eggCountForLevel(levelId)` trả về 1..5, độc lập với UI và lưu trữ.
- **MVP 10 level**: hiện tối đa 4 trứng (Level 6–10). Quy tắc 5 trứng dành cho Level 11+ khi campaign được mở rộng, **không tạo Level 11 giả**.

### 2.2 Cấp trứng — phần thưởng Boss

| Hoàn thành mốc | Cấp trứng mở khóa | Áp dụng cho level |
|---|---:|---|
| Chưa thắng Boss 5 | 1 | Level 1–5 |
| Thắng Level 5 | 2 | Level 6–10 |
| Thắng Level 10 | 3 | Level 11–15 (tương lai) |
| Thắng Level 15 | 4 | Level 16–20 (tương lai) |
| Các mốc Boss tiếp theo | Có thể nâng tiếp theo config | Sau Level 20 (chưa triển khai) |

- **Nâng cấp chỉ áp dụng từ trận kế tiếp**, không biến đổi trứng giữa trận đang diễn ra.
- **"Qua Boss" = thắng toàn bộ Boss level với Base HP > 0**, theo luật Victory trong `PHASE6_9_CAMPAIGN_PLAN.md`. Ở thiết kế hiện tại, Boss có thể thoát gây -2 HP nhưng trận vẫn thắng nếu Base HP > 0; vẫn tính hoàn thành level. **Không âm thầm đổi luật thành bắt buộc giết Boss**.
- Mốc thưởng ghi nhận **một lần về mặt unlock**; replay Boss không tạo thêm trứng, không cộng cấp lần nữa.
- **Mở khóa cấp là vĩnh viễn trong campaign**, nhưng khi replay màn cũ, cấp trứng thực tế **giới hạn theo level** để không phá cân bằng/số sao. Ví dụ: đã thắng Boss 10 nhưng replay Level 2 ⇒ 2 trứng cấp 1; chơi Level 8 ⇒ 4 trứng cấp 2. Cấp đã mở khóa vẫn được giữ, không bị hạ trong save.
- Sau khi thắng Level 10, tiến trình có thể ghi đã mở cấp 3, **chưa có Level 11 trong MVP** nên không hiển thị màn mới hoặc cấp 3 trong level hiện có.

### 2.3 Tỷ lệ hero khi nở

`Hero.tier` trong engine hiện tại là **0-based**; `ATK = 2 ** hero.tier`. `eggLevel` là **1-based**. Không đánh đồng hai giá trị.

| Cấp trứng | Hero ATK 1 (`tier=0`) | Hero ATK 2 (`tier=1`) | Hero ATK 4 (`tier=2`) |
|---|---:|---:|---:|
| 1 | 100% | 0% | 0% |
| 2 | 50% | 50% | 0% |
| 3 | 20% | 60% | 20% |

- Đây là **tỷ lệ playtest ban đầu**, chứa trong config, không hard-code ở UI.
- Loại hero giữ như bản hiện tại: `kind='A' | 'B'`, xác suất A/B **50/50**, độc lập với tier. Có thể cấu hình và inject `RandomSource` cho test.
- **Ngoại lệ hướng dẫn:** Chỉ lần nở đầu tiên của **Level 1** đảm bảo `Hero A, tier 0, ATK 1` để người chơi tập ghép. Không áp dụng ép loại/tier cho trứng đầu trong **mọi level**.
- Cấp trứng >= 4: **chừa interface/config extension**, không tự bịa tỷ lệ hoặc mở nội dung chưa được duyệt. Fallback an toàn cho level config chưa hỗ trợ phải có validation/error rõ ràng, không ngầm dùng tỷ lệ sai.
- Hai hero chỉ ghép khi `kind` và `tier` đều giống; hero được nở ATK 2 có thể ghép với hero ATK 2 cùng loại khác.

### 2.4 HP, hồi trứng, nở trứng

- **Mỗi trứng có HP, hatchCount, trạng thái và cooldown riêng.**
- Quy tắc cân bằng đề xuất cho bản fix (đưa vào `GameBalance.ts`, dễ thay):
  - `baseHp(eggLevel) = 3 + 2 * (eggLevel - 1)`.
  - `maxHp = baseHp(eggLevel) + 2 * egg.hatchCount`.
  - Ví dụ trứng cấp 1: `3 -> 5 -> 7`; cấp 2: `5 -> 7 -> 9`.
- `hatchCount` **tính riêng từng trứng**, reset khi bắt đầu/restart trận. Không tăng toàn bộ trứng khi một trứng nở.
- Khi HP về 0: **roll phần thưởng đúng 1 lần** và spawn 1 hero vào ô trống, sau đó reset chính trứng đó; không double hatch khi 2 hit cùng tick.
- Khi bàn cờ đầy: mỗi trứng đã vỡ giữ **tối đa 1 pending hero của chính nó**; không reroll, không nhận thêm sát thương/tiếp tục hồi khi đang pending.
- Khi xuất hiện ô trống: xử lý các pending theo thứ tự ổn định `slotIndex` tăng dần, mỗi ô tối đa 1 hero; trứng đã nhận chỗ được reset và tiếp tục hoạt động. Không làm mất phần thưởng.
- Chặn số trứng hiện có `<= 5`, số hero trên bàn `<= 25`, một hero trên một ô.

### 2.5 Vị trí / va chạm / thao tác

- Hiển thị **tối đa 5 slot trứng** thành một hàng phía dưới bàn cờ (có thể co kích thước theo viewport). Căn đều, không đè đường quái, HUD, đáy màn hoặc lên nhau.
- Tính toán động từ `boardBounds`, `pathBounds`, `cellSize`, `weaponReach`, `eggCount` và `canvas bounds`. Không hard-code tọa độ desktop.
- Hero mép dưới có thể dùng kiếm xoay đánh **ít nhất 1 trứng gần nhất** khi vũ khí thật sự giao hitbox. **Không yêu cầu một hero đánh được cả 5 trứng**.
- Trứng xa kiếm vẫn có thể được đánh bằng **kéo/thả trực tiếp**: pointer từ hero tới vùng hitbox của **một eggId**; damage chỉ cho egg đó; hero giữ nguyên ô.
- Drag tới ô trống ⇒ Move; drag tới hero cùng loại+cấp ⇒ Merge; drag vào trứng ⇒ Attack Egg; drag sai ⇒ Cancel.
- Một thao tác chỉ chọn **một** đích. Không phát sinh drag hit sang các trứng bên cạnh.
- Sword–monster và sword–egg là 2 kiểu va chạm riêng. Kiếm chỉ đánh mục tiêu thực sự chạm, cooldown key theo `(heroId, targetType, targetId)`; `pointerup` chỉ phát 1 lệnh.
- Nếu kiếm và drag cùng hero/cùng trứng xảy ra trong cùng simulation tick: chỉ tính **1 hit**, ưu tiên drag, theo luật Phase 3 feedback.
- Quái trúng đòn không làm trứng mất HP ngoài va chạm thật. Không chia sẻ HP/cooldown/kill event giữa quái và trứng.
- Pause / Game Over / Victory khóa cả orbit damage và drag damage, reset không rò rỉ state/timers.

## 3. API và dữ liệu đề xuất (điều chỉnh theo code hiện tại)

```ts
type HeroKind = 'A' | 'B';
type EggStatus = 'active' | 'pending';

type HatchReward = { kind: HeroKind; heroTier: number };

type EggState = {
  id: string;
  slotIndex: number;       // 0..eggCount-1
  eggLevel: number;        // 1-based, khác Hero.tier
  hp: number;
  maxHp: number;
  hatchCount: number;
  status: EggStatus;
  pendingHero: HatchReward | null;
};

type EggProgressionConfig = {
  maxConcurrentEggs: 5;
  eggCountByLevel: ReadonlyArray<{ fromLevel: number; count: number }>;
  eggLevelMilestones: ReadonlyArray<{ completedBossLevel: number; unlockedEggLevel: number }>;
  hatchWeightsByEggLevel: Record<number, ReadonlyArray<{ heroTier: number; weight: number }>>;
};

// Domain pure, không phụ thuộc Phaser:
function eggCountForLevel(levelId: number): number;
function allowedEggLevelForLevel(levelId: number): number;
function resolveEggLevel(levelId: number, highestUnlockedEggLevel: number): number;
function rollHatch(eggLevel: number, random: RandomSource): HatchReward;
function createEggsForLevel(levelId: number, highestUnlockedEggLevel: number): EggState[];
```

- Khi chưa có CampaignProgress: resolver chạy được ở chế độ test/dev với unlock value **được truyền vào**, không tự hack save.
- Khi Phase 6 thêm tiến trình: `highestUnlockedEggLevel` derive từ các boss level thực sự đã hoàn thành (hoặc persist metadata có version). Không cho client UI tự set giá trị unlocked.
- Save cũ thiếu field egg progression ⇒ migrate/fallback an toàn về cấp 1; không mất `bestStars`, `highestUnlockedLevel`, `results`.
- Cần phân biệt **config/milestone tương lai** với level đã tồn tại; chỉ 10 level từ campaign MVP.

## 4. Nhiệm vụ code — thứ tự ưu tiên

### A. Audit + chuẩn hóa config

- [ ] Đọc toàn bộ tài liệu liên quan và các file thực tế (`GameEngine`, `GameState`, `types`, `GameBalance`, `DragController`, renderers, tests).
- [ ] Xác định hành vi 1 trứng hiện tại; không làm mất các tests cũ.
- [ ] Tạo `EggProgressionConfig`, pure resolver cho count/level, validate tổng weight = 100 và `eggCount <= 5`.
- [ ] Chốt vị trí bổ sung model `EggState[]` trong game state thay cho giả định singleton `egg`.

### B. Nhiều trứng + va chạm chuẩn

- [ ] Khởi tạo N trứng đúng theo `levelId`; Level 1 mặc định vẫn chỉ 1.
- [ ] Hit test riêng từng eggId cho sword và drag; HP/cooldown/hatchCount riêng.
- [ ] Nở đúng 1 hero/trứng; xử lý pending độc lập khi board đầy.
- [ ] Tương thích Move/Merge/Pause/Resume/Restart, không leak input listeners.

### C. Tỷ lệ nở + cấp trứng

- [ ] Xây `rollHatch(eggLevel, injectedRandomSource)` với bảng tỷ lệ và kiểu hero A/B.
- [ ] Ngoại lệ tutorial chỉ cho Level 1, lần nở đầu.
- [ ] Hero ATK/tier đúng hệ hiện tại; không nhầm cấp trứng và tier hero.
- [ ] Tạo chức năng `resolveEggLevel` giữ milestone boss, có level cap khi replay.
- [ ] Chừa hook cho Phase 6 xử lý nâng cấp **sau victory**; không tự tạo/cập nhật campaign khi level map chưa tồn tại.

### D. UI mock và regression

- [ ] Render 1–5 hình trứng đơn giản, HP riêng, có label cấp hoặc màu viền khác nhau (không cần sprite).
- [ ] Trên desktop và viewport 9:16, 5 trứng vẫn nhìn rõ, vùng chạm không chồng nhau.
- [ ] Trạng thái `pending` hiển thị rõ và không nhận damage.
- [ ] Giữ overlay/HUD, kiếm xoay, quái, wave và luật 2048 hiện tại.

## 5. Automated acceptance tests (bắt buộc)

| ID | Scenario | Expected |
|---|---|---|
| E01 | `eggCountForLevel(1, 2, 3, 4, 5, 6, 10, 11, 99)` | `1,2,2,3,3,4,4,5,5` |
| E02 | Level 1 khởi tạo | 1 active egg, 1 hero A ATK 1, HP trứng 3 |
| E03 | Level 6, unlock Boss 5 | 4 trứng cấp 2, HP ban đầu mỗi trứng 5 |
| E04 | Level 10, unlock Boss 5 | 4 trứng cấp 2; không có level 11 trên map |
| E05 | Hoàn thành Boss 5 trong giữa trận | Không thay trứng trận đang chạy; chỉ trận Level 6 trở đi được cấp 2 |
| E06 | Hoàn thành Boss 10 | Mốc cấp 3 được ghi nhận; không tự mở Level 11 (MVP giới hạn 10) |
| E07 | Replay Level 2 sau Boss 10 | 2 trứng cấp 1; campaign vẫn giữ unlock cao |
| E08 | Nở 1 trong 4 trứng | Chỉ trứng đó tăng hatchCount, HP reset theo riêng nó |
| E09 | Sword hit monster, không giao egg | Monster mất HP; 4–5 trứng giữ nguyên HP |
| E10 | Sword hit 2 egg hitboxes thật | Chỉ 2 trứng đó giảm HP, theo cooldown từng `eggId` |
| E11 | Drag tới trứng thứ 4 | Trứng #4 nhận đúng 1 hit; hero giữ nguyên; trứng khác không mất HP |
| E12 | Orbit + drag cùng tick, cùng hero và egg | Đúng 1 hit |
| E13 | 2 trứng cùng chạm 0 HP | Spawn đúng 2 reward nếu đủ ô; không duplicate |
| E14 | Board 25 ô đầy, 2 trứng vỡ | 2 pending reward cố định; sau 2 merge giải phóng ô, nhận đúng 2 hero |
| E15 | Roll cấp 1/2/3 với mock RNG biên 0, .49, .5, .79, .8, .99 | Hero tiers đúng weight; deterministic; loại A/B đúng RNG |
| E16 | Tutorial level 1 hatch lần đầu | A tier0; các lần sau A/B theo RNG; level khác không ép A |
| E17 | Merge A tier1 + A tier1 | A tier2, ATK4; B tier1 không ghép với A tier1 |
| E18 | Pause/Defeat/Victory | Không tự đánh trứng, không drag, HP và cooldown đóng băng |
| E19 | Restart giữa level có 4 trứng | Reset đúng 4 trứng, HP/hatchCount/cooldown; 1 hero ATK1; không rò event |
| E20 | 9:16 với 5 trứng | Không tràn màn, overlap hoặc che hitbox; tương tác drag chính xác |
| E21 | Replay boss thắng nhiều lần | Không nhân đôi số trứng hoặc nâng trứng thêm cấp |
| E22 | Save version cũ không có egg progression | Đọc không crash, vẫn giữ stars/unlocked/results |

**Quality gates:** `pnpm typecheck`, `pnpm test`, `pnpm build` đều PASS. Kiểm thử Playwright ít nhất Level 1, Level 6 mock unlocked, viewport mobile 9:16; kèm screenshot. Với campaign chưa sẵn có, E03/E05/E06/E07/E21/E22 chạy bằng domain/integration harness, không dựng Level Map ngoài scope.

## 6. Rủi ro cần tránh

1. **Bùng nổ hero:** 4–5 trứng có thể tăng spawn nhanh; dùng HP progression/cooldown như config, không tự tăng tốc độ kiếm hoặc sinh hero miễn phí ngoài cơ chế.
2. **Không đủ tầm kiếm:** Nhiều trứng phân bố ngang khiến kiếm một hero không chạm hết; đó là hành vi hợp lệ. Drag vẫn mở được trứng xa.
3. **Bàn cờ đầy:** pending per egg, phát quà công bằng, không mất hoặc reroll.
4. **Phá save:** không reset campaign hiện có chỉ để thêm egg milestone; migration phải idempotent.
5. **Unlock sai thời điểm:** Boss level được thắng mới upgrade; replay không cộng dồn; no mid-match upgrade.
6. **Lẫn `hero.tier` và `eggLevel`:** trứng cấp 2 có thể sinh hero tier 0 hoặc 1; không mặc định cấp trứng là ATK.
7. **Tự làm thêm Phase 6–9:** tuyệt đối không. Fix xong bàn giao báo cáo, chờ duyệt.

## 7. Definition of Done

- [ ] `EggState[]` thay được logic giả định 1 trứng (không làm hỏng tương thích tính năng cũ).
- [ ] 1/2/3/4/5 trứng theo milestone Level, giới hạn <=5.
- [ ] Boss milestones mở khóa cấp trứng vĩnh viễn, áp dụng từ level sau; replay giữ cân bằng.
- [ ] Tỷ lệ nở cấp 1/2/3 kiểm chứng bằng RNG mock; hero merge chuẩn.
- [ ] Va chạm/trừ HP/roll/spawn/cooldown của từng trứng tách riêng; không ảnh hưởng combat quái.
- [ ] Drag, auto sword, merge, pause, restart hoạt động với nhiều trứng.
- [ ] UI mock 9:16, 5 egg slots không chồng lấn; không cần đồ họa đẹp.
- [ ] Các bài test E01–E22 phù hợp phạm vi hiện tại PASS; các test phụ thuộc Phase 6 chỉ cần domain harness.
- [ ] Typecheck, unit/integration tests và build PASS; report đầy đủ.
- [ ] **Dừng trước Phase 6**; không tự động chuyển tiếp.

## 8. Format bàn giao bắt buộc

```text
FIX: MD-FIX-EGG-01
STATUS: PASS | PARTIAL | FAIL
FILES CHANGED:
- ...
IMPLEMENTED:
- Egg count per level ...
- Egg tier after boss milestones ...
- Hatch probabilities ...
- Multi-egg combat / drag / pending ...
CHECKS:
- pnpm typecheck: ...
- pnpm test: ...
- pnpm build: ...
MANUAL TEST:
- ...
MIGRATION / COMPATIBILITY:
- ...
ISSUES:
- ...
NEXT: Chờ xác nhận trước Phase 6. Không tự triển khai phase tiếp theo.
```
