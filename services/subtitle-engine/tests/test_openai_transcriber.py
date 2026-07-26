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


def test_no_speech_needs_both_conditions():
    """Chuẩn Whisper: chỉ bỏ khi no_speech_prob CAO và avg_logprob THẤP (cả hai)."""
    from subtitle_engine.openai_transcriber import _segments_from_response

    body = {
        "segments": [
            # Câu thật, sạch → giữ
            {"start": 0.0, "end": 2.0, "text": "Câu thật", "no_speech_prob": 0.1, "avg_logprob": -0.3},
            # Ảo giác điển hình: nghi không phải tiếng nói + độ tin cậy thấp → bỏ
            {"start": 2.0, "end": 4.0, "text": "Hãy đăng ký kênh", "no_speech_prob": 0.95, "avg_logprob": -1.4},
            # Lời thoại trên nền nhạc: no_speech cao NHƯNG logprob tốt → PHẢI GIỮ
            {"start": 4.0, "end": 6.0, "text": "Thoại có nhạc nền", "no_speech_prob": 0.8, "avg_logprob": -0.4},
        ]
    }
    segs = _segments_from_response(body, 0, 6000)
    texts = [s.text for s in segs]
    assert texts == ["Câu thật", "Thoại có nhạc nền"]


def test_parse_silences():
    from subtitle_engine.openai_transcriber import parse_silences

    stderr = """
[silencedetect @ 0x1] silence_start: 1.5
[silencedetect @ 0x1] silence_end: 3.25 | silence_duration: 1.75
[silencedetect @ 0x1] silence_start: 10.0
"""
    silences = parse_silences(stderr)
    assert silences[0] == (1500, 3250)
    assert silences[1][0] == 10000  # im lặng mở tới hết file


def test_speech_regions_inverted_and_merged():
    from subtitle_engine.openai_transcriber import speech_regions_from_silences

    # File 10s: im lặng 2–5s và 5.2–8s (hai khoảng sát nhau).
    regions = speech_regions_from_silences([(2000, 5000), (5200, 8000)], 10_000)
    # Vùng nói: 0–2s, (5–5.2s bị gộp/bỏ vì quá ngắn sau pad), 8–10s
    assert regions[0][0] == 0
    assert regions[-1][1] == 10_000
    # Không vùng nào nằm giữa lòng khoảng im lặng dài
    for s, e in regions:
        assert e > s


def test_speech_regions_all_silent():
    from subtitle_engine.openai_transcriber import speech_regions_from_silences

    # Cả file im lặng → không còn vùng nói nào
    assert speech_regions_from_silences([(0, 10_000)], 10_000) == []
