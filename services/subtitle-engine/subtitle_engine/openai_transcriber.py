"""Nhận dạng giọng nói qua API OpenAI (whisper-1 / gpt-4o-transcribe).

Engine vẫn KHÔNG chạm DB. API key nhận qua biến môi trường OPENAI_API_KEY (Node worker
truyền vào khi spawn) — không đưa lên dòng lệnh để tránh lộ trong danh sách tiến trình.

- `whisper-1`: hỗ trợ response_format=verbose_json → có mốc thời gian theo câu (khớp phụ đề tốt).
- `gpt-4o-transcribe`: chính xác hơn nhưng KHÔNG trả timestamp → ta cắt audio thành đoạn ngắn
  và suy thời gian theo ranh giới đoạn (thô hơn). Vì vậy mặc định nên dùng whisper-1 cho phụ đề.

Audio dài được cắt thành nhiều đoạn để lách giới hạn 25MB mỗi request của OpenAI; mốc thời
gian mỗi đoạn được cộng offset theo vị trí đoạn.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Callable, Optional

from . import progress
from .models import RawSegment, TranscriptionResult, Word

OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions"
MAX_REQUEST_BYTES = 24 * 1024 * 1024  # < 25MB giới hạn OpenAI


class OpenAITranscriptionError(Exception):
    def __init__(self, message: str, code: str = "TRANSCRIPTION_FAILED"):
        super().__init__(message)
        self.code = code


def _chunk_seconds(model: str) -> int:
    # whisper-1 có timestamp riêng nên đoạn dài không sao; gpt-4o suy giờ theo đoạn → cắt ngắn.
    return 90 if model.startswith("gpt-4o") else 600


def _encode_chunks(audio_path: str, out_dir: str, chunk_seconds: int) -> list[str]:
    """Cắt audio thành các đoạn MP3 mono 16k (nhỏ, dưới giới hạn dung lượng)."""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    pattern = str(Path(out_dir) / "chunk_%05d.mp3")
    try:
        subprocess.run(
            [
                "ffmpeg", "-nostdin", "-y", "-i", audio_path,
                "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k",
                "-f", "segment", "-segment_time", str(chunk_seconds), pattern,
            ],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise OpenAITranscriptionError(
            f"Không cắt được audio: {exc.stderr[-300:] if exc.stderr else exc}",
            "AUDIO_EXTRACTION_FAILED",
        ) from exc
    return sorted(str(p) for p in Path(out_dir).glob("chunk_*.mp3"))


def _post_openai(
    chunk_path: str, api_key: str, model: str, language: Optional[str], want_timestamps: bool
) -> dict:
    """Gọi endpoint transcriptions cho một đoạn. Trả JSON đã parse."""
    import requests  # noqa: PLC0415 (lazy import — chỉ cần cho provider openai)

    if os.path.getsize(chunk_path) > MAX_REQUEST_BYTES:
        raise OpenAITranscriptionError("Đoạn audio vượt 25MB sau khi nén.", "TRANSCRIPTION_FAILED")

    data = {"model": model}
    if language and language != "auto":
        data["language"] = language
    if want_timestamps:
        data["response_format"] = "verbose_json"
    else:
        data["response_format"] = "json"

    with open(chunk_path, "rb") as fh:
        files = {"file": (Path(chunk_path).name, fh, "audio/mpeg")}
        try:
            resp = requests.post(
                OPENAI_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                data=data,
                files=files,
                timeout=600,
            )
        except requests.RequestException as exc:
            raise OpenAITranscriptionError(f"Không gọi được API OpenAI: {exc}") from exc

    if resp.status_code == 401:
        raise OpenAITranscriptionError("API key OpenAI không hợp lệ.", "MODEL_LOAD_FAILED")
    if resp.status_code == 429:
        raise OpenAITranscriptionError("OpenAI báo quá giới hạn (rate limit / hết hạn mức).")
    if resp.status_code >= 400:
        raise OpenAITranscriptionError(f"OpenAI lỗi {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def _segments_from_response(body: dict, offset_ms: int, chunk_dur_ms: int) -> list[RawSegment]:
    """Chuyển JSON OpenAI → RawSegment, cộng offset thời gian của đoạn."""
    segs: list[RawSegment] = []
    if isinstance(body.get("segments"), list) and body["segments"]:
        for s in body["segments"]:
            start = int(round(float(s.get("start", 0)) * 1000)) + offset_ms
            end = int(round(float(s.get("end", 0)) * 1000)) + offset_ms
            text = str(s.get("text", "")).strip()
            if text:
                segs.append(RawSegment(start_ms=start, end_ms=max(end, start + 1), text=text, words=[]))
    else:
        # Không có timestamp (gpt-4o): cả đoạn thành một segment, formatter sẽ chia theo ký tự.
        text = str(body.get("text", "")).strip()
        if text:
            segs.append(
                RawSegment(start_ms=offset_ms, end_ms=offset_ms + chunk_dur_ms, text=text, words=[])
            )
    return segs


def transcribe_openai(
    audio_path: str,
    *,
    model: str,
    language: Optional[str],
    duration_ms: int,
    work_dir: str,
    api_key: Optional[str] = None,
) -> TranscriptionResult:
    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        raise OpenAITranscriptionError("Chưa cấu hình API key OpenAI.", "MODEL_LOAD_FAILED")

    chunk_seconds = _chunk_seconds(model)
    chunks = _encode_chunks(audio_path, str(Path(work_dir) / "chunks"), chunk_seconds)
    if not chunks:
        raise OpenAITranscriptionError("Không tạo được đoạn audio nào.", "AUDIO_EXTRACTION_FAILED")

    want_ts = not model.startswith("gpt-4o")  # chỉ whisper-1 trả verbose_json
    all_segments: list[RawSegment] = []
    for i, chunk in enumerate(chunks):
        offset_ms = i * chunk_seconds * 1000
        body = _post_openai(chunk, key, model, language, want_ts)
        all_segments.extend(_segments_from_response(body, offset_ms, chunk_seconds * 1000))
        progress.progress("transcribing", min(0.99, (i + 1) / len(chunks)))

    # Đánh lại order theo thời gian, phòng khi đoạn trả lệch.
    all_segments.sort(key=lambda s: s.start_ms)

    return TranscriptionResult(
        language=(language if language and language != "auto" else "auto"),
        language_probability=1.0,
        duration_ms=duration_ms,
        segments=all_segments,
    )
