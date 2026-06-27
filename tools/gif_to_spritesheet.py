from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageSequence


def build_sheet(src: Path, out_png: Path, out_json: Path | None, columns: int | None) -> None:
    gif = Image.open(src)
    frames = [frame.copy().convert("RGBA") for frame in ImageSequence.Iterator(gif)]
    if not frames:
        raise ValueError(f"No frames found in {src}")

    frame_w, frame_h = frames[0].size
    frame_count = len(frames)
    cols = columns or frame_count
    rows = (frame_count + cols - 1) // cols

    sheet = Image.new("RGBA", (cols * frame_w, rows * frame_h), (0, 0, 0, 0))

    durations = []
    for i, frame in enumerate(frames):
      x = (i % cols) * frame_w
      y = (i // cols) * frame_h
      sheet.paste(frame, (x, y))
      gif.seek(i)
      durations.append(gif.info.get("duration", 0))

    out_png.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_png)

    if out_json:
        out_json.parent.mkdir(parents=True, exist_ok=True)
        out_json.write_text(
            json.dumps(
                {
                    "source": str(src).replace("\\", "/"),
                    "frameWidth": frame_w,
                    "frameHeight": frame_h,
                    "frameCount": frame_count,
                    "columns": cols,
                    "rows": rows,
                    "durationsMs": durations,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert a GIF into a sprite sheet PNG.")
    parser.add_argument("src", type=Path, help="Source GIF path")
    parser.add_argument("out_png", type=Path, help="Output sprite sheet PNG path")
    parser.add_argument("--out-json", type=Path, default=None, help="Optional metadata JSON path")
    parser.add_argument("--columns", type=int, default=None, help="Frames per row; defaults to one horizontal strip")
    args = parser.parse_args()

    build_sheet(args.src, args.out_png, args.out_json, args.columns)


if __name__ == "__main__":
    main()
