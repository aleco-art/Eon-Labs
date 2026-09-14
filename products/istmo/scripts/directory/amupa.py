"""Municipal channels from the AMUPA mayors directory 2024-2029 (PDF, published Oct 2024).

AMUPA (Asociacion de Municipios de Panama) is not a government domain, so every channel is
stored as "otra fuente publica" and flagged for corroboration. Mayor names are NOT imported:
merged cells in the PDF misalign them, and the platform addresses the institution, not a person.

Usage: python scripts/directory/amupa.py path/to/Directorio-de-Alcaldes-de-Panama-2024-2029.pdf
Requires: pdfplumber
"""
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber

SOURCE = "https://amupa.org.pa/wp-content/uploads/2024/10/Directorio-de-Alcaldes-de-Panama-2024-2029.pdf"
CHECKED = "2026-09-14"
ROOT = Path(__file__).resolve().parents[2]

# Reviewed by hand. Reason is kept in the output so the exclusion is auditable.
# Keys are sha256(email)[:16]: some addresses look personal and are not republished here.
EXCLUDED = {
    "e032fbb5178ee721": "formato invalido en la fuente",
    "4c6780051a241bcd": "parece una cuenta personal",
    "a3373ccb3e6a2136": "parece una cuenta personal (el municipio publica otra direccion)",
    "bc5fea1878659683": "parece una cuenta personal",
    "aafbb800ef4aab7b": "buzon nominal de una funcionaria; se usan canales institucionales del Municipio de Panama",
    "b433b39715f75743": "buzon de compras, no de atencion",
    "c0ed60e4be8cfde4": "no identifica a la institucion",
    "73dcf501185104a2": "buzon de un departamento especifico, no del despacho",
    "abdb0c5efd43ee6b": "buzon de tesoreria, no de atencion",
}
ALIASES = {  # AMUPA spelling -> IGN official district name
    "almirante(6)": "almirante",
    "santa catalina o": "santa catalina o calovebora (bledeshia)",
    "ccaelmoavceobora": "cemaco",
    "comarca ngabe bugle": "comarca ngabe-bugle",
    "comarca embera wounaan": "comarca embera-wounaan",
    "panama": "panama",
    "nurun": "nurum",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()
    return re.sub(r"\s+", " ", s)


def main(pdf_path: str) -> None:
    territories = json.loads((ROOT / "src/data/territories.json").read_text(encoding="utf-8"))
    districts = {}
    for t in territories:
        districts.setdefault((norm(t["province"]), norm(t["district"])), (t["province_code"], t["district_code"], t["district"]))
    by_district_name = {}
    for (p, d), v in districts.items():
        by_district_name.setdefault(d, []).append((p, v))

    rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for r in table:
                    rows.append([(c or "").replace("\n", " ").strip() for c in r])

    seen_email = {}
    out, skipped = [], []
    for province, district, _mayor, phone, email in (r[:5] for r in rows if len(r) >= 5):
        if not district or norm(district) in ("distrito",):
            continue
        dname = ALIASES.get(norm(district), norm(district))
        candidates = by_district_name.get(dname, [])
        pnorm = ALIASES.get(norm(province), norm(province))
        match = [v for p, v in candidates if p.replace("-", " ") == pnorm.replace("-", " ")] or [v for _, v in candidates]
        if len(match) != 1:
            skipped.append({"province": province, "district": district, "reason": "sin correspondencia unica con la division territorial"})
            continue
        province_code, district_code, official = match[0]
        emails = [e.strip().lower() for e in re.split(r"\s*/\s*", email) if e.strip()]
        valid, excluded = [], []
        # Excluded addresses are masked: some look personal and must not be republished.
        mask = lambda e: re.sub(r"^(.{2})[^@]*", lambda m: m.group(1) + "***", e)
        for e in emails:
            key = hashlib.sha256(e.encode()).hexdigest()[:16]
            if key in EXCLUDED:
                excluded.append({"email": mask(e), "reason": EXCLUDED[key]})
            elif not re.fullmatch(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", e):
                excluded.append({"email": mask(e), "reason": "formato invalido en la fuente"})
            elif e in seen_email:
                excluded.append({"email": mask(e), "reason": "repetido para otro distrito (" + seen_email[e] + ")"})
            else:
                valid.append(e)
                seen_email[e] = official
        phones = re.sub(r"\s+", " ", phone)
        out.append({
            "id": "municipio-" + district_code,
            "name": "Municipio de " + official,
            "province_code": province_code,
            "district_code": district_code,
            "email": valid[0] if valid else None,
            "generic_domain": bool(valid and re.search(r"@(gmail|hotmail|outlook|yahoo)\.", valid[0])),
            "phone": None if re.search(r"no tien|no cuent", phones, re.I) or not phones else phones,
            "excluded": excluded,
            "source_url": SOURCE,
            "checked_at": CHECKED,
        })
    result = {"source": SOURCE, "checked_at": CHECKED, "municipalities": out, "skipped": skipped}
    (Path(__file__).parent / "amupa-municipios.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"municipios={len(out)} con_correo={sum(1 for m in out if m['email'])} omitidos={len(skipped)}")
    for s in skipped:
        print("  omitido:", s)


if __name__ == "__main__":
    main(sys.argv[1])
