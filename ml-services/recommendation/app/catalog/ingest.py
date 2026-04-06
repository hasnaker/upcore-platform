"""Catalog bulk ingestion from JSON/CSV files."""

from __future__ import annotations

import json
from pathlib import Path

import structlog

from app.catalog.validator import validate_intervention

logger = structlog.get_logger()


async def ingest_catalog(file_path: str | Path) -> dict:
    """Ingest intervention catalog from a JSON file.

    Validates each entry and reports errors.

    Args:
        file_path: Path to JSON file with intervention data.

    Returns:
        Ingest report with success/error counts.
    """
    path = Path(file_path)
    if not path.exists():
        return {"error": f"File not found: {file_path}"}

    with open(path) as f:
        data = json.load(f)

    if not isinstance(data, list):
        data = [data]

    report = {
        "total": len(data),
        "valid": 0,
        "invalid": 0,
        "errors": [],
    }

    for i, item in enumerate(data):
        errors = validate_intervention(item)
        if errors:
            report["invalid"] += 1
            report["errors"].append({"index": i, "errors": errors})
        else:
            report["valid"] += 1

    logger.info("catalog_ingest_completed", **{k: v for k, v in report.items() if k != "errors"})
    return report
