from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# --- Models ---

class SmokingEvent(BaseModel):
    timestamp: str
    action: str

class DailyLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    count: int = 0
    events: List[SmokingEvent] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    daily_limit: int = 10
    cigarette_price: float = 0.50
    currency: str = "USD"
    sound_enabled: bool = False
    delay_duration: int = 300
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UpdateSettings(BaseModel):
    daily_limit: Optional[int] = None
    cigarette_price: Optional[float] = None
    currency: Optional[str] = None
    sound_enabled: Optional[bool] = None
    delay_duration: Optional[int] = None

class DelayLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    started_at: str
    completed: bool = False
    duration_seconds: int = 300


# --- Helpers ---

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

async def get_or_create_log(date_str: str = None):
    if not date_str:
        date_str = today_str()
    doc = await db.daily_logs.find_one({"date": date_str}, {"_id": 0})
    if not doc:
        new_log = DailyLog(date=date_str)
        d = new_log.model_dump()
        await db.daily_logs.insert_one(d)
        del d["_id"]
        return d
    return doc

async def get_or_create_settings():
    doc = await db.user_settings.find_one({}, {"_id": 0})
    if not doc:
        s = UserSettings()
        d = s.model_dump()
        await db.user_settings.insert_one(d)
        del d["_id"]
        return d
    return doc


# --- Routes ---

@api_router.get("/")
async def root():
    return {"message": "EMBER API v1.0"}

@api_router.get("/logs/today")
async def get_today():
    return await get_or_create_log()

@api_router.post("/logs/increment")
async def increment():
    d = today_str()
    await get_or_create_log(d)
    event = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "add"}
    await db.daily_logs.update_one(
        {"date": d},
        {"$inc": {"count": 1}, "$push": {"events": event}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return await db.daily_logs.find_one({"date": d}, {"_id": 0})

@api_router.post("/logs/decrement")
async def decrement():
    d = today_str()
    log = await get_or_create_log(d)
    if log["count"] <= 0:
        return log
    event = {"timestamp": datetime.now(timezone.utc).isoformat(), "action": "remove"}
    await db.daily_logs.update_one(
        {"date": d},
        {"$inc": {"count": -1}, "$push": {"events": event}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return await db.daily_logs.find_one({"date": d}, {"_id": 0})

@api_router.get("/logs/history")
async def history(days: int = 30):
    start = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    docs = await db.daily_logs.find({"date": {"$gte": start}}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs

@api_router.get("/settings")
async def get_settings():
    return await get_or_create_settings()

@api_router.put("/settings")
async def update_settings(body: UpdateSettings):
    await get_or_create_settings()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.user_settings.update_one({}, {"$set": updates})
    return await db.user_settings.find_one({}, {"_id": 0})

@api_router.post("/delays/start")
async def start_delay():
    settings = await get_or_create_settings()
    dl = DelayLog(
        date=today_str(),
        started_at=datetime.now(timezone.utc).isoformat(),
        duration_seconds=settings.get("delay_duration", 300)
    )
    d = dl.model_dump()
    await db.delay_logs.insert_one(d)
    del d["_id"]
    return d

@api_router.post("/delays/{delay_id}/complete")
async def complete_delay(delay_id: str):
    await db.delay_logs.update_one({"id": delay_id}, {"$set": {"completed": True}})
    doc = await db.delay_logs.find_one({"id": delay_id}, {"_id": 0})
    return doc or {"error": "Not found"}

@api_router.get("/delays/streak")
async def delay_streak():
    total = await db.delay_logs.count_documents({"completed": True})
    today_total = await db.delay_logs.count_documents({"completed": True, "date": today_str()})
    return {"total_completed": total, "today_completed": today_total}

@api_router.get("/analytics/summary")
async def analytics_summary():
    now = datetime.now(timezone.utc)
    d30 = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    d7 = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    t = now.strftime("%Y-%m-%d")
    y = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    logs = await db.daily_logs.find({"date": {"$gte": d30}}, {"_id": 0}).sort("date", 1).to_list(1000)
    settings = await get_or_create_settings()
    price = settings.get("cigarette_price", 0.50)

    total_30 = sum(entry["count"] for entry in logs)
    week_logs = [entry for entry in logs if entry["date"] >= d7]
    total_7 = sum(entry["count"] for entry in week_logs)

    today_log = next((entry for entry in logs if entry["date"] == t), None)
    today_count = today_log["count"] if today_log else 0
    yesterday_log = next((entry for entry in logs if entry["date"] == y), None)
    yesterday_count = yesterday_log["count"] if yesterday_log else 0

    avg = round(total_30 / max(len(logs), 1), 1)
    delays = await db.delay_logs.count_documents({"completed": True})

    return {
        "today": today_count,
        "yesterday": yesterday_count,
        "difference": yesterday_count - today_count,
        "weekly_total": total_7,
        "monthly_total": total_30,
        "daily_average": avg,
        "money_spent_weekly": round(total_7 * price, 2),
        "money_spent_monthly": round(total_30 * price, 2),
        "currency": settings.get("currency", "USD"),
        "delay_streak": delays,
        "daily_data": logs,
    }

@api_router.post("/seed")
async def seed_data():
    """Seed sample data for the last 14 days for testing."""
    import random
    now = datetime.now(timezone.utc)
    seeded = 0
    for i in range(14, 0, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        existing = await db.daily_logs.find_one({"date": d})
        if not existing:
            c = random.randint(2, 15)
            log = DailyLog(date=d, count=c)
            ld = log.model_dump()
            await db.daily_logs.insert_one(ld)
            seeded += 1
    return {"seeded_days": seeded}

@api_router.post("/logs/reset-today")
async def reset_today():
    d = today_str()
    await db.daily_logs.update_one(
        {"date": d},
        {"$set": {"count": 0, "events": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return await get_or_create_log(d)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
