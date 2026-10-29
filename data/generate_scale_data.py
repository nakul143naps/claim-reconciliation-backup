#!/usr/bin/env python3
"""Deterministic Large-Scale Synthetic Data Generator for Claim Reconciliation.

Generates realistic hospital claims and remittances at scale for performance,
pagination, and invariant testing WITHOUT modifying the canonical 12-claim benchmark.

Usage:
    python data/generate_scale_data.py --count 50
"""

import argparse
import csv
import random
from datetime import date, timedelta
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent

PAYERS = ["Northwind Health", "Cedar Mutual", "Harbor Plan", "Apex Health", "Beacon Care"]
CPT_CODES = [
    ("99213", 15000),  # Office visit, level 3 ($150.00)
    ("99214", 22000),  # Office visit, level 4 ($220.00)
    ("99215", 28000),  # Office visit, level 5 ($280.00)
    ("80053", 8500),   # Comprehensive metabolic panel ($85.00)
    ("93000", 6000),   # Electrocardiogram ($60.00)
    ("36415", 2500),   # Routine venipuncture ($25.00)
    ("71046", 18500),  # Chest X-ray ($185.00)
    ("99283", 35000),  # Emergency department level 3 ($350.00)
]


def generate_scale_dataset(num_claims: int = 50, seed: int = 42):
    random.seed(seed)
    base_date = date(2026, 9, 1)

    claims = []
    remittances = []
    remit_counter = 2001

    for i in range(1, num_claims + 1):
        claim_id = f"C{2000 + i}"
        patient_account = f"A{2000 + i}"
        cpt, billed_cents = random.choice(CPT_CODES)
        payer = random.choice(PAYERS)
        service_date = base_date + timedelta(days=(i % 25))
        claims.append((claim_id, patient_account, payer, service_date.isoformat(), cpt, billed_cents))

        # Determine scenario archetype deterministically
        scenario = i % 10
        posted_date = service_date + timedelta(days=random.randint(4, 12))

        if scenario in (0, 1, 2):
            # 1. Balanced: Full payment
            remittances.append((
                f"R{remit_counter}", claim_id, payer, billed_cents, 0, 0, "", posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 3:
            # 2. Balanced: Contractual write-off (CO-45)
            adj = int(billed_cents * 0.25)
            paid = billed_cents - adj
            remittances.append((
                f"R{remit_counter}", claim_id, payer, paid, adj, 0, "CO-45", posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 4:
            # 3. Balanced: Patient responsibility (PR-1 deductible or PR-3 copay)
            pr = int(billed_cents * 0.20)
            paid = billed_cents - pr
            code = "PR-1" if i % 2 == 0 else "PR-3"
            remittances.append((
                f"R{remit_counter}", claim_id, payer, paid, 0, pr, code, posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 5:
            # 4. Balanced with denial history: initial denial (CO-16), followed by full settlement
            first_remit_date = posted_date
            remittances.append((
                f"R{remit_counter}", claim_id, payer, 0, 0, 0, "CO-16", first_remit_date.isoformat()
            ))
            remit_counter += 1
            second_remit_date = first_remit_date + timedelta(days=7)
            remittances.append((
                f"R{remit_counter}", claim_id, payer, billed_cents, 0, 0, "", second_remit_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 6:
            # 5. Unbalanced: Partial payment
            paid = int(billed_cents * 0.60)
            remittances.append((
                f"R{remit_counter}", claim_id, payer, paid, 0, 0, "", posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 7:
            # 6. Unbalanced: Unresolved denial (CO-197 or CO-50)
            denial_code = "CO-197" if i % 2 == 0 else "CO-50"
            remittances.append((
                f"R{remit_counter}", claim_id, payer, 0, 0, 0, denial_code, posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 8:
            # 7. Review anomaly: Payment exceeds billed
            overpaid = billed_cents + 2500  # $25.00 overpayment
            remittances.append((
                f"R{remit_counter}", claim_id, payer, overpaid, 0, 0, "", posted_date.isoformat()
            ))
            remit_counter += 1

        elif scenario == 9:
            # 8. No remittance received for this claim (leaves difference as NULL)
            pass

    # Add 2 orphan remittances referencing non-existent claims
    orphan_date = base_date + timedelta(days=15)
    remittances.append((
        f"R{remit_counter}", "C9998", "Northwind Health", 7500, 0, 0, "", orphan_date.isoformat()
    ))
    remit_counter += 1
    remittances.append((
        f"R{remit_counter}", "C9999", "Cedar Mutual", 5000, 0, 0, "", orphan_date.isoformat()
    ))

    return claims, remittances


def write_csv(path: Path, header: list, rows: list):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(header)
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate scale synthetic data for Claim Reconciliation.")
    parser.add_argument("--count", type=int, default=50, help="Number of claims to generate (default: 50)")
    parser.add_argument("--claims-out", type=str, default="claims_large.csv", help="Claims CSV output filename")
    parser.add_argument("--remits-out", type=str, default="remittances_large.csv", help="Remittances CSV output filename")
    args = parser.parse_args()

    claims, remittances = generate_scale_dataset(num_claims=args.count)

    claims_path = OUT_DIR / args.claims_out
    remits_path = OUT_DIR / args.remits_out

    write_csv(
        claims_path,
        ["claim_id", "patient_account", "payer", "service_date", "cpt", "billed_cents"],
        claims,
    )
    write_csv(
        remits_path,
        [
            "remit_id",
            "claim_id",
            "payer",
            "paid_cents",
            "adjustment_cents",
            "patient_responsibility_cents",
            "reason_code",
            "posted_date",
        ],
        remittances,
    )

    print(f"Generated {len(claims)} claims in {claims_path.name}")
    print(f"Generated {len(remittances)} remittances in {remits_path.name}")


if __name__ == "__main__":
    main()
