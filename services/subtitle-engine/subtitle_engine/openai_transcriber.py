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
import re
import subprocess
from pathlib import Path
from typing import Callable, Optional

from . import progress
from .models import RawSegment, TranscriptionResult, Word

OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions"
MAX_REQUEST_BYTES = 24 * 1024 * 1024  # < 25MB giới hạn OpenAI

# VAD bằng silencedetect: coi là im lặng khi dưới -35dB kéo dài ≥ 0.6s.
SILENCE_NOISE_DB = "-35dB"
SILENCE_MIN_DUR_S = 0.6
SPEECH_PAD_MS = 250        # nới hai đầu đoạn nói để không cắt cụt chữ
SPEECH_MERGE_GAP_MS = 400  # hai đoạn nói cách nhau dưới ngưỡng này thì gộp
SPEECH_MIN_LEN_MS = 350    # đoạn "nói" ngắn hơn ngưỡng này coi như nhiễu, bỏ


class OpenAITranscriptionError(Exception):
    def __init__(self, message: str, code: str = "TRANSCRIPTION_FAILED"):
        super().__init__(message)
        self.code = code


def _chunk_seconds(model: str) -> int:
    # whisper-1 có timestamp riêng nên đoạn dài không sao; gpt-4o suy giờ theo đoạn → cắt ngắn.
    return 90 if model.startswith("gpt-4o") else 600


def parse_silences(ffmpeg_stderr: str) -> list[tuple[int, int]]:
    """Parse output silencedetect → danh sách khoảng im lặng [(start_ms, end_ms)]."""
    silences: list[tuple[int, int]] = []
    start: Optional[int] = None
    for line in ffmpeg_stderr.splitlines():
        m = re.search(r"silence_start:\s*(-?[0-9.]+)", line)
        if m:
            start = max(0, int(float(m.group(1)) * 1000))
            continue
        m = re.search(r"silence_end:\s*(-?[0-9.]+)", line)
        if m and start is not None:
            end = max(0, int(float(m.group(1)) * 1000))
            if end > start:
                silences.append((start, end))
            start = None
    if start is not None:
        silences.append((start, 10**12))  # im lặng kéo tới hết file
    return silences


def speech_regions_from_silences(
    silences: list[tuple[int, int]], total_ms: int
) -> list[tuple[int, int]]:
    """Đảo khoảng im lặng → các vùng CÓ tiếng nói; nới biên, gộp vùng sát nhau, bỏ vùng quá ngắn."""
    regions: list[tuple[int, int]] = []
    cursor = 0
    for s, e in sorted(silences):
        if s > cursor:
            regions.append((cursor, min(s, total_ms)))
        cursor = max(cursor, e)
    if cursor < total_ms:
        regions.append((cursor, total_ms))

    # Nới biên + gộp vùng gần nhau.
    padded = [
        (max(0, s - SPEECH_PAD_MS), min(total_ms, e + SPEECH_PAD_MS)) for s, e in regions
    ]
    merged: list[tuple[int, int]] = []
    for s, e in padded:
        if merged and s - merged[-1][1] <= SPEECH_MERGE_GAP_MS:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    return [(s, e) for s, e in merged if e - s >= SPEECH_MIN_LEN_MS]


def detect_speech_regions(audio_path: str, total_ms: int) -> list[tuple[int, int]]:
    """VAD bằng ffmpeg silencedetect. Trả các vùng có tiếng nói; lỗi thì coi cả file là nói."""
    try:
        proc = subprocess.run(
            [
                "ffmpeg", "-nostdin", "-i", audio_path,
                "-af", f"silencedetect=noise={SILENCE_NOISE_DB}:d={SILENCE_MIN_DUR_S}",
                "-f", "null", "-",
            ],
            capture_output=True, text=True,
        )
    except OSError:
        return [(0, total_ms)]
    return speech_regions_from_silences(parse_silences(proc.stderr), total_ms)


def _encode_region(
    audio_path: str, out_dir: str, index: int, start_ms: int, end_ms: int
) -> str:
    """Trích một vùng [start, end] thành MP3 mono 16k. Trả đường dẫn file."""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    out = str(Path(out_dir) / f"region_{index:05d}.mp3")
    try:
        subprocess.run(
            [
                "ffmpeg", "-nostdin", "-y",
                "-ss", f"{start_ms / 1000:.3f}", "-t", f"{(end_ms - start_ms) / 1000:.3f}",
                "-i", audio_path,
                "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k",
                out,
            ],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise OpenAITranscriptionError(
            f"Không cắt được audio: {exc.stderr[-300:] if exc.stderr else exc}",
            "AUDIO_EXTRACTION_FAILED",
        ) from exc
    return out


def _split_region(start_ms: int, end_ms: int, max_ms: int) -> list[tuple[int, int]]:
    """Chia vùng dài quá giới hạn thành các phần ≤ max_ms."""
    if end_ms - start_ms <= max_ms:
        return [(start_ms, end_ms)]
    parts: list[tuple[int, int]] = []
    cursor = start_ms
    while cursor < end_ms:
        parts.append((cursor, min(cursor + max_ms, end_ms)))
        cursor += max_ms
    return parts


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


# Câu có no_speech_prob cao hơn ngưỡng này = model tự nhận "không phải tiếng nói" → bỏ
# (đây là nguồn ảo giác "Hãy đăng ký kênh..." trên đoạn nhạc).
NO_SPEECH_THRESHOLD = 0.6


def _segments_from_response(body: dict, offset_ms: int, chunk_dur_ms: int) -> list[RawSegment]:
    """Chuyển JSON OpenAI → RawSegment, cộng offset thời gian của đoạn."""
    segs: list[RawSegment] = []
    if isinstance(body.get("segments"), list) and body["segments"]:
        for s in body["segments"]:
            if float(s.get("no_speech_prob", 0.0)) > NO_SPEECH_THRESHOLD:
                continue
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

    # VAD trước: chỉ gửi các vùng CÓ tiếng nói lên OpenAI. Chặn ảo giác trên
    # nhạc/im lặng (API whisper-1 không có VAD) và neo timestamp theo vị trí thật.
    regions = detect_speech_regions(audio_path, duration_ms)
    progress.log(f"VAD: {len(regions)} vùng có tiếng nói / tổng {duration_ms}ms")
    if not regions:
        # Không có tiếng nói (toàn nhạc/im lặng) → trả rỗng thay vì để model bịa.
        return TranscriptionResult(
            language=(language if language and language != "auto" else "auto"),
            language_probability=0.0,
            duration_ms=duration_ms,
            segments=[],
        )

    max_ms = _chunk_seconds(model) * 1000
    pieces: list[tuple[int, int]] = []
    for s, e in regions:
        pieces.extend(_split_region(s, e, max_ms))

    want_ts = not model.startswith("gpt-4o")  # chỉ whisper-1 trả verbose_json
    chunk_dir = str(Path(work_dir) / "chunks")
    all_segments: list[RawSegment] = []
    for i, (s, e) in enumerate(pieces):
        chunk = _encode_region(audio_path, chunk_dir, i, s, e)
        body = _post_openai(chunk, key, model, language, want_ts)
        all_segments.extend(_segments_from_response(body, s, e - s))
        progress.progress("transcribing", min(0.99, (i + 1) / len(pieces)))

    # Đánh lại order theo thời gian, phòng khi đoạn trả lệch.
    all_segments.sort(key=lambda s: s.start_ms)

    return TranscriptionResult(
        language=(language if language and language != "auto" else "auto"),
        language_probability=1.0,
        duration_ms=duration_ms,
        segments=all_segments,
    )
