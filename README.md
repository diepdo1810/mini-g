# Mini-G — Merge Defense

Game 2D màn hình dọc **9:16**, kết hợp thủ thành, kiếm xoay tự động, mở trứng và ghép Hero kiểu 2048. Hiện dùng hình học mock (Phaser 3 + TypeScript + Vite + pnpm + Vitest), chưa cần sprite đẹp.

Game chạy trên trình duyệt, không có backend. Tiến trình lưu vào **IndexedDB**. Đây **chưa phải PWA offline-installable**: chưa có service worker/cache để tải trang lần đầu khi mất mạng.

## Chạy và kiểm thử

Yêu cầu Node.js và pnpm (CI đang dùng Node 22, pnpm 9).

```bash
pnpm install --frozen-lockfile
pnpm dev       # http://localhost:3000
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

## Luật chơi

- **Campaign:** Có 10 level, mỗi level gồm 3–5 wave. Chọn màn qua Map, thắng để mở level tiếp theo, chơi lại để tăng sao. Boss ở **Level 5 và 10**, xuất hiện cuối wave cuối.
- **Bàn cờ 5×5:** Mỗi ô tối đa 1 Hero. Mỗi màn bắt đầu 1 Hero A, ATK 1. Hero tự đánh bằng kiếm xoay khi hitbox thực sự chạm mục tiêu, có cooldown.
- **Kéo Hero:** Thả vào trứng gây 1 hit và Hero giữ nguyên vị trí. Thả ô trống để di chuyển; kéo vào Hero cùng loại/cấp để ghép `1+1=2`, `2+2=4` (ATK).
- **Trứng:** Mỗi trứng có HP riêng; vỡ sẽ nở Hero loại A/B vào ô trống. Nếu bàn cờ đầy, giữ phần thưởng chờ. HP trứng tăng theo số lần nở của chính trứng đó. Kiếm chạm trứng tự gây sát thương; đánh quái không tự trừ HP trứng.
- **Quái:** Di chuyển một vòng quanh bàn. Quái thường còn sống thoát trừ **1 Base HP**, Boss thoát trừ **2 Base HP** đúng một lần. Base HP ban đầu 3; về 0 là thua.
- **Kết thúc:** Hết wave và Base HP còn dương là thắng. Còn 3/2/1 HP nhận 3/2/1 sao; bestStars không giảm khi replay.

### Tiến trình trứng

| Level | Số trứng | Cấp trứng |
| --- | ---: | --- |
| 1 | 1 | 1 |
| 2–3 | 2 | 1 |
| 4–5 | 3 | 1 |
| 6–10 | 4 | 2 sau khi thắng Boss Level 5 |
| 11+ (tương lai) | Tối đa 5 | Cấp 3+ sau Boss Level 10 |

Tỉ lệ mở Hero: trứng cấp 1 → ATK 1 (100%); cấp 2 → ATK 1/2 (50%/50%); cấp 3 → ATK 1/2/4 (20%/60%/20%). Campaign MVP chỉ có 10 level, chưa mở Level 11.

## Điều khiển

- Chuột/cảm ứng: kéo Hero để move/merge/đập trứng.
- `D`: Debug hitboxes; `P`: Pause/Resume; `R`: Restart level.
- Nút Map, Retry, Next Level theo trạng thái game.

## Trung tâm thiết kế & tiến độ

- **[Mini-G Design Hub](docs/design/README.md)** — xem ý tưởng Hero/Map, roadmap, board và quy trình tạo ảnh trên GitHub.
- [GitHub Issues](https://github.com/diepdo1810/mini-g/issues) — trạng thái công việc thực tế.

## Mã nguồn và tài liệu

- [GameEngine](src/game/domain/GameEngine.ts): luật combat, trứng, quái, wave.
- [Cấu hình 10 màn](src/game/config/levels.ts) và [tham số gameplay](src/game/config/GameBalance.ts).
- [Campaign / IndexedDB](src/game/campaign/): lưu tiến trình, bestStars và cấp trứng.
- [Tests](tests/): logic và regression.
- [Ghi chú cân bằng](docs/BALANCE_NOTES.md): số liệu cấu hình và playtest cần làm.
- [Trạng thái QA](docs/QA_CAMPAIGN_STATUS.md): phân biệt CI với manual test.
- [AGENTS.md](AGENTS.md) và [GitHub workflow](docs/DEV_WORKFLOW.md).

GitHub Actions chạy `pnpm typecheck`, `pnpm test`, `pnpm build` trên PR vào `master`. Chỉ đánh dấu QA đã đạt khi có bằng chứng thực tế.

**Chưa triển khai:** sprite đẹp, multiplayer, tài khoản, backend, cloud save, PWA/offline cache, thanh toán.
