"""FastAPI Application entrypoint for Claim Reconciliation API."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api import claims_router, health_router, remittances_router, summary_router
from backend.app.core.config import settings
from backend.app.db.session import init_db
from backend.app.schemas.errors import ErrorDetail, ErrorResponse

# Configure structured application logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("claim_reconciliation")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown hooks."""
    logger.info("Initializing database schema on startup...")
    init_db()
    logger.info("Application ready to serve requests.")
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title="Claim Reconciliation API",
    description="Deterministic claims reconciliation, remittance audit trail, and anomaly detection.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for local development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standardized error handlers adhering to DESIGN.md
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Format query/body validation errors into unified error envelope."""
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        error_messages.append(f"{loc}: {msg}")
    
    formatted_msg = "; ".join(error_messages)
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INVALID_QUERY_PARAMETER",
                message=formatted_msg,
            )
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Preserve unified error structure for explicit HTTP exceptions."""
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = exc.detail.get("code", "HTTP_ERROR")
        message = exc.detail.get("message", str(exc.detail))
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code=code,
                message=message,
            )
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Safe fallback for unexpected errors without leaking stack traces or credentials."""
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_ERROR",
                message="An unexpected server error occurred",
            )
        ).model_dump(),
    )


# Mount routers with /api prefix
app.include_router(health_router, prefix="/api")
app.include_router(summary_router, prefix="/api")
app.include_router(claims_router, prefix="/api")
app.include_router(remittances_router, prefix="/api")


@app.get("/", include_in_schema=False)
def root():
    """Friendly root endpoint pointing to interactive documentation."""
    return {
        "name": "Stitch Fin — Claim Reconciliation API",
        "version": "1.0.0",
        "status": "online",
        "interactive_docs": "/docs",
        "endpoints": {
            "health": "/api/health",
            "summary": "/api/summary",
            "claims": "/api/claims",
            "unmatched_remittances": "/api/remittances/unmatched",
        },
    }
