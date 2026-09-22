# OTTv2
BT lập trình web 01
# Oẳn Tù Tì v2 (OTTv2)

## 1. Giới thiệu

OTTv2 là trò chơi Oẳn Tù Tì được xây dựng dưới dạng website.

Trò chơi gồm 2 người chơi trên bàn cờ 9x9. Mỗi quân cờ được di chuyển tối đa 1 ô theo 8 hướng giống quân Vua trong cờ vua.

Project được thực hiện cho bài tập môn học.

Đường dẫn đến trang web: https://ottv2.onrender.com/

---

## 2. Luật chơi

### Bàn cờ

* Bàn cờ có kích thước 9x9.
* Mỗi quân cờ chỉ được di chuyển tối đa 1 ô.
* Quân cờ có thể di chuyển theo 8 hướng:

  * Lên
  * Xuống
  * Trái
  * Phải
  * Chéo trên trái
  * Chéo trên phải
  * Chéo dưới trái
  * Chéo dưới phải

### Các loại quân

Trò chơi có 3 loại quân:

* Đấm
* Lá
* Kéo

Quy tắc ăn quân:

* Đấm thắng Kéo
* Kéo thắng Lá
* Lá thắng Đấm
* Hai quân cùng loại không thể ăn nhau và sẽ chặn đường nhau.

### Điều kiện thắng

Người chơi thắng khi:

* Ăn hết hoàn toàn một loại quân của đối phương.

hoặc

* Đưa được quân vào ô a1 hoặc i9.

---

## 3. Các Use Case chính

| STT  | Use Case                 | Mô tả                                                                 |
| ---- | ------------------------ | --------------------------------------------------------------------- |
| UC01 | Bắt đầu trò chơi         | Người chơi mở website và bắt đầu ván chơi                             |
| UC02 | Chọn quân cờ             | Người chơi chọn một quân cờ của mình                                  |
| UC03 | Di chuyển quân cờ        | Người chơi di chuyển quân tối đa 1 ô theo 8 hướng                     |
| UC04 | Ăn quân đối phương       | Hệ thống xử lý việc ăn quân theo luật Đấm - Lá - Kéo                  |
| UC05 | Kiểm tra điều kiện thắng | Hệ thống kiểm tra người chơi đã ăn hết một loại quân hoặc vào ô a1/i9 |
| UC06 | Kết thúc trò chơi        | Hệ thống thông báo người chiến thắng và kết thúc ván                  |
| UC07 | Chơi lại                 | Người chơi nhấn nút chơi lại để bắt đầu ván mới                       |

### Luồng chơi chính

1. Người chơi mở trò chơi.
2. Hệ thống tạo bàn cờ 9x9.
3. Người chơi 1 chọn quân cờ.
4. Người chơi chọn ô muốn di chuyển.
5. Hệ thống kiểm tra nước đi.
6. Nếu có quân đối phương, hệ thống xử lý luật ăn quân.
7. Kiểm tra điều kiện thắng.
8. Nếu chưa có người thắng, chuyển lượt cho người chơi 2.
9. Hai người chơi tiếp tục cho đến khi có người thắng.
10. Người chơi có thể chọn Chơi lại để bắt đầu ván mới.

---

## 4. Công nghệ sử dụng

* HTML
* CSS
* JavaScript
* Git
* GitHub

---

## 5. Cấu trúc project

text
OTTv2/
│
├── index.html
├── style.css
├── game.js
└── README.md

### index.html

Xây dựng cấu trúc và giao diện chính của trò chơi.

### style.css

Thiết kế giao diện bàn cờ, quân cờ và các thành phần trên trang.

### game.js

Xử lý logic của trò chơi:

* Tạo bàn cờ 9x9.
* Quản lý quân cờ.
* Chọn quân.
* Di chuyển quân.
* Kiểm tra nước đi.
* Quản lý lượt chơi.
* Xử lý luật ăn quân.
* Kiểm tra điều kiện thắng.

---

## 6. Cách chạy chương trình

### Cách 1: Mở trực tiếp

Mở file index.html bằng trình duyệt.

### Cách 2: Sử dụng Live Server

Mở project bằng Visual Studio Code.

Cài extension Live Server.

Sau đó:

Chuột phải vào index.html → Open with Live Server

---

## 7. Cách chơi

1. Người chơi 1 bắt đầu.
2. Click vào quân cờ của mình.
3. Click vào ô muốn di chuyển.
4. Quân chỉ được đi tối đa 1 ô theo 8 hướng.
5. Hệ thống xử lý việc ăn quân theo luật Đấm - Lá - Kéo.
6. Sau mỗi lượt, quyền chơi chuyển sang người chơi còn lại.
7. Khi một người thỏa điều kiện thắng, trò chơi kết thúc.
8. Nhấn Chơi lại để bắt đầu ván mới.

---

## 8. Thành viên nhóm

| STT | Họ và tên | MSSV |
| --- | --------- | ---- |
| 1   | ...       | ...  |
| 2   | ...       | ...  |
| 3   | ...       | ...  |
| 4   | ...       | ...  |

---

## 9. Phiên bản

### Version 1.0

* Xây dựng giao diện bàn cờ 9x9.
* Hiển thị quân cờ.
* Chọn và di chuyển quân.
* Quản lý lượt chơi.
* Xử lý luật chơi OTTv2.

### Version 2.0

* Xây dựng server.
* Hỗ trợ nhiều người chơi cùng lúc.
* Đồng bộ trạng thái trò chơi giữa các người chơi.
# OTTv2
BT lập trình web 01
# Oẳn Tù Tì v2 (OTTv2)

## 1. Giới thiệu

OTTv2 là trò chơi Oẳn Tù Tì được xây dựng dưới dạng website.

Trò chơi gồm 2 người chơi trên bàn cờ 9x9. Mỗi quân cờ được di chuyển tối đa 1 ô theo 8 hướng giống quân Vua trong cờ vua.

Project được thực hiện cho bài tập môn học.

---

## 2. Luật chơi

### Bàn cờ

* Bàn cờ có kích thước 9x9.
* Mỗi quân cờ chỉ được di chuyển tối đa 1 ô.
* Quân cờ có thể di chuyển theo 8 hướng:

  * Lên
  * Xuống
  * Trái
  * Phải
  * Chéo trên trái
  * Chéo trên phải
  * Chéo dưới trái
  * Chéo dưới phải

### Các loại quân

Trò chơi có 3 loại quân:

* Đấm
* Lá
* Kéo

Quy tắc ăn quân:

* Đấm thắng Kéo
* Kéo thắng Lá
* Lá thắng Đấm
* Hai quân cùng loại không thể ăn nhau và sẽ chặn đường nhau.

### Điều kiện thắng

Người chơi thắng khi:

* Ăn hết hoàn toàn một loại quân của đối phương.

hoặc

* Đưa được quân vào ô a1 hoặc i9.

---

## 3. Các Use Case chính

| STT  | Use Case                 | Mô tả                                                                 |
| ---- | ------------------------ | --------------------------------------------------------------------- |
| UC01 | Bắt đầu trò chơi         | Người chơi mở website và bắt đầu ván chơi                             |
| UC02 | Chọn quân cờ             | Người chơi chọn một quân cờ của mình                                  |
| UC03 | Di chuyển quân cờ        | Người chơi di chuyển quân tối đa 1 ô theo 8 hướng                     |
| UC04 | Ăn quân đối phương       | Hệ thống xử lý việc ăn quân theo luật Đấm - Lá - Kéo                  |
| UC05 | Kiểm tra điều kiện thắng | Hệ thống kiểm tra người chơi đã ăn hết một loại quân hoặc vào ô a1/i9 |
| UC06 | Kết thúc trò chơi        | Hệ thống thông báo người chiến thắng và kết thúc ván                  |
| UC07 | Chơi lại                 | Người chơi nhấn nút chơi lại để bắt đầu ván mới                       |

### Luồng chơi chính

1. Người chơi mở trò chơi.
2. Hệ thống tạo bàn cờ 9x9.
3. Người chơi 1 chọn quân cờ.
4. Người chơi chọn ô muốn di chuyển.
5. Hệ thống kiểm tra nước đi.
6. Nếu có quân đối phương, hệ thống xử lý luật ăn quân.
7. Kiểm tra điều kiện thắng.
8. Nếu chưa có người thắng, chuyển lượt cho người chơi 2.
9. Hai người chơi tiếp tục cho đến khi có người thắng.
10. Người chơi có thể chọn Chơi lại để bắt đầu ván mới.

---

## 4. Công nghệ sử dụng

* HTML
* CSS
* JavaScript
* Git
* GitHub

---

## 5. Cấu trúc project

text
OTTv2/
│
├── index.html
├── style.css
├── game.js
└── README.md

### index.html

Xây dựng cấu trúc và giao diện chính của trò chơi.

### style.css

Thiết kế giao diện bàn cờ, quân cờ và các thành phần trên trang.

### game.js

Xử lý logic của trò chơi:

* Tạo bàn cờ 9x9.
* Quản lý quân cờ.
* Chọn quân.
* Di chuyển quân.
* Kiểm tra nước đi.
* Quản lý lượt chơi.
* Xử lý luật ăn quân.
* Kiểm tra điều kiện thắng.

---

## 6. Cách chạy chương trình

### Cách 1: Mở trực tiếp

Mở file index.html bằng trình duyệt.

### Cách 2: Sử dụng Live Server

Mở project bằng Visual Studio Code.

Cài extension Live Server.

Sau đó:

Chuột phải vào index.html → Open with Live Server

---

## 7. Cách chơi

1. Người chơi 1 bắt đầu.
2. Click vào quân cờ của mình.
3. Click vào ô muốn di chuyển.
4. Quân chỉ được đi tối đa 1 ô theo 8 hướng.
5. Hệ thống xử lý việc ăn quân theo luật Đấm - Lá - Kéo.
6. Sau mỗi lượt, quyền chơi chuyển sang người chơi còn lại.
7. Khi một người thỏa điều kiện thắng, trò chơi kết thúc.
8. Nhấn Chơi lại để bắt đầu ván mới.

---

## 8. Thành viên nhóm

| STT | Họ và tên | MSSV |
| --- | --------- | ---- |
| 1   | ...       | ...  |
| 2   | ...       | ...  |
| 3   | ...       | ...  |
| 4   | ...       | ...  |

---

## 9. Phiên bản

### Version 1.0

* Xây dựng giao diện bàn cờ 9x9.
* Hiển thị quân cờ.
* Chọn và di chuyển quân.
* Quản lý lượt chơi.
* Xử lý luật chơi OTTv2.

### Version 2.0

* Xây dựng server.
* Hỗ trợ nhiều người chơi cùng lúc.
* Đồng bộ trạng thái trò chơi giữa các người chơi.
