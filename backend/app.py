import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="Eon Labs", version="0.1.0", docs_url="/api/docs")
PUBLIC_BASE_URL = os.getenv("EON_SITE_URL", "http://127.0.0.1:8000").rstrip("/")
PUBLIC_ROUTES = ["", "showroom", "soluciones", "como-trabajamos", "paquetes", "empezar"]
PROJECT_SLUGS = ["crm-inmobiliario", "gestion-academia-idiomas", "seguimiento-obras", "control-distribuidora", "automatizacion-administrativa"]
KNOWN_PATHS = {*PUBLIC_ROUTES, *(f"showroom/{slug}" for slug in PROJECT_SLUGS)}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "eon-labs"}


@app.get("/robots.txt", response_class=PlainTextResponse, include_in_schema=False)
def robots() -> str:
    return f"User-agent: *\nAllow: /\nSitemap: {PUBLIC_BASE_URL}/sitemap.xml\n"


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap() -> Response:
    routes = [*PUBLIC_ROUTES, *(f"showroom/{slug}" for slug in PROJECT_SLUGS)]
    urls = "".join(f"<url><loc>{PUBLIC_BASE_URL}/{route}</loc></url>" for route in routes)
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>', media_type="application/xml")


if DIST.exists():
    assets = DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_spa(path: str) -> FileResponse:
        candidate = (DIST / path).resolve()
        if path and candidate.is_relative_to(DIST.resolve()) and candidate.is_file():
            return FileResponse(candidate)
        status_code = 200 if path.rstrip("/") in KNOWN_PATHS else 404
        return FileResponse(DIST / "index.html", status_code=status_code)
