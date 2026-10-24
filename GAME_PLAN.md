# MERGE DEFENSE — KẾ HOẠCH PHÁT TRIỂN GAME OFFLINE MVP

> Tài liệu cho Antigravity. Phiên bản đặc tả: 1.0 — 24/10/2026.
> Mục tiêu: Tạo game prototype **chơi được**, chứng minh vòng lặp **phòng thủ + kéo đập trứng + mở nhân vật + ghép kiểu 2048**. Đồ họa hoàn toàn bằng hình học.

## 0. Nguyên tắc triển khai

1. Dùng **Phaser 3 + TypeScript + Vite + pnpm**. Không dùng React/Vue hoặc backend cho gameplay MVP.
2. **Chốt Phaser major version 3**; kiểm tra `package.json` và lockfile. Template Phaser mới có thể đang dùng Phaser 4, không được vô tình cài 4 khi code dựa Phaser 3.
3. Chơi hoàn toàn **không cần server**; chạy trên trình duyệt ở localhost. Chưa cần tài khoản, cloud, API, cửa hàng, tiền tệ, gacha trả phí hoặc multiplayer.
4. Hình học đơn giản: nhân vật = hình vuông, quái = hình tròn, kiếm xoay = thanh chữ nhật, trứng = hình oval, bàn cờ = ô vuông.
5. **Logic độc lập Phaser**. Scene chỉ xử lý vẽ, nhận input, đưa action vào logic và render state. Game không phụ thuộc vào server hay DOM để tính luật.
6. Triển khai **theo phase**, sau mỗi phase chạy, kiểm thử và báo kết quả; không tự ý mở rộng feature.
7. Các con số dưới đây là **giá trị khởi tạo để playtest**, gom vào `GameBalance.ts`; không hard-code rải rác.
8. Giữ game có thể resize trên mobile; desktop hiển thị khung chơi dọc ở giữa, không kéo giãn méo.

## 1. Tóm tắt gameplay

- Bàn cờ **5×5** ở giữa màn hình. Ô cờ chứa tối đa 1 nhân vật.
- Ban đầu **1 nhân vật loại A, sức tấn công ATK = 1** đặt sát mép phía trên, giữa hàng (row=0, col=2). Không được đặt giữa bàn cờ vì kiếm khó chạm quái ngoài đường.
- Quái xuất hiện trên **một đường hình chữ nhật khép kín quanh bàn cờ**, di chuyển tuần tự quanh bốn cạnh; **HP là số trên quái**.
- Mỗi nhân vật có **1 kiếm hình chữ nhật quay quanh vị trí cố định**. Kiếm chạm quái gây sát thương bằng `ATK` với cooldown riêng theo cặp nhân vật–quái, **không trừ HP mỗi frame**.
- Dưới bàn cờ có **1 trứng**, trên trứng hiển thị HP. Người chơi **kéo từ nhân vật xuống vùng trứng và thả**: trứng mất HP = ATK nhân vật. **Nhân vật vẫn ở đúng ô, vẫn tự đánh quái** suốt thao tác. Mỗi lần kéo hợp lệ gây đúng 1 hit.
- HP trứng về 0: tạo một nhân vật mới loại A/B (ngẫu nhiên theo quy tắc dưới), cấp sức mạnh 1, tại ô trống. Sau đó xuất hiện trứng mới, HP tăng dần.
- Có thể **kéo nhân vật vào ô trống để đổi vị trí** hoặc **kéo nhân vật lên nhân vật cùng loại, cùng sức mạnh để ghép**. Ghép `1+1=2`, `2+2=4`, `4+4=8`... Nhân vật nguồn biến mất, nhân vật đích tăng ATK; không cộng hai loại khác nhau.
- Quái đi hết một vòng mà chưa bị hạ: quái thoát, căn cứ mất 1 HP, quái bị loại khỏi màn. Căn cứ HP về 0: thua.
- Qua 5 wave: thắng. Có Restart để chơi lại.

## 2. Phạm vi phiên bản

### BẮT BUỘC cho MVP

- Gameplay offline trong trình duyệt; desktop mouse + mobile touch.
- Bàn cờ 5×5 và đường quái đi hình vuông.
- Quái spawn, di chuyển mượt theo delta time, có HP, bị tiêu diệt hoặc thoát sau 1 vòng.
- Nhân vật mặc định có vũ khí xoay tự động, có collision và cooldown.
- Kéo xuống trứng gây sát thương, trứng nở, nhân vật mới spawn.
- Kéo để di chuyển hoặc ghép đúng luật 2048.
- 5 wave, căn cứ HP, thắng/thua, Restart/Pause.
- UI tối thiểu, lưu trạng thái kết thúc cơ bản nếu cần; unit test cho game logic; build không lỗi.

### KHÔNG LÀM trong MVP

- Sprite đẹp, hiệu ứng phức tạp, ảnh nhân vật có bản quyền, mạng xã hội, hệ nguyên tố, cây kỹ năng, inventory, boss, tiền thưởng, vật phẩm trả phí, ads, leaderboard, login, realtime, database server.
- Không triển khai toàn bộ PWA, Android wrapper hoặc đồng bộ online trong MVP; chỉ giữ kiến trúc sẵn sàng.

## 3. Màn hình và bố cục

- Tỉ lệ chuẩn: **9:16**; kích thước logic khuyến nghị **450×800**. Dùng `Phaser.Scale.FIT` + `CENTER_BOTH`, canvas giữ tỉ lệ, nền ngoài khung tối.
- HUD đầu màn: `WAVE 1/5`, `Base HP 3`, `Kills`, nút `Pause`.
- Giữa màn: vòng chạy của quái vẽ nét đứt/chạy quanh phía ngoài; bàn cờ 5×5; hero + kiếm; quái + HP.
- Dưới: vùng trứng dễ chạm, hiển thị `EGG HP 3/3`, màu nổi bật; hint `Kéo nhân vật vào trứng`.
- Cuối: khu vực nhỏ thông báo `+Hero A`, `MERGE 1→2`, `Victory`, `Game Over`.
- Tương phản đủ đọc ở màn nhỏ. Hình học + số lớn; chưa cần ảnh, icon hoặc animation art.
- Layout từ giá trị `BOARD_X`, `BOARD_Y`, `CELL_SIZE` được tính từ khung logic. Đường quái phải bao quanh bàn cờ nhưng **không bị cắt** và không đè vùng HUD/trứng.
- Khởi tạo hero ở vị trí **sát mép bàn** để kiếm thật sự tiếp cận vòng quái. Tinh chỉnh khoảng cách path/kiếm thông qua playtest.

## 4. Luật chính thức và bất biến

### 4.1. Dữ liệu nhân vật

```ts
type HeroKind = 'A' | 'B';
interface Hero {
  id: string;
  kind: HeroKind;
  row: number;    // 0..4
  col: number;    // 0..4
  tier: number;   // 0 = ATK 1, 1 = ATK 2...
  angle: number;  // góc vũ khí xoay, rad
}
// hero.atk = 2 ** hero.tier
```

- Mỗi ô tối đa 1 hero. `id` duy nhất, không dùng index ô như hero ID.
- Không bao giờ tồn tại hero ở ngoài lưới hoặc hai hero cùng ô.
- Ban đầu chỉ 1 hero `{kind: 'A', row:0, col:2, tier:0}`.

### 4.2. Kiếm xoay tự động

- Vũ khí gắn với hero; xoay **quanh hero**, hero không dịch chuyển do vũ khí.
- Dùng `angle += angularSpeed * deltaSeconds`; mô hình hitbox của kiếm là hình chữ nhật dài mảnh hoặc capsule gần đúng. Cần kiểm tra **phần thân kiếm** thực sự giao với quái (không chỉ khoảng cách hero–quái).
- Có thể dùng khoảng cách từ tâm quái đến **đoạn thẳng đại diện thân kiếm** + bán kính hitbox để tính va chạm thuần TypeScript. Phaser chỉ vẽ hình theo state. Tránh yêu cầu Arcade Physics cho toàn bộ dự án.
- Cooldown **riêng từng cặp `(heroId, monsterId)`** nhằm tránh trừ máu mỗi frame; ban đầu 450ms. Nếu quái đã chết, không đánh lại.
- Sát thương `max(1, hero.atk)`; HP quái không dưới 0 trong dữ liệu hiển thị.
- Nhiều hero có thể đánh cùng quái; mỗi hero quản lý cooldown riêng.
- Trong lúc kéo đập trứng, kiếm vẫn quay/đánh độc lập.

### 4.3. Quái và đường di chuyển

```ts
interface Monster {
  id: string;
  hp: number;
  maxHp: number;
  progress: number; // quãng đường đã đi (pixel) trên path chu vi
  speed: number;    // pixel/giây
}
```

- Path là hình chữ nhật gồm 4 đoạn nối kín theo thứ tự; mọi quái dùng **cùng một path**.
- Vị trí render `positionOnPath(progress)` lấy từ tọa độ/bề dài bốn đoạn; **di chuyển theo `speed * deltaSeconds`**.
- Quái bắt đầu ở đầu đoạn trên (ví dụ góc trên-trái), đi **theo chiều kim đồng hồ**; chuyển góc liên tục, không teleport.
- `progress >= perimeter` => quái thoát, căn cứ `-1 HP`, remove quái. Không reset progress về 0 vô hạn trong MVP.
- `hp <= 0` => remove quái, `kills += 1`; không đồng thời gây hại căn cứ.

### 4.4. Tương tác kéo-thả (rất quan trọng)

**Một thao tác từ hero có ba đích hợp lệ:**

1. **Đích là trứng:** gọi `attackEgg(heroId)` đúng **một lần khi thả hợp lệ**. ATK hero trừ HP trứng. Hero không đổi ô; kiếm vẫn xoay. Không đánh trứng khi mới nhấn hoặc đang kéo. Nếu thả ngoài trứng: không trừ HP.
2. **Đích là ô trống:** gọi `moveHero(heroId, targetCell)`; cập nhật vị trí nhân vật.
3. **Đích là hero khác:** nếu `same kind && same tier`, gọi `mergeHeroes(sourceId, targetId)`. Hero nguồn biến mất; hero đích tier + 1, giữ vị trí đích. Khác loại hoặc khác tier: không đổi gì, hiển thị hint ngắn.

- Cảm giác kéo: vẽ **bóng/đường nối** theo pointer, **không di chuyển nhân vật thật** trong khi kéo. Sau khi thả hợp lệ ở ô trống mới cập nhật vị trí. Không sinh bản sao hero.
- Chống nhầm click: kéo trên ngưỡng ~16–20 pixel mới là drag; click thường không tạo action.
- Cooldown chủ động đập trứng theo hero ~250ms giữa các lượt kéo để chống double event, có thông báo nhẹ khi cooldown; không chặn đánh quái.
- Chỉ một drag được xử lý tại một thời điểm; hỗ trợ `pointerupoutside`, `gameout`, huỷ drag khi mất focus; không để trạng thái drag kẹt.
- Input phải hoạt động bằng chuột và chạm; tắt scroll touch trên vùng canvas để không cuộn trang khi kéo.

### 4.5. Trứng và random hero

```ts
interface Egg { hp: number; maxHp: number; hatchCount: number; }
```

- Trứng đầu HP=3. HP trứng kế tiếp: `3 + 2 * hatchCount`, cấu hình được; khi 0, tạo hero mới, rồi reset HP trứng mới.
- Trứng là **đối tượng gameplay**, không phải quái; kiếm xoay tự động không đánh trứng. Chỉ thao tác kéo từ hero mới gây sát thương trứng.
- **Trứng đầu nở ra loại A** (tutorial có chủ đích để người chơi ghép sớm); từ trứng thứ 2: random A/B, tỉ lệ 50/50, nguồn random inject được để test. Hero mới luôn `tier=0`.
- Spawn vào ô trống bằng thuật toán chọn ô trống ngẫu nhiên. Không ghi đè hero đang có.
- **Nếu đầy 25 ô:** trứng không nở/không reset thành trứng khác; giữ trạng thái `readyToHatch`, hiển thị `Bàn cờ đầy — hãy ghép nhân vật`. Sau khi xuất hiện ô trống (ghép), tự sinh đúng **một** hero và tiếp tục. Không âm HP, không mất phần thưởng.
- Không cần animation gacha, chỉ nháy ngắn và chữ loại hero.

### 4.6. Wave, thắng/thua

- Khởi đầu căn cứ HP=3; 5 wave. Spawn quái theo từng wave, khoảng cách ban đầu 2.5 giây giữa quái trong cùng wave.
- Wave đề xuất để playtest (chỉnh theo trải nghiệm, không coi là số cố định):

| Wave | Số quái | HP mỗi quái | Tốc độ khởi tạo |
|---|---:|---:|---:|
| 1 | 1 | 3 | 32 px/s |
| 2 | 2 | 4 | 34 px/s |
| 3 | 2 | 6 | 36 px/s |
| 4 | 3 | 8 | 38 px/s |
| 5 | 4 | 12 | 40 px/s |

- Khi **đã spawn hết** quái wave và **không còn quái đang hoạt động**, đợi ~2 giây rồi sang wave mới.
- `Base HP <= 0` => thua, dừng combat và input; nút Restart.
- Hết wave 5 và quái cuối bị tiêu diệt hoặc thoát, nếu HP căn cứ > 0 => thắng.
- Nếu trải nghiệm đầu quá khó, **ưu tiên giảm HP/tốc độ quái hoặc nới tầm kiếm**, không tự thêm vật phẩm/tăng lực ẩn.
- **Tiêu chí balance bắt buộc:** với hero ban đầu ở `(0,2)`, người chơi phải có khả năng hạ quái wave 1 trước khi quái đi hết vòng; khi mở và ghép thêm hero, khả năng phòng thủ tăng rõ rệt.

### 4.7. Tạm dừng và reset

- `Pause` đóng băng di chuyển, vũ khí, cooldown, wave timer và input gameplay; `Resume` tiếp tục.
- `Restart` xóa trạng thái ván hiện tại và đưa về 1 hero, trứng HP 3, căn cứ HP 3, wave 1; không giữ quái/sự kiện từ ván trước.
- Khi tab mất focus: auto pause (không để game chạy vài phút ngầm rồi thua), resume bằng thao tác người chơi.

## 5. Cấu hình kỹ thuật

### 5.1. Stack

- Node.js LTS phù hợp với bản Vite chọn ở thời điểm cài.
- TypeScript `strict: true`.
- Phaser **3.x** chính xác trong lockfile; Vite; pnpm.
- Vitest cho kiểm thử logic thuần TypeScript; không cần framework UI.
- ESLint cơ bản nếu sẵn; ưu tiên `pnpm typecheck`, `pnpm test`, `pnpm build` chạy ổn.
- Không gọi API/network. Tất cả asset nội bộ dự án.

### 5.2. Cấu trúc thư mục khuyến nghị

```text
project-root/
├── docs/
│   └── GAME_PLAN.md
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── config/
│   │   │   └── GameBalance.ts
│   │   ├── domain/
│   │   │   ├── types.ts
│   │   │   ├── GameState.ts
│   │   │   ├── GameEngine.ts
│   │   │   ├── GameActions.ts
│   │   │   ├── PathMath.ts
│   │   │   ├── HitDetection.ts
│   │   │   └── RandomSource.ts
│   │   ├── scenes/
│   │   │   └── GameScene.ts
│   │   ├── render/
│   │   │   ├── BoardRenderer.ts
│   │   │   ├── EntityRenderer.ts
│   │   │   └── HudRenderer.ts
│   │   └── input/
│   │       └── DragController.ts
│   ├── storage/
│   │   └── SaveRepository.ts
│   └── styles.css
├── tests/
│   ├── merge.test.ts
│   ├── egg.test.ts
│   ├── path.test.ts
│   ├── hit.test.ts
│   └── waves.test.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

Có thể gộp các lớp render nhỏ nếu giúp đơn giản. **Không nhồi hết logic vào `GameScene.ts`.**

### 5.3. Game engine và update loop

- `GameEngine` chứa state, `tick(deltaSeconds)` và `dispatch(action)`. Logic thuần TS, không import `phaser`.
- `GameScene.update(time, delta)` gọi engine tick với `delta/1000` và render thay đổi; dùng giới hạn `deltaSeconds` hợp lý sau lag, auto pause khi ẩn tab.
- Input Phaser chuyển thành action: `ATTACK_EGG`, `MOVE_HERO`, `MERGE_HERO`, `PAUSE`, `RESUME`, `RESTART`.
- Render không tự trừ HP, không tự spawn quái; **state engine là nguồn sự thật duy nhất**.
- Dùng ID ổn định, cleanup listener/timer khi scene restart để tránh sự kiện nhân đôi.
- Nếu animation dùng tween Phaser, nó không được quyết định damage, spawn, win/lose.

### 5.4. Chuẩn bị online sau này, KHÔNG triển khai online ngay

- Random qua `RandomSource` (có thể seed cho test).
- Các action là command có validate. Hiện tại xử lý local; tương lai có thể gửi command đến server kiểm tra.
- `SaveRepository` là interface; ban đầu có thể lưu `bestWave`, `bestKills`, `settings` bằng IndexedDB/localStorage. **Không cần lưu giữa một ván khi MVP chưa ổn định**.
- Tương lai: Laravel + PostgreSQL cho tài khoản và lưu tiến trình; Reverb chỉ khi có tính năng realtime phù hợp. Multiplayer cần server-authoritative simulation; không xem local game state là đáng tin.
- **Chơi offline trong web ≠ truy cập trang lần đầu khi không có mạng**. MVP chạy không backend; nếu muốn mở app/browser hoàn toàn không mạng sau khi cài, làm PWA cache sau MVP. Android offline có thể gói bằng Capacitor ở phase tương lai.

## 6. Kế hoạch thực hiện theo phase

### Phase 0 — Khởi tạo project

**Task**
- Tạo Vite TypeScript + Phaser 3 + pnpm.
- Game canvas FIT 450×800, desktop/mobile ổn, background tối đơn giản.
- Có npm scripts: `dev`, `build`, `typecheck`, `test`.
- Tạo `GameBalance.ts`, README với hướng dẫn chạy.

**Done khi**
- `pnpm install && pnpm dev` mở được game trên máy.
- `pnpm typecheck && pnpm build` thành công.
- Resize không méo game, không kéo trang khi chạm canvas.

### Phase 1 — Bàn cờ, quái chạy vòng, hero + kiếm tự đánh

**Task**
- Render bàn 5×5 và path quanh bốn cạnh.
- Render 1 hero ATK 1 ở `(0,2)`.
- Render 1 quái HP 3 theo path kín; hiển thị HP.
- Kiếm xoay quanh hero; hitbox có collision + cooldown; hiện hiệu ứng số damage ngắn.
- Quái chết khi HP 0; nếu hết 1 vòng thì căn cứ mất HP.
- Debug toggle hiển thị hitbox và khoảng kiếm (chỉ dev).

**Done khi**
- Hero không di chuyển, kiếm tự quay, quái chuyển đủ 4 góc mượt.
- Kiếm chạm làm giảm HP đúng 1/đòn; không liên tục mỗi frame.
- Quái đầu **có thể bị hạ** trước khi hoàn tất một vòng với thiết lập cơ bản.
- Quái không bị trừ HP nếu đứng ngoài vùng thân kiếm.

### Phase 2 — Kéo hero xuống đập trứng

**Task**
- Render trứng HP 3 dưới bàn cờ.
- Input drag từ hero: bóng kéo/đường nối, thả đúng vào trứng = 1 hit.
- Giữ hero ở vị trí cũ và tiếp tục auto combat khi drag.
- Trứng 0 HP hiện `Ready to hatch`; giai đoạn này có thể tạo mock đơn giản hoặc chuyển thẳng Phase 3.
- Hỗ trợ chuột/chạm và thả ra ngoài hủy action.

**Done khi**
- Kéo hero ATK1 vào trứng 3HP đúng 3 lần làm trứng 0 HP.
- Chỉ click, thả ngoài vùng trứng, hoặc kéo từ khoảng trống không gây sát thương.
- Không phá hoạt động kiếm xoay khi thao tác.

### Phase 3 — Mở trứng, nhân vật mới, di chuyển, ghép 2048

**Task**
- Đủ HP 0 thì hatch; trứng đầu sinh A, sau đó random A/B.
- Sinh vào ô trống, hiển thị hero loại và ATK.
- Kéo hero -> ô trống để chuyển vị trí.
- Kéo hero -> hero cùng loại/cùng tier để ghép; sai loại/cấp thì không đổi.
- Xử lý bàn đầy không mất nhân vật nở.
- Thêm phản hồi đơn giản khi merge/hatch.

**Done khi**
- Hai hero loại A ATK1 ghép thành một A ATK2 và giải phóng 1 ô.
- A ATK2 + A ATK2 => A ATK4.
- A + B hoặc 1 + 2 không ghép.
- Tất cả thao tác duy trì bất biến 1 hero/ô; không clone, không mất hero vì thả sai.

### Phase 4 — Vòng chơi hoàn chỉnh

**Task**
- Wave scheduler 1→5, spawn nhiều quái theo dữ liệu config.
- HUD wave, căn cứ HP, kills; Pause/Resume/Restart.
- Màn thắng/thua đơn giản và nút Restart.
- Auto pause khi ẩn tab.
- Playtest và cân bằng số; chú trọng vòng chơi trứng → ghép → mạnh lên.

**Done khi**
- Chơi được một ván từ đầu đến thắng hoặc thua.
- Hết quái wave thì chuyển wave đúng 1 lần, không spawn trùng.
- Restart hoàn toàn sạch; Pause không tụt HP/quái chạy.

### Phase 5 — Test, hoàn thiện offline MVP

**Task**
- Unit tests cho merge, spawn, egg, path, collision cooldown, wave transition.
- Manual test desktop Chrome và mô phỏng thiết bị mobile; test cảm ứng thật nếu có.
- Chỉnh layout, lỗi resize, cleanup event listeners, console errors.
- README, lệnh cài và build, mô tả điều chỉnh cân bằng trong config.
- Chỉ khi gameplay đạt mới xét lưu `bestWave`/`bestKills` vào local storage; không làm cloud.

**Done khi**
- `pnpm typecheck`, `pnpm test`, `pnpm build` PASS.
- Hoạt động với mouse và touch, không bị drag kẹt.
- Không lỗi console nghiêm trọng, không crash khi lặp Restart.
- Một người mới chơi hiểu cách đập trứng và ghép trong vòng 30–60 giây.

## 7. Các test case bắt buộc

| ID | Tình huống | Kết quả mong đợi |
|---|---|---|
| T01 | Start game | 1 hero A ATK1 ở `(0,2)`, trứng HP3, Base HP3, wave1 |
| T02 | Quái đi qua 4 góc | Vị trí liên tục, không teleport, không đi xuyên bàn |
| T03 | Kiếm chạm quái | Trừ đúng ATK, cooldown theo hero–quái |
| T04 | Kiếm chưa chạm quái | Không trừ HP |
| T05 | Hero drag xuống trứng và thả | Trứng trừ đúng ATK một lần, hero ở nguyên ô |
| T06 | Drag thả ngoài trứng và ô | Không thay đổi gì |
| T07 | Trứng lần đầu về 0 | Sinh đúng 1 hero A ATK1 vào ô trống, tạo trứng kế tiếp |
| T08 | Merge A1→A1 | Còn 1 A2 ở ô đích, ô nguồn trống |
| T09 | Merge A1→B1 | Không hợp lệ, state nguyên vẹn |
| T10 | Merge A1→A2 | Không hợp lệ, state nguyên vẹn |
| T11 | Kéo vào ô trống | Hero chuyển ô, không thêm/nhân bản |
| T12 | 25 ô đều đầy lúc trứng nở | Pending spawn; không ghi đè, sau có ô trống nở đúng 1 hero |
| T13 | Quái HP0 | Biến mất, tăng kills, không gây damage căn cứ |
| T14 | Quái chạy hết chu vi | Biến mất, căn cứ -1 HP đúng một lần |
| T15 | Base HP0 | Game over, game ngừng; Restart dùng state mới |
| T16 | Hết 5 wave, Base HP>0 | Victory đúng một lần |
| T17 | Pause / tab ẩn | Mọi timer gameplay ngừng, resume không nhảy quãng lớn |
| T18 | Lặp Restart nhiều lần | Không có 2 listener, 2 quái trùng, cooldown cũ |
| T19 | Chuột + cảm ứng | Drag trơn, không cuộn trang ngoài ý muốn |
| T20 | Resize desktop/mobile | Tỉ lệ 9:16 không vỡ layout, đối tượng không bị cắt |

## 8. Rủi ro cần kiểm soát

1. **Tầm kiếm không tới quái:** Hero mặc định phải sát mép; path offset, bán kính xoay, chiều dài kiếm cùng nằm trong `GameBalance.ts`. Bắt buộc có debug hitbox.
2. **Đánh quái mỗi frame:** cooldown theo cặp ID; không dùng sprite overlap callback vô hạn.
3. **Kéo đập trứng làm hero di chuyển:** chỉ di chuyển bóng kéo; game object nhân vật thật vẫn đứng yên đến khi thả vào ô trống.
4. **Giật khi tụt FPS:** delta time cho đường di chuyển và góc quay; giới hạn delta sau tab background.
5. **Gacha ngẫu nhiên gây khó ghép:** trứng đầu cố định loại A làm tutorial; lần sau random có kiểm thử bằng seed.
6. **Không có quy tắc thua:** quái thoát sau một vòng trừ HP căn cứ, tránh vòng vô hạn.
7. **Vội xây backend:** không làm API hoặc multiplayer trước khi prototype ổn.
8. **Phaser API mismatch:** xác minh tài liệu thuộc **Phaser 3**, không sao chép code Phaser 4 vô điều kiện.

## 9. Quy tắc báo cáo cho Antigravity

Khi hoàn thành **mỗi phase**, báo cáo theo mẫu:

```text
PHASE: <0..5>
STATUS: PASS / PARTIAL / BLOCKED
FILES CHANGED: <file list>
IMPLEMENTED: <short bullets>
CHECKS: pnpm typecheck / pnpm test / pnpm build
MANUAL TEST: <what was verified>
ISSUES: <none or exact blocker>
NEXT: <next phase only>
```

Không tuyên bố hoàn thành nếu chưa chạy lệnh kiểm thử được. Nếu môi trường không chạy được, ghi rõ lý do và lệnh cần chạy. Không tự ý thêm feature ngoài kế hoạch.

## 10. Definition of Done — toàn MVP

- [ ] Mở `pnpm dev` thấy game dọc, 5×5, hero ATK1, trứng HP3, path quái.
- [ ] Kiếm xoay và **chạm quái thật**; cooldown không đánh mỗi frame.
- [ ] Kéo hero vào trứng gây damage, hero không rời ô và vẫn tự đánh.
- [ ] Trứng nở tạo hero; hai hero giống loại/cấp có thể ghép ATK tăng gấp đôi.
- [ ] Quái chạy theo hình vuông; 5 wave, căn cứ mất HP khi quái thoát.
- [ ] Thắng/thua, pause/resume, restart ổn định.
- [ ] Mouse và touch hoạt động; layout 9:16 ổn định.
- [ ] Tests, typecheck, build pass. Có README hướng dẫn chạy.
- [ ] Không cần internet/backend để logic game chạy trên phiên bản đã được tải cục bộ.

## 11. Tài liệu tham khảo kỹ thuật

- Phaser 3 API và docs: https://docs.phaser.io/
- Phaser 3 unified mouse/touch input: https://docs.phaser.io/phaser/concepts/input
- Phaser Scale Manager: https://docs.phaser.io/phaser/concepts/scale-manager
- Phaser Geometry / intersection: https://docs.phaser.io/phaser/concepts/geometry
- Phaser + Vite + TypeScript template giới thiệu: https://phaser.io/news/2024/01/phaser-vite-typescript-template
- Video tham khảo gameplay (không sao chép asset): https://www.youtube.com/watch?v=Qy5eUWyD1t4

---

**Yêu cầu triển khai:** Antigravity đọc hết file, xây **Phase 0 → Phase 1 trước**, kiểm chứng vòng quái + kiếm chạm; sau đó lần lượt Phase 2 → 5 theo acceptance. Không tự mở rộng sang sprite đẹp, backend hoặc online.
