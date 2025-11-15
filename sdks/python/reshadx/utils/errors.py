"""ReshADX Python SDK - Error Classes"""

from typing import Any, Dict, Optional


class ReshADXError(Exception):
    """Base exception for ReshADX SDK errors"""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 0,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"

    def __repr__(self) -> str:
        return f"ReshADXError(code={self.code!r}, message={self.message!r}, status_code={self.status_code})"

    def is_validation_error(self) -> bool:
        """Check if error is a validation error"""
        return self.code == "VALIDATION_ERROR"

    def is_auth_error(self) -> bool:
        """Check if error is an authentication error"""
        return self.code in ("INVALID_CREDENTIALS", "INVALID_TOKEN", "TOKEN_EXPIRED")

    def is_rate_limit_error(self) -> bool:
        """Check if error is a rate limit error"""
        return self.code == "RATE_LIMIT_EXCEEDED"

    def is_network_error(self) -> bool:
        """Check if error is a network error"""
        return self.code == "NETWORK_ERROR"


class ValidationError(ReshADXError):
    """Validation error"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class AuthenticationError(ReshADXError):
    """Authentication error"""

    def __init__(self, message: str, code: str = "AUTHENTICATION_ERROR"):
        super().__init__(message, code, 401)


class NotFoundError(ReshADXError):
    """Resource not found error"""

    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)


class RateLimitError(ReshADXError):
    """Rate limit exceeded error"""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message, "RATE_LIMIT_EXCEEDED", 429)
        self.retry_after = retry_after


class ServerError(ReshADXError):
    """Server error"""

    def __init__(self, message: str):
        super().__init__(message, "SERVER_ERROR", 500)
