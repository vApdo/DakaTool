"""Test progress emitter: JSON Lines hợp lệ, stdout sạch."""
from __future__ import annotations

import io
import json

from subtitle_engine import progress


def test_progress_emits_json_line(monkeypatch):
    buf = io.StringIO()
    monkeypatch.setattr("sys.stdout", buf)
    progress.progress("transcribing", 0.5)
    line = buf.getvalue().strip()
    obj = json.loads(line)
    assert obj == {"type": "progress", "stage": "transcribing", "progress": 0.5}


def test_progress_clamped(monkeypatch):
    buf = io.StringIO()
    monkeypatch.setattr("sys.stdout", buf)
    progress.progress("x", 5.0)
    obj = json.loads(buf.getvalue().strip())
    assert obj["progress"] == 1.0


def test_completed_and_error(monkeypatch):
    buf = io.StringIO()
    monkeypatch.setattr("sys.stdout", buf)
    progress.completed("/tmp/out/result.json")
    progress.error("hỏng rồi", "TRANSCRIPTION_FAILED")
    lines = [json.loads(l) for l in buf.getvalue().strip().split("\n")]
    assert lines[0] == {"type": "completed", "resultPath": "/tmp/out/result.json"}
    assert lines[1] == {"type": "error", "message": "hỏng rồi", "code": "TRANSCRIPTION_FAILED"}


def test_log_goes_to_stderr(monkeypatch, capsys):
    progress.log("chẩn đoán")
    captured = capsys.readouterr()
    assert "chẩn đoán" in captured.err
    assert captured.out == ""
