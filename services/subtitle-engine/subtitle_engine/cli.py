"""CLI engine: python -m subtitle_engine.cli transcribe ...

Node worker gọi bằng mảng tham số (spawn, không shell). Engine KHÔNG chạm DB.
Đầu vào: đường dẫn video + thư mục ra + tuỳ chọn model/ngôn ngữ.
Đầu ra: result.json + subtitles.srt/vtt/ass trong thư mục ra; tiến độ JSON Lines trên stdout.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import progress
from .formatter import format_segments
from .media import MediaError, extract_audio, probe_duration_ms
from .models import Cue
from .subtitle_formats import AssStyle, render_ass, render_srt, render_vtt
from .transcriber import TranscriptionError, transcribe


def _write_outputs(output_dir: str, cues: list[Cue], language: str, language_prob: float, duration_ms: int) -> str:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    (out / "subtitles.srt").write_text(render_srt(cues), encoding="utf-8")
    (out / "subtitles.vtt").write_text(render_vtt(cues), encoding="utf-8")
    (out / "subtitles.ass").write_text(render_ass(cues, AssStyle()), encoding="utf-8")

    result = {
        "language": language,
        "languageProbability": language_prob,
        "durationMs": duration_ms,
        "segments": [cue.to_dict() for cue in cues],
    }
    result_path = str(out / "result.json")
    Path(result_path).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    return result_path


def cmd_transcribe(args: argparse.Namespace) -> int:
    input_path = args.input
    output_dir = args.output_dir

    if not Path(input_path).exists():
        progress.error(f"File video không tồn tại: {input_path}", "INVALID_FILE")
        return 2

    try:
        progress.progress("extracting_audio", 0.02)
        duration_ms = probe_duration_ms(input_path)
        audio_path = extract_audio(input_path, output_dir)
        progress.progress("extracting_audio", 0.1)

        if args.provider == "openai":
            # Nhận dạng qua API OpenAI (key lấy từ biến môi trường OPENAI_API_KEY).
            from .openai_transcriber import OpenAITranscriptionError, transcribe_openai

            try:
                result = transcribe_openai(
                    audio_path,
                    model=args.model,
                    language=args.language,
                    duration_ms=duration_ms,
                    work_dir=output_dir,
                )
            except OpenAITranscriptionError as exc:
                progress.error(str(exc), exc.code)
                return 4
        else:
            result = transcribe(
                audio_path,
                language=args.language,
                model_name=args.model,
                device=args.device,
                compute_type=args.compute_type,
                beam_size=args.beam_size,
                vad_enabled=not args.no_vad,
                duration_ms=duration_ms,
            )

        progress.progress("formatting", 0.95)
        cues = format_segments(result.segments)

        progress.progress("writing", 0.98)
        result_path = _write_outputs(
            output_dir, cues, result.language, result.language_probability, duration_ms
        )
        progress.progress("writing", 1.0)
        progress.completed(result_path)
        return 0
    except MediaError as exc:
        progress.error(str(exc), exc.code)
        return 3
    except TranscriptionError as exc:
        progress.error(str(exc), exc.code)
        return 4
    except Exception as exc:  # pragma: no cover - phòng thủ
        progress.log("Lỗi không mong đợi:", repr(exc))
        progress.error(f"Lỗi không xác định: {exc}", "UNKNOWN_ERROR")
        return 1


def _style_from_dict(data: dict) -> AssStyle:
    return AssStyle(
        font_name=data.get("fontName", "DejaVu Sans"),
        font_size=int(data.get("fontSize", 56)),
        primary_color=data.get("primaryColor", "#FFFFFF"),
        outline_color=data.get("outlineColor", "#000000"),
        outline_width=float(data.get("outlineWidth", 4)),
        position=data.get("position", "bottom"),
        margin_v=int(data.get("marginV", 80)),
        background_enabled=bool(data.get("backgroundEnabled", False)),
        background_color=data.get("backgroundColor", "#000000"),
        background_opacity=float(data.get("backgroundOpacity", 0.5)),
    )


def cmd_build(args: argparse.Namespace) -> int:
    """Sinh lại SRT/VTT/ASS từ segment đã chỉnh sửa (đọc từ DB, truyền qua file JSON).

    KHÔNG chạm DB — chỉ đọc file segments-json + style-json do worker ghi ra.
    """
    try:
        raw = json.loads(Path(args.segments).read_text(encoding="utf-8"))
        cues = [
            Cue(
                order=int(s["order"]),
                start_ms=int(s["startMs"]),
                end_ms=int(s["endMs"]),
                text=str(s["text"]),
                words=[],
            )
            for s in raw
        ]
        style = AssStyle()
        if args.style:
            style = _style_from_dict(json.loads(Path(args.style).read_text(encoding="utf-8")))

        out = Path(args.output_dir)
        out.mkdir(parents=True, exist_ok=True)
        (out / "subtitles.srt").write_text(render_srt(cues), encoding="utf-8")
        (out / "subtitles.vtt").write_text(render_vtt(cues), encoding="utf-8")
        (out / "subtitles.ass").write_text(render_ass(cues, style), encoding="utf-8")
        progress.completed(str(out / "subtitles.ass"))
        return 0
    except Exception as exc:  # pragma: no cover - phòng thủ
        progress.error(f"Không sinh được phụ đề: {exc}", "UNKNOWN_ERROR")
        return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="subtitle_engine")
    sub = parser.add_subparsers(dest="command", required=True)

    t = sub.add_parser("transcribe", help="Nhận dạng và sinh phụ đề từ video")
    t.add_argument("--input", required=True, help="Đường dẫn video nguồn")
    t.add_argument("--output-dir", required=True, dest="output_dir", help="Thư mục ghi kết quả")
    t.add_argument("--provider", default="local", choices=["local", "openai"],
                   help="local = faster-whisper trong máy; openai = API OpenAI")
    t.add_argument("--language", default="auto", help="Mã ngôn ngữ hoặc 'auto'")
    t.add_argument("--model", default="small",
                   help="local: tên model faster-whisper; openai: whisper-1 | gpt-4o-transcribe")
    t.add_argument("--device", default="cpu", help="cpu | cuda")
    t.add_argument("--compute-type", default="int8", dest="compute_type")
    t.add_argument("--beam-size", type=int, default=5, dest="beam_size")
    t.add_argument("--no-vad", action="store_true", help="Tắt VAD filter")
    t.set_defaults(func=cmd_transcribe)

    b = sub.add_parser("build", help="Sinh SRT/VTT/ASS từ segment đã chỉnh sửa")
    b.add_argument("--segments", required=True, help="File JSON mảng segment")
    b.add_argument("--output-dir", required=True, dest="output_dir")
    b.add_argument("--style", default=None, help="File JSON style (tuỳ chọn)")
    b.set_defaults(func=cmd_build)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
