"""Nhận dạng giọng nói bằng faster-whisper.

Import faster-whisper theo kiểu lười (trong hàm) để test formatter/format không cần
cài model nặng. Có interface WordAligner để sau này cắm WhisperX cải thiện timestamp.
"""
from __future__ import annotations

from typing import Optional, Protocol

from . import progress
from .models import RawSegment, TranscriptionResult, Word


class WordAligner(Protocol):
    """Điểm mở rộng: căn chỉnh timestamp mức từ (ví dụ WhisperX) sau transcribe."""

    def align(self, audio_path: str, result: TranscriptionResult) -> TranscriptionResult: ...


class TranscriptionError(Exception):
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def _to_ms(seconds: Optional[float]) -> Optional[int]:
    if seconds is None:
        return None
    return int(round(seconds * 1000))


def transcribe(
    audio_path: str,
    *,
    language: Optional[str],
    model_name: str,
    device: str,
    compute_type: str,
    beam_size: int,
    vad_enabled: bool,
    duration_ms: int,
    aligner: Optional[WordAligner] = None,
) -> TranscriptionResult:
    """Chạy faster-whisper, trả TranscriptionResult. Phát progress theo mốc thời gian audio.

    language=None hoặc "auto" → để model tự nhận diện.
    """
    try:
        from faster_whisper import WhisperModel  # noqa: PLC0415 (lazy import)
    except Exception as exc:  # pragma: no cover - phụ thuộc môi trường
        raise TranscriptionError(f"Không import được faster-whisper: {exc}", "MODEL_LOAD_FAILED") from exc

    try:
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
    except Exception as exc:
        raise TranscriptionError(f"Không tải được model '{model_name}': {exc}", "MODEL_LOAD_FAILED") from exc

    lang_arg = None if not language or language == "auto" else language

    try:
        segments_iter, info = model.transcribe(
            audio_path,
            language=lang_arg,
            beam_size=beam_size,
            word_timestamps=True,
            vad_filter=vad_enabled,
            vad_parameters={"min_silence_duration_ms": 500} if vad_enabled else None,
            condition_on_previous_text=False,
        )
    except Exception as exc:
        raise TranscriptionError(f"Transcribe thất bại: {exc}", "TRANSCRIPTION_FAILED") from exc

    total_ms = max(1, duration_ms)
    raw_segments: list[RawSegment] = []
    try:
        # faster-whisper trả generator lười — phải lặp mới thực sự chạy suy luận.
        for seg in segments_iter:
            words: list[Word] = []
            if getattr(seg, "words", None):
                for w in seg.words:
                    words.append(
                        Word(text=w.word, start_ms=_to_ms(w.start), end_ms=_to_ms(w.end))
                    )
            raw_segments.append(
                RawSegment(
                    start_ms=_to_ms(seg.start) or 0,
                    end_ms=_to_ms(seg.end) or 0,
                    text=seg.text,
                    words=words,
                )
            )
            progress.progress("transcribing", min(0.99, (seg.end or 0) * 1000 / total_ms))
    except Exception as exc:
        raise TranscriptionError(f"Lỗi khi đọc kết quả transcribe: {exc}", "TRANSCRIPTION_FAILED") from exc

    result = TranscriptionResult(
        language=getattr(info, "language", None) or (lang_arg or "auto"),
        language_probability=float(getattr(info, "language_probability", 0.0) or 0.0),
        duration_ms=duration_ms,
        segments=raw_segments,
    )

    if aligner is not None:
        result = aligner.align(audio_path, result)

    return result
