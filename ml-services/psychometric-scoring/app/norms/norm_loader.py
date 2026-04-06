"""Load JSON norm files at startup, validate schema, register in memory.

Norm files are stored in data/ directory (or app/norms/data/ for
instrument-specific norm data).
"""

from __future__ import annotations

import json
from pathlib import Path

import structlog

from app.norms.norm_tables import NormTable, register_norm_table

logger = structlog.get_logger(__name__)

# Mapping of JSON filenames to (instrument, version) tuples
_NORM_FILES: dict[str, tuple[str, str]] = {
    "european_norms.json": ("BAT-12-TR", "bat12-tr-provisional-v0.1"),
}


def _load_single_norm(file_path: Path, instrument: str, version: str) -> NormTable | None:
    """Load and validate a single norm file."""
    if not file_path.exists():
        logger.warning("norm_file_not_found", path=str(file_path))
        return None

    try:
        with open(file_path) as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("norm_file_load_error", path=str(file_path), error=str(exc))
        return None

    table = NormTable(
        instrument=instrument,
        version=version,
        n=data.get("n", 0),
        percentile_distributions=data.get("percentile_distributions", {}),
        subscale_means=data.get("subscale_means", {}),
        subscale_sds=data.get("subscale_sds", {}),
        cutoffs=data.get("cutoffs", {}),
        collected_at=data.get("collected_at"),
        citation=data.get("source_citation", ""),
        license=data.get("license", ""),
    )

    logger.info(
        "norm_table_loaded",
        instrument=instrument,
        version=version,
        n=table.n,
    )
    return table


def load_all_norms(data_dir: str = "data") -> int:
    """Load all norm tables from the data directory.

    Returns the number of successfully loaded tables.
    """
    data_path = Path(data_dir)
    loaded = 0

    for filename, (instrument, version) in _NORM_FILES.items():
        file_path = data_path / filename
        table = _load_single_norm(file_path, instrument, version)
        if table is not None:
            register_norm_table(table)
            loaded += 1

    # Also load any norm files from app/norms/data/
    norms_data_dir = Path("app/norms/data")
    if norms_data_dir.exists():
        for json_file in norms_data_dir.glob("*.json"):
            try:
                with open(json_file) as f:
                    data = json.load(f)
                instrument = data.get("instrument", json_file.stem)
                version = data.get("version", "v0.1")
                table = NormTable(
                    instrument=instrument,
                    version=version,
                    n=data.get("n", 0),
                    percentile_distributions=data.get("percentile_distributions", {}),
                    subscale_means=data.get("subscale_means", {}),
                    subscale_sds=data.get("subscale_sds", {}),
                    cutoffs=data.get("cutoffs", {}),
                    collected_at=data.get("collected_at"),
                    citation=data.get("source_citation", ""),
                    license=data.get("license", ""),
                )
                register_norm_table(table)
                loaded += 1
                logger.info(
                    "norm_table_loaded",
                    instrument=instrument,
                    version=version,
                    source=str(json_file),
                )
            except (json.JSONDecodeError, OSError) as exc:
                logger.error("norm_file_load_error", path=str(json_file), error=str(exc))

    logger.info("norms_loading_complete", total_loaded=loaded)
    return loaded
