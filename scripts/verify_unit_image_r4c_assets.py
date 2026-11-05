#!/usr/bin/env python3
"""R4C physical-file gate: fail closed until all eight approved WebP assets exist.

This checks file integrity and dimensions, NOT architectural visual accuracy.
Use visual/manual 15/35m³ sign-off and same-SHA Chromium QA separately.
No third-party Python dependencies; works without Pillow.
"""
from __future__ import annotations

from hashlib import sha256
from pathlib import Path
import json
import struct
import sys

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r4c'
TIERS = ('mini', 'small', 'medium', 'large')
SPECS = (('cap', 640, 480), ('thumb', 336, 312))


def webp_size(data: bytes) -> tuple[int, int]:
    if len(data) < 30 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('not a WebP RIFF image')
    pos = 12
    while pos + 8 <= len(data):
        fourcc = data[pos:pos + 4]
        size = struct.unpack_from('<I', data, pos + 4)[0]
        chunk = data[pos + 8:pos + 8 + size]
        if len(chunk) != size:
            raise ValueError('truncated WebP chunk')
        if fourcc == b'VP8X' and len(chunk) >= 10:
            width = 1 + int.from_bytes(chunk[4:7], 'little')
            height = 1 + int.from_bytes(chunk[7:10], 'little')
            return width, height
        if fourcc == b'VP8 ' and len(chunk) >= 10 and chunk[3:6] == b'\x9d\x01\x2a':
            width = int.from_bytes(chunk[6:8], 'little') & 0x3fff
            height = int.from_bytes(chunk[8:10], 'little') & 0x3fff
            return width, height
        if fourcc == b'VP8L' and len(chunk) >= 5 and chunk[0] == 0x2f:
            packed = int.from_bytes(chunk[1:5], 'little')
            return 1 + (packed & 0x3fff), 1 + ((packed >> 14) & 0x3fff)
        pos += 8 + size + (size % 2)
    raise ValueError('no usable WebP dimension chunk')


def main() -> int:
    results = []
    problems = []
    for tier in TIERS:
        for directory, width, height in SPECS:
            name = f'unit-r4c-{tier}-{width}x{height}.webp'
            path = ROOT / directory / name
            if not path.is_file():
                problems.append(f'MISSING {path.relative_to(REPO)}')
                continue
            data = path.read_bytes()
            try:
                actual = webp_size(data)
                if actual != (width, height):
                    problems.append(f'DIMENSION {name}: {actual} != {(width, height)}')
                    continue
                if len(data) < 1024:
                    problems.append(f'TOO_SMALL {name}: {len(data)} bytes')
                    continue
            except ValueError as exc:
                problems.append(f'INVALID_WEBP {name}: {exc}')
                continue
            results.append({
                'file': str(path.relative_to(REPO)),
                'dimensions': [width, height],
                'sha256': sha256(data).hexdigest(),
                'bytes': len(data),
            })
    output = {
        'task': 'UNIT-IMAGE-REBUILD-01-R4C',
        'status': 'ASSET_HOLD' if problems else 'PHYSICAL_FILES_PASS_VISUAL_HOLD',
        'physical_files_present': len(results),
        'physical_files_required': len(TIERS) * len(SPECS),
        'problems': problems,
        'assets': results,
        'visual_15_35_independent_room': 'HOLD_MANUAL',
        '375_390_browser': 'HOLD_SAME_SHA',
        'merge_main': False,
        'deploy': False,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 2 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
