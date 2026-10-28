"""Health check endpoint."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.errors import ErrorDetail, ErrorResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", status_code=status.HTTP_200_OK)
def get_health(db: Session = Depends(get_db)):
    """Check service and database connectivity."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=ErrorResponse(
                error=ErrorDetail(
                    code="DATABASE_UNAVAILABLE",
                    message="The service is temporarily unavailable",
                )
            ).model_dump(),
        )
