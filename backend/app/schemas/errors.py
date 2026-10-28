"""Standardized error responses adhering to DESIGN.md."""

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error object."""

    code: str = Field(description="Machine-readable error classification code")
    message: str = Field(description="Human-readable safe explanation")


class ErrorResponse(BaseModel):
    """Unified error envelope."""

    error: ErrorDetail
