# Mini-G — Visual / Gameplay Board

> Cập nhật: 26/10/2026. **Snapshot thủ công**, dùng để đọc trên Android. Click issue để xem trạng thái và bình luận thực tế. Live board kéo thả: [GitHub Projects của diepdo1810](https://github.com/users/diepdo1810/projects) (người dùng cần tạo project `Mini-G | Roadmap`).

## Bảng trạng thái

| Ideas — đang bàn | Planned — đã định hướng | In Progress / Chờ xử lý | Review | Done |
|---|---|---|---|---|
| [#26 Hero ấu trùng cute](https://github.com/diepdo1810/mini-g/issues/26) | [#30 Roadmap/UI pipeline](https://github.com/diepdo1810/mini-g/issues/30) | [#25 Gameplay: nhịp nở, merge](https://github.com/diepdo1810/mini-g/issues/25) **(việc ưu tiên Antigravity)** | Chưa có PR UI | [#23 Nghiên cứu review](https://github.com/diepdo1810/mini-g/issues/23) |
| [#27 Map mùa](https://github.com/diepdo1810/mini-g/issues/27) |  | [#5 Balance](https://github.com/diepdo1810/mini-g/issues/5), [#15 QA](https://github.com/diepdo1810/mini-g/issues/15) — cần playtest |  |  |
| [#28 UI 9:16](https://github.com/diepdo1810/mini-g/issues/28) |  |  |  |  |
| [#29 Quy trình asset](https://github.com/diepdo1810/mini-g/issues/29) |  |  |  |  |

**Lưu ý:** Các cột trên phản ánh ưu tiên/đề xuất ở thời điểm viết, **không** phải GitHub Project Status đang đồng bộ. #25 không được coi là đang code nếu Antigravity chưa comment `IN_PROGRESS`.

## Dự kiến triển khai

| Giai đoạn | Khoảng thời gian đề xuất | Chủ trì | Kết quả cần chốt |
|---|---|---|---|
| Gameplay | 26/10 – 01/11 | Antigravity | #25; merge, wave, egg pacing, test touch |
| Concept art & UX | 02/11 – 08/11 | ChatGPT + chủ dự án | Hero 2 family × 4 tier, 1 Spring map, wireframe; duyệt style |
| Asset + UI implementation | 09/11 – 15/11 | Antigravity | Map Spring + hero PNG + HUD vào Phaser, CI |
| Polish + thử trên Android | 16/11 – 22/11 | Chủ dự án + Antigravity | Responsive, chuyển form, cảm giác chơi, tài liệu QA |

**Ước lượng**, không phải ngày hoàn thành cam kết. 2 map Thu/Đông hoặc animation nhiều frame có thể cần thêm thời gian. Nếu #25 chưa ổn, đẩy lịch coding UI; vẫn có thể bàn và vẽ concept.

## Khi xem board

- Muốn trao đổi ý tưởng → comment issue #26–#29.
- Muốn giao Antigravity → chuyển yêu cầu thành acceptance criteria, chỉ làm sau gameplay.
- Muốn xem ảnh tạo ở đâu → [Asset pipeline](ASSET_PIPELINE.md).
- Muốn thay đổi quyết định → ghi trong [Ideas](IDEAS.md) và cập nhật issue liên quan.
