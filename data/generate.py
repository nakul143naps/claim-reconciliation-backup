#!/usr/bin/env python3
"""Write the fixed synthetic CSVs next to this file.

Running this script again rewrites claims.csv and remittances.csv.
The rows do not change. There are no patient names or other personal data.
"""

import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent

CLAIMS = [
    # claim_id, patient_account, payer, service_date, cpt, billed_cents
    ("C1001", "A1001", "Northwind Health", "2026-09-02", "99213", 15000),
    ("C1002", "A1002", "Cedar Mutual", "2026-09-03", "99214", 22000),
    ("C1003", "A1003", "Harbor Plan", "2026-09-04", "80053", 8500),
    ("C1004", "A1004", "Northwind Health", "2026-09-05", "99213", 15000),
    ("C1005", "A1005", "Cedar Mutual", "2026-09-08", "93000", 6000),
    ("C1006", "A1006", "Harbor Plan", "2026-09-09", "99215", 28000),
    ("C1007", "A1007", "Northwind Health", "2026-09-10", "99213", 15000),
    ("C1008", "A1008", "Cedar Mutual", "2026-09-11", "36415", 2500),
    ("C1009", "A1009", "Harbor Plan", "2026-09-12", "99213", 15000),
    ("C1010", "A1010", "Northwind Health", "2026-09-15", "80053", 9000),
    ("C1011", "A1011", "Cedar Mutual", "2026-09-16", "99214", 20000),
    ("C1012", "A1012", "Harbor Plan", "2026-09-17", "99213", 14000),
]

REMITTANCES = [
    # remit_id, claim_id, payer, paid_cents, adjustment_cents,
    # patient_responsibility_cents, reason_code, posted_date
    ("R1001", "C1001", "Northwind Health", 12000, 3000, 0, "CO-45", "2026-09-08"),
    ("R1002", "C1002", "Cedar Mutual", 18000, 0, 4000, "PR-3", "2026-09-09"),
    ("R1003", "C1003", "Harbor Plan", 0, 0, 0, "CO-16", "2026-09-10"),
    ("R1004", "C1004", "Northwind Health", 10000, 0, 0, "", "2026-09-11"),
    ("R1005", "C1006", "Harbor Plan", 30000, 0, 0, "", "2026-09-14"),
    ("R1006", "C1007", "Northwind Health", 0, 0, 0, "CO-197", "2026-09-12"),
    ("R1007", "C1007", "Northwind Health", 11000, 4000, 0, "CO-45", "2026-09-20"),
    ("R1008", "C1008", "Cedar Mutual", 0, 0, 2500, "PR-1", "2026-09-15"),
    ("R1009", "C1009", "Harbor Plan", 0, 0, 0, "CO-50", "2026-09-16"),
    ("R1010", "C1010", "Northwind Health", 4000, 2000, 1000, "CO-45", "2026-09-18"),
    ("R1011", "C1011", "Cedar Mutual", 0, 5000, 0, "CO-16", "2026-09-19"),
    ("R1012", "C9999", "Cedar Mutual", 5000, 0, 0, "", "2026-09-18"),
    ("R1013", "C1012", "Harbor Plan", 14000, 0, 0, "", "2026-09-22"),
]


def write_csv(path, header, rows):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(header)
        writer.writerows(rows)


def main():
    write_csv(
        OUT / "claims.csv",
        ["claim_id", "patient_account", "payer", "service_date", "cpt", "billed_cents"],
        CLAIMS,
    )
    write_csv(
        OUT / "remittances.csv",
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
        REMITTANCES,
    )


if __name__ == "__main__":
    main()
