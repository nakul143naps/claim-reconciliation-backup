"""Repository layer for Claim and Remittance queries with eager loading and SQL optimization."""

from typing import List, Optional, Tuple
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.db.models import Claim, Remittance
from backend.app.schemas.claim import (
    ClaimDetail,
    ClaimListItem,
    RemittanceDetail,
)
from backend.app.schemas.remittance import UnmatchedRemittanceItem
from backend.app.schemas.summary import ReconciliationSummary
from backend.app.services.reconciliation import (
    ASSIGNMENT_DENIAL_CODES,
    calculate_claim_reconciliation,
)


class ClaimRepository:
    """Encapsulates database access for claims and remittances."""

    def __init__(self, db: Session):
        self.db = db

    def get_summary(self) -> ReconciliationSummary:
        """Compute aggregate reconciliation summary KPIs across all records."""
        # 1. Total claims and total billed cents
        claims_agg = self.db.query(
            func.count(Claim.claim_id),
            func.coalesce(func.sum(Claim.billed_cents), 0),
        ).first()
        total_claims = claims_agg[0] if claims_agg else 0
        total_billed_cents = claims_agg[1] if claims_agg else 0

        # 2. Remittances aggregates
        remit_agg = self.db.query(
            func.coalesce(func.sum(Remittance.paid_cents), 0),
            func.coalesce(
                func.sum(
                    case(
                        (Remittance.claim_id.isnot(None), Remittance.paid_cents),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (Remittance.claim_id.is_(None), 1),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (Remittance.claim_id.is_(None), Remittance.paid_cents),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (Remittance.claim_id.isnot(None), Remittance.adjustment_cents),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (Remittance.claim_id.isnot(None), Remittance.patient_responsibility_cents),
                        else_=0,
                    )
                ),
                0,
            ),
        ).first()

        all_remittance_paid_cents = remit_agg[0] if remit_agg else 0
        matched_paid_cents = remit_agg[1] if remit_agg else 0
        unmatched_remittance_count = remit_agg[2] if remit_agg else 0
        unmatched_remittance_paid_cents = remit_agg[3] if remit_agg else 0
        total_adjustment_cents = remit_agg[4] if remit_agg else 0
        total_patient_responsibility_cents = remit_agg[5] if remit_agg else 0

        uncollected_cash_cents = max(0, total_billed_cents - matched_paid_cents)
        net_unsettled_cents = max(
            0,
            total_billed_cents
            - matched_paid_cents
            - total_adjustment_cents
            - total_patient_responsibility_cents,
        )

        # 3. Derive claim-level statuses and flags by loading claims with matched remittances
        claims = (
            self.db.query(Claim)
            .options(selectinload(Claim.remittances))
            .all()
        )

        balanced_count = 0
        unbalanced_count = 0
        no_remittance_count = 0
        denial_history_count = 0
        flagged_for_review_count = 0

        for claim in claims:
            matched_remits = [r for r in claim.remittances if r.claim_id == claim.claim_id]
            totals, status, flags, has_denial = calculate_claim_reconciliation(
                billed_cents=claim.billed_cents,
                matched_remittances=matched_remits,
                claim_payer=claim.payer,
            )

            if status == "balanced":
                balanced_count += 1
            elif status == "unbalanced":
                unbalanced_count += 1
            elif status == "no_remittance":
                no_remittance_count += 1

            if has_denial:
                denial_history_count += 1

            # review flags: payment_exceeds_billed or payer_mismatch
            if "payment_exceeds_billed" in flags or "payer_mismatch" in flags:
                flagged_for_review_count += 1

        return ReconciliationSummary(
            total_claims=total_claims,
            balanced_claims=balanced_count,
            unbalanced_claims=unbalanced_count,
            claims_without_remittance=no_remittance_count,
            total_billed_cents=total_billed_cents,
            matched_paid_cents=matched_paid_cents,
            all_remittance_paid_cents=all_remittance_paid_cents,
            unmatched_remittance_count=unmatched_remittance_count,
            unmatched_remittance_paid_cents=unmatched_remittance_paid_cents,
            claims_with_denial_history=denial_history_count,
            claims_flagged_for_review=flagged_for_review_count,
            uncollected_cash_cents=uncollected_cash_cents,
            net_unsettled_cents=net_unsettled_cents,
            total_adjustment_cents=total_adjustment_cents,
            total_patient_responsibility_cents=total_patient_responsibility_cents,
        )

    def get_claims_paginated(
        self,
        payer: Optional[str] = None,
        status: Optional[str] = None,
        claim_id: Optional[str] = None,
        flag: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[ClaimListItem], int]:
        """Query claims with filtering, sorting, and pagination."""
        query = self.db.query(Claim).options(selectinload(Claim.remittances))

        if claim_id:
            search_term = f"%{claim_id.strip()}%"
            query = query.filter(
                Claim.claim_id.ilike(search_term) | Claim.patient_account.ilike(search_term)
            )

        if payer:
            query = query.filter(func.lower(Claim.payer) == payer.strip().lower())

        # Sort claims deterministically by claim_id ascending
        query = query.order_by(Claim.claim_id.asc())
        all_claims = query.all()

        # Calculate reconciliation item for each
        calculated_items: List[ClaimListItem] = []
        for claim in all_claims:
            matched_remits = [r for r in claim.remittances if r.claim_id == claim.claim_id]
            totals, claim_status, flags, _ = calculate_claim_reconciliation(
                billed_cents=claim.billed_cents,
                matched_remittances=matched_remits,
                claim_payer=claim.payer,
            )

            if status and claim_status != status.strip().lower():
                continue

            if flag and flag.strip().lower() not in [f.lower() for f in flags]:
                continue

            calculated_items.append(
                ClaimListItem(
                    claim_id=claim.claim_id,
                    payer=claim.payer,
                    billed_cents=claim.billed_cents,
                    paid_cents=totals.paid_cents,
                    adjustment_cents=totals.adjustment_cents,
                    patient_responsibility_cents=totals.patient_responsibility_cents,
                    difference_cents=totals.difference_cents,
                    status=claim_status,
                    flags=flags,
                )
            )

        total_count = len(calculated_items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paged_items = calculated_items[start_idx:end_idx]

        return paged_items, total_count

    def get_claim_by_id(self, claim_id: str) -> Optional[ClaimDetail]:
        """Fetch full claim details including complete ordered remittance history."""
        norm_id = claim_id.strip().upper()
        claim = (
            self.db.query(Claim)
            .options(selectinload(Claim.remittances))
            .filter(func.upper(Claim.claim_id) == norm_id)
            .first()
        )

        if not claim:
            return None

        # Sort matched remittances by posted_date ASC, remit_id ASC
        matched_remits = [r for r in claim.remittances if r.claim_id == claim.claim_id]
        sorted_remits = sorted(matched_remits, key=lambda r: (r.posted_date, r.remit_id))

        totals, status, flags, has_denial = calculate_claim_reconciliation(
            billed_cents=claim.billed_cents,
            matched_remittances=sorted_remits,
            claim_payer=claim.payer,
        )

        remittance_details = [
            RemittanceDetail(
                remit_id=r.remit_id,
                paid_cents=r.paid_cents,
                adjustment_cents=r.adjustment_cents,
                patient_responsibility_cents=r.patient_responsibility_cents,
                reason_code=r.reason_code,
                posted_date=r.posted_date,
            )
            for r in sorted_remits
        ]

        return ClaimDetail(
            claim_id=claim.claim_id,
            patient_account=claim.patient_account,
            payer=claim.payer,
            service_date=claim.service_date,
            cpt=claim.cpt,
            billed_cents=claim.billed_cents,
            totals=totals,
            status=status,
            flags=flags,
            denial_history=has_denial,
            remittances=remittance_details,
        )

    def get_unmatched_remittances(self) -> List[UnmatchedRemittanceItem]:
        """Fetch all unmatched remittances ordered by posted_date and remit_id."""
        query = (
            self.db.query(Remittance)
            .filter(Remittance.claim_id.is_(None))
            .order_by(Remittance.posted_date.asc(), Remittance.remit_id.asc())
        )
        records = query.all()

        return [
            UnmatchedRemittanceItem(
                remit_id=r.remit_id,
                source_claim_id=r.source_claim_id,
                payer=r.payer,
                paid_cents=r.paid_cents,
                adjustment_cents=r.adjustment_cents,
                patient_responsibility_cents=r.patient_responsibility_cents,
                reason_code=r.reason_code,
                posted_date=r.posted_date,
                issue="claim_not_found",
            )
            for r in records
        ]

    def export_reconciliation_csv(self) -> str:
        """Generate complete reconciliation audit ledger as CSV formatted string."""
        import csv
        import io

        claims = (
            self.db.query(Claim)
            .options(selectinload(Claim.remittances))
            .order_by(Claim.claim_id.asc())
            .all()
        )

        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow([
            "claim_id",
            "patient_account",
            "payer",
            "service_date",
            "cpt",
            "billed_cents",
            "paid_cents",
            "adjustment_cents",
            "patient_responsibility_cents",
            "difference_cents",
            "status",
            "flags",
            "matched_remittances_count",
        ])

        for claim in claims:
            matched_remits = [r for r in claim.remittances if r.claim_id == claim.claim_id]
            totals, status, flags, _ = calculate_claim_reconciliation(
                billed_cents=claim.billed_cents,
                matched_remittances=matched_remits,
                claim_payer=claim.payer,
            )

            diff_str = str(totals.difference_cents) if totals.difference_cents is not None else ""
            flags_str = ";".join(flags) if flags else "none"

            writer.writerow([
                claim.claim_id,
                claim.patient_account,
                claim.payer,
                claim.service_date.isoformat(),
                claim.cpt,
                claim.billed_cents,
                totals.paid_cents,
                totals.adjustment_cents,
                totals.patient_responsibility_cents,
                diff_str,
                status,
                flags_str,
                len(matched_remits),
            ])

        return output.getvalue()

    def export_reconciliation_json(self) -> str:
        """Generate complete reconciliation audit ledger as formatted JSON string."""
        import json

        claims = (
            self.db.query(Claim)
            .options(selectinload(Claim.remittances))
            .order_by(Claim.claim_id.asc())
            .all()
        )

        records = []
        for claim in claims:
            matched_remits = [r for r in claim.remittances if r.claim_id == claim.claim_id]
            totals, status, flags, _ = calculate_claim_reconciliation(
                billed_cents=claim.billed_cents,
                matched_remittances=matched_remits,
                claim_payer=claim.payer,
            )

            records.append({
                "claim_id": claim.claim_id,
                "patient_account": claim.patient_account,
                "payer": claim.payer,
                "service_date": claim.service_date.isoformat(),
                "cpt": claim.cpt,
                "billed_cents": claim.billed_cents,
                "billed_dollars": f"{(claim.billed_cents / 100):.2f}",
                "paid_cents": totals.paid_cents,
                "paid_dollars": f"{(totals.paid_cents / 100):.2f}",
                "adjustment_cents": totals.adjustment_cents,
                "adjustment_dollars": f"{(totals.adjustment_cents / 100):.2f}",
                "patient_responsibility_cents": totals.patient_responsibility_cents,
                "patient_responsibility_dollars": f"{(totals.patient_responsibility_cents / 100):.2f}",
                "difference_cents": totals.difference_cents,
                "difference_dollars": f"{(totals.difference_cents / 100):.2f}" if totals.difference_cents is not None else None,
                "status": status,
                "flags": flags,
                "matched_remittances_count": len(matched_remits),
            })

        return json.dumps({
            "generated_at": func.now(),
            "total_records": len(records),
            "claims": records,
        }, default=str, indent=2)
