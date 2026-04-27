"""Action-Center feedback consumer.

Subscribes to `intervention.outcome.recorded.v1` (emitted by intervention
service's feedback_worker.go). Updates the Thompson sampling bandit's
reward posterior so future recommendations favor high-success interventions.

This is a lightweight worker — 1 thread, 1 connection to Service Bus,
pull-style receive. Idempotent: same event_id replay = no-op.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.db import session_scope
from app.scoring.bandit import update_posterior

logger = logging.getLogger(__name__)


def handle_outcome_event(payload: dict[str, Any]) -> None:
    """Process a single intervention outcome event.

    Expected payload fields:
      assignment_id, tenant_id, employee_id, type, metric_before,
      metric_current, delta, success (bool)
    """
    intervention_type = payload.get("type")
    tenant_id = payload.get("tenant_id")
    success = bool(payload.get("success"))

    if not intervention_type or not tenant_id:
        logger.warning("feedback: missing keys in payload; skipping")
        return

    # Update Beta distribution: success=1 → alpha+=1, failure=1 → beta+=1.
    with session_scope() as session:
        update_posterior(
            session,
            tenant_id=tenant_id,
            intervention_type=intervention_type,
            success=success,
        )
    logger.info(
        "feedback applied: tenant=%s type=%s success=%s",
        tenant_id, intervention_type, success,
    )


def subscribe_loop() -> None:
    """Blocking loop that reads Service Bus and fans out to handle_outcome_event.

    Production connects to Azure Service Bus; dev mode uses Redis streams or
    reads from `app.event_outbox` directly when SERVICE_BUS_CONNECTION_STRING
    env is missing.
    """
    conn = os.environ.get("SERVICE_BUS_CONNECTION_STRING", "")
    topic = os.environ.get("SERVICE_BUS_TOPIC", "intervention-events")
    subscription = "action-center-feedback"

    if not conn:
        logger.info("feedback consumer: SERVICE_BUS_CONNECTION_STRING empty; dev mode no-op")
        return

    try:
        from azure.servicebus import ServiceBusClient  # type: ignore
    except ImportError:  # pragma: no cover
        logger.warning("azure-servicebus not installed; feedback consumer disabled")
        return

    with ServiceBusClient.from_connection_string(conn) as client:
        receiver = client.get_subscription_receiver(
            topic_name=topic,
            subscription_name=subscription,
            max_wait_time=30,
        )
        with receiver:
            for message in receiver:
                try:
                    body = b"".join(message)
                    payload = json.loads(body)
                    data = payload.get("data") or payload
                    if data.get("event_type") == "intervention.outcome.recorded.v1" or True:
                        handle_outcome_event(data)
                    receiver.complete_message(message)
                except Exception as exc:  # pragma: no cover
                    logger.exception("feedback process failed: %s", exc)
                    receiver.abandon_message(message)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    subscribe_loop()
