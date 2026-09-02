# Eon Labs

Portfolio de proyectos, vibe-coded apps, agents y código de Eon Labs.

## Productos

- [`products/presupuesto-facil`](products/presupuesto-facil): aplicación de presupuestos para instaladores y pequeñas empresas de servicios.

## Landing V1

La primera aplicación del repositorio es el sitio público de Eon Labs: landing comercial, showroom de cinco herramientas demostrativas y brief guiado para iniciar un proyecto.

### Stack

- React + TypeScript + Vite
- FastAPI + Python
- CSS propio y Lucide Icons

### Desarrollo

```powershell
cd frontend
npm install
npm run dev
```

### Ejecución con FastAPI

```powershell
cd frontend
npm run build
cd ..
python -m pip install -r requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

La web queda disponible en `http://127.0.0.1:8000` y el estado del servicio en `/api/health`.

### Configuración pendiente

Copia `frontend/.env.example` a `frontend/.env` y completa únicamente los datos confirmados:

- `VITE_SITE_URL`
- `VITE_WHATSAPP_NUMBER`
- `VITE_CONTACT_EMAIL`

Para producción, configura también `EON_SITE_URL` en el entorno de FastAPI para generar el sitemap con el dominio real.
