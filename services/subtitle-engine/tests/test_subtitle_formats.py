"""Test định dạng SRT/VTT/ASS: timestamp đúng, escape ASS an toàn."""
from __future__ import annotations

from subtitle_engine.models import Cue
from subtitle_engine.subtitle_formats import (
    AssStyle,
    escape_ass_text,
    render_ass,
    render_srt,
    render_vtt,
)


def _cues():
    return [
        Cue(order=1, start_ms=0, end_ms=1500, text="Xin chào", words=[]),
        Cue(order=2, start_ms=1600, end_ms=3661, text="Dòng hai\nvới xuống dòng", words=[]),
    ]


def test_srt_timestamp_format():
    out = render_srt(_cues())
    assert "00:00:00,000 --> 00:00:01,500" in out
    assert "00:00:01,600 --> 00:00:03,661" in out
    assert out.startswith("1\n")


def test_vtt_header_and_timestamp():
    out = render_vtt(_cues())
    assert out.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:01.500" in out
    assert "00:00:03.661" in out


def test_ass_has_style_and_events():
    out = render_ass(_cues(), AssStyle())
    assert "[V4+ Styles]" in out
    assert "[Events]" in out
    assert "DejaVu Sans" in out
    # Xuống dòng chuyển thành \N
    assert "Dòng hai\\Nvới xuống dòng" in out


def test_ass_escapes_override_braces():
    dangerous = "{\\an8}\\pos(0,0) chèn tag"
    escaped = escape_ass_text(dangerous)
    # Dấu ngoặc nhọn phải bị vô hiệu để không trở thành override block.
    assert "\\{" in escaped
    assert "\\}" in escaped
    # Không còn '{' mở đầu block hợp lệ
    assert not escaped.startswith("{\\")


def test_ass_time_centiseconds():
    from subtitle_engine.subtitle_formats import _fmt_ass_time

    assert _fmt_ass_time(3661230) == "1:01:01.23"
    assert _fmt_ass_time(0) == "0:00:00.00"


def test_ass_color_conversion():
    from subtitle_engine.subtitle_formats import _hex_to_ass_color

    # #FFFFFF trắng, alpha 0 (mờ đục) → &H00FFFFFF
    assert _hex_to_ass_color("#FFFFFF", 0.0) == "&H00FFFFFF"
    # #FF0000 đỏ → BGR đảo thành 0000FF
    assert _hex_to_ass_color("#FF0000", 0.0) == "&H000000FF"
