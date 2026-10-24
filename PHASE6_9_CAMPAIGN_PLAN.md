# MERGE DEFENSE — CAMPAIGN / LEVEL SYSTEM (PHASE 6–9)

> **Trạng thái:** Thiết kế đã chốt để Antigravity triển khai.  
> **Ngày:** 24/10/2026 · **Phiên bản:** 1.0  
> **Dự án:** Game offline 2D, Phaser 3 + TypeScript + Vite + pnpm.  
> **Tài liệu liên quan:** `docs/GAME_PLAN.md`, `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`, `docs/PHASE5_QA_PLAYTEST.md`.

## 0. Chỉ thị quan trọng cho Antigravity

1. **Sửa project hiện tại. Không tạo project mới.** Giữ phần Phase 0–5 đã chạy ổn.
2. Tài liệu này **mở rộng và ghi đè** các giả định cũ liên quan đến `5 wave cố định`, `chỉ có 1 màn`, `boss nằm ngoài phạm vi MVP`, `Restart luôn quay về Wave 1 của trò chơi`.
3. Những luật **không thay đổi**: bàn cờ 5×5; tối đa 1 hero/ô; kiếm xoay quanh hero; trứng tự nhận sát thương khi kiếm thực sự chạm; thao tác kéo vào trứng gây 1 hit; 2 hero cùng loại+cấp mới ghép `1+1=2`, `2+2=4`...; combat độc lập với Phaser; offline.
4. Không thêm sprite đẹp, hoạt ảnh phức tạp, multiplayer, đăng nhập, backend, vật phẩm trả phí hay hệ kinh tế.
5. **Không triển khai cả 4 phase trong một lần.** Hoàn thành từng phase, chạy tests/build, báo kết quả, rồi mới tiếp tục.
6. Cấu hình, số máu, tốc độ, số lượng quái phải **data-driven**, tập trung trong config. Các số bên dưới là **mốc playtest**, không phải công thức tăng vô hạn.
7. **Không phá các test cũ.** Khi một test cũ kiểm tra luật đã được thay bằng đặc tả mới (ví dụ 5 wave cố định), điều chỉnh test có lý do và bổ sung regression test.

---

## 1. Tầm nhìn gameplay

**Game = thủ thành + gacha trứng miễn phí + ghép 2048 + bản đồ tiến trình kiểu Candy Crush.**

- Người chơi chọn **Level** trên bản đồ. Bắt đầu một trận độc lập.
- Một **Level** gồm nhiều **Wave** quái. Level 5 và 10 có **Boss** ở wave cuối.
- Hero cố định trong ô nhưng kéo được để đổi ô, ghép, hoặc đập trứng. Kiếm của hero tự xoay để đánh mục tiêu va chạm.
- Quái tiến một vòng hình vuông quanh bàn cờ. Quái đi hết vòng vẫn sống ⇒ **thoát** ⇒ **căn cứ mất HP**.
- Thắng level ⇒ chấm sao, lưu thành tích, mở level kế tiếp. Thua ⇒ chơi lại level đó.
- Sang level mới ⇒ **đội hình, trứng, kills, HP, timer đều reset**, chỉ lưu **tiến trình campaign**.

### Phân biệt thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| `Level` | Màn chọn từ bản đồ, có `id`, wave config, tiến trình, số sao. |
| `Wave` | Một đợt spawn theo thứ tự trong level. |
| `Enemy` | Quái thường; khi thoát trừ 1 Base HP. |
| `Boss` | Quái có HP cao, hình khác dễ nhận biết; khi thoát trừ 2 Base HP. |
| `Base HP` | Máu căn cứ, bắt đầu 3 mỗi level. |
| `Hero ATK` | `2 ** tier`; mọi level bắt đầu 1 hero A, tier 0, ATK 1. |
| `Egg HP` | Trứng bắt đầu 3, sau mỗi lần nở tăng 2: 3 → 5 → 7...; reset mỗi level. |

---

## 2. Luật chơi CHỐT

### 2.1. Chọn màn, thắng/thua, tiến trình

- Có **10 level** ban đầu; chỉ **Level 1** được mở lần đầu.
- Màn chưa mở không thể nhấn Play / truy cập qua URL hoặc route trực tiếp.
- Thắng một level khi **toàn bộ wave đã spawn đủ**, **không còn quái sống/đang di chuyển**, `Base HP > 0`.
- Thua ngay khi `Base HP <= 0`; ngừng mọi timer, spawn, di chuyển, sát thương, input gameplay.
- Thắng level N: `highestUnlockedLevel = max(highestUnlockedLevel, min(N+1, 10))`.
- Có thể chơi lại level đã mở, cải thiện số sao; **không ghi đè kết quả tốt bằng kết quả thấp hơn**.
- Restart trong trận: chơi lại **level hiện tại**, không trở về Level 1.
- Trên overlay Victory / Defeat có nút **Retry** và **Map**. Trên Victory có thêm **Next Level** nếu level tiếp theo tồn tại và đã mở. Level 10 kết thúc campaign MVP, không giả vờ có Level 11.
- Từ bản đồ vào level N → tạo `GameState` mới hoàn toàn; **không mang hero/ATK/egg HP** từ level trước.

### 2.2. Máu căn cứ / quái thoát

- `baseHP = 3` cho mọi level MVP.
- Enemy thường hoàn thành **đúng 1 vòng** đường hình vuông mà còn sống ⇒ despawn và trừ **1 HP**.
- Boss hoàn thành đúng 1 vòng mà còn sống ⇒ despawn và trừ **2 HP**.
- Quái chỉ thoát **một lần**, không tiếp tục chạy vòng khác, không tăng `Kills`.
- Kill ⇒ quái biến mất và `Kills +1`; không trừ Base HP.
- Khi một quái chạm mốc cuối vòng cùng tick với cú chém chí mạng: ưu tiên **tính sát thương và loại quái chết trước**, rồi mới xử lý escape cho những quái còn sống (đảm bảo deterministic).
- Khi nhiều quái cùng thoát: tính tổng damage, chặn Base HP ở `0`, phát ra **1** Game Over; không tiếp tục chuyển wave/victory.
- Pause ngừng hoàn toàn bộ đếm đường đi, cooldown va chạm, timer chuyển wave, thời gian spawn. Resume không chạy dồn các sự kiện missed trong thời gian tạm dừng.

### 2.3. Boss

- Chỉ tại **Level 5** và **Level 10**, ở **wave cuối** (spawn sau quái thường trong wave đó).
- Boss là một `Enemy` có `type: 'boss'`, dùng **chung hệ di chuyển, va chạm, lifecycle**; không viết một engine boss riêng.
- Tốc độ boss thấp hơn quái thường cùng level. HP boss ban đầu khoảng **4–5 lần HP quái thường** của wave cuối, chỉ là mốc để chỉnh sau playtest.
- Mock boss bằng hình tròn lớn hơn, viền đậm, chữ `BOSS` + HP, màu dễ phân biệt. Không yêu cầu sprite.
- Boss chết ⇒ tính 1 kill, wave có thể kết thúc nếu mọi quái đã kết thúc.
- Boss thoát ⇒ -2 Base HP đúng 1 lần.
- Wave không hoàn thành sớm khi vẫn còn boss sống.

### 2.4. Hero, kiếm, trứng (giữ luật Phase 3/5)

- Hero khởi tạo ở **hàng cuối, cột giữa `(row=4, col=2)`** để kiểm thử kiếm gần trứng. Đây là **thay đổi có chủ đích** so với mặc định `(0,2)` của tài liệu prototype cũ. Nếu trục row của code hiện tại đảo chiều, chọn ô **giữa mép sát trứng** tương đương; ghi rõ mapping.
- **Trứng nằm ngay dưới bàn cờ, sát vòng quái nhưng không đè lên đường quái.** Khoảng cách đủ để kiếm của hero mép dưới thật sự chạm trứng khi xoay; không cố kéo dài kiếm bất thường.
- Kiếm tự xoay, chỉ gây damage khi **hitbox vũ khí giao mục tiêu**. Đánh quái nhưng **không chạm trứng** ⇒ trứng không mất HP.
- Hit cooldown tính độc lập theo `heroId:targetType:targetId`; mỗi lần chạm không trừ HP liên tục theo frame.
- Kéo từ hero vào trứng và **thả thành công** ⇒ trứng nhận đúng **1 hit** bằng ATK hero; hero vẫn đứng nguyên ô. Không tính hit kéo 2 lần do `pointerup` trùng sự kiện.
- Kéo tới ô trống ⇒ Move. Kéo hero cùng kind+tier ⇒ Merge. Sai loại/cấp ⇒ không đổi.
- Trứng đầu nở A ATK 1; trứng tiếp theo ngẫu nhiên A/B (nguồn RNG injectable).
- Bàn cờ đầy ⇒ giữ phần thưởng `readyToHatch`, khi ghép giải phóng ô thì spawn hero pending, không sinh trùng.
- Khi `Pause`, `Game Over`, `Victory`: khóa drag, đập trứng, ghép.
- Egg HP `3 + 2 * hatchCount` tính trong phạm vi trận và reset về 3 ở level tiếp theo.

### 2.5. Sao và điểm

- Victory, còn **3 HP ⇒ 3 sao**; **2 HP ⇒ 2 sao**; **1 HP ⇒ 1 sao**.
- Defeat ⇒ **0 sao** và **không mở khóa level**.
- `bestStars` cho mỗi level = `max(bestStars, currentStars)`; số sao toàn campaign là tổng `bestStars` đã đạt.
- MVP không có tiền, năng lượng, lives, loot, vật phẩm trả phí, gacha bằng tiền.

---

## 3. Nội dung 10 màn đầu (giá trị playtest)

> Đây là **config thử nghiệm**, phải playtest để đảm bảo thắng được bằng 1 hero khởi đầu và hệ trứng/ghép. Giữ mức khó tăng nhẹ, đừng biến Level 1 thành quá khó.

| Level | Wave | Lượng quái thường từng wave | HP quái theo wave | Tốc độ quái (px/s) | Boss cuối màn |
|---|---:|---|---|---:|---|
| 1 | 3 | 1 / 2 / 2 | 3 / 4 / 5 | 32 | Không |
| 2 | 3 | 2 / 2 / 3 | 4 / 5 / 6 | 33 | Không |
| 3 | 4 | 2 / 2 / 3 / 3 | 4 / 5 / 6 / 7 | 34 | Không |
| 4 | 4 | 2 / 3 / 3 / 4 | 5 / 6 / 7 / 8 | 35 | Không |
| 5 | 5 | 2 / 3 / 3 / 4 / 2 | 5 / 6 / 7 / 8 / 9 | 35 | **Boss HP 40**, speed 27 |
| 6 | 4 | 3 / 3 / 4 / 4 | 6 / 7 / 8 / 10 | 36 | Không |
| 7 | 4 | 3 / 4 / 4 / 5 | 7 / 8 / 10 / 11 | 37 | Không |
| 8 | 4 | 4 / 4 / 5 / 5 | 8 / 10 / 11 / 12 | 38 | Không |
| 9 | 4 | 4 / 5 / 5 / 6 | 9 / 11 / 12 / 14 | 39 | Không |
| 10 | 5 | 4 / 5 / 5 / 6 / 3 | 10 / 12 / 14 / 16 / 18 | 40 | **Boss HP 85**, speed 29 |

**Quy ước:** Cột “Lượng quái thường” **không bao gồm boss**. Level 5/10 spawn **thêm đúng 1 boss ở wave cuối**. Wave cuối chỉ kết thúc sau khi boss chết hoặc thoát.

Thông số chung:

- `spawnIntervalMs = 2500` (quái thường và boss theo hàng đợi, không cùng lúc).
- `interWaveDelayMs = 2000`.
- `baseHP = 3`.
- `normal.escapeDamage = 1`; `boss.escapeDamage = 2`.
- `normal` dùng `speed` ở bảng; `boss` dùng speed riêng.
- Dùng cùng đường đi hình chữ nhật hiện có, đảm bảo 1 vòng duy nhất.
- **Không tăng độ khó vô hạn bằng công thức**. Mỗi level là dữ liệu khai báo. Có thể viết helper `makeLevel` để tạo config nhưng dữ liệu đã chốt vẫn phải kiểm soát được.

### Ví dụ Level 1

- Wave 1: 1 quái HP 3, speed 32.
- Wave 2: 2 quái HP 4, speed 32.
- Wave 3: 2 quái HP 5, speed 32.
- Victory nếu không còn quái và Base HP > 0; lưu sao; mở Level 2.

### Ví dụ Level 5

- Wave 1–4 như bảng.
- Wave 5: 2 quái thường HP 9, speed 35; sau đó boss HP 40, speed 27.
- Boss thoát khi Base HP 3 ⇒ giảm còn 1; vẫn có thể Victory nếu tất cả quái khác đã giải quyết và Base HP còn >0 (nhận 1 sao). **Không bắt buộc giết boss để qua màn ở bản MVP**; thoát gây phạt HP, thống nhất với quy tắc mọi quái. Nếu muốn bắt buộc hạ boss, đó là thiết kế v2, không tự thêm.

---

## 4. UI/UX — thiết kế chức năng, chưa làm đẹp

### 4.1. Flow

```text
Open Game
   ↓
Level Map (Level 1 unlocked)
   ↓ choose unlocked Level
Gameplay (fresh state, Wave 1 / N)
   ├── Base HP = 0 → Game Over → Retry / Map
   └── All waves done, Base HP > 0 → Victory + Stars
                                  ├── Retry
                                  ├── Map
                                  └── Next Level (except Level 10)
```

### 4.2. Màn Level Map

- Hiển thị **10 nút tròn đánh số 1–10** nối bằng đường cong/zigzag đơn giản, gợi cách đi level Candy Crush; **không sao chép giao diện, nhân vật, hình ảnh**.
- `unlocked`: nhấn được; `locked`: xám + biểu tượng khóa, không vào được.
- `completed`: hiển thị 1–3 ngôi sao đạt tốt nhất.
- Level 5, 10 có nhãn `BOSS`.
- Có thể scroll nếu màn nhỏ; ưu tiên trong khung 9:16, vùng chạm >= 44 px CSS hoặc quy đổi hợp lý.
- Header tổng sao đã thu thập (tối đa 30), nút âm thanh không bắt buộc.
- Phải có lối quay từ gameplay về Map (`Pause` menu / overlay); cần xác nhận nếu đang chơi: nút `Back to Map` hủy tiến trình trận hiện tại; **không thay đổi tiến trình campaign**.

### 4.3. HUD gameplay

- Dòng đầu: `LEVEL 3` · `WAVE 2/4` · `BASE HP 3/3` · `Kills`.
- Boss: thanh HP hoặc số HP nổi bật `BOSS 40/40`; trên map ghi level boss.
- Giữ HUD không đè đường quái, bàn cờ, trứng.
- Pause/Resume/Restart hoạt động trong phạm vi **level hiện tại**.
- Victory overlay: `LEVEL COMPLETE`, 1–3 sao, `Retry`, `Map`, `Next`.
- Game Over overlay: `DEFEAT`, level/wave/kills, `Retry`, `Map`.
- Vẫn chỉ dùng hình tròn, chữ, hình vuông, kiếm hình chữ nhật; không thêm art.

---

## 5. Kiến trúc dữ liệu — tránh hard-code 10 scene

Đề xuất interface (tên điều chỉnh theo code hiện có; giữ nguyên ý nghĩa):

```ts
type EnemyType = 'normal' | 'boss';

type EnemySpawnConfig = {
  type: EnemyType;
  hp: number;
  speed: number;          // px/s
  escapeDamage: number;   // normal=1, boss=2
};

type WaveConfig = {
  spawnIntervalMs: number;
  enemies: EnemySpawnConfig[]; // thứ tự spawn tường minh
};

type LevelConfig = {
  id: number;
  baseHP: 3;
  waves: WaveConfig[];
  isBossLevel: boolean; // metadata cho Map, không tự tạo boss
};

type LevelResult = {
  bestStars: 0 | 1 | 2 | 3;
  bestKills: number;
};

type CampaignProgress = {
  schemaVersion: 1;
  highestUnlockedLevel: number; // 1..10
  results: Record<number, LevelResult>;
};
```

**Lưu ý thiết kế:** Boss tồn tại **chỉ trong `waves[].enemies[]`**. `isBossLevel` chỉ là metadata để render map; **không spawn thêm boss dựa trên cờ này**. Như vậy không có lỗi spawn boss 2 lần.

Tách lớp (tùy cấu trúc hiện tại):

```text
src/game/
  config/
    GameBalance.ts           # combat/egg constants đã có
    levels.ts                # Level 1..10 data, validate config
  domain/
    GameEngine.ts            # gameplay + wave state hiện tại, nhận LevelConfig
    GameState.ts             # currentLevelId, Base HP, wave, hero, egg...
    LevelRules.ts            # pure: stars, unlock, level result
    types.ts
  campaign/
    CampaignController.ts    # chọn level, bắt đầu trận, xử lý kết quả
    ProgressRepository.ts    # interface đọc/ghi tiến trình
    IndexedDbProgress.ts     # offline implementation
  render/
    LevelMapRenderer.ts      # map 10 level, simple shapes
    HudRenderer.ts           # LEVEL / WAVE / BOSS / results
  input/
    DragController.ts        # giữ xử lý hiện tại
  main.ts

tests/
  campaign.test.ts
  level-config.test.ts
  enemy-escape.test.ts
  boss.test.ts
  progression.test.ts
```

Không bắt buộc đổi tên/move toàn bộ file nếu project đang dùng module tương đương. **Ưu tiên adapter/refactor nhỏ.**

### 5.1. GameEngine API tối thiểu

```ts
startLevel(levelConfig: LevelConfig): GameState;
restartLevel(): GameState;
update(deltaMs: number): void;
pause(): void;
resume(): void;
getResult(): { levelId: number; victory: boolean; stars: 0 | 1 | 2 | 3 } | null;
```

- `GameEngine` không đọc trực tiếp `IndexedDB`, không phụ thuộc UI scene.
- `CampaignController` nhận kết quả game, cập nhật `CampaignProgress`, sau đó chuyển màn.
- UI chỉ gọi controller; không tự set `highestUnlockedLevel`.
- Engine mỗi lần start/restart phải xóa hero/monster/egg/cooldown/timer cũ; **không leak listeners**.

### 5.2. Lưu offline

- Lưu **bằng IndexedDB** thông qua `ProgressRepository`; dữ liệu nhỏ, dùng một record khóa `campaign-v1` hoặc cấu trúc tương đương.
- Khi mới chơi: `{schemaVersion:1,highestUnlockedLevel:1,results:{}}`.
- Lưu khi **Victory** (và chỉ sau khi trạng thái kết thúc được xác thực); save kết quả tốt nhất, mở khóa màn kế.
- Defeat/Restart/đóng tab giữa trận **không mở khóa level**, không lưu đội hình giữa trận.
- Nếu IndexedDB không dùng được: hiện thông báo tiến trình không thể lưu; có thể fallback in-memory trong phiên, **không báo lưu thành công giả**.
- Kiểm tra dữ liệu nạp vào: clamp level 1..10, stars 0..3; nếu JSON/record lỗi thì fallback khởi tạo, cảnh báo console, không crash.
- Save phiên bản có `schemaVersion` để nâng cấp về sau.
- Khi nhiều lượt Victory nhanh: serialize hoặc transaction lưu để không mất bản ghi tốt nhất (ưu tiên `max(bestStars, newStars)` và `max(highestUnlockedLevel, newUnlock)`).

### 5.3. Định hướng online tương lai (KHÔNG triển khai)

- `ProgressRepository` có thể thay `IndexedDbProgress` bằng server adapter khi cần đồng bộ.
- `LevelConfig` định danh và có `configVersion` nếu thực sự cần quản lý thay đổi về sau.
- Khi multiplayer, server authoritative cho trận và tiến trình; **không tin save / result do client gửi**.
- Chưa viết code network/WebSocket/Reverb/Laravel ở Phase 6–9.

---

## 6. Kế hoạch triển khai từng phase

### PHASE 6 — Level System, Map, Progress

**Mục tiêu:** Từ prototype 5 wave cố định sang game nhiều level mà **giữ nguyên combat đang hoạt động**.

Công việc:

1. Tạo `LevelConfig` + config 10 level (chưa cần boss hoạt động, boss config chuẩn bị sẵn).
2. Refactor wave scheduler trong `GameEngine` nhận `LevelConfig.waves`; wave hiển thị đúng `N` thay vì cố định 5.
3. Làm Map 10 nút tròn số, khóa/mở, sao, nhãn boss; menu Play level đã mở.
4. Lưu campaign bằng repository + IndexedDB; thắng level N mở N+1; không mở khi thua.
5. Retry làm mới **level hiện tại**; Back to Map không lưu trận dở.
6. Khi tải lại trang, tiến trình đã hoàn tất không mất.
7. Chưa chỉnh combat kiếm/trứng/merge ngoài bug cần thiết để đảm bảo chạy được.

**Acceptance — PASS nếu:**

- New game chỉ chọn được Level 1; không vào Level 2 bằng route/URL trái phép.
- Level 1 có 3 wave, thắng unlock Level 2, replay Level 1 bình thường.
- Reload vẫn thấy Level 2 mở, bestStars chính xác.
- Game Over không unlock; Restart giữ đúng level đang chơi và reset state sạch.
- Không còn hard-code `5` trong logic giới hạn số wave.
- `pnpm typecheck`, `pnpm test`, `pnpm build` PASS.

**Chỉ sau PASS Phase 6 mới triển khai Phase 7.**

### PHASE 7 — Escape Damage & Boss

**Mục tiêu:** Cơ chế quái thoát và boss nhất quán, kiểm thử được.

Công việc:

1. Rà soát **escape logic Phase 0–5 đã có**; sửa nếu thiếu, **không tạo cơ chế escape thứ 2**.
2. Quy tắc đúng 1 vòng, mất HP 1 lần, không tính kill, xử lý thắng/thua đúng.
3. Thêm enemy `boss` chung path và combat; HP/tốc độ từ wave config; thoát -2 HP.
4. Spawn boss sau quái thường wave cuối Level 5/10; HP hiển thị rõ trên UI.
5. Pause/Resume và restart không nhân đôi boss/quái.
6. Unit tests cho escape, boss, đồng thời va chạm/chết/thoát, baseHP 0.

**Acceptance — PASS nếu:**

- 1 normal thoát: `3→2`, `Kills` không tăng. 1 boss thoát: `3→1`.
- HP còn 1, boss thoát: `1→0`, Game Over ngay.
- Quái chết tại mốc cuối vòng không đồng thời trừ HP.
- Level 5/10 wave cuối đúng **1 boss**; Level khác không có boss.
- Chỉ Victory nếu toàn bộ quái đã chết/thoát và Base HP > 0.
- Kiếm/egg không bị tính damage chéo; test cũ vẫn PASS.

### PHASE 8 — 10 Level Balance & Flow

**Mục tiêu:** Chơi được liên tục 10 level, độ khó hợp lý.

Công việc:

1. Dùng đúng config bảng 10 level; mỗi màn số wave/quái/HP khác nhau.
2. Implement overlay sao 1/2/3 + nút Retry / Map / Next.
3. Đồng bộ map state: completed / unlocked / locked / boss.
4. Chơi lại level để tăng sao; tổng sao tính theo bestStars.
5. Manual playtest các level 1, 3, 5, 7, 10; điều chỉnh config **có giải thích**, tránh thay đổi logic ngầm.
6. Ghi các thay đổi vào `BALANCE_NOTES.md` (trước/sau + lý do).

**Acceptance — PASS nếu:**

- Game mở được từng level theo thứ tự, replay không mất tiến trình.
- Level 5 và 10 boss đủ rõ bằng hình học.
- Đánh giá sao đúng với Base HP còn lại, save luôn giữ best.
- Có thể thắng Level 1 chỉ bằng tương tác hợp lệ; không buộc dùng debug/hack state.
- Level 10 xong hiển thị Campaign Complete, không mở Level 11.

### PHASE 9 — QA Offline Campaign

**Mục tiêu:** Chốt bản campaign MVP ổn định trên desktop/mobile.

Công việc:

1. Chạy full unit + integration regression các luật cũ và mới.
2. Playwright: Map → Level 1 → Victory → mở Level 2 → refresh → Retry → Map; game over branch.
3. Mô phỏng/test input mobile: viewport 360×640, 390×844, desktop có khung 9:16; kéo/ghép/đập trứng, pause.
4. Kiểm tra timer/RAF/listener không rò rỉ khi liên tục retry/switch level.
5. Thử save corrupt, storage không sẵn, refresh giữa trận, pause khi mất focus.
6. Cập nhật README: chạy dev, test, build; cách sửa/thêm level; gameplay rules; giới hạn offline.
7. Không bổ sung asset art hoặc backend.

**Acceptance — PASS nếu:**

- `pnpm typecheck`, `pnpm test`, `pnpm build` PASS.
- Không bug P0/P1 trong playtest; các P2 phải liệt kê rõ.
- Mobile không có vùng kéo bị che, text HP đọc được, UI không tràn.
- Save/Unlock/Boss/Escape/Stars hoạt động sau reload.
- Antigravity cung cấp report file changed, test result, manual test, issues, next.

---

## 7. Test cases bắt buộc (tự động hóa ưu tiên domain)

| ID | Kịch bản | Kỳ vọng |
|---|---|---|
| C01 | Chơi lần đầu | Level 1 unlocked, level 2–10 locked. |
| C02 | Chọn locked level | Bị chặn ở logic/controller, không chỉ UI. |
| C03 | Start Level 1 | 3 wave, Base HP 3, 1 hero A ATK 1, Egg HP 3. |
| C04 | Start Level 5 | 5 wave, boss cuối wave 5. |
| C05 | Win Level 1 (3 HP) | 3 sao, mở Level 2. |
| C06 | Win Level 1 (1 HP) | 1 sao, mở Level 2. |
| C07 | Replay kết quả thấp | Giữ bestStars cao hơn. |
| C08 | Defeat Level 2 | Không mở Level 3. |
| C09 | Restart Level 7 | Vẫn ở Level 7; reset hero/egg/HP/wave/monster. |
| C10 | Chuyển Level 1→2 | Không mang hero ATK cao, egg HP, kills, cooldown cũ sang. |
| C11 | Normal đi hết 1 vòng | -1 HP một lần; quái despawn; kills không tăng. |
| C12 | Boss đi hết 1 vòng | -2 HP một lần; quái despawn; kills không tăng. |
| C13 | Hero giết quái sát vạch thoát | Chỉ kill, không mất base HP. |
| C14 | Base HP về 0 | Game Over ngay; freeze mọi timer/action. |
| C15 | Chưa spawn đủ / còn boss sống | Không chuyển wave và không Victory. |
| C16 | Boss spawn tại Level 5 | 1 boss ở wave cuối, không nhân đôi. |
| C17 | Level khác không có boss | Không boss. |
| C18 | Pause 10s rồi resume | Không nhảy tiến trình/không spawn dồn. |
| C19 | Kiếm đánh quái, không chạm trứng | Trứng giữ HP. |
| C20 | Kiếm chạm trứng | Trứng mất HP theo cooldown hợp lệ. |
| C21 | Kéo hero đập trứng | 1 hit, hero giữ nguyên ô, không double hit. |
| C22 | Hai hero A1 ghép | Ra A2 ATK 2; vẫn chỉ 1 hero/ô. |
| C23 | Save rồi refresh | Sao / unlocked không mất. |
| C24 | Save bị lỗi/corrupt | Không crash, có fallback và cảnh báo. |
| C25 | Hoàn thành Level 10 | Hiện Campaign Complete, không tạo Level 11. |
| C26 | Kéo/thả khi pause hoặc kết thúc | Không thay đổi game state. |
| C27 | Hai quái cùng thoát | Damage tổng đúng, clamp Base HP ≥0, 1 Game Over. |
| C28 | Bàn cờ đầy + nở trứng | Pending hero không mất và không nhân bản. |

**Lưu ý:** Có thể dùng fake clock + seeded/mock RNG để test deterministic. Không dùng `setTimeout` thật trong domain tests. Playwright chỉ để kiểm tra end-to-end.

---

## 8. Những quyết định KHÔNG tự đổi

1. **10 level**, không tự làm 100 level.
2. **Boss Level 5/10**, không boss ở tất cả level.
3. **Mỗi level start lại bằng 1 hero ATK 1**, không mang đội hình đi tiếp.
4. **Không bắt buộc giết boss**; boss thoát trừ 2 HP, theo cùng luật quái thoát. Có thể vẫn thắng nếu Base HP còn >0.
5. **Máu căn cứ 3** cho mọi level trong MVP.
6. **Sao dựa Base HP còn lại**, không dựa kills/thời gian.
7. **Offline**: chỉ lưu tiến trình đã hoàn tất, không autosave trận đang chơi.
8. **Hình học**: không thiết kế sprite, hiệu ứng đẹp.
9. **Boss là enemy type trong wave**; không viết riêng một boss engine và không spawn trùng.
10. **Đọc code hiện có trước khi sửa**. Không thay hệ combat đang PASS nếu không có bug.

## 9. Format báo cáo sau mỗi phase

```text
PHASE: 6 | 7 | 8 | 9
STATUS: PASS | FAIL | PARTIAL
FILES CHANGED:
- ...
IMPLEMENTED:
- ...
CHECKS:
- pnpm typecheck: PASS/FAIL
- pnpm test: PASS/FAIL (x/y)
- pnpm build: PASS/FAIL
MANUAL TEST:
- ...
ISSUES:
- None | ...
NEXT:
- ...
```

**Quy tắc bàn giao:** Nếu phase FAIL/PARTIAL, ưu tiên fix phase đó. Không tuyên bố PASS chỉ từ typecheck/build khi chức năng thực tế chưa xác minh.
