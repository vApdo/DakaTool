"""Subtitle engine cho DakaTool Auto Subtitle.

Engine chạy như tiến trình con do Node worker gọi qua spawn (mảng tham số, không shell).
KHÔNG truy cập database. Chỉ: nhận đường dẫn video vào + thư mục ra, xử lý, ghi file
kết quả, phát tiến độ dạng JSON Lines trên stdout (log chẩn đoán ra stderr).
"""

__version__ = "0.1.0"
