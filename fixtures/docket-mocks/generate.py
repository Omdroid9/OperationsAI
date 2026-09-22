#!/usr/bin/env python3
"""Write one-page specimen PDFs for Docket upload tests."""

from pathlib import Path

OUT = Path(__file__).resolve().parent

SPECS = [
    {
        "file": "cdl-final-test.pdf",
        "title": "COMMERCIAL DRIVER LICENSE — SPECIMEN",
        "type": "cdl",
        "lines": [
            "Name: Final Test",
            "License class: A",
            "License number: D1234567",
            "State: CA",
            "Issued date: 2025-06-30",
            "Expiration date: 2028-06-30",
            "USDOT (employer): 156789",
        ],
    },
    {
        "file": "medical-certificate-final-test.pdf",
        "title": "MEDICAL EXAMINER CERTIFICATE — SPECIMEN",
        "type": "medical_certificate",
        "lines": [
            "Name: Final Test",
            "Examiner: Dr. N. Alvarez, MD",
            "Issued date: 2025-09-18",
            "Expiration date: 2026-09-18",
            "Status: Qualified",
            "Note: Expiration is within 45 days of the demo clock (2026-08-12).",
        ],
    },
    {
        "file": "mvr-final-test.pdf",
        "title": "MOTOR VEHICLE RECORD — SPECIMEN",
        "type": "mvr",
        "lines": [
            "Name: Final Test",
            "License number: D1234567",
            "State: CA",
            "Issued date: 2026-07-20",
            "Expiration date: 2027-07-20",
            "Violations: None in the last 36 months",
        ],
    },
    {
        "file": "driver-application-final-test.pdf",
        "title": "DRIVER APPLICATION — SPECIMEN",
        "type": "driver_application",
        "lines": [
            "Name: Final Test",
            "Company: Test",
            "Phone: 2095183162",
            "Email: finaltest@gmail.com",
            "Issued date: 2026-08-01",
            "Expiration date: 2027-08-01",
            "Position: Interstate driver",
        ],
    },
    {
        "file": "drug-alcohol-final-test.pdf",
        "title": "DRUG AND ALCOHOL CLEARINGHOUSE — SPECIMEN",
        "type": "drug_alcohol",
        "lines": [
            "Name: Final Test",
            "Query type: Full query",
            "Issued date: 2026-06-01",
            "Expiration date: 2027-06-01",
            "Result: No prohibitions on file",
        ],
    },
    {
        "file": "vehicle-information-final-test.pdf",
        "title": "VEHICLE INFORMATION — SPECIMEN",
        "type": "vehicle_information",
        "lines": [
            "Registered owner: Final Test",
            "Company: Test",
            "VIN: 1HGBH41JXMN109186",
            "Unit: 104",
            "Issued date: 2026-01-15",
            "Expiration date: 2027-01-15",
            "Plate: 8TEST42  CA",
        ],
    },
    {
        "file": "insurance-final-test.pdf",
        "title": "CERTIFICATE OF LIABILITY INSURANCE — SPECIMEN",
        "type": "insurance",
        "lines": [
            "Named insured: Final Test / Test",
            "Policy number: CA-INS-44021",
            "Issued date: 2026-01-01",
            "Expiration date: 2026-12-31",
            "Auto liability: $1,000,000",
            "Cargo: $100,000",
        ],
    },
    {
        "file": "irp-ifta-final-test.pdf",
        "title": "IRP / IFTA CREDENTIALS — SPECIMEN",
        "type": "irp_ifta",
        "lines": [
            "Name: Final Test",
            "Account: CA-IFTA-7781",
            "Issued date: 2026-01-01",
            "Expiration date: 2026-12-31",
            "Fleet: 1 power unit",
        ],
    },
    {
        "file": "ucr-final-test.pdf",
        "title": "UCR REGISTRATION — SPECIMEN",
        "type": "ucr",
        "lines": [
            "Name: Final Test",
            "USDOT: 156789",
            "Issued date: 2026-01-05",
            "Expiration date: 2026-12-31",
            "Year: 2026",
        ],
    },
    {
        "file": "filing-packet-final-test.pdf",
        "title": "FILING PACKET — SPECIMEN",
        "type": "filing_packet",
        "lines": [
            "Name: Final Test",
            "Company: Test",
            "Issued date: 2026-08-10",
            "Expiration date: 2026-11-10",
            "Contents: MCS-150 draft, authority checklist",
        ],
    },
]


def escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_pdf(spec: dict) -> bytes:
    stream_lines = [
        "BT",
        "/F1 16 Tf",
        "50 740 Td",
        f"({escape('MOCK DOCUMENT — NOT AN OFFICIAL RECORD')}) Tj",
        "0 -28 Td",
        "/F1 14 Tf",
        f"({escape(spec['title'])}) Tj",
        "0 -18 Td",
        "/F1 11 Tf",
        f"({escape('Expected SkyOS type: ' + spec['type'])}) Tj",
        "0 -28 Td",
        "/F1 12 Tf",
    ]
    for line in spec["lines"]:
        stream_lines.append(f"({escape(line)}) Tj")
        stream_lines.append("0 -20 Td")
    stream_lines += [
        "0 -16 Td",
        "/F1 9 Tf",
        f"({escape('For SkyOS Docket extraction tests only. Invented identity.')}) Tj",
        "ET",
    ]
    content = "\n".join(stream_lines) + "\n"
    content_bytes = content.encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(content_bytes) + content_bytes + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{index} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")

    xref_at = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode())
    out.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_at}\n%%EOF\n"
        ).encode()
    )
    return bytes(out)


def main() -> None:
    for spec in SPECS:
        path = OUT / spec["file"]
        path.write_bytes(build_pdf(spec))
        print(path.name)


if __name__ == "__main__":
    main()
