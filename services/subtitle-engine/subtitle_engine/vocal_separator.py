"""Tách giọng nói/hát khỏi nhạc nền bằng Demucs (htdemucs) — chạy CPU.

Dùng cho video có nhạc nền to hoặc bài hát: đưa phần "vocals" sạch cho Whisper
thay vì audio gốc → giảm mạnh ảo giác và tăng độ chính xác.

Import demucs kiểu lười: chỉ cần cài (torch + demucs) khi thật sự bật tính năng.
Lần chạy đầu, demucs tự tải model htdemucs (~300MB) về cache (HF_HOME/torch hub).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from . import progress


class VocalSeparationError(Exception):
    def __init__(self, message: str, code: str = "AUDIO_EXTRACTION_FAILED"):
        super().__init__(message)
        self.code = code


def separate_vocals(audio_path: str, work_dir: str) -> str:
    """Tách vocals từ audio_path, trả đường dẫn WAV 16kHz mono chỉ chứa giọng.

    Ném VocalSeparationError nếu thiếu thư viện hoặc tách thất bại.
    """
    try:
        import torch  # noqa: PLC0415
        from demucs.api import Separator, save_audio  # noqa: PLC0415
    except Exception as exc:
        raise VocalSeparationError(
            f"Chưa cài demucs/torch cho tính năng tách giọng: {exc}",
            "MODEL_LOAD_FAILED",
        ) from exc

    out_dir = Path(work_dir) / "vocals"
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_vocals = str(out_dir / "vocals_raw.wav")
    vocals_16k = str(out_dir / "vocals.wav")

    progress.log("Demucs: bắt đầu tách giọng (lần đầu sẽ tải model ~300MB)…")
    try:
        torch.set_num_threads(max(1, (torch.get_num_threads() or 4)))
        separator = Separator(model="htdemucs", device="cpu", progress=False)
        _origin, separated = separator.separate_audio_file(audio_path)
        vocals = separated.get("vocals")
        if vocals is None:
            raise VocalSeparationError("Model không trả stem 'vocals'.")
        save_audio(vocals, raw_vocals, samplerate=separator.samplerate)
    except VocalSeparationError:
        raise
    except Exception as exc:
        raise VocalSeparationError(f"Tách giọng thất bại: {exc}") from exc

    # Đưa về 16kHz mono cho whisper.
    try:
        subprocess.run(
            [
                "ffmpeg", "-nostdin", "-y", "-i", raw_vocals,
                "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", vocals_16k,
            ],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise VocalSeparationError(
            f"Chuẩn hoá vocals thất bại: {exc.stderr[-300:] if exc.stderr else exc}"
        ) from exc

    progress.log("Demucs: tách giọng xong.")
    return vocals_16k
