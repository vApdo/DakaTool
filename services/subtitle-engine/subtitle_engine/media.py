"""Thao tác media qua ffprobe/ffmpeg. Luôn gọi bằng mảng tham số (không shell)."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


class MediaError(Exception):
    """Lỗi ffprobe/ffmpeg với mã lỗi engine tương ứng."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def probe_duration_ms(video_path: str) -> int:
    """Đọc thời lượng (ms) bằng ffprobe. Ném MediaError(FFPROBE_FAILED) nếu lỗi."""
    try:
        proc = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                video_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        data = json.loads(proc.stdout)
        duration = float(data["format"]["duration"])
        return int(round(duration * 1000))
    except (subprocess.CalledProcessError, KeyError, ValueError, json.JSONDecodeError) as exc:
        raise MediaError(f"ffprobe thất bại: {exc}", "FFPROBE_FAILED") from exc


def extract_audio(video_path: str, output_dir: str) -> str:
    """Tách audio 16kHz mono WAV — định dạng faster-whisper ưa dùng.

    Trả đường dẫn file audio. Ném MediaError(AUDIO_EXTRACTION_FAILED) nếu lỗi.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    audio_path = str(Path(output_dir) / "audio.wav")
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-y",
                "-i",
                video_path,
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                audio_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise MediaError(
            f"Tách audio thất bại: {exc.stderr[-500:] if exc.stderr else exc}",
            "AUDIO_EXTRACTION_FAILED",
        ) from exc
    if not Path(audio_path).exists():
        raise MediaError("Không tạo được file audio.", "AUDIO_EXTRACTION_FAILED")
    return audio_path
