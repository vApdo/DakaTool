"""Luật tách phụ đề: biến segment thô (từ whisper) thành các cue dễ đọc.

Nguyên tắc:
- Không mất chữ: mọi từ trong input đều xuất hiện đúng thứ tự ở output.
- Cắt tại ranh giới từ; ưu tiên chỗ có dấu kết câu . ! ? rồi , ; :
- Giới hạn ký tự / dòng, thời lượng cue, khoảng lặng → điểm cắt.
- Giữ nguyên Unicode tiếng Việt (không normalize, không bỏ dấu).
- Xử lý được trường hợp thiếu timestamp: phân bổ thời gian theo độ dài từ.
"""
from __future__ import annotations

from .models import Cue, RawSegment, Word

MAX_CHARS_PER_LINE = 42
MAX_LINES_PER_CUE = 2
MAX_CUE_DURATION_MS = 5500
MIN_CUE_DURATION_MS = 800
SPLIT_PAUSE_MS = 600
CUE_GAP_MS = 50

MAX_CHARS_PER_CUE = MAX_CHARS_PER_LINE * MAX_LINES_PER_CUE

_STRONG_PUNCT = (".", "!", "?", "…")
_WEAK_PUNCT = (",", ";", ":")


def _clean_text(text: str) -> str:
    return text.strip()


def flatten_words(segments: list[RawSegment]) -> list[Word]:
    """Gộp mọi từ về một danh sách phẳng với timestamp đảm bảo không None và tăng dần.

    - Nếu segment có words kèm timestamp → dùng trực tiếp.
    - Nếu thiếu timestamp (một phần hoặc toàn bộ) → phân bổ đều theo độ dài ký tự
      trong khoảng [segment.start_ms, segment.end_ms].
    """
    words: list[Word] = []
    for seg in segments:
        tokens = seg.words if seg.words else _tokens_from_text(seg.text)
        tokens = [t for t in tokens if _clean_text(t.text)]
        if not tokens:
            continue
        _fill_missing_timings(tokens, seg.start_ms, seg.end_ms)
        words.extend(tokens)

    # Ép đơn điệu: end >= start, start[i] >= end[i-1].
    prev_end = 0
    for w in words:
        if w.start_ms is None or w.start_ms < prev_end:
            w.start_ms = prev_end
        if w.end_ms is None or w.end_ms <= w.start_ms:
            w.end_ms = w.start_ms + 1
        prev_end = w.end_ms
    return words


def _tokens_from_text(text: str) -> list[Word]:
    return [Word(text=tok, start_ms=None, end_ms=None) for tok in text.split()]


def _fill_missing_timings(tokens: list[Word], start_ms: int, end_ms: int) -> None:
    """Phân bổ thời gian cho các token thiếu timestamp theo tỉ lệ độ dài ký tự."""
    if all(t.start_ms is not None and t.end_ms is not None for t in tokens):
        return
    span = max(1, end_ms - start_ms)
    total_chars = sum(max(1, len(_clean_text(t.text))) for t in tokens)
    cursor = start_ms
    for t in tokens:
        weight = max(1, len(_clean_text(t.text))) / total_chars
        dur = max(1, int(round(span * weight)))
        if t.start_ms is None:
            t.start_ms = cursor
        if t.end_ms is None:
            t.end_ms = min(end_ms, t.start_ms + dur)
        cursor = t.end_ms


def _line_length(words: list[Word]) -> int:
    """Số ký tự khi ghép words bằng khoảng trắng (gần đúng, để kiểm ngân sách)."""
    text = " ".join(_clean_text(w.text) for w in words)
    return len(text)


def _ends_with(text: str, chars: tuple[str, ...]) -> bool:
    stripped = text.rstrip("\"')]}»")
    return bool(stripped) and stripped[-1] in chars


def group_into_cues(words: list[Word]) -> list[Cue]:
    """Gom từ thành cue theo các luật giới hạn. Trả cue chưa canh chỉnh thời gian."""
    cues: list[Cue] = []
    current: list[Word] = []

    def flush() -> None:
        if not current:
            return
        text = wrap_text([_clean_text(w.text) for w in current])
        cues.append(
            Cue(
                order=len(cues) + 1,
                start_ms=current[0].start_ms or 0,
                end_ms=current[-1].end_ms or 0,
                text=text,
                words=list(current),
            )
        )
        current.clear()

    for word in words:
        if current:
            last = current[-1]
            pause = (word.start_ms or 0) - (last.end_ms or 0)
            projected_chars = _line_length(current + [word])
            projected_dur = (word.end_ms or 0) - (current[0].start_ms or 0)
            if (
                pause >= SPLIT_PAUSE_MS
                or projected_chars > MAX_CHARS_PER_CUE
                or projected_dur > MAX_CUE_DURATION_MS
            ):
                flush()
        current.append(word)
        # Ưu tiên cắt sau dấu kết câu mạnh; cắt sau dấu yếu nếu cue đã đủ dài.
        if _ends_with(word.text, _STRONG_PUNCT):
            flush()
        elif _ends_with(word.text, _WEAK_PUNCT) and _line_length(current) >= MAX_CHARS_PER_LINE:
            flush()

    flush()
    return cues


def wrap_text(tokens: list[str]) -> str:
    """Xuống dòng tham lam sao cho mỗi dòng ≤ MAX_CHARS_PER_LINE, tối đa 2 dòng.

    Nếu không đủ chỗ trong 2 dòng (hiếm, do từ quá dài) vẫn giữ đủ chữ, không cắt từ.
    """
    if not tokens:
        return ""
    lines: list[str] = []
    line = ""
    for tok in tokens:
        candidate = tok if not line else f"{line} {tok}"
        if len(candidate) <= MAX_CHARS_PER_LINE or not line:
            line = candidate
        else:
            lines.append(line)
            line = tok
            if len(lines) >= MAX_LINES_PER_CUE:
                # Dồn phần còn lại vào dòng cuối để không mất chữ.
                break
    if line:
        lines.append(line)
    if len(lines) > MAX_LINES_PER_CUE:
        head = lines[: MAX_LINES_PER_CUE - 1]
        tail = " ".join(lines[MAX_LINES_PER_CUE - 1 :])
        lines = head + [tail]
    return "\n".join(lines)


def _adjust_timings(cues: list[Cue]) -> list[Cue]:
    """Đảm bảo thời lượng tối thiểu và khoảng hở giữa các cue, không chồng lấn."""
    n = len(cues)
    for i, cue in enumerate(cues):
        if cue.end_ms <= cue.start_ms:
            cue.end_ms = cue.start_ms + MIN_CUE_DURATION_MS
        # Kéo dài cue quá ngắn nếu còn chỗ trước cue kế tiếp.
        if cue.end_ms - cue.start_ms < MIN_CUE_DURATION_MS:
            desired = cue.start_ms + MIN_CUE_DURATION_MS
            if i + 1 < n:
                limit = cues[i + 1].start_ms - CUE_GAP_MS
                cue.end_ms = min(desired, max(cue.end_ms, limit))
            else:
                cue.end_ms = desired
        # Tránh chồng lấn cue kế tiếp.
        if i + 1 < n and cue.end_ms + CUE_GAP_MS > cues[i + 1].start_ms:
            new_end = cues[i + 1].start_ms - CUE_GAP_MS
            if new_end > cue.start_ms:
                cue.end_ms = new_end
    return cues


def format_segments(segments: list[RawSegment]) -> list[Cue]:
    """Toàn bộ pipeline: flatten → group → canh thời gian → đánh số lại."""
    words = flatten_words(segments)
    cues = group_into_cues(words)
    cues = _adjust_timings(cues)
    for idx, cue in enumerate(cues, start=1):
        cue.order = idx
    return cues
