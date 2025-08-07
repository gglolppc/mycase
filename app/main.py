import shutil
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List
import os
from aiogram import Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware

from app.bot import send_order_to_telegram
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, Response, HTTPException, APIRouter
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from app.models import OrderModel
from dotenv import load_dotenv
from app.db.database import get_session, Order
from app.tg_bot.db.database import DbSessionMiddleware
from app.tg_bot.handler import order, delete, start, info
from app.tg_bot.bot_init import tg_bot
import json, logging

load_dotenv()

WEBHOOK_PATH = "/webhook"
WEBHOOK_URL = f"https://mycase.md{WEBHOOK_PATH}"

# Инициализация aiogram
dp = Dispatcher(storage=MemoryStorage())
dp.update.middleware(DbSessionMiddleware())
dp.include_router(order.order_router)
dp.include_router(start.start_router)
dp.include_router(delete.delete_router)
dp.include_router(info.info_router)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await tg_bot.set_webhook(WEBHOOK_URL)
    print("✅ Webhook установлен")
    yield
    await tg_bot.delete_webhook()
    print("🧹 Webhook удалён")

app = FastAPI(lifespan=lifespan)

# Middleware на ограничение размера запроса
class LimitRequestSize(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int = 5_000_000):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        raw = await request.body()
        if len(raw) > self.max_bytes:
            return Response(status_code=413)
        request.state.raw_body = raw
        return await call_next(request)

app.add_middleware(LimitRequestSize)

# --- WEBHOOK ---
router = APIRouter()

@router.post(WEBHOOK_PATH)
async def telegram_webhook(request: Request) -> Response:
    raw = getattr(request.state, "raw_body", None)
    if raw is None:
        raw = await request.body()

    try:
        update: dict = json.loads(raw)
    except Exception as e:
        logging.exception("Bad JSON %s", e)
        return Response(status_code=400)

    logging.debug("Update parsed ok, type=%s", type(update))

    ok = await dp.feed_webhook_update(
        bot=tg_bot,
        update=update,
        headers=dict(request.headers),
    )

    return Response(status_code=200 if ok else 500)

app.include_router(router)  # <-- Подключаем ПОСЛЕ объявления маршрута

templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# === ЗАКАЗ ===
@app.post("/order")
async def receive_order(
    session: AsyncSession = Depends(get_session),
    order: OrderModel = Depends(OrderModel.as_form),
    comment: str = Form(""),
    brand: str = Form(""),
    model: str = Form(""),
    design_image: UploadFile = File(...),
    files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    order_dir = os.path.join(UPLOAD_DIR, f"{order.name}_{timestamp}")
    os.makedirs(order_dir, exist_ok=True)

    # Сохраняем дизайн
    design_path = os.path.join(order_dir, "design.png")
    with open(design_path, "wb") as f:
        shutil.copyfileobj(design_image.file, f)

    # Сохраняем остальные файлы
    file_paths = []
    for idx, file in enumerate(files):
        path = os.path.join(order_dir, f"user_file_{idx}_{file.filename}")
        with open(path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
        file_paths.append(path)

    # Отправляем заказ в Telegram
    await send_order_to_telegram(
        {
            "name": order.name,
            "phone": order.phone,
            "brand": brand,
            "model": model,
            "address": order.address,
            "comment": comment,
        },
        design_path=design_path,
        file_paths=file_paths
    )
    try:
        new_order = Order(
            c_name=order.name,
            phone_number=order.phone,
            address=order.address,
            brand=brand,
            phone_model=model,
            design_url=design_path

        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Order received"}
