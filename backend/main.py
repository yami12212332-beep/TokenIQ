
"""
Enterprise AI Platform Usage & Cost Intelligence - FastAPI Backend
Modular Architecture:
- routes/: API endpoint controllers (copilot, claude, analytics)
- services/: Database connection pool and SQL execution engine
- schemas/: Pydantic request and response payload models
- models/: Database entity models reflecting tokeniq_db
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env before importing modules that read database settings.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import services.database as database_service
from services.database import init_db_pool, close_db_pool
from routes.analytics import router as analytics_router
from routes.copilot import router as copilot_router
from routes.claude import router as claude_router
from routes.chatgpt import router as chatgpt_router
from routes.dashboard import router as dashboard_router
from routes.overall import router as overall_router
from schemas.analytics import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    yield
    await close_db_pool()


app_name = os.getenv("APP_NAME", os.getenv("PP_NAME", "TokenIQ"))
app_env = os.getenv("APP_ENV", "development").lower()
debug = os.getenv("DEBUG", "false").lower() in {
    "1", "true", "yes", "on"
}

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title=f"{app_name} AI Platform & Token Cost Intelligence API",
    description=(
        "Unified backend API querying PostgreSQL telemetry tables "
        "joining Microsoft 365 Copilot, Anthropic Claude, OpenAI ChatGPT, and Workday HR data."
    ),
    version="2.3.0",
    debug=debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount existing modular route controllers.
app.include_router(analytics_router)
app.include_router(copilot_router)
app.include_router(claude_router)
app.include_router(chatgpt_router)
app.include_router(dashboard_router)
app.include_router(overall_router)


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health():
    connected = False

    if database_service.engine is not None:
        try:
            from sqlalchemy import text
            async with database_service.engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            connected = True
        except Exception:
            logger.exception("Database health probe failed")

    payload = {
        "status": "healthy" if connected else "unhealthy",
        "database": "PostgreSQL",
        "database_connected": connected,
        "schema_mode": "raw tables with backend joins",
        "tables_used": [
            "workday_employees",
            "copilot_usage_user_detail",
            "copilot_user_count_summary",
            "copilot_user_count_trend",
            "claude_usage_user_detail",
            "claude_cost_user_detail",
            "claude_organization_users",
            "chatgpt_usage_user_detail",
            "chatgpt_cost_user_detail",
        ],
        "query_engine": "SQLAlchemy 2.0 AsyncEngine",
    }


    if not connected:
        raise HTTPException(
            status_code=503,
            detail=(
                "Backend is running but PostgreSQL is not connected. "
                "Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, "
                "and database availability."
            ),
        )

    return payload


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
