from __future__ import annotations

from typing import Any, Optional


class AuthenChainError(Exception):
    """Base exception for AuthenChain Python SDK errors."""

    def __init__(
        self,
        message: str,
        *,
        code: Optional[str] = None,
        status: Optional[int] = None,
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details


class AuthenChainValidationError(AuthenChainError):
    """Raised when local input validation fails."""


class AuthenChainApiError(AuthenChainError):
    """Raised when the AuthenChain API returns an error response."""


class AuthenChainNetworkError(AuthenChainError):
    """Raised when a network request fails before a response is received."""


class AuthenChainTimeoutError(AuthenChainNetworkError):
    """Raised when an AuthenChain request times out."""


class AuthenChainNotImplementedError(AuthenChainError):
    """Raised for reserved SDK methods that are not implemented yet."""
