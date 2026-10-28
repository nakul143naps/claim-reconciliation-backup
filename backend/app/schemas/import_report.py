"""Schemas for import reports and row-level validation issues."""

from typing import List, Optional
from pydantic import BaseModel, Field


class RowIssue(BaseModel):
    """Details of a row rejection or conflict during CSV import."""

    row_number: int = Field(description="1-based row number in the CSV file")
    record_id: Optional[str] = Field(default=None, description="Claim ID or Remit ID if known")
    code: str = Field(description="Error classification code")
    message: str = Field(description="Human-readable explanation of why the row was rejected")


class FileImportResult(BaseModel):
    """Statistics and errors for a single CSV file import."""

    filename: str
    rows_seen: int = 0
    inserted: int = 0
    duplicate_noop: int = 0
    rejected: int = 0
    conflicting_existing_id: int = 0
    issues: List[RowIssue] = Field(default_factory=list)


class FullImportReport(BaseModel):
    """Combined report across claims and remittances imports."""

    claims: FileImportResult
    remittances: FileImportResult
    success: bool = True
