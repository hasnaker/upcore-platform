"""Background job scheduler for periodic tasks.

Manages quarterly retraining and other scheduled jobs.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger()

# Quarterly retrain cron: 2 AM on the 1st of every 3rd month
RETRAIN_CRON = "0 2 1 */3 *"


class JobScheduler:
    """Async job scheduler wrapper.

    For V1: stub implementation. Production uses APScheduler or Celery Beat.
    """

    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}
        self._running = False

    async def start(self) -> None:
        """Start the scheduler."""
        self._running = True
        logger.info("job_scheduler_started")

    async def stop(self) -> None:
        """Stop the scheduler."""
        self._running = False
        logger.info("job_scheduler_stopped")

    def register_job(
        self,
        job_id: str,
        cron_expression: str,
        handler: str,
    ) -> None:
        """Register a scheduled job.

        Args:
            job_id: Unique job identifier.
            cron_expression: Cron schedule expression.
            handler: Dotted path to handler function.
        """
        self._jobs[job_id] = {
            "cron": cron_expression,
            "handler": handler,
            "enabled": True,
        }
        logger.info("job_registered", job_id=job_id, cron=cron_expression)

    def list_jobs(self) -> list[dict]:
        """List all registered jobs."""
        return [
            {"job_id": jid, **info}
            for jid, info in self._jobs.items()
        ]
