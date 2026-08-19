"""Application-level login throttling for the admin auth endpoint.

Protects POST /api/admin/auth/login against rapid brute-force attempts without
adding a large external rate-limiting framework.

Strategy
--------
Two fixed-window counters per failed login:
- a ``(username, client_ip)`` bucket, and
- a ``client_ip`` bucket covering all usernames from that IP.

A bucket blocks once its failure count reaches its limit within the window and
stays blocked for the lockout duration, after which it resets so legitimate
logins can proceed.

This is deliberately NOT keyed by username alone: an attacker cannot lock out
every admin account globally (no per-account DoS), and a distributed attempt
spread across many IPs still has to pay bcrypt cost per attempt.

Limitations (documented)
------------------------
- In-memory and single-process. With multiple uvicorn workers each process has
  its own counters. For multi-worker deployments use a shared store (Redis) or
  reverse-proxy rate limiting instead.
- Keyed by ``request.client.host``; if the app runs behind a proxy that does
  not strip client-controlled ``X-Forwarded-For`` values, the proxy address is
  what is throttled.
"""

import threading
import time

from app.core.config import settings


class LoginThrottle:
    """Fixed-window failure counter with lockout for admin logins."""

    def __init__(
        self,
        max_failures: int = 5,
        ip_max_failures: int = 20,
        window_seconds: int = 900,
        lockout_seconds: int = 900,
    ) -> None:
        self.max_failures = max_failures
        self.ip_max_failures = ip_max_failures
        self.window_seconds = window_seconds
        self.lockout_seconds = lockout_seconds
        self._records: dict[str, dict] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _combo_key(username: str, ip: str) -> str:
        return f"{username.lower()}@{ip}"

    @staticmethod
    def _ip_key(ip: str) -> str:
        return f"ip:{ip}"

    def _record_for(self, key: str, now: float) -> dict:
        record = self._records.get(key)
        if record is None:
            record = {"failures": 0, "first_failure": now, "blocked_until": None}
            self._records[key] = record
            return record
        if record["blocked_until"] is not None and now >= record["blocked_until"]:
            # Lockout window elapsed: reset so legitimate attempts can proceed.
            record["failures"] = 0
            record["first_failure"] = now
            record["blocked_until"] = None
            return record
        if now - record["first_failure"] > self.window_seconds:
            record["failures"] = 0
            record["first_failure"] = now
            record["blocked_until"] = None
        return record

    def is_blocked(self, username: str, ip: str) -> bool:
        """True if this (username, ip) or the ip is currently locked out."""
        now = time.monotonic()
        with self._lock:
            for key in (self._combo_key(username, ip), self._ip_key(ip)):
                record = self._records.get(key)
                if (
                    record is not None
                    and record["blocked_until"] is not None
                    and now < record["blocked_until"]
                ):
                    return True
            # Opportunistic cleanup of expired, unblocked windows.
            expired = [
                key
                for key, record in self._records.items()
                if record["blocked_until"] is None
                and now - record["first_failure"] > self.window_seconds
            ]
            for key in expired:
                del self._records[key]
        return False

    def record_failure(self, username: str, ip: str) -> None:
        """Record a failed login and apply lockout once limits are hit."""
        now = time.monotonic()
        with self._lock:
            buckets = (
                (self._combo_key(username, ip), self.max_failures),
                (self._ip_key(ip), self.ip_max_failures),
            )
            for key, limit in buckets:
                record = self._record_for(key, now)
                record["failures"] += 1
                if record["failures"] >= limit:
                    record["blocked_until"] = now + self.lockout_seconds

    def record_success(self, username: str, ip: str) -> None:
        """Clear the (username, ip) bucket on a successful login so legitimate
        retries are never permanently locked out."""
        with self._lock:
            self._records.pop(self._combo_key(username, ip), None)

    def reset(self) -> None:
        """Clear all counters (used by tests between cases)."""
        with self._lock:
            self._records.clear()


login_throttle = LoginThrottle(
    max_failures=settings.admin_login_max_failures,
    ip_max_failures=settings.admin_login_ip_max_failures,
    window_seconds=settings.admin_login_window_seconds,
    lockout_seconds=settings.admin_login_lockout_seconds,
)


def get_login_throttle() -> LoginThrottle:
    """FastAPI dependency exposing the login throttle singleton."""
    return login_throttle