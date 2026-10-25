# Mini-G — GitHub Issues / Pull Requests / CI

## Nguồn dữ liệu chính
- Repository: https://github.com/diepdo1810/mini-g
- Default branch: **master**.
- Trạng thái công việc, bằng chứng, lịch sử: GitHub Issues + PRs + GitHub Actions.
- ChatGPT lập kế hoạch, tạo issues, có thể code trên nhánh; Antigravity có thể thực thi issues trên Ubuntu. Cả hai phải tuân thủ cùng quy trình.
- Chủ dự án duyệt thay đổi, nghiệm thu gameplay và quyết định merge. Không cần sử dụng Notion/Trello để cập nhật lại trạng thái issue.

## Với mỗi issue
1. Đọc issue và dependencies; không tạo issue trùng. Viết acceptance criteria kiểm thử được.
2. Báo `STATUS: IN_PROGRESS` vào issue khi bắt đầu thực hiện.
3. Tạo nhánh mới từ `master`: `fix/<id>-short-name`, `feat/<id>-short-name` hoặc `chore/<id>-short-name`.
4. Làm đúng phạm vi, sửa hoặc bổ sung tests. Không push trực tiếp lên `master`.
5. Chạy `pnpm typecheck`, `pnpm test`, `pnpm build` nếu có môi trường. Nếu không chạy được, ghi `NOT RUN`, không tự tuyên bố PASS.
6. Push branch và tạo PR nhắm `master`. CI tự chạy trong GitHub Actions.
7. Phản hồi vào issue: commit SHA, PR URL, tóm tắt thay đổi, kết quả test (phân biệt local/CI), blockers.
8. Nếu CI lỗi: sửa trên cùng branch để CI chạy lại. Nếu CI xanh: chủ dự án playtest, review.
9. Chỉ khi được duyệt mới merge. `Closes #ID` trong PR sẽ đóng issue sau merge vào default branch.

## Mẫu báo cáo comment vào issue
```text
ISSUE: #ID
STATUS: IN_PROGRESS | READY_FOR_REVIEW | BLOCKED
BRANCH: fix/ID-...
COMMIT: SHA
PR: URL
IMPLEMENTED:
- ...
CHECKS:
- Local typecheck/test/build: PASS | FAIL | NOT RUN
- GitHub Actions CI: PASS | FAIL | PENDING | NOT AVAILABLE
MANUAL: ...
BLOCKERS: ...
NEXT: Await owner review
```

## Kiểm tra trên Android
- Mở tab Pull requests của repo, chọn PR.
- Tab **Checks** hiển thị job `Typecheck, Test, Build`. Xanh mới xác nhận CI PASS.
- Tab **Files changed** xem code khác biệt; tab **Conversation** đọc báo cáo.
- Không merge PR Draft. Khi CI PASS và kiểm thử đạt, chủ dự án đổi PR thành Ready for review rồi quyết định merge.

## Antigravity (khi có Ubuntu)
```bash
gh auth status
gh issue view 13 -R diepdo1810/mini-g
git switch master
git pull --ff-only origin master
git switch -c fix/13-short-name
# implement + verify
pnpm typecheck && pnpm test && pnpm build
gh pr create --base master --head fix/13-short-name --title "..." --body "Closes #13"
```

Tài liệu này không yêu cầu Antigravity chạy nền hay đồng bộ tự động. GitHub Actions chỉ chạy theo các trigger của workflow.
