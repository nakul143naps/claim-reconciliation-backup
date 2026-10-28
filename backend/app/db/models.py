"""Database models for claims and remittances."""

from datetime import date
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for SQLAlchemy declarative models."""
    pass


class Claim(Base):
    """Represents a medical claim submitted to an insurance payer."""

    __tablename__ = "claims"

    claim_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    patient_account: Mapped[str] = mapped_column(String(50), nullable=False)
    payer: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    cpt: Mapped[str] = mapped_column(String(10), nullable=False)
    billed_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)

    __table_args__ = (
        CheckConstraint("billed_cents >= 0", name="chk_claims_billed_cents_nonnegative"),
    )

    remittances: Mapped[List["Remittance"]] = relationship(
        "Remittance",
        back_populates="claim",
        cascade="all, delete-orphan",
        order_by="[Remittance.posted_date, Remittance.remit_id]",
    )

    def __repr__(self) -> str:
        return f"<Claim claim_id={self.claim_id!r} payer={self.payer!r} billed_cents={self.billed_cents}>"


class Remittance(Base):
    """Represents a remittance advice (payment/adjustment) received from a payer."""

    __tablename__ = "remittances"

    remit_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    source_claim_id: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    claim_id: Mapped[Optional[str]] = mapped_column(
        String(20),
        ForeignKey("claims.claim_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    payer: Mapped[str] = mapped_column(String(100), nullable=False)
    paid_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    adjustment_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    patient_responsibility_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    posted_date: Mapped[date] = mapped_column(Date, nullable=False)

    __table_args__ = (
        CheckConstraint("paid_cents >= 0", name="chk_remit_paid_cents_nonnegative"),
        CheckConstraint("adjustment_cents >= 0", name="chk_remit_adj_cents_nonnegative"),
        CheckConstraint(
            "patient_responsibility_cents >= 0",
            name="chk_remit_patient_resp_nonnegative",
        ),
        Index("ix_remittances_posted_date_remit_id", "posted_date", "remit_id"),
    )

    claim: Mapped[Optional["Claim"]] = relationship("Claim", back_populates="remittances")

    def __repr__(self) -> str:
        return (
            f"<Remittance remit_id={self.remit_id!r} claim_id={self.claim_id!r} "
            f"paid_cents={self.paid_cents}>"
        )
