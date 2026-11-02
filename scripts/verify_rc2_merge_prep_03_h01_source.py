#!/usr/bin/env python3
"""Read-only H01 HIFI-06 ZIP integrity/physical-receipt gate.

Do not assume that a newly hashed ZIP is the approved visual master:
the visual owner must compare it with the signed source independently.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

REPORT_DIR = Path("release-evidence/rc2-merge-prep-03")
MAX_ENTRY = 30 * 1024 * 1024
MAX_TOTAL = 150 * 1024 * 1024


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def safe_member(info):
    s = info.filename.replace("\\", "/")
    normalized = s.rstrip("/") if info.is_dir() else s
    p = PurePosixPath(normalized)
    if not normalized or normalized.startswith("/") or any(x in ("", ".", "..") for x in normalized.split("/")):
        raise ValueError("UNSAFE_ZIP_PATH: " + s)
    if ":" in s or s.startswith("~"):
        raise ValueError("UNSAFE_ZIP_PATH: " + s)
    if stat.S_IFMT(info.external_attr >> 16) == stat.S_IFLNK:
        raise ValueError("ZIP_SYMLINK_NOT_ALLOWED: " + s)
    return p


def inspect(zip_path, out_dir, chosen_entry):
    if not zip_path.is_file():
        raise FileNotFoundError("H01_SOURCE_NOT_RECEIVED: " + str(zip_path))
    if not zipfile.is_zipfile(zip_path):
        raise ValueError("H01_SOURCE_NOT_ZIP")
    with zipfile.ZipFile(zip_path) as z:
        if z.testzip() is not None:
            raise ValueError("H01_ZIP_CRC_FAILED")
        names, contents = set(), {}
        total = 0
        for info in z.infolist():
            p = safe_member(info)
            if info.is_dir():
                continue
            if str(p).lower() in names:
                raise ValueError("DUPLICATE_ZIP_PATH: " + str(p))
            names.add(str(p).lower())
            if info.file_size > MAX_ENTRY:
                raise ValueError("ZIP_ENTRY_TOO_LARGE: " + str(p))
            total += info.file_size
            if total > MAX_TOTAL:
                raise ValueError("ZIP_TOTAL_TOO_LARGE")
            contents[str(p)] = z.read(info)
        webps = sorted(x for x in contents if x.lower().endswith(".webp"))
        htmls = sorted(x for x in contents if x.lower().endswith((".html", ".htm")))
        if len(webps) != 7:
            raise ValueError(f"H01_EXPECTED_7_WEBP_FOUND_{len(webps)}")
        if not htmls:
            raise ValueError("H01_MAIN_HTML_MISSING")
        for name in webps:
            data = contents[name]
            if len(data) < 24 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                raise ValueError("INVALID_WEBP_MAGIC: " + name)
        if chosen_entry:
            entry = chosen_entry.replace("\\", "/")
            if entry not in htmls:
                raise ValueError("REQUESTED_HTML_NOT_FOUND: " + entry)
        elif len(htmls) == 1:
            entry = htmls[0]
        else:
            candidates = [x for x in htmls if PurePosixPath(x).name.lower() in ("index.html", "home.html", "h01.html")]
            if len(candidates) != 1:
                raise ValueError("MULTIPLE_HTML_PICK_EXPLICIT_ENTRY: " + repr(htmls))
            entry = candidates[0]

        out_dir.mkdir(parents=True, exist_ok=True)
        extract_dir = out_dir / "source"
        for name, data in contents.items():
            dest = extract_dir.joinpath(*PurePosixPath(name).parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)

        report = {
            "task": "RC2-MERGE-PREP-03",
            "status": "SOURCE_BYTES_VERIFIED_VISUAL_SIGNOFF_PENDING",
            "received_file": zip_path.name,
            "archive_sha256": sha256(zip_path.read_bytes()),
            "html_entry": entry,
            "html_sha256": sha256(contents[entry]),
            "webp_count": 7,
            "assets": [{"path": x, "size": len(contents[x]), "sha256": sha256(contents[x])} for x in webps],
            "all_entries": len(contents),
            "receipt": "ZIP CRC, path traversal, media signature and source SHA recorded",
            "approval_status": "UNVERIFIED_NOT_SIGNED_OFF",
            "merge_permitted": False,
            "deployment_permitted": False,
        }
        return report


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--zip", default=os.environ.get("H01_HIFI06_ZIP"))
    p.add_argument("--html-entry", default=os.environ.get("H01_HIFI06_HTML_ENTRY"))
    p.add_argument("--out", default=str(REPORT_DIR))
    args = p.parse_args()
    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)
    try:
        approved_names = ("BR01_H01_CONNECT_05.zip", "BR01_H01_HIFI_06.zip")
        location = Path("inputs/h01")
        chosen = Path(args.zip) if args.zip else next((location / n for n in approved_names if (location / n).is_file()), location / approved_names[0])
        report = inspect(chosen, output, args.html_entry)
        rc = 0
    except (ValueError, OSError, zipfile.BadZipFile) as exc:
        report = {
            "task": "RC2-MERGE-PREP-03",
            "status": "HOLD",
            "blocker": str(exc),
            "accepted_names": ["BR01_H01_CONNECT_05.zip", "BR01_H01_HIFI_06.zip"],
            "source_note": "Library records alone do not authorize access to the raw ZIP; supply physical bytes in inputs/h01 or via --zip.",
            "approval_status": "NOT_VERIFIED",
            "merge_permitted": False,
            "deployment_permitted": False,
        }
        rc = 2
    (output / "h01_receipt.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return rc


if __name__ == "__main__":
    sys.exit(main())
