"""
NameNest backend — a domain + social handle + trademark availability checker.

Single endpoint of note: POST /api/check-name
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from cache import cache
from checkers import (
    BROWSER_HEADERS, DOMAIN_TLDS, check_all_domains, check_all_social,
    check_domain, check_github, check_google_play, check_uspto_trademark,
    is_valid_handle, slugify,
)
from suggestions import generate_variants

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

app = FastAPI(title="NameNest API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("namenest")


class CheckNameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class CheckResult(BaseModel):
    platform: str
    label: str
    status: str
    url: Optional[str] = None
    note: Optional[str] = None


class Suggestion(BaseModel):
    name: str
    dot_com_status: str
    github_status: str
    score: int


class CheckNameResponse(BaseModel):
    name: str
    slug: str
    checked_at: str
    domains: List[CheckResult]
    social: List[CheckResult]
    appstore: List[CheckResult]
    trademark: List[CheckResult]
    summary: dict
    suggestions: List[Suggestion]


async def _score_variant(client: httpx.AsyncClient, variant: str) -> Suggestion:
    dom = check_domain(variant, ".com")
    gh = check_github(variant)

    dom_status = "available" if dom["available"] is True else "taken"
    gh_status = "available" if gh["available"] is True else "taken"

    score = (1 if dom_status == "available" else 0) + \
            (1 if gh_status == "available" else 0)
    return Suggestion(name=variant, dot_com_status=dom_status,
                      github_status=gh_status, score=score)


async def build_suggestions(slug: str, limit: int = 6) -> List[Suggestion]:
    variants = generate_variants(slug, max_variants=18)
    async with httpx.AsyncClient(headers=BROWSER_HEADERS) as client:
        results = await asyncio.gather(*[_score_variant(client, v) for v in variants])
    results.sort(key=lambda s: (-s.score,
                                0 if s.dot_com_status == "available" else 1,
                                len(s.name)))
    filtered = [s for s in results if s.dot_com_status == "available"] or results
    return filtered[:limit]


def _summarize(results: List[dict]) -> dict:
    counts = {"available": 0, "taken": 0, "unknown": 0}
    for r in results:
        avail = r.get("available")
        if avail is True:
            key = "available"
        elif avail is False:
            key = "taken"
        else:
            key = "unknown"
        counts[key] = counts.get(key, 0) + 1
    return counts


@api_router.get("/")
async def root() -> dict:
    return {"service": "namenest", "status": "ok"}

def _to_check_result(raw: dict) -> dict:
    """Convert a raw checker dict (platform/name/available) into
    the shape CheckResult expects (platform/label/status/url/note)."""
    avail = raw.get("available")
    if avail is True:
        status = "available"
    elif avail is False:
        status = "taken"
    else:
        status = "unknown"
    return {
        "platform": raw.get("platform", "unknown"),
        "label": raw.get("name", ""),
        "status": status,
        "url": raw.get("url"),
        "note": raw.get("note"),
    }

@api_router.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api_router.post("/check-name", response_model=CheckNameResponse)
async def check_name(req: CheckNameRequest) -> CheckNameResponse:
    slug = slugify(req.name)
    if not is_valid_handle(slug):
        raise HTTPException(status_code=400,
            detail="Name must be 1-30 alphanumeric characters after normalization")

    cache_key = f"check:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return CheckNameResponse(**cached)

    domains = check_all_domains(slug)
    social = check_all_social(slug)
    play = check_google_play(slug)
    tm = check_uspto_trademark(slug)
    suggestions = await build_suggestions(slug)
    all_checks = domains + social + [play] + [tm]
    summary = _summarize(all_checks)

    response = CheckNameResponse(
        name=req.name, slug=slug,
        checked_at=datetime.now(timezone.utc).isoformat(),
        domains=[CheckResult(**_to_check_result(d)) for d in domains],
        social=[CheckResult(**_to_check_result(s)) for s in social],
        appstore=[CheckResult(**_to_check_result(play))],
        trademark=[CheckResult(**_to_check_result(tm))],
        summary=summary, suggestions=suggestions,
    )
    payload = response.model_dump()
    cache.set(cache_key, payload)
    try:
        await db.name_searches.insert_one({
            "slug": slug, "raw_name": req.name,
            "checked_at": payload["checked_at"], "summary": summary,
        })
    except Exception as e:
        logger.warning("mongo insert failed: %s", e)
    return response


@api_router.get("/recent")
async def recent_searches(limit: int = 8) -> list[dict[str, Any]]:
    return await db.name_searches.find({}, {"_id": 0}) \
        .sort("checked_at", -1).to_list(length=limit)


app.include_router(api_router)

cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown() -> None:
    mongo_client.close()