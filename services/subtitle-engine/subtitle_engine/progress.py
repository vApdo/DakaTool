"""Phát tiến độ dạng JSON Lines trên stdout.

Node worker đọc từng dòng stdout, parse JSON. Mọi log chẩn đoán KHÔNG đi qua đây
mà ghi ra stderr (xem log()). Điều này giữ stdout sạch, chỉ chứa sự kiện máy đọc.
"""
from __future__ import annotations

import json
import sys
from typing import Optional


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def progress(stage: str, value: float) -> None:
    """value trong [0,1]. stage: extracting_audio | transcribing | formatting | writing."""
    clamped = max(0.0, min(1.0, value))
    _emit({"type": "progress", "stage": stage, "progress": round(clamped, 4)})


def completed(result_path: str) -> None:
    _emit({"type": "completed", "resultPath": result_path})


def error(message: str, code: Optional[str] = None) -> None:
    payload: dict = {"type": "error", "message": message}
    if code:
        payload["code"] = code
    _emit(payload)


def log(*args: object) -> None:
    """Log chẩn đoán ra stderr (không ảnh hưởng luồng JSON Lines trên stdout)."""
    print(*args, file=sys.stderr, flush=True)
