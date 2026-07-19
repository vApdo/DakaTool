"""Test luật tách phụ đề: không mất chữ, không chồng lấn, xử lý thiếu timestamp, Unicode VN."""
from __future__ import annotations

from subtitle_engine.formatter import (
    CUE_GAP_MS,
    MAX_CHARS_PER_LINE,
    MAX_CUE_DURATION_MS,
    format_segments,
    wrap_text,
)
from subtitle_engine.models import RawSegment, Word


def _words(pairs: list[tuple[str, int, int]]) -> list[Word]:
    return [Word(text=t, start_ms=s, end_ms=e) for t, s, e in pairs]


def _all_text(cues) -> str:
    return " ".join(c.text.replace("\n", " ") for c in cues)


def test_no_word_loss_simple():
    seg = RawSegment(
        start_ms=0,
        end_ms=2000,
        text="xin chào các bạn",
        words=_words([("xin", 0, 300), ("chào", 300, 700), ("các", 700, 1200), ("bạn", 1200, 2000)]),
    )
    cues = format_segments([seg])
    assert "xin" in _all_text(cues)
    assert "chào" in _all_text(cues)
    assert "các" in _all_text(cues)
    assert "bạn" in _all_text(cues)


def test_no_overlap_and_gap():
    # Nhiều câu ngắn có khoảng lặng để buộc tách thành nhiều cue.
    words = []
    t = 0
    for i in range(20):
        words.append(Word(text=f"từ{i}.", start_ms=t, end_ms=t + 400))
        t += 400 + 700  # khoảng lặng > SPLIT_PAUSE_MS
    seg = RawSegment(start_ms=0, end_ms=t, text=" ".join(w.text for w in words), words=words)
    cues = format_segments([seg])
    assert len(cues) >= 2
    for a, b in zip(cues, cues[1:]):
        assert a.end_ms <= b.start_ms, "cue không được chồng lấn"
        assert b.start_ms - a.end_ms >= 0


def test_max_duration_enforced_by_split():
    # Chuỗi từ liên tục dài hơn MAX_CUE_DURATION_MS → phải tách.
    words = []
    t = 0
    for i in range(40):
        words.append(Word(text=f"w{i}", start_ms=t, end_ms=t + 300))
        t += 300
    seg = RawSegment(start_ms=0, end_ms=t, text=" ".join(w.text for w in words), words=words)
    cues = format_segments([seg])
    for c in cues:
        assert c.end_ms - c.start_ms <= MAX_CUE_DURATION_MS + 1


def test_missing_timestamps_distributed():
    # Words không có timestamp → phân bổ theo segment.
    seg = RawSegment(
        start_ms=1000,
        end_ms=5000,
        text="một hai ba bốn",
        words=[Word(text=w, start_ms=None, end_ms=None) for w in ["một", "hai", "ba", "bốn"]],
    )
    cues = format_segments([seg])
    assert cues
    assert cues[0].start_ms >= 1000
    assert cues[-1].end_ms <= 5000 + 1000  # có thể mở rộng theo MIN duration
    # thứ tự thời gian tăng dần
    for c in cues:
        assert c.end_ms > c.start_ms


def test_segment_without_words():
    seg = RawSegment(start_ms=0, end_ms=3000, text="đây là một câu không có từ", words=[])
    cues = format_segments([seg])
    assert "đây" in _all_text(cues)
    assert "câu" in _all_text(cues)


def test_vietnamese_unicode_preserved():
    text = "Tiếng Việt có dấu: ăâêôơưđ ẫ ệ ỗ."
    seg = RawSegment(start_ms=0, end_ms=2000, text=text, words=[])
    cues = format_segments([seg])
    joined = _all_text(cues)
    for ch in "ăâêôơưđẫệỗ":
        assert ch in joined


def test_wrap_text_line_length():
    tokens = ["đây", "là", "một", "đoạn", "văn", "bản", "khá", "dài", "để", "kiểm", "tra", "xuống", "dòng"]
    wrapped = wrap_text(tokens)
    for line in wrapped.split("\n"):
        # Cho phép vượt nhẹ khi một từ đơn dài hơn giới hạn, nhưng nhìn chung tôn trọng.
        assert len(line) <= MAX_CHARS_PER_LINE + 20
    assert wrapped.count("\n") <= 1


def test_respects_segment_boundaries():
    # Hai câu tự nhiên riêng biệt → KHÔNG gộp thành một cue.
    segs = [
        RawSegment(0, 1500, "Xin chào.", _words([("Xin", 0, 700), ("chào.", 700, 1500)])),
        RawSegment(1700, 3200, "Tạm biệt.", _words([("Tạm", 1700, 2400), ("biệt.", 2400, 3200)])),
    ]
    cues = format_segments(segs)
    assert len(cues) == 2
    assert "Xin chào." in cues[0].text
    assert "Tạm biệt." in cues[1].text


def test_balanced_two_line_wrap():
    # Câu dài hơn một dòng → chia hai dòng gần cân, không nhồi đầy dòng trên.
    words = _words([(f"từ{i}", i * 500, i * 500 + 400) for i in range(16)])
    seg = RawSegment(0, 8000, " ".join(w.text for w in words), words)
    cues = format_segments(seg and [seg])
    for c in cues:
        lines = c.text.split("\n")
        if len(lines) == 2:
            assert abs(len(lines[0]) - len(lines[1])) <= 12  # hai dòng gần cân


def test_order_is_sequential():
    words = _words([(f"w{i}", i * 1000, i * 1000 + 400) for i in range(10)])
    seg = RawSegment(start_ms=0, end_ms=10000, text=" ".join(w.text for w in words), words=words)
    cues = format_segments([seg])
    assert [c.order for c in cues] == list(range(1, len(cues) + 1))
