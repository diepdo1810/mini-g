# Mini-G — Asset Pipeline (tạo ảnh ở đâu, lưu và triển khai thế nào?)

## 1. Dùng công cụ gì?

| Công việc | Nơi làm | Thành phẩm |
|---|---|---|
| Concept/style sheet nhân vật | **ChatGPT tạo ảnh**; dùng một mẫu được duyệt làm reference cho các tier | Sheet family + bảng màu |
| Concept Spring map / Thu / Đông | **ChatGPT tạo ảnh**; dùng cùng art direction | Background/layer PNG |
| Bố cục màn hình | Wireframe Figma/Canva hoặc phác thảo được lưu GitHub | Screenshot PNG + notes |
| Hero/icon UI production | Xuất từ concept được duyệt; sửa/cắt và kiểm tra alpha nếu cần | PNG transparent |
| Lắp vào game | **Antigravity/Phaser** | Texture loading, scale, animation, responsive |

**Nguyên tắc:** tạo ảnh được ngay trong cuộc trò chuyện ChatGPT khi bạn yêu cầu; sau khi chọn ảnh, đưa file sản xuất và ghi chú vào GitHub. Ảnh do AI tạo cần review, có thể phải chỉnh/cắt lại trước khi dùng. **Chưa tạo ảnh production trước khi duyệt concept.**

## 2. Số asset của bản thử đầu

- **Hero:** 2 family × 4 tiers = **8 form**, mỗi form 1 PNG transparent Idle. Chỉ tạo idle đầu tiên; chưa đòi spritesheet nhiều frame.
- **Map:** 1 Spring background, trang trí foreground và tile/route tách lớp. 2 seasonal variations chỉ là concept sau.
- **UI:** 1 bộ: panel HUD, thanh HP, sao, egg queue, nút Pause/Map/Next. Ưu tiên vẽ UI bằng code/UI elements, không render text/bấm nút vào ảnh nền.
- **VFX:** 1 tween hiệu ứng merge, 1 hiệu ứng hit dạng particle màu; có thể code Phaser.

## 3. Thư mục thống nhất

```text
mini-g/
├── docs/design/
│   ├── README.md
│   ├── BOARD.md
│   ├── IDEAS.md
│   └── ASSET_PIPELINE.md
├── public/assets/
│   ├── heroes/
│   │   ├── leaf/t1-idle.png ... t4-idle.png
│   │   └── fire/t1-idle.png ... t4-idle.png
│   ├── maps/
│   │   └── spring/background.png, foreground.png
│   └── ui/
│       └── (chỉ những icon/texture thực sự cần)
└── src/game/render/
```

Đây là **cấu trúc dự kiến**: chỉ tạo folder khi có file hợp lệ. Lưu prompt, art direction, bảng màu, phiên bản đã duyệt ở Issue #26/#27 hoặc thêm file `docs/design/ASSET_MANIFEST.md` sau.

## 4. Quy tắc kỹ thuật cho ảnh

- Hero PNG với alpha thật; mỗi sprite cùng canvas/điểm neo, không có nền, chữ, nút, watermark.
- Định hướng ảnh gốc **256×256** mỗi Hero, render cỡ phù hợp ô Board rồi kiểm tra trực tiếp trên Android; không nhồi nhiều chi tiết sẽ mất khi thu nhỏ.
- Map nền theo tỉ lệ 9:16; layout logic 450×800. Nền là trang trí, không tự chứa grid hoặc lane bắt buộc; path/board do game logic vẽ theo layer.
- Không đưa asset không có nguồn/quyền sử dụng rõ ràng vào repo public.
- Animation đầu tiên: Idle bob nhẹ, Hit, Merge transform qua Phaser; chỉ làm sprite sheet khi thực sự cần nhiều frame.

## 5. Checklist duyệt

- [ ] Family A T1–T4 nhìn như một nhánh tiến hóa.
- [ ] Family B khác A ở cả silhouette, không chỉ đổi màu.
- [ ] Tất cả đọc được ở 40–60px gameplay.
- [ ] Map màu sắc không làm chìm sword, monster, Hero, đường đi.
- [ ] PNG có alpha, kích thước và anchor nhất quán.
- [ ] UI tap targets, HUD, egg queue không chồng nhau trên viewport 360×640 / 412×915.
- [ ] Mỗi thay đổi asset được phản ánh trong issue và PR, không có binary khổng lồ không cần thiết.

## 6. Thứ tự làm việc

[#26 Hero concept](https://github.com/diepdo1810/mini-g/issues/26) → [#27 Spring Map](https://github.com/diepdo1810/mini-g/issues/27) → [#28 UI wireframe](https://github.com/diepdo1810/mini-g/issues/28) → [#29 Asset production](https://github.com/diepdo1810/mini-g/issues/29) → **issue code tích hợp mới cho Antigravity**.
