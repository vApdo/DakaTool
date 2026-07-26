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


def _pause_before(words: list[Word], i: int) -> int:
    """Khoảng lặng (ms) giữa từ i-1 và i."""
    return (words[i].start_ms or 0) - (words[i - 1].end_ms or 0)


def _needs_split(words: list[Word]) -> bool:
    """Một nhóm từ có cần chia nhỏ không: quá dài ký tự / quá lâu / có khoảng lặng rõ."""
    if _line_length(words) > MAX_CHARS_PER_CUE:
        return True
    dur = (words[-1].end_ms or 0) - (words[0].start_ms or 0)
    if dur > MAX_CUE_DURATION_MS:
        return True
    return any(_pause_before(words, i) >= SPLIT_PAUSE_MS for i in range(1, len(words)))


def _best_split_index(words: list[Word]) -> int:
    """Chọn vị trí cắt TỰ NHIÊN nhất (cắt SAU từ index trả về).

    Ưu tiên: dấu kết câu mạnh → dấu ngắt yếu → khoảng lặng dài nhất → giữa theo ký tự.
    Trong mỗi nhóm ưu tiên, chọn điểm GẦN GIỮA nhất để hai vế cân đối, dễ đọc.
    """
    n = len(words)
    positions = list(range(n - 1))  # cắt sau từ i (không cắt sau từ cuối)
    mid = (n - 1) / 2

    def closest_to_middle(cands: list[int]) -> int:
        return min(cands, key=lambda i: abs(i - mid))

    strong = [i for i in positions if _ends_with(words[i].text, _STRONG_PUNCT)]
    if strong:
        return closest_to_middle(strong)
    weak = [i for i in positions if _ends_with(words[i].text, _WEAK_PUNCT)]
    if weak:
        return closest_to_middle(weak)
    # Khoảng lặng lớn nhất nếu đủ đáng kể.
    gap, idx = max((_pause_before(words, i + 1), i) for i in positions)
    if gap >= SPLIT_PAUSE_MS:
        return idx
    # Không có tín hiệu ngôn ngữ: cắt ở ranh giới từ gần giữa theo số ký tự.
    total = _line_length(words)
    for i in positions:
        if _line_length(words[: i + 1]) >= total / 2:
            return i
    return max(0, n // 2 - 1)


def _split_segment(words: list[Word]) -> list[list[Word]]:
    """Chia đệ quy một segment (đã là câu tự nhiên của Whisper) khi vượt giới hạn."""
    if len(words) <= 1 or not _needs_split(words):
        return [words]
    i = _best_split_index(words)
    if i < 0 or i >= len(words) - 1:
        return [words]
    return _split_segment(words[: i + 1]) + _split_segment(words[i + 1 :])


def wrap_text(tokens: list[str]) -> str:
    """Xuống dòng CÂN ĐỐI cho tối đa 2 dòng, cắt tại ranh giới từ (không cắt giữa từ).

    - Vừa một dòng (≤ MAX_CHARS_PER_LINE) → để nguyên một dòng.
    - Dài hơn → chia hai dòng sao cho độ dài hai dòng gần bằng nhau và cả hai ≤ giới hạn,
      dễ đọc hơn kiểu nhồi đầy dòng trên rồi hất phần dư xuống dòng dưới.
    """
    if not tokens:
        return ""
    full = " ".join(tokens)
    if len(full) <= MAX_CHARS_PER_LINE:
        return full

    best_i = 1
    best_penalty: float | None = None
    for i in range(1, len(tokens)):
        len1 = len(" ".join(tokens[:i]))
        len2 = len(" ".join(tokens[i:]))
        # Phạt chênh lệch độ dài; phạt nặng nếu một dòng vượt giới hạn.
        penalty = abs(len1 - len2)
        if len1 > MAX_CHARS_PER_LINE or len2 > MAX_CHARS_PER_LINE:
            penalty += 1000
        if best_penalty is None or penalty < best_penalty:
            best_penalty, best_i = penalty, i

    return " ".join(tokens[:best_i]) + "\n" + " ".join(tokens[best_i:])


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
    """Toàn bộ pipeline: TÔN TRỌNG ranh giới câu của Whisper.

    Mỗi segment từ Whisper là một đơn vị câu/mệnh đề tự nhiên. Ta giữ nguyên ranh giới
    đó (không gộp hai câu vào một cue), chỉ chia nhỏ segment khi nó quá dài — và khi chia
    thì cắt ở dấu câu / chỗ ngắt hơi gần giữa nhất để hai vế cân đối, đọc tự nhiên.
    """
    cues: list[Cue] = []
    for seg in segments:
        words = flatten_words([seg])
        if not words:
            continue
        for piece in _split_segment(words):
            if not piece:
                continue
            cues.append(
                Cue(
                    order=0,
                    start_ms=piece[0].start_ms or 0,
                    end_ms=piece[-1].end_ms or 0,
                    text=wrap_text([_clean_text(w.text) for w in piece]),
                    words=list(piece),
                )
            )
    cues = _adjust_timings(cues)
    for idx, cue in enumerate(cues, start=1):
        cue.order = idx
    return cues
