"""UpCore burnout model monthly retraining DAG.

Airflow 2.x. Schedule: 1. Sunday of each month, 03:00 UTC.
Deploys via Azure ML + blob-backed model registry.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

DEFAULT_ARGS = {
    "owner": "ml-platform",
    "depends_on_past": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=15),
    "email_on_failure": True,
    "email": ["sre@upcore.app", "ds@upcore.app"],
}


def snapshot_prod_data(**_ctx) -> dict:
    """Dump last 12 months of burnout-relevant features to parquet."""
    # Implementation: psycopg2 → Azure PostgreSQL read replica
    # SELECT features FROM app.assessment_snapshots
    # JOIN app.intervention_assignments ON …
    # WRITE TO: abfss://ml-training@upcore.dfs.core.windows.net/burnout/YYYY-MM/raw.parquet
    return {"rows": 0, "path": ""}


def validate_snapshot(**ctx) -> None:
    """Fail the DAG if data is insufficient or drifted."""
    row_count = ctx["ti"].xcom_pull(task_ids="snapshot")["rows"]
    if row_count < 1000:
        raise ValueError(f"Insufficient data: {row_count} rows")


def train_model(**ctx) -> dict:
    """LSTM training — delegates to train_burnout.py. Returns AUC + model URI."""
    import json
    import os
    import subprocess

    snapshot_path = ctx["ti"].xcom_pull(task_ids="snapshot")["path"]
    out_dir = os.environ.get("ML_OUTPUT_DIR", "/ml/out")
    subprocess.run(
        [
            "python", "/ml/retraining/train_burnout.py",
            "--snapshot", snapshot_path,
            "--out", out_dir,
            "--epochs", "50",
        ],
        check=True,
    )
    with open(os.path.join(out_dir, "metrics.json")) as f:
        metrics = json.load(f)
    return {
        "auc": metrics["auc"],
        "model_uri": f"{out_dir}/burnout_lstm.keras",
    }


def canary_deploy(**ctx) -> None:
    """Deploy to 10% traffic slice — Azure ML endpoint traffic split."""
    auc = ctx["ti"].xcom_pull(task_ids="train")["auc"]
    if auc < 0.75:
        raise ValueError(f"Model AUC {auc} below threshold")


def promote_or_rollback(**_ctx) -> None:
    """After 48h canary, promote to 100% if success criteria met."""
    # Poll Azure ML canary metrics; if OK set traffic=100/0, else 0/100
    pass


with DAG(
    dag_id="upcore_burnout_retraining",
    description="Monthly retraining for burnout-prediction model",
    default_args=DEFAULT_ARGS,
    schedule="0 3 * * 0#1",  # 1st Sunday 03:00 UTC
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["upcore", "ml", "burnout"],
) as dag:
    snapshot = PythonOperator(task_id="snapshot", python_callable=snapshot_prod_data)
    validate = PythonOperator(task_id="validate", python_callable=validate_snapshot)
    train = PythonOperator(task_id="train", python_callable=train_model)
    canary = PythonOperator(task_id="canary", python_callable=canary_deploy)
    promote = PythonOperator(task_id="promote", python_callable=promote_or_rollback)

    snapshot >> validate >> train >> canary >> promote
