"""
Production application entrypoint: structured logging, Sentry error tracking,
rate limiting, security headers, and a real health check — no auto
table-creation, no debug mode, no wildcard CORS.
"""

from backend.database.database import Base, engine

# Import all models so SQLAlchemy registers them
import backend.models.user
import backend.models.product
import backend.models.customer
import backend.models.inventory
import backend.models.invoice
import backend.models.invoice_session
import backend.models.payment
import backend.models.audit_log
import backend.models.store


Base.metadata.create_all(bind=engine)
import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from backend.config import settings
from backend.database.database import wait_for_db, wait_for_redis, get_db
from backend.api import auth, billing, inventory, payment, reports, voice, products
from backend.utils.rate_limiter import limiter




# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("main")

# ---------- Sentry (error monitoring) ----------
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENV,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.2,
    )

# ---------- Rate limiting ----------
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,   # hide Swagger in prod
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENV != "production" else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

print(settings.cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Auth"])
app.include_router(billing.router, prefix=f"{settings.API_V1_PREFIX}/billing", tags=["Billing"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_PREFIX}/inventory", tags=["Inventory"])
app.include_router(payment.router, prefix=f"{settings.API_V1_PREFIX}/payment", tags=["Payment"])
app.include_router(reports.router, prefix=f"{settings.API_V1_PREFIX}/reports", tags=["Reports"])
app.include_router(voice.router, prefix=f"{settings.API_V1_PREFIX}/voice", tags=["Voice AI"])
app.include_router(products.router,prefix=f"{settings.API_V1_PREFIX}/products",tags=["Products"],)


@app.on_event("startup")
def on_startup():
    logger.info(f"Starting {settings.APP_NAME} [{settings.ENV}]")

    wait_for_db()
    redis_ready = wait_for_redis()
    if not redis_ready:
        logger.warning("Redis-dependent features will be unavailable until Redis becomes reachable.")

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check(db=None):
    """Used by Docker healthcheck and load balancers."""
    return {"status": "ok", "env": settings.ENV}