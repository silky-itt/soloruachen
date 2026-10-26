# Flow sản phẩm và triển khai

## 1. Kết nối tài khoản

1. Người dùng mở web, nhập nickname để có phiên app riêng.
2. Bấm “Kết nối LeetCode”. Nếu chưa có extension, hiện hướng dẫn cài và nút kiểm tra lại.
3. App tạo mã ghép nối ngẫu nhiên, dùng một lần, hết hạn ngắn và gắn với phiên app hiện tại.
4. Extension mở leetcode.com; người dùng đăng nhập trực tiếp trên trang đó.
5. Extension cho người dùng xác nhận ghép với phiên app. Nếu có thể xác minh tài khoản đang đăng nhập, gửi thông tin tối thiểu cần thiết về backend qua kênh xác thực.
6. Backend hoàn tất ghép nối, web hiện tên tài khoản và “Đã kết nối”.

Đây là ghép nối extension với app, không phải màn hình cấp quyền chính thức của LeetCode. Không dùng tên người dùng lấy từ một trang hồ sơ bất kỳ làm bằng chứng sở hữu tài khoản. Nếu chưa xác minh được danh tính, chỉ hiển thị “Đã kết nối trình duyệt”, chưa gắn nhãn tài khoản đã xác thực.

Không thu mật khẩu, không yêu cầu dán cookie, không chuyển cookie/session LeetCode về backend. Cho phép ngắt kết nối và thu hồi phiên extension. Chỉ cho phép ghép nối từ origin web được cấu hình, không nhận mã từ mọi website.

Trạng thái UI: chưa cài extension / chưa kết nối / đang chờ đăng nhập / chờ xác nhận / đã kết nối / hết hạn / mất kết nối / lỗi.

## 2. Tạo và vào phòng

1. Người tạo bấm “Tạo phòng”, chọn thời lượng (mặc định 20 phút), nhập link đề LeetCode.
2. MVP chỉ dùng đề miễn phí và link hợp lệ trên leetcode.com/problems/; backend chuẩn hóa slug, không tải nội dung từ URL tùy ý.
3. Phòng hiện mã/link mời, 2 vị trí người chơi và trạng thái kết nối.
4. Người còn lại vào bằng mã/link. Phòng đủ 2 người thì từ chối người thứ ba bằng thông báo rõ ràng.
5. Cả hai mở đề trên LeetCode bằng nút trong phòng. Extension kiểm tra đúng slug và có editor dùng được.
6. Mỗi người chọn ngôn ngữ trên LeetCode và bấm “Sẵn sàng” trong phòng/extension.
7. Khi cả hai sẵn sàng, chủ phòng bấm “Bắt đầu”; server phát thời điểm bắt đầu sau 3 giây và hạn kết thúc.

Thay đổi đề/thời lượng sẽ hủy trạng thái sẵn sàng của cả hai. MVP không random bằng cách scraping danh sách đề. Trước trận người chơi có thể đã xem đề; chưa hứa cơ chế giấu đề/chống chuẩn bị trước.

## 3. Trận đấu realtime

### Nơi viết code

- Người chơi viết, Run và Submit trên chính trang LeetCode đã đăng nhập.
- Extension hiển thị panel riêng gồm đồng hồ, trạng thái kết nối, code đối thủ chỉ xem và trạng thái bài nộp.
- Web có trang theo dõi trận, hiện hai code panel chỉ xem cùng tiến trình; nút “Mở LeetCode để viết” đưa về nơi thao tác thật.
- Không dựng editor có vẻ chỉnh sửa/nộp được trong web nếu chưa có tích hợp thực tế. Prototype phải ghi rõ dữ liệu demo.

### Đồng bộ code

- Chỉ chia sẻ khi đã tham gia phòng và người dùng đã bật chia sẻ cho trận đó.
- Extension gửi snapshot ban đầu, sau đó gửi thay đổi có debounce khoảng 150–300 ms, kèm số thứ tự phiên bản.
- Server xác thực thành viên, gán chủ sở hữu từ phiên đã xác thực; không tin playerId do client tự khai.
- Mỗi người chỉ được cập nhật code của mình. Server chỉ phát code cho đối thủ trong cùng trận.
- Không dùng chung document có quyền ghi cho cả hai. Đối thủ nhận bản xem riêng.
- Reconnect nhận snapshot mới nhất; giới hạn kích thước payload và tốc độ gửi.
- UI không cho chọn/copy code đối thủ theo thao tác thông thường; có nhãn “Chỉ xem”. Không tuyên bố chống copy tuyệt đối.

### Chấm bài và người thắng

- Run chỉ hiển thị trạng thái chạy thử, không tính thắng.
- Mỗi Submit phải gắn đúng người chơi, slug, trận, thời điểm nhận trên server và submission ID nếu tích hợp lấy được.
- Chỉ bài nộp trong khoảng thời gian trận mới đủ điều kiện. Accepted từ trước trận hoặc của đề khác không được tính.
- Ưu tiên thứ tự thời điểm server ghi nhận Submit; thời gian máy người chơi không có tính quyết định.
- Kết quả extension báo là tín hiệu chưa đáng tin tuyệt đối. Nếu không có cách đối chiếu độc lập, MVP ghi rõ kết quả do trình duyệt báo, chỉ dành cho đấu vui.
- Khi có Accepted, chờ các bài nộp sớm hơn còn đang chấm để tránh tuyên bố thắng sai. Bài nhận sau Accepted sớm nhất đã xác nhận không làm đổi người thắng.
- Hết giờ khóa nhận Submit mới của trận; bài đã ghi nhận đúng hạn được chờ chấm trong thời gian giới hạn cấu hình ở server. Nếu không xác định được kết quả, chuyển sang “Cần xác nhận kết quả”, không tự đánh là trượt.
- Không có Accepted sau khi xử lý xong các bài hợp lệ thì hòa. Hòa khi thời điểm nộp trùng nhau ở độ chính xác server.

## 4. Mất kết nối và kết thúc

- Đồng hồ luôn theo server; mất mạng không dừng trận, refresh không reset.
- Hiện rõ code đối thủ đã cũ khi mất kết nối; không giả hiển thị đang online.
- Cho phép kết nối lại; MVP không tự xử thua chỉ vì mất kết nối.
- Có nút đầu hàng với bước xác nhận, sau đó server kết thúc trận.
- Màn hình kết quả: thắng/thua/hòa/cần xác nhận, thời gian hoàn thành, trạng thái bài nộp và nút đấu lại.
- Đấu lại tạo match mới, xóa sẵn sàng và đồng hồ; không lẫn sự kiện trận cũ.
- Ngừng phát code khi kết thúc/rời phòng/ngắt kết nối tài khoản. MVP không lưu lịch sử source code lâu dài, chỉ giữ snapshot phục vụ trận và dọn sau khi phòng đóng.

## 5. Trạng thái và dữ liệu gợi ý

Room: waiting → ready → countdown → running → judging → finished; có trạng thái cancelled khi đóng trước trận.

Connection: disconnected / connecting / connected / stale / error.

Entities tối thiểu: AppSession, ExtensionPairing, Room, RoomMember, Match, CodeSnapshot, Submission.

Sự kiện gợi ý: room:join, room:updated, player:ready, match:start, code:update, submission:reported, match:finished, connection:changed. Server phát trạng thái chính thức; mọi lệnh kiểm tra quyền và trạng thái hiện tại. Countdown/running/judging không cho đổi đề hay người tham gia.

## 6. Thứ tự thực hiện cho Anti

### A. Prototype có thể review

Tự thiết kế UI và xây toàn bộ flow bằng mock adapter. Có kịch bản: kết nối thành công/lỗi, vào phòng, sẵn sàng, countdown, code realtime mô phỏng, bài đang chấm, Accepted, reconnect và kết quả. Phân biệt demo với tích hợp thật. Chưa cần dịch vụ trả phí hoặc deploy.

### B. Spike tích hợp LeetCode

Trước khi đầu tư toàn bộ backend, kiểm chứng trên trình duyệt thật: nhận diện phiên đăng nhập, đọc code thay đổi, theo dõi Submit và kết quả đúng bài, chèn panel không phá editor. Kiểm tra tài liệu/điều khoản hiện hành, không bypass CAPTCHA hoặc cơ chế bảo vệ truy cập.

Ghi lại phần nào hoạt động, cách thử tái hiện, giới hạn và phần chưa xác minh. Nếu gặp chặn, giữ prototype và báo giới hạn cụ thể; không thay bằng dữ liệu giả rồi báo đã tích hợp.

### C. Nối MVP

Gợi ý Next.js + TypeScript cho web, Node.js + Socket.IO cho server, Chrome extension Manifest V3, PostgreSQL cho metadata. Anti được điều chỉnh cách tổ chức code phù hợp, nên dùng chung schema sự kiện và tách adapter LeetCode khỏi logic trận đấu.

Kiểm tra có ý nghĩa: client A không ghi code B; người ngoài không vào kênh phòng; ghép nối hết hạn/dùng lại bị từ chối; reconnect không reset giờ; Accepted sai đề hoặc sai trận không tính; kết quả chấm đến đảo thứ tự không chọn sai người thắng.

## Ngoài phạm vi MVP

Matchmaking, Elo, giải đấu, phòng nhiều người, chat/voice, đề Premium, AI gợi ý, chạy code trên server app, chống gian lận tuyệt đối, đăng nhập OAuth LeetCode chính thức và lưu replay dài hạn.
