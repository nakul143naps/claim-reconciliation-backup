#!/usr/bin/env python3
"""Generates an executive-grade PDF review brief for senior engineering review.

Creates Stitch_Fin_Executive_Review_Brief.pdf in the project root.
"""

from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = PROJECT_ROOT / "Stitch_Fin_Executive_Review_Brief.pdf"


def build_pdf():
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom palette
    NAVY = colors.HexColor("#0f172a")
    BLUE = colors.HexColor("#2563eb")
    ORANGE = colors.HexColor("#ea580c")
    GREEN = colors.HexColor("#16a34a")
    SLATE = colors.HexColor("#475569")
    LIGHT_BG = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#cbd5e1")

    # Typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=NAVY,
        spaceAfter=4,
    )

    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=BLUE,
        spaceAfter=4,
    )

    meta_style = ParagraphStyle(
        "MetaText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=SLATE,
    )

    h2_style = ParagraphStyle(
        "Heading2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=NAVY,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12.5,
        textColor=NAVY,
        spaceAfter=5,
    )

    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    callout_link = ParagraphStyle(
        "CalloutLink",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=BLUE,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=NAVY,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=table_cell,
        fontName="Helvetica-Bold",
    )

    story = []

    # 1. Header Badges & Title
    badge_text = "<font color='#2563eb'><b>ENTERPRISE HEALTHCARE RECONCILIATION</b></font> &nbsp;|&nbsp; <font color='#ea580c'><b>DEPLOYED LIVE ON AWS EC2</b></font>"
    story.append(Paragraph(badge_text, badge_style))
    story.append(Paragraph("Stitch Financial — Claims Reconciliation & Audit Hub", title_style))
    story.append(
        Paragraph(
            "<b>Author:</b> Nakul (Forward Deployed Engineer Candidate) &nbsp;|&nbsp; "
            "<b>Reviewer:</b> Senior Engineering Review (ServiceNow) &nbsp;|&nbsp; "
            "<b>Status:</b> 38/38 Tests Passing",
            meta_style,
        )
    )
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=8))

    # 2. Live Cloud URL Box
    link_html = (
        "<b>Live AWS Cloud Deployment:</b> "
        "<font color='#2563eb'><u>http://67.202.41.44</u></font> &nbsp;(or port 3000: <u>http://67.202.41.44:3000</u>)<br/>"
        "<font size='8' color='#64748b'>Hosted on AWS EC2 (us-east-1) with Nginx Reverse Proxy, Dockerized MySQL 8.0 & FastAPI • "
        "GitHub: <u>https://github.com/nakul143naps/claim-reconciliation</u></font>"
    )
    link_table = Table(
        [[Paragraph(link_html, body_style)]],
        colWidths=[7.4 * inch],
    )
    link_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(link_table)
    story.append(Spacer(1, 6))

    # 3. Executive Overview & Problem Solved
    story.append(Paragraph("1. Executive Problem & Technical Scope", h2_style))
    story.append(
        Paragraph(
            "In healthcare revenue cycle management, medical clinics submit bills (<b>Claims</b>) to insurance payers and receive back complex payment advices (<b>Remittances</b>). These remittances bundle cash transfers, contractual write-offs, copays, and clinical denial codes across multiple dates.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Why traditional tools fail:</b> Standard billing software suffers from floating-point rounding drift (e.g. <code>0.1 + 0.2 = 0.30000000000000004</code>), loses cash accountability by discarding orphan checks, and conflates operational denials with mathematical balances. This platform solves all three using pure integer cents arithmetic (<code>BIGINT</code>), strict foreign-key isolation via the <b>Dual-Key Pattern</b>, and full multi-page scale pagination.",
            body_style,
        )
    )

    # 4. Tech Stack Table
    story.append(Paragraph("2. Full-Stack Production Architecture", h2_style))
    stack_data = [
        [
            Paragraph("Layer", table_cell_bold),
            Paragraph("Technologies Used", table_cell_bold),
            Paragraph("Key Architectural Rationale", table_cell_bold),
        ],
        [
            Paragraph("<b>Frontend</b>", table_cell),
            Paragraph("React 18.3, TypeScript 5.6, Vite 6, Tailwind CSS", table_cell),
            Paragraph("Single-page app with single-line filter bar, live search, <code>Show: 10/20/50</code> selector, and audit drawers.", table_cell),
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell),
            Paragraph("Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic v2", table_cell),
            Paragraph("Asynchronous REST API with eager relationship preloading (<code>selectinload</code>) eliminating N+1 queries.", table_cell),
        ],
        [
            Paragraph("<b>Database</b>", table_cell),
            Paragraph("MySQL 8.0 (Containerized in Docker)", table_cell),
            Paragraph("Non-negative <code>CHECK</code> constraints, composite timeline indexes, and <code>ON DELETE SET NULL</code> orphan safety.", table_cell),
        ],
        [
            Paragraph("<b>Cloud (AWS)</b>", table_cell),
            Paragraph("EC2 (t3.micro), 20 GB gp3 EBS, 2 GB Swap", table_cell),
            Paragraph("Expanded EBS online to 20 GB without downtime; allocated 2 GB swap to eliminate 1 GB RAM bottlenecks.", table_cell),
        ],
    ]
    t_stack = Table(stack_data, colWidths=[1.1 * inch, 2.7 * inch, 3.6 * inch])
    t_stack.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t_stack)
    story.append(Spacer(1, 6))

    # 5. Live Settlement Ledger Explained
    story.append(Paragraph("3. The Live Settlement Ledger: Plain-English Concept Guide", h2_style))
    story.append(
        Paragraph(
            "When you view the dashboard, the top container renders the <b>3-Way Live Settlement Ledger</b>. Every figure adheres to: "
            "<code>Difference = Billed - Paid - Adjustments - Patient Responsibility</code>.",
            body_style,
        )
    )

    ledger_cards = [
        [
            Paragraph("<b>Total Billed: $1,700.00</b><br/><font size='7.5' color='#475569'>Total gross clinic charges across all 12 claims.</font>", table_cell),
            Paragraph("<b>Matched Cash: $990.00 (58.2%)</b><br/><font size='7.5' color='#16a34a'>Cash received into the bank against valid claims.</font>", table_cell),
        ],
        [
            Paragraph("<b>Gross Uncollected: $710.00</b><br/><font size='7.5' color='#ea580c'>Charges billed minus matched cash received ($1,700 - $990).</font>", table_cell),
            Paragraph("<b>Net Unsettled AR: $495.00</b><br/><font size='7.5' color='#2563eb'>Actual collectible variance after $140 write-offs & $75 copays.</font>", table_cell),
        ],
    ]
    t_cards = Table(ledger_cards, colWidths=[3.7 * inch, 3.7 * inch])
    t_cards.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_cards)
    story.append(Spacer(1, 4))

    ledger_details = (
        "• <b>5 Balanced Claims ($0 balance)</b>: Fully settled (C1001, C1002, C1007, C1008, C1012).<br/>"
        "• <b>6 Unbalanced Claims</b>: Variance remaining ($435.00 total) requiring billing follow-up.<br/>"
        "• <b>1 Unremitted Claim (C1005)</b>: Zero remittances received ($60.00 billed). Difference is strictly <code>null</code> so accountants don't falsely classify it as debt.<br/>"
        "• <b>1 Orphan Remittance (R1012)</b>: $50.00 check pointing to non-existent claim C9999. Quarantined in the unmatched queue with <code>claim_id = NULL</code> without losing cash."
    )
    story.append(Paragraph(ledger_details, body_style))
    story.append(Spacer(1, 6))

    # 6. Interactive Review Checklist & Invitation to Test
    story.append(Paragraph("4. Interactive Review Checklist (Please Try on Live App!)", h2_style))
    
    checklist = [
        "<b>Step 1: Open the Live URL</b> &bull; Visit <u>http://67.202.41.44:3000</u> in Chrome or Edge. Test the entries selector (<code>Show: 10 / 20 / 50</code>) and live filters.",
        "<b>Step 2: Inspect Claim C1007</b> &bull; Click row <code>C1007</code>. Notice it evaluates as <b>Balanced</b> ($0 balance) while preserving the <b>Denial History</b> badge. The timeline shows it was originally denied under <code>CO-197</code> ($0 paid), then settled under <code>R1007</code> ($110 paid, $40 write-off).",
        "<b>Step 3: Review Denial Playbook</b> &bull; In the detail modal, observe the clinical appeal playbook with root cause analysis and a copyable formal reconsideration letter.",
        "<b>Step 4: Scale Test via CSV Upload</b> &bull; Click <b>'Import CSV'</b> in the table header. Upload <code>data/claims_large.csv</code> (50 claims) and <code>data/remittances_large.csv</code>. Watch the ledger recalculate live to <b>$10,085.00 Billed</b>, <b>$7,285.00 Paid</b>, and page through 50 claims!",
        "<b>Step 5: 1-Click Benchmark Reset</b> &bull; Click <b>'Import CSV'</b> ➔ click <b>'Reset to Demo Benchmark'</b>. The database restores the official 12-claim benchmark in milliseconds.",
    ]

    for item in checklist:
        story.append(Paragraph(f"&bull; {item}", body_style))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR, spaceAfter=4))
    story.append(
        Paragraph(
            "<font size='7.5' color='#94a3b8'>Stitch Financial Take-Home Submission • Forward Deployed Engineer • Deployed on AWS EC2 • October 2026</font>",
            meta_style,
        )
    )

    doc.build(story)
    print(f"PDF built successfully at: {PDF_PATH}")


if __name__ == "__main__":
    build_pdf()
