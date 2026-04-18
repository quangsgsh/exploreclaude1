---
name: "OPSX: Archive"
description: Lưu trữ một change đã hoàn thành trong workflow thử nghiệm
category: Workflow
tags: [workflow, archive, experimental]
---

Lưu trữ (archive) một change đã hoàn thành trong workflow thử nghiệm.

**Input**: Có thể chỉ định tên change sau `/opsx:archive` (ví dụ: `/opsx:archive add-auth`). Nếu không chỉ định, hãy kiểm tra xem có thể suy luận từ ngữ cảnh hội thoại hay không. Nếu mơ hồ hoặc không rõ, BẮT BUỘC phải hỏi người dùng chọn trong danh sách changes có sẵn.

**Các bước thực hiện**

1. **Nếu không có tên change, yêu cầu người dùng chọn**

   Chạy `openspec list --json` để lấy danh sách changes đang có. Dùng **AskUserQuestion tool** để người dùng tự chọn.

   Chỉ hiển thị các change đang active (chưa được archive).
   Bao gồm schema đang được dùng cho mỗi change nếu có.

   **QUAN TRỌNG**: KHÔNG được đoán hoặc tự động chọn change. Luôn để người dùng tự quyết định.

2. **Kiểm tra trạng thái hoàn thành của artifact**

   Chạy `openspec status --change "<name>" --json` để kiểm tra mức độ hoàn thành của artifact.

   Phân tích JSON để hiểu:
   - `schemaName`: Workflow đang được sử dụng
   - `artifacts`: Danh sách các artifact cùng trạng thái (`done` hoặc khác)

   **Nếu có artifact nào chưa ở trạng thái `done`:**
   - Hiển thị cảnh báo liệt kê các artifact chưa hoàn thành
   - Hỏi người dùng xác nhận có tiếp tục không
   - Chỉ tiếp tục nếu người dùng đồng ý

3. **Kiểm tra trạng thái hoàn thành của task**

   Đọc file tasks (thường là `tasks.md`) để kiểm tra có task nào chưa hoàn thành không.

   Đếm số task có dấu `- [ ]` (chưa xong) so với `- [x]` (đã xong).

   **Nếu phát hiện task chưa hoàn thành:**
   - Hiển thị cảnh báo kèm số lượng task chưa xong
   - Hỏi người dùng xác nhận có tiếp tục không
   - Chỉ tiếp tục nếu người dùng đồng ý

   **Nếu không có file tasks:** Tiếp tục mà không cần cảnh báo về task.

4. **Đánh giá trạng thái đồng bộ của delta spec**

   Kiểm tra delta spec tại `openspec/changes/<name>/specs/`. Nếu không có, bỏ qua bước sync.

   **Nếu có delta spec:**
   - So sánh mỗi delta spec với main spec tương ứng tại `openspec/specs/<capability>/spec.md`
   - Xác định những thay đổi sẽ được áp dụng (thêm, sửa, xóa, đổi tên)
   - Hiển thị bản tổng hợp tóm tắt trước khi hỏi người dùng

   **Các lựa chọn hiển thị cho người dùng:**
   - Nếu cần thay đổi: "Sync ngay (khuyến nghị)", "Archive mà không sync"
   - Nếu đã đồng bộ: "Archive ngay", "Sync lại", "Hủy"

   Nếu người dùng chọn sync, dùng Task tool (subagent_type: "general-purpose", prompt: "Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <include the analyzed delta spec summary>"). Tiếp tục archive bất kể lựa chọn nào.

5. **Thực hiện archive**

   Tạo thư mục archive nếu chưa tồn tại:
   ```bash
   mkdir -p openspec/changes/archive
   ```

   Tạo tên đích theo ngày hiện tại: `YYYY-MM-DD-<change-name>`

   **Kiểm tra đích đã tồn tại chưa:**
   - Nếu đã tồn tại: Báo lỗi, đề xuất đổi tên archive cũ hoặc dùng ngày khác
   - Nếu chưa: Di chuyển thư mục change vào archive

   ```bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   ```

6. **Hiển thị tóm tắt**

   Hiển thị thông tin archive hoàn tất, bao gồm:
   - Tên change
   - Schema đã sử dụng
   - Vị trí lưu trữ
   - Trạng thái sync spec (đã sync / bỏ qua sync / không có delta spec)
   - Ghi chú về các cảnh báo (artifact/task chưa hoàn thành)

**Output khi thành công**

```
## Archive Hoàn tất

**Change:** <change-name>
**Schema:** <schema-name>
**Lưu tại:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Đã sync sang main specs

Tất cả artifact đã hoàn thành. Tất cả task đã hoàn thành.
```

**Output khi thành công (Không có delta spec)**

```
## Archive Hoàn tất

**Change:** <change-name>
**Schema:** <schema-name>
**Lưu tại:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** Không có delta spec

Tất cả artifact đã hoàn thành. Tất cả task đã hoàn thành.
```

**Output khi thành công kèm cảnh báo**

```
## Archive Hoàn tất (có cảnh báo)

**Change:** <change-name>
**Schema:** <schema-name>
**Lưu tại:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** Bỏ qua sync (người dùng chọn bỏ qua)

**Cảnh báo:**
- Đã archive với 2 artifact chưa hoàn thành
- Đã archive với 3 task chưa hoàn thành
- Đã bỏ qua sync delta spec (người dùng chọn bỏ qua)

Vui lòng xem lại archive nếu điều này không phải chủ ý.
```

**Output khi lỗi (Archive đã tồn tại)**

```
## Archive Thất bại

**Change:** <change-name>
**Target:** openspec/changes/archive/YYYY-MM-DD-<name>/

Thư mục archive đích đã tồn tại.

**Lựa chọn:**
1. Đổi tên archive cũ
2. Xóa archive cũ nếu là bản trùng
3. Đợi sang ngày khác rồi archive
```

**Nguyên tắc bắt buộc**
- Luôn hỏi người dùng chọn change nếu chưa cung cấp tên
- Dùng artifact graph (openspec status --json) để kiểm tra mức độ hoàn thành
- Không chặn archive khi có cảnh báo — chỉ thông báo và xin xác nhận
- Giữ nguyên file `.openspec.yaml` khi di chuyển vào archive (nó đi kèm theo thư mục)
- Hiển thị tóm tắt rõ ràng về những gì đã thực hiện
- Nếu cần sync, dùng Skill tool gọi `openspec-sync-specs` (do agent thực hiện)
- Nếu có delta spec, luôn chạy đánh giá sync và hiển thị tổng hợp trước khi hỏi
