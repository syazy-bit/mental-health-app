"""Centralized password hashing for student authentication (Phase 1B).

Strategy: reuse bcrypt, the project's existing password-hashing implementation
(see AdminService). No Argon2id (not currently a dependency) and no pepper
(no secret-management mechanism for one) are introduced.

Security properties (mirroring the admin implementation):
- Salted adaptive bcrypt; passwords over bcrypt's 72-byte limit are REJECTED,
  never silently truncated.
- Verification is constant-time via the hashing library and returns False for
  malformed hashes instead of raising.
- A dummy verification helper equalizes login timing for unknown/deleted
  accounts so response time cannot enumerate accounts.
"""

import bcrypt


# Dummy bcrypt hash used to equalize response timing when the account does not
# exist (or must not be distinguishable), so login timing cannot be used to
# enumerate registered student emails.
_DUMMY_BCRYPT_HASH = "$2b$12$Lo9KZ.WcgFw0IBDVVJozrufcNURKPXMsWpZhr6zdplKHYTRmDbpFS"

# bcrypt only uses the first 72 bytes of a password.
BCRYPT_MAX_PASSWORD_BYTES = 72


def exceeds_bcrypt_limit(password: str) -> bool:
    """True if the UTF-8 encoded password is longer than 72 bytes."""
    return len(password.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (salted, adaptive).

    Raises ValueError for passwords over bcrypt's 72-byte limit rather than
    silently truncating them. Only genuine KDF output is ever returned, so
    registration can never persist an empty/placeholder hash from this path.
    """
    if exceeds_bcrypt_limit(password):
        raise ValueError(
            f"Password exceeds bcrypt's {BCRYPT_MAX_PASSWORD_BYTES}-byte limit"
        )
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its bcrypt hash.

    Rejects passwords over bcrypt's 72-byte limit (no silent truncation) and
    returns False for malformed hashes instead of raising.
    """
    if exceeds_bcrypt_limit(password):
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def dummy_verify(password: str) -> None:
    """Run a bcrypt verification against the dummy hash to equalize timing.

    Used on the unknown-account and duplicate-registration paths so those
    responses cost the same as a real password check.
    """
    verify_password(password, _DUMMY_BCRYPT_HASH)
