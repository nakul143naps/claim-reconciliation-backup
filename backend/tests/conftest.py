"""Pytest fixtures and isolated in-memory SQLite database setup."""

import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db.models import Base, Claim, Remittance
from backend.app.repositories.claim_repository import ClaimRepository
from backend.app.services.import_service import ImportService


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create a fresh in-memory SQLite database using StaticPool for consistent cross-thread sharing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def claim_repo(db_session: Session) -> ClaimRepository:
    """Provide ClaimRepository bound to test session."""
    return ClaimRepository(db_session)


@pytest.fixture(scope="function")
def import_service(db_session: Session) -> ImportService:
    """Provide ImportService bound to test session."""
    return ImportService(db_session)
