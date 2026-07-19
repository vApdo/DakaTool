"""Test phần xử lý phản hồi OpenAI (không gọi mạng): offset thời gian + fallback không timestamp."""
from __future__ import annotations

from subtitle_engine.openai_transcriber import _chunk_seconds, _segments_from_response


def test_verbose_json_segments_with_offset():
    body = {
        "segments": [
            {"start": 0.0, "end": 2.0, "text": "Xin chào"},
            {"start": 2.0, "end": 4.0, "text": "các bạn"},
        ]
    }
    segs = _segments_from_response(body, offset_ms=600_000, chunk_dur_ms=90_000)
    assert len(segs) == 2
    # cộng offset 600s cho đoạn thứ hai
    assert segs[0].start_ms == 600_000
    assert segs[0].end_ms == 602_000
    assert segs[1].text == "các bạn"


def test_plain_text_fallback_one_segment():
    # gpt-4o-transcribe: chỉ có text, không segments → một segment trải cả đoạn
    body = {"text": "Đây là lời nói không kèm timestamp"}
    segs = _segments_from_response(body, offset_ms=0, chunk_dur_ms=90_000)
    assert len(segs) == 1
    assert segs[0].start_ms == 0
    assert segs[0].end_ms == 90_000
    assert "timestamp" in segs[0].text


def test_empty_response():
    assert _segments_from_response({"text": "  "}, 0, 1000) == []
    assert _segments_from_response({}, 0, 1000) == []


def test_chunk_length_depends_on_model():
    assert _chunk_seconds("gpt-4o-transcribe") == 90  # ngắn để suy giờ đỡ thô
    assert _chunk_seconds("whisper-1") == 600  # có timestamp riêng nên đoạn dài được
