# Campaign QA — bằng chứng và kiểm thử còn thiếu

Ngày: 25/10/2026. File này **không** xác nhận QA Android đã PASS.

## Automated tests

- GitHub Actions chạy `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Snapshot trước Issue #15: [CI PR #20](https://github.com/diepdo1810/mini-g/actions/runs/40169644011) **PASS: 13 test files, 106 tests**.
- Unit tests đã kiểm tra logic: Sword/monster hit, egg HP/hatch/merge, Wave/Boss escape, Campaign unlock, 10-level configuration, egg tier limits.
- Issue #15 bổ sung test sanitization lưu tiến trình; xem **Checks của PR #15** để biết kết quả thực tế (không suy đoán trước).

## Manual browser QA (chưa chạy)

| Tình huống | Trạng thái | Tiêu chí |
| --- | --- | --- |
| Chọn Map 1–10 trên Android Chrome 9:16 | NOT RUN | Không vỡ layout, đủ vùng chạm |
| Chơi Level 1 đến 10 bằng tương tác thực tế | NOT RUN | Vượt màn bình thường không dùng debug |
| Boss Level 5, 10 | NOT RUN | Nhãn BOSS/HP rõ, thắng/thua chính xác |
| Nhiều trứng Level 6–10 | NOT RUN | Đập đúng trứng, không che nút khác |
| Kéo/move/merge/đập trứng trên cảm ứng | NOT RUN | Không nhân bản hoặc đánh sai trứng |
| Đầy bàn cờ và thưởng nở đang chờ | NOT RUN | Không mất thưởng, nở sau merge |
| Pause/Resume, Restart, chuyển Map, Next Level | NOT RUN | Không rò rỉ timer, không lưu sai |
| Đóng mở trình duyệt sau Boss 5 | NOT RUN | IndexedDB giữ cấp trứng, sao và màn mở |
| Mở game mới khi mất mạng | NOT SUPPORTED | Chưa có PWA/service worker |

## Phát hiện từ code review

- README cũ mô tả 5 wave cố định và 1 trứng; đã cập nhật cho campaign 10 màn và tối đa 5 trứng.
- `IndexedDbProgress.load()` cũ làm mất trường `highestUnlockedEggLevel` và không làm sạch bản ghi `results`; bản sửa #15 giữ trường này, kiểm tra schema-v1 và lọc giá trị lỗi.
- Hero mặc định đang ở hàng 0, cột 2. Đặc tả campaign từng gợi ý hàng cuối sát trứng; **chưa đổi** vì cần xác minh cảm giác chơi.
- Cần kiểm thử thời gian thực và performance trên máy Android, unit tests không thay thế được.

## Điều kiện đóng Issue #15

Kèm kết quả playtest Android, kiểm tra save/reload, chơi hết 10 màn và CI PASS. Trường hợp test không đạt: tạo issue bug riêng kèm bước tái hiện, không đánh dấu PASS.
