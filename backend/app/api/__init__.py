from backend.app.api.claims import router as claims_router
from backend.app.api.health import router as health_router
from backend.app.api.remittances import router as remittances_router
from backend.app.api.summary import router as summary_router

__all__ = ["claims_router", "health_router", "remittances_router", "summary_router"]
