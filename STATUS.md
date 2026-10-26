# Trạng thái triển khai Solo Code

Cập nhật: 26/10/2026 (sau khi đọc mã nguồn và chạy kiểm tra local).

## Đang làm đến đâu

**Đang ở giai đoạn prototype và nối tích hợp. Chưa hoàn tất trận đấu thật trên LeetCode.** Đã có mã nguồn web, backend, schema dùng chung và khung extension. Điểm còn thiếu rõ nhất là truyền code và kết quả bài nộp từ extension về server.

Lần cập nhật này chỉ kiểm tra và cập nhật tài liệu; chưa sửa tính năng ứng dụng. Không có tác vụ lập trình chạy nền sau khi kết thúc lượt cập nhật này.

| Hạng mục | Trạng thái thực tế | Việc còn lại |
| --- | --- | --- |
| Flow sản phẩm | Đã có `FLOW.md` | Đối chiếu hành vi khi kiểm thử thực tế |
| Web UI / mock demo | Đã có mã nguồn giao diện, mock adapter và socket service; kiểm tra TypeScript đạt | Review trên trình duyệt, kiểm tra flow và build production |
| Backend phòng đấu | Đã có RoomManager, PairingManager và socket handlers; kiểm tra TypeScript đạt | Kiểm thử hai client, reconnect và quyền phiên qua socket thật |
| Unit test hiện có | Cả 7 test in kết quả `ok`; tiến trình chưa tự thoát, đã dừng thủ công | Dọn timer trong test để runner kết thúc sạch; chưa ghi nhận suite hoàn tất với exit code 0 |
| Ghép nối extension | Có popup gọi API verify và lưu phiên vào storage | Thử ghép nối thật, đồng bộ phòng và thu hồi phiên |
| Gửi code realtime từ extension | **Chưa hoàn tất:** `handleCodeSync` trong `extension/background/background.js` chỉ có comment, chưa có lệnh gửi dữ liệu | Nối kênh xác thực về server và kiểm tra đối thủ nhận code |
| Gửi kết quả bài nộp từ extension | **Chưa hoàn tất:** `handleSubmission` mới ghi log, chưa gửi kết quả về server | Nối Submit/verdict với đúng phòng, trận và bài nộp |
| Đọc editor / kết quả LeetCode | Có content script và page bridge | Chưa kiểm chứng trên LeetCode bằng trình duyệt thật |
| Build production | Tài liệu cũ ghi nhận thành công | Chưa chạy lại trong lần kiểm tra này |

## Kiểm tra đã chạy

- Server: `./node_modules/.bin/tsc --noEmit` — đạt, exit code 0.
- Web: `./node_modules/.bin/tsc --noEmit --incremental false` — đạt, exit code 0.
- Server: `npm test` — runner bị môi trường chặn tạo IPC pipe (`listen EPERM`), chưa chạy được test theo script mặc định.
- Thử trực tiếp: `node --import tsx --test src/__tests__/rules.test.ts` — 7 test đều in `ok`, nhưng tiến trình vẫn còn chạy sau khi suite trả kết quả. Mã test tạo các trận có timer và chưa dọn hết; đã dừng thủ công. Chưa có lần chạy kết thúc sạch.
- Chưa kiểm tra UI trên trình duyệt, chưa load extension, chưa thử hai người đấu thật trên LeetCode trong lượt này.

Kết quả test chỉ xác nhận các assertion hiện có. Ví dụ test có tên kiểm tra hết hạn mã ghép nối thực tế mới kiểm tra định dạng và dùng một lần, chưa mô phỏng hết hạn; test có tên kiểm tra thời gian nộp thực tế mới thử sai slug. Chưa thể coi các nhánh đó đã được kiểm chứng đầy đủ.

## Việc tiếp theo theo thứ tự

1. Hoàn thiện đường extension → server cho code và bài nộp; đồng bộ room/match vào extension và đối chiếu phiên ghép nối.
2. Dọn timer của test, bổ sung kiểm tra còn thiếu cho hết hạn ghép nối và thời gian nộp, chạy lại đến khi runner thoát sạch.
3. Kiểm chứng editor, Submit và verdict trên LeetCode hiện tại; ghi lại cách tái hiện và phần không tương thích.
4. Thử hai trình duyệt: tạo/vào phòng → sẵn sàng → đấu → kết quả → đấu lại; thêm mất mạng/reconnect và kết quả chấm đến đảo thứ tự.
5. Review giao diện và build production trước khi đánh dấu MVP hoàn tất.

## Cách duy trì trạng thái

Sau mỗi đợt làm việc, cập nhật tiến độ, việc tiếp theo và kiểm tra đã chạy. Phân biệt “có mã nguồn”, “kiểm tra local đạt” và “đã kiểm chứng trên LeetCode”. Không dùng tỷ lệ hoàn thành hoặc nhãn “100%” khi chưa có bằng chứng.

## Hướng dẫn và báo cáo đã gộp

Hai phần dưới giữ lại nội dung từ README và SPIKE trước khi dọn tài liệu. Các tuyên bố hoàn thành, tỷ lệ tin cậy và kết quả test trong đó là ghi nhận lịch sử; một số đã không còn phù hợp với mã nguồn hiện tại, đặc biệt phần realtime của extension. Không dùng các bảng “100%” bên dưới làm trạng thái triển khai hiện tại. Bảng tiến độ ở đầu file là trạng thái hiện tại.

# Solo Code — Nền Tảng Đấu Code 1v1 Realtime với LeetCode

Ứng dụng web đấu code 1v1 giữa bạn bè, kết hợp cùng Chrome Extension (Manifest V3) đồng bộ trực tiếp từ LeetCode. Mỗi người chơi viết và nộp bài trên chính trang LeetCode của mình, đồng thời quan sát code của đối thủ realtime qua panel chỉ xem (có tính năng chặn copy thao tác thông thường).

> Báo cáo spike được gộp ở phần tiếp theo của file trạng thái này.

---

## 🚀 Cấu Trúc Dự Án

```
soloruachen/
├── shared/              # Type definitions & socket schemas dùng chung
│   └── src/types.ts
├── server/              # Node.js + Express + Socket.IO Server
│   ├── src/RoomManager.ts    # State machine, luật phòng, out-of-order resolution
│   ├── src/PairingManager.ts # Quản lý mã ghép nối 1 lần (5 phút TTL)
│   ├── src/index.ts          # Server entry & Socket.IO handlers
│   └── src/__tests__/        # Unit test suite kiểm thử toàn bộ luật đấu
├── web/                 # Next.js 14 + Tailwind CSS Web Application
│   ├── src/app/              # Next.js App Router (Layout & Main Page)
│   ├── src/components/       # CodeViewer, MatchHeader, PairingModal, ResultScreen
│   ├── src/components/SimulationBar.tsx # Dock điều khiển kịch bản mô phỏng demo
│   ├── src/services/mockAdapter.ts      # Bộ giả lập prototype độc lập
│   └── src/services/socketService.ts    # Kết nối Socket.IO thời gian thực
├── extension/           # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup/           # Giao diện popup nhập mã ghép nối
│   ├── background/      # Service worker quản lý kết nối
│   └── content/         # Page bridge đọc Monaco và Side-panel nhúng LeetCode
└── STATUS.md            # Tiến độ, hướng dẫn chạy và báo cáo tích hợp
```

---

## ⚡ Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Khởi động Web App (Next.js)

```bash
cd soloruachen/web
npm install   # (nếu chưa cài)
npm run dev   # Chạy trên http://localhost:3000
```

Build production:
```bash
npm run build
npm run start
```

### 2. Khởi động Backend Server (Node.js + Socket.IO)

```bash
cd soloruachen/server
npm install   # (nếu chưa cài)
npm run dev   # Chạy trên http://localhost:3001
```

Chạy kiểm thử unit test:
```bash
npm test
```
*Tất cả 7/7 bài kiểm thử về capacity phòng tối đa 2 người, quyền chủ phòng, cách ly code giữa 2 client, và xử lý bài nộp out-of-order đều chạy và pass 100%.*

### 3. Cài đặt Chrome Extension (Manifest V3)

1. Mở trình duyệt Google Chrome hoặc Brave / Edge.
2. Truy cập địa chỉ `chrome://extensions`.
3. Bật công tắc **Developer mode** ở góc trên bên phải.
4. Bấm nút **Load unpacked** (Tải tiện ích đã giải nén).
5. Chọn thư mục `soloruachen/extension`.
6. Biểu tượng **Solo Code 1v1** sẽ xuất hiện trên thanh tiện ích của trình duyệt.

---

## 🎮 Hai Chế Độ Trải Nghiệm (Dual Mode)

Web app được tích hợp sẵn thanh điều khiển chuyển đổi nhanh giữa 2 chế độ:

### 1. Chế độ Mock / Prototype Demo (Mặc định)
- Dành cho review nhanh toàn bộ luồng mà **không cần chạy server hay cài extension**.
- Có thanh dock nổi **BẢNG ĐIỀU KHIỂN MÔ PHỎNG** ở dưới cùng màn hình với các nút:
  - `Đối thủ vào phòng`: Giả lập có người chơi thứ 2 tham gia.
  - `Đối thủ sẵn sàng`: Cả hai người chơi chuyển sang trạng thái sẵn sàng.
  - `Đếm ngược (3s)`: Kích hoạt đồng hồ đếm ngược 3 giây vào trận.
  - `Gõ code realtime`: Đối thủ gõ code giải thuật Python theo thời gian thực.
  - `Đối thủ Run Test`: Phát sự kiện chạy thử bài.
  - `Đối thủ Submit (Accepted)`: Chấm bài -> Trạng thái PENDING -> ACCEPTED -> Thắng cuộc.
  - `Mô phỏng mạng giật`: Chuyển trạng thái kết nối sang mất tín hiệu (Stale).
  - `Đầu hàng`: Giả lập bỏ cuộc và kết thúc trận.
  - `Đấu lại (Rematch)`: Đặt lại trận đấu mới.

### 2. Chế độ Máy chủ Live (Realtime Backend)
- Kết nối trực tiếp với backend Socket.IO tại `http://localhost:3001`.
- Tạo phòng thật, chia sẻ mã phòng (`SOLO-XXXX`) cho bạn bè.
- Ghép nối với Chrome Extension qua mã 6 số một lần.
- Đọc code trực tiếp từ LeetCode Monaco editor và cập nhật tiến trình thật.

---

## 🛡️ Chính Sách Bảo Mật & Luật Đấu Cốt Lõi

1. **Tuyệt đối không thu thập mật khẩu/cookie**: Đăng nhập diễn ra trực tiếp trên `leetcode.com`. Extension chỉ đọc định danh công khai từ DOM. Không lưu cookie phiên về backend.
2. **Quyền riêng tư & Cách ly code**: Client A chỉ có quyền đẩy code cho tài khoản của mình (`sessionId` được server xác thực). Server chỉ phát sóng dạng chỉ xem cho đối thủ.
3. **Chống copy đối thủ**: Code đối thủ áp dụng `user-select: none`, chặn sự kiện copy (`Ctrl+C`, `Cmd+C`) và chặn menu chuột phải.
4. **Giải quyết thứ tự nộp bài (Out-of-Order Resolution)**:
   - Thời điểm nộp bài được ghi nhận theo **đồng hồ máy chủ** (`submittedAtServer`).
   - Nếu bài nộp của người B ra kết quả `Accepted` nhưng bài nộp trước đó của người A vẫn đang được LeetCode chấm (`PENDING`), máy chủ đưa phòng vào trạng thái `judging` (đang chấm) để chờ kết quả của A.
   - Nếu bài nộp trước của A cũng đạt `Accepted`, A sẽ là người chiến thắng vì đã nộp sớm hơn tại máy chủ.

---

## 📊 Bảng Trạng Thái Thực Tế Từng Phần

| Thành phần | Trạng thái | Đánh giá |
| :--- | :---: | :--- |
| **Domain State Machine & Rules** | ✅ Hoàn thành | Đã viết unit test đầy đủ, kiểm thử phòng 2 người, quyền hạn, out-of-order logic |
| **Giao diện Web App (Next.js 14)** | ✅ Hoàn thành | Đã build production sạch sẽ, đầy đủ giao diện desktop-first, dark theme |
| **Bộ Mock Adapter Simulator** | ✅ Hoàn thành | Bao phủ 100% flow từ nickname -> lobby -> match -> result -> rematch |
| **Chrome Extension Manifest V3** | ✅ Hoàn thành | Đã có manifest, popup, background service worker, page bridge & side-panel |
| **Đọc Monaco Editor LeetCode** | ✅ Hoàn thành (Spike) | Dùng Page World bridge script lắng nghe `model.onDidChangeContent` |
| **Chống gian lận OCR / chụp ảnh** | ⚠️ Ngoài phạm vi | Chỉ chặn copy thao tác UI thông thường theo đúng thỏa thuận tại `FLOW.md` |


---

# Báo Cáo Spike: Kiểm Chứng Khả Năng Tích Hợp LeetCode

Tài liệu này ghi nhận kết quả nghiên cứu kỹ thuật thực tế (technical spike) về việc kết nối nền tảng Solo Code với LeetCode theo yêu cầu tại `FLOW.md`.

---

## 1. Tóm tắt kết quả & Giới hạn cốt lõi

| Hạng mục tích hợp | Khả thi | Phương pháp kỹ thuật | Mức độ tin cậy | Giới hạn thực tế |
| :--- | :---: | :--- | :---: | :--- |
| **Đọc code editor** | ✅ Có | Bridge script inject vào Page World đọc `window.monaco.editor` | Cao (95%) | LeetCode thỉnh thoảng A/B test layout mới hoặc CodeMirror |
| **Nhận diện User** | ✅ Có | Đọc `__NEXT_DATA__` hoặc DOM avatar `/u/{username}` | Trung bình | Không có OAuth chính thức, chỉ là định danh trình duyệt |
| **Bắt sự kiện Submit** | ✅ Có | DOM click listener (`console-submit-button`) + MutationObserver | Cao | Phụ thuộc vào việc LeetCode giữ nguyên selector/text |
| **Lấy kết quả chấm** | ✅ Có | Quan sát status pill (`Accepted`, `Wrong Answer`) | Cao | Có độ trễ 3-15s từ hàng đợi chấm của LeetCode |
| **Không thu Cookie/PW** | ✅ Đạt | Không đọc hay gửi Cookie `LEETCODE_SESSION` về server | Tuyệt đối (100%) | Đảm bảo an toàn tài khoản người dùng theo yêu cầu |

---

## 2. Chi tiết Spike 1: Đọc Editor Code trên LeetCode

### Vấn đề:
Chrome Extension Manifest V3 chạy content script trong **Isolated World** (thế giới cô lập), không thể truy cập trực tiếp biến `window.monaco` của trang LeetCode.

### Giải pháp kỹ thuật đã triển khai:
1. Content script tạo thẻ `<script>` trỏ đến `content/page-bridge.js` và nhúng vào DOM của trang.
2. `page-bridge.js` chạy trong **Page World**, có quyền truy cập trực tiếp vào `window.monaco.editor.getModels()`.
3. Khi editor khởi tạo xong, bridge đăng ký lắng nghe sự kiện `model.onDidChangeContent`:
   ```javascript
   model.onDidChangeContent(() => {
     clearTimeout(debounceTimer);
     debounceTimer = setTimeout(() => {
       window.dispatchEvent(new CustomEvent('solo-code:editor-content', {
         detail: { code: model.getValue(), language: model.getLanguageId() }
       }));
     }, 200);
   });
   ```
4. Content script bắt sự kiện `solo-code:editor-content` và chuyển tiếp về background service worker để đồng bộ về phòng đấu.

### Giới hạn & Biện pháp phòng vệ:
- Nếu LeetCode sử dụng CodeMirror hoặc đổi cấu trúc Monaco: Fallback đọc nội dung từ DOM `.monaco-editor .view-lines`.
- Giới hạn payload: Giới hạn kích thước tối đa 128 KB để chống spam dữ liệu qua Socket.

---

## 3. Chi tiết Spike 2: Nhận Diện Tài Khoản Đăng Nhập

### Thực tế điều tra:
- LeetCode **không cung cấp public OAuth 2.0 API** cho các ứng dụng bên thứ 3.
- Mọi hướng giải pháp yêu cầu người dùng dán Cookie `LEETCODE_SESSION` hoặc nhập mật khẩu đều **bị nghiêm cấm** theo `FLOW.md` và vi phạm bảo mật nghiêm trọng.

### Phương pháp an toàn đã áp dụng:
1. Người dùng tự đăng nhập trực tiếp trên tab chính thức `leetcode.com`.
2. Extension mở leetcode.com và chỉ đọc username công khai từ:
   - `window.__NEXT_DATA__.props.pageProps.userStatus.username`
   - Hoặc đường link avatar cá nhân trên header: `<a href="/u/{username}">`
3. Nhãn hiển thị trên web: "Đã kết nối trình duyệt" kèm tên tài khoản đọc được. Server không cấp bất kỳ quyền hạn đặc biệt nào dựa trên tên này để tránh giả mạo (spoofing).

---

## 4. Chi tiết Spike 3: Bắt Sự Kiện Run & Submit và Kết Quả Chấm

### Quy trình chấm của LeetCode:
1. Khi người dùng bấm nút **Submit**, LeetCode gửi POST GraphQL request đến endpoint `https://leetcode.com/problems/{slug}/submit/`.
2. Server LeetCode trả về `submission_id`.
3. Client LeetCode định kỳ poll endpoint `https://leetcode.com/submissions/detail/{id}/check/` cho đến khi state chuyển từ `PENDING` thành `SUCCESS`.
4. Giao diện hiển thị tab "Submission Result" với nhãn xanh `Accepted` hoặc đỏ `Wrong Answer`, kèm Runtime (ms) và Memory (MB).

### Kỹ thuật theo dõi:
1. **Bắt nút bấm**: Listener bắt sự kiện click trên nút có `data-e2e-locator="console-submit-button"` hoặc chứa chữ "Submit".
   - Ngay lập tức gửi tín hiệu `status: 'PENDING', isRunOnly: false` về máy chủ Solo Code.
2. **Quan sát kết quả (Verdict Observer)**:
   - Một MutationObserver theo dõi container kết quả bài nộp trên DOM trong tối đa 30 giây.
   - Khi phát hiện phần tử chứa chữ `Accepted` hiển thị:
     - Trích xuất Runtime và Memory.
     - Phát tín hiệu `status: 'ACCEPTED'` về phòng đấu.
   - Nếu phát hiện `Wrong Answer` / `Compile Error`:
     - Phát tín hiệu `status: 'WRONG_ANSWER'`.

### Xử lý bất đồng bộ & Đến ngược thứ tự (Out-of-order):
- Vì bài nộp của Người A có thể phải chờ hàng đợi LeetCode 10 giây, trong khi bài của Người B nộp sau 2 giây nhưng chỉ mất 3 giây để ra `Accepted`.
- **Luật máy chủ (đã kiểm thử 100% trong `rules.test.ts`)**:
  - Máy chủ ghi nhận thời điểm Submit ban đầu (`submittedAtServer`).
  - Nếu một bài nộp sau ra `Accepted` trong khi bài nộp trước đó còn đang `PENDING`, phòng chuyển sang trạng thái `judging` (đang chấm) và chờ phán quyết của bài trước.
  - Người có thời điểm nộp tại máy chủ sớm nhất mà đạt `Accepted` sẽ là người chiến thắng chính thức!

---

## 5. Chi tiết Spike 4: Nhúng Side-Panel Không Gây Xáo Trộn Editor

- Khung hiển thị của extension được nhúng dưới dạng `#solo-code-sidepanel` với `position: fixed; top: 60px; right: 16px;`.
- Có nút thu gọn thành một thanh nhỏ gọn (`solo-code-sidepanel.collapsed`), đảm bảo không che mất:
  - Nút Run / Submit ở góc dưới
  - Khung đề bài bên trái
  - Vùng gõ code chính của Monaco
- Code của đối thủ hiển thị trong panel được áp dụng thuộc tính chống copy:
  - `-webkit-user-select: none !important;`
  - `user-select: none !important;`
  - Chặn sự kiện click chuột phải (`contextmenu`).

---

## 6. Phân Định Rõ Ràng: Phần Thật vs Phần Demo vs Chưa Kiểm Chứng

| Thành phần | Trạng thái | Ghi chú kỹ thuật |
| :--- | :---: | :--- |
| **Logic phòng & Luật đấu (Server)** | **THẬT 100%** | Node.js + Socket.IO + Express, test suite 7/7 unit tests đạt 100% |
| **Thuật toán giải quyết Out-of-order** | **THẬT 100%** | Kiểm tra bài nộp sớm hơn đang chấm, tránh tuyên bố thắng sai |
| **Giao diện Web App** | **THẬT 100%** | Next.js 14 + Tailwind CSS, đã build production thành công |
| **Chế độ Mock Demo Prototype** | **THẬT 100%** | Thanh công cụ giả lập đầy đủ kịch bản (gõ code, Run, Submit, Stale, Rematch) |
| **Chrome Extension Manifest V3** | **THẬT 100%** | Popup ghép nối, page-bridge inject Monaco, side-panel LeetCode |
| **Bảo vệ chống copy code đối thủ** | **THẬT 100%** | Áp dụng ở tầng UI (`user-select: none`, chặn sự kiện copy) |
| **Tương thích toàn bộ bản cập nhật LeetCode tương lai** | **CHƯA KIỂM CHỨNG** | LeetCode có thể thay đổi DOM selector/CSS classes bất cứ lúc nào |
| **Chống gian lận tuyệt đối (OCR/Gõ lại)** | **NGOÀI PHẠM VI** | Chỉ hạn chế copy thông thường, dành cho đấu vui giữa bạn bè |
