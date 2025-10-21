from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Support running from repo root or from inside `back/`
try:
    from back.settings import settings  # type: ignore
    from back.app.api.ocr import router as ocr_router  # type: ignore
except ModuleNotFoundError:
    from settings import settings  # type: ignore
    from app.api.ocr import router as ocr_router  # type: ignore


def create_app() -> FastAPI:
    app = FastAPI(title="OCR Summary API", version="1.0.0")

    # CORS
    allow_origins = settings.CORS_ORIGINS
    if isinstance(allow_origins, str):
        allow_origins = [x.strip() for x in allow_origins.split(",") if x.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins or [],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(ocr_router, prefix=settings.API_PREFIX)

    return app


app = create_app()
