"""Sinh nội dung SRT / VTT / ASS từ danh sách Cue.

An toàn: KHÔNG chèn tag ASS do người dùng cung cấp; escape ký tự đặc biệt.
Style ASS cố định (DejaVu Sans, chữ trắng viền đen, canh dưới giữa) — người dùng
chỉ điều chỉnh qua tham số style đã kiểm soát, không truyền chuỗi ASS thô.
"""
from __future__ import annotations

from dataclasses import dataclass

from .models import Cue


def _fmt_srt_time(ms: int) -> str:
    ms = max(0, ms)
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, milli = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{milli:03d}"


def _fmt_vtt_time(ms: int) -> str:
    ms = max(0, ms)
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, milli = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{milli:03d}"


def _fmt_ass_time(ms: int) -> str:
    """ASS dùng centisecond, giờ 1 chữ số: H:MM:SS.cc."""
    ms = max(0, ms)
    h, rem = divmod(ms, 3_600_000)
    m, rem = divmod(rem, 60_000)
    s, milli = divmod(rem, 1000)
    cs = milli // 10
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"


def render_srt(cues: list[Cue]) -> str:
    blocks = []
    for i, cue in enumerate(cues, start=1):
        blocks.append(
            f"{i}\n{_fmt_srt_time(cue.start_ms)} --> {_fmt_srt_time(cue.end_ms)}\n{cue.text}\n"
        )
    return "\n".join(blocks)


def render_vtt(cues: list[Cue]) -> str:
    lines = ["WEBVTT", ""]
    for cue in cues:
        lines.append(f"{_fmt_vtt_time(cue.start_ms)} --> {_fmt_vtt_time(cue.end_ms)}")
        lines.append(cue.text)
        lines.append("")
    return "\n".join(lines)


@dataclass
class AssStyle:
    """Style ASS đã kiểm soát (bắt nguồn từ subtitleStyle của project)."""

    font_name: str = "DejaVu Sans"
    font_size: int = 56
    primary_color: str = "#FFFFFF"
    outline_color: str = "#000000"
    outline_width: float = 4.0
    position: str = "bottom"  # bottom | middle | top
    margin_v: int = 80
    background_enabled: bool = False
    background_color: str = "#000000"
    background_opacity: float = 0.5


def _hex_to_ass_color(hex_color: str, alpha: float = 0.0) -> str:
    """#RRGGBB → &HAABBGGRR (ASS dùng thứ tự đảo BGR + alpha, alpha 0 = mờ đục)."""
    h = hex_color.lstrip("#")
    if len(h) != 6:
        h = "FFFFFF"
    r, g, b = h[0:2], h[2:4], h[4:6]
    a = max(0, min(255, int(round(alpha * 255))))
    return f"&H{a:02X}{b}{g}{r}".upper()


def _ass_alignment(position: str) -> int:
    """Numpad alignment: 2 = dưới giữa, 5 = giữa, 8 = trên giữa."""
    return {"bottom": 2, "middle": 5, "top": 8}.get(position, 2)


def escape_ass_text(text: str) -> str:
    """Escape để văn bản không bị hiểu thành lệnh ASS.

    - Xuống dòng → \\N
    - '{' '}' (mở/đóng override) → thêm '\\' để vô hiệu
    - '\\' đứng trước ký tự khác → nhân đôi tránh tạo lệnh ngoài ý muốn
    """
    out = text.replace("\\", "\\\\")
    out = out.replace("{", "\\{").replace("}", "\\}")
    out = out.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\N")
    return out


def render_ass(cues: list[Cue], style: AssStyle, play_res_x: int = 1280, play_res_y: int = 720) -> str:
    primary = _hex_to_ass_color(style.primary_color, 0.0)
    outline = _hex_to_ass_color(style.outline_color, 0.0)
    # BackColour dùng cho bóng/nền; alpha lấy từ opacity (0 mờ đục → cần đảo).
    back_alpha = 1.0 - style.background_opacity if style.background_enabled else 1.0
    back = _hex_to_ass_color(style.background_color, back_alpha)
    border_style = 3 if style.background_enabled else 1
    alignment = _ass_alignment(style.position)

    header = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        f"PlayResX: {play_res_x}",
        f"PlayResY: {play_res_y}",
        "",
        "[V4+ Styles]",
        (
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding"
        ),
        (
            f"Style: Default,{style.font_name},{style.font_size},{primary},{primary},"
            f"{outline},{back},0,0,0,0,100,100,0,0,{border_style},"
            f"{style.outline_width:g},0,{alignment},40,40,{style.margin_v},1"
        ),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    events = []
    for cue in cues:
        events.append(
            f"Dialogue: 0,{_fmt_ass_time(cue.start_ms)},{_fmt_ass_time(cue.end_ms)},"
            f"Default,,0,0,0,,{escape_ass_text(cue.text)}"
        )

    return "\n".join(header + events) + "\n"
