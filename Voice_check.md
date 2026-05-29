# Voice_check — Spec giọng nói (Mital Manage)

> **version:** 1.1  
> **parser:** `js/voice-assistant.js` (đồng bộ với `VOICE_VOCAB` trong file)  
> **mục đích:** AI/dev đọc → map câu nói → `intent` → Firebase  
> **cách thêm tình huống:** copy mục **§5 Template** hoặc thêm dòng vào bảng **§4 Kịch bản test**

---

## §0. Intent JSON (chuẩn parser)

Mọi câu sau khi parse phải ra object dạng:

```json
{
  "action": "add_car | check_in | change_car | swap_cars | pay | unpay | delete",
  "carCodes": ["A1", "XV"],
  "paid": true,
  "raw": "câu STT gốc"
}
```

| Field | Bắt buộc | Ý nghĩa |
|-------|----------|---------|
| `action` | có | Hành động app sẽ chạy |
| `carCodes` | có (trừ một số lệnh đặc biệt) | Mã xe **chuẩn** (canonical), đã qua bước alias |
| `paid` | không | Chỉ với `add_car`: `true` = ra xe **đã trả (R)**, `false` = **chưa (C)**. Mặc định `false` |
| `raw` | có | Transcript gốc để debug |

**Thứ tự ưu tiên parse:** `delete` → `swap_cars` / `change_car` → `pay`/`unpay` → `add_car` / `check_in` (theo từ khóa `ra` / `vào`).

---

## §1. Bảng mã xe — alias (cách nói → mã chuẩn)

Quy tắc chung:

- STT thường **không dấu**, **chữ thường** → parser `normalizeText()` bỏ dấu trước khi match.
- Alias **dài match trước** (ví dụ `xuong vang` trước `xuong`).
- Mã chuẩn lưu **IN HOA**, không dấu: `A1`, `XV`, `DM`, `03`.

### 1.1 Nhóm chữ + số (đọc trực tiếp hoặc gần đúng)

| canonical | alias_tiếng_nói (mỗi alias một dòng) | ghi_chú |
|-----------|--------------------------------------|---------|
| `A1`–`A9`… | `a1`, `a 1`, `ây một` (STT có thể lệch) | `A` + số |
| `AB` | `ab`, `a b` | Hai chữ, **không** có số |
| `M1`–`M9`… | `m1`, `m 1`, `em một` | `M` + số |
| `S1`–`S9`… | `s1`, `s 1`, `ét một` | Giống nhóm M |
| `D1`–`D9`… | `d1`, `d 1`, `đờ ríp`, `do rip` | `D` + số |
| `03`, `10`, `25`… | `03`, `mười`, `hai mươi lăm` | Chỉ số → giữ số (zero-pad nếu shop dùng `03`) |

### 1.2 Nhóm C (Cào)

| canonical | alias_tiếng_nói |
|-----------|-----------------|
| `C1`, `C3`… | `cào 1`, `cao 1`, `c 1` |
| `CX` | `cào xanh`, `cao xanh`, `c xanh` |
| `CC` | `cào cào xanh`, `cao cao xanh` |

### 1.3 Nhóm X (Xuồng) — mọi mã bắt đầu `X`

| canonical | alias_tiếng_nói |
|-----------|-----------------|
| `XV` | `xuồng vàng`, `xuong vang` |
| `XD` | `xuồng đỏ`, `xuong do`, `x đỏ` |
| `XT` | `xuồng tím`, `xuong tim` |
| `X1`, `X2`… | `xuồng 1`, `xuong 2`, `xuồng một` |
| `X*` (khác) | `xuồng` + mô tả trong menu editor | Nếu thiếu alias → bổ sung dòng ở đây |

### 1.4 Mã đặc biệt

| canonical | alias_tiếng_nói |
|-----------|-----------------|
| `DM` | `đỏ mới`, `do moi`, `đỏ mới` |
| `VH` | `vex hồng`, `ve hong`, `vê hồng`, `vh` |

---

## §2. Hành động (actions)

### `add_car` — Cho xe **ra** danh sách (đang chạy)

| Thuộc tính | Giá trị |
|------------|---------|
| Từ khóa chính | `ra` (cuối câu hoặc trước hậu tố thanh toán) |
| Không nhầm | `res`, `tiếp` (= resume, **không** phải add) |

**Hậu tố thanh toán khi ra xe** (áp dụng **từng xe** trong câu, mặc định nếu không nói):

| Nói | `paid` | Nút app |
|-----|--------|---------|
| `… ra rồi` / `… rồi` (sau mã xe) | `true` | **R** |
| `… chưa` | `false` | **C** |
| `… ra` (không rồi/chưa) | `false` | **C** (mặc định) |

**Nhiều xe một câu:** liệt kê lần lượt, cùng hậu tố hoặc từng cụm.

| Ví dụ câu nói | expected |
|----------------|----------|
| `A1 ra` | `{ action:"add_car", carCodes:["A1"], paid:false }` |
| `Xuồng vàng ra rồi` | `{ action:"add_car", carCodes:["XV"], paid:true }` |
| `S1 Xuồng đỏ ra` | `{ action:"add_car", carCodes:["S1","XD"], paid:false }` |
| `Cào xanh ra rồi` | `{ action:"add_car", carCodes:["CX"], paid:true }` |
| `Xuồng tím chưa` | `{ action:"add_car", carCodes:["XT"], paid:false }` |

---

### `check_in` — Xe **Vào** (tạm dừng đếm)

| Thuộc tính | Giá trị |
|------------|---------|
| Từ khóa | `vào`, `cho vào` |
| Cú pháp | Giống `add_car` nhưng đổi `ra` → `vào` |
| `paid` | **Không dùng** (C/R không đổi khi vào) |

| Ví dụ câu nói | expected |
|----------------|----------|
| `A1 vào` | `{ action:"check_in", carCodes:["A1"] }` |
| `Xuồng đỏ Xuồng 8 vào` | `{ action:"check_in", carCodes:["XD","X8"] }` |

**Lưu ý:** Chỉ tác động dòng **đang chạy** (chưa Vào). Nhiều mã → xử lý lần lượt từng dòng tìm được.

---

### `change_car` — Đổi mã **một** dòng

| Thuộc tính | Giá trị |
|------------|---------|
| Từ khóa | `đổi`, `doi`, `qua`, `chuyển` |
| Cú pháp | `[mã_1] (đổi\|qua) (xe)? [mã_2]` |
| `carCodes` | `[mã_cũ, mã_mới]` |

| Ví dụ câu nói | expected |
|----------------|----------|
| `S1 qua S2` | `{ action:"change_car", carCodes:["S1","S2"] }` |
| `Xuồng đỏ đổi xe Xuồng 9` | `{ action:"change_car", carCodes:["XD","X9"] }` |

---

### `swap_cars` — Hai xe **đổi chéo** cho nhau

| Thuộc tính | Giá trị |
|------------|---------|
| Khi nào | Một câu có **hai** cặp `qua`/`đổi` ngược nhau |
| `carCodes` | `[A, B]` — swap mã trên **hai dòng** hiện có |

| Ví dụ câu nói | expected |
|----------------|----------|
| `Xuồng 1 qua xuồng 2 xuồng 2 qua xuồng 1` | `{ action:"swap_cars", carCodes:["X1","X2"] }` |

**Không đủ 2 dòng trên list:** báo lỗi, không đổi.

---

### Các action khác (ít dùng giọng)

| action | Từ khóa | Ghi chú |
|--------|---------|---------|
| `resume` | `res`, `tiếp tục` | Res sau Vào |
| `pay` | `thanh toán`, `đã trả`, `r` | C/R → R |
| `unpay` | `chưa trả`, `c` | C/R → C |
| `delete` | `xóa` | Có confirm |

---

## §3. Quy tắc STT hay sai (parser nên chịu)

| STT nghe được | Hiểu thành |
|---------------|------------|
| `cao` / `cào` | Nhóm C |
| `xuong` / `xuồng` | Nhóm X |
| `xanh` đứng một mình sau `cào` | `CX` nếu không có số |
| `rồi` / `roi` | Hậu tố paid khi **ra** |
| `chưa` | paid=false khi **ra** |

---

## §4. Kịch bản test (bắt buộc pass trước khi deploy)

Chạy trên console: `VoiceAssistant.parseVoiceCommand('...')`

| id | câu_nói | expected_action | expected_carCodes | paid |
|----|---------|-----------------|-------------------|------|
| T01 | `A1 ra` | add_car | A1 | false |
| T02 | `Xuồng vàng ra rồi` | add_car | XV | true |
| T03 | `S1 Xuồng đỏ ra` | add_car | S1,XD | false |
| T04 | `Cào xanh ra rồi` | add_car | CX | true |
| T05 | `Xuồng tím chưa` | add_car | XT | false |
| T06 | `A1 vào` | check_in | A1 | — |
| T07 | `Xuồng đỏ Xuồng 8 vào` | check_in | XD,X8 | — |
| T08 | `S1 qua S2` | change_car | S1,S2 | — |
| T09 | `Xuồng 1 qua xuồng 2 xuồng 2 qua xuồng 1` | swap_cars | X1,X2 | — |
| T10 | `Đỏ mới ra` | add_car | DM | false |
| T11 | `Vê hồng ra rồi` | add_car | VH | true |

---

## §5. Template — thêm tình huống mới

Copy block dưới, điền vào đúng mục, rồi bảo AI cập nhật `VOICE_VOCAB` trong `voice-assistant.js`.

### 5.1 Thêm alias mã xe

```markdown
| canonical | alias_tiếng_nói | ghi_chú |
|-----------|-----------------|---------|
| `??` | `...`, `...` | ... |
```

### 5.2 Thêm câu / hành vi

```markdown
| id | câu_nói | expected_action | expected_carCodes | paid | ghi_chú |
|----|---------|-----------------|-------------------|------|---------|
| T?? | `...` | ... | ... | true/false/— | ... |
```

### 5.3 Thêm từ khóa hành động (nếu cần)

```markdown
- action: `...`
- keywords: [`...`, `...`]
- logic: ...
```

---

## §6. Ghi chú shop (ngữ cảnh — không parse tự động)

- **AB** là một mã riêng, không phải “A + B”.
- **Đổi chéo** hai xe: ưu tiên `swap_cars` một câu; nếu STT tách hai câu → hai lần `change_car` vẫn chấp nhận được.
- Khi nhiều dòng **trùng mã** trên list: app chọn dòng **mới nhất** (id lớn nhất).

---

## Changelog

| version | ngày | thay đổi |
|---------|------|----------|
| 1.0 | — | Ghi chú tự do ban đầu |
| 1.1 | 2026-05-29 | Chuẩn hóa spec + bảng test + template |
