"""Kiểu dữ liệu nội bộ của engine (dataclass thuần, không phụ thuộc DB)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Word:
    """Một từ với mốc thời gian (ms). start/end có thể None nếu whisper không trả timestamp."""

    text: str
    start_ms: Optional[int]
    end_ms: Optional[int]


@dataclass
class RawSegment:
    """Segment thô từ transcriber trước khi áp luật tách phụ đề."""

    start_ms: int
    end_ms: int
    text: str
    words: list[Word] = field(default_factory=list)


@dataclass
class Cue:
    """Một dòng phụ đề cuối cùng (đã tách theo luật), sẵn sàng ghi ra SRT/VTT/ASS."""

    order: int
    start_ms: int
    end_ms: int
    text: str
    words: list[Word] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "order": self.order,
            "startMs": self.start_ms,
            "endMs": self.end_ms,
            "text": self.text,
            "words": [
                {"text": w.text, "startMs": w.start_ms, "endMs": w.end_ms}
                for w in self.words
            ],
        }


@dataclass
class TranscriptionResult:
    """Kết quả transcribe: ngôn ngữ nhận diện + danh sách segment thô."""

    language: str
    language_probability: float
    duration_ms: int
    segments: list[RawSegment]
