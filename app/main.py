import os
import logging
import aiofiles  # <--- Нужно установить: pip install aiofiles
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

from aiogram import Dispatcher, types
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, HTTPException, APIRouter
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.sessions import SessionMiddleware

from app.bot import send_order_to_telegram
from app.db.database import get_session, Order
from app.models import OrderModel
from app.tg_bot.bot_init import tg_bot
from app.tg_bot.db.database import DbSessionMiddleware
from app.tg_bot.handler import order, delete, start, info

from app.admin.router import router as admin_router

load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO)

WEBHOOK_PATH = "/webhook"
WEBHOOK_URL = f"https://mycase.md{WEBHOOK_PATH}"
UPLOAD_DIR = "uploads"

# Создаем папку при старте скрипта (синхронно ок)
os.makedirs(UPLOAD_DIR, exist_ok=True)

dp = Dispatcher(storage=MemoryStorage())
dp.update.middleware(DbSessionMiddleware())
dp.include_router(order.order_router)
dp.include_router(start.start_router)
dp.include_router(delete.delete_router)
dp.include_router(info.info_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await tg_bot.set_webhook(WEBHOOK_URL)
    logging.info("✅ Webhook установлен")
    yield
    await tg_bot.delete_webhook()
    logging.info("🧹 Webhook удалён")


app = FastAPI(lifespan=lifespan)
templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "dev_only_change_me"),
    same_site="lax",
    https_only=False,   # если у тебя HTTPS (на проде да). Если пока нет — поставь False.
)

app.include_router(admin_router)

# --- WEBHOOK ---
webhook_router = APIRouter()


@webhook_router.post(WEBHOOK_PATH)
async def telegram_webhook(request: Request):
    try:
        # FastAPI сам распарсит JSON асинхронно
        update_data = await request.json()

        # Преобразуем dict в объект Update aiogram
        update = types.Update(**update_data)

        # Передаем в диспетчер
        await dp.feed_update(bot=tg_bot, update=update)

        return {"status": "ok"}
    except Exception as e:
        logging.exception("💥 Webhook error: %s", e)
        # Возвращаем 200, чтобы Telegram не долбил повторными запросами при ошибке в коде
        return {"status": "error", "message": str(e)}


app.include_router(webhook_router)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# === ЗАКАЗ ===
@app.post("/order")
async def receive_order(
        session: AsyncSession = Depends(get_session),
        order_data: OrderModel = Depends(OrderModel.as_form),
        # Переименовал переменную, чтобы не путать с модулем order
        comment: str = Form(""),
        brand: str = Form(""),
        model: str = Form(""),
        design_image: UploadFile = File(...),
        files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Используем ID или имя, чистим от спецсимволов по хорошему
    safe_name = "".join(x for x in order_data.name if x.isalnum())
    order_folder = f"{safe_name}_{timestamp}"
    order_dir = os.path.join(UPLOAD_DIR, f"{safe_name}_{timestamp}")

    # os.makedirs блокирующий, но быстрый. Для идеала можно aiofiles.os.makedirs, но и так сойдет
    os.makedirs(order_dir, exist_ok=True)

    # 1. Асинхронное сохранение дизайна
    design_path = os.path.join(order_dir, "design.png")
    async with aiofiles.open(design_path, "wb") as f:
        content = await design_image.read()
        await f.write(content)
    design_url = f"/uploads/{order_folder}/design.png"
    # 2. Асинхронное сохранение файлов
    file_paths = []
    for idx, file in enumerate(files):
        if not file.filename: continue  # Пропуск пустых
        path = os.path.join(order_dir, f"user_{idx}_{file.filename}")
        async with aiofiles.open(path, "wb") as out_file:
            while content := await file.read(1024 * 1024):  # Читаем кусками по 1Мб (если файлы большие)
                await out_file.write(content)
        file_paths.append(path)

    # 3. Сначала пишем в БД (чтобы ID заказа получить или гарантировать сохранность)
    try:
        new_order = Order(
            c_name=order_data.name,
            phone_number=order_data.phone,
            address=order_data.address,
            brand=brand,
            phone_model=model,
            design_url=design_url
        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        logging.error(f"DB Error: {e}")
        raise HTTPException(status_code=400, detail="Ошибка сохранения заказа в БД")

    # 4. Отправляем в Telegram
    # Лучше обернуть в try/except, чтобы ошибка ТГ не крашила ответ юзеру, если заказ уже в базе
    try:
        await send_order_to_telegram(
            {
                "name": order_data.name,
                "phone": order_data.phone,
                "brand": brand,
                "model": model,
                "address": order_data.address,
                "comment": comment,
            },
            design_path=design_path,
            file_paths=file_paths
        )
    except Exception as e:
        logging.error(f"Telegram send error: {e}")
        # Можно вернуть warning, но заказ принят

    return {"message": "Order received"}

@app.get("/termos", response_class=HTMLResponse)
async def termos_page(request: Request):
    return templates.TemplateResponse("termos.html", {"request": request})


@app.post("/order-termos")
async def receive_termos_order(
    session: AsyncSession = Depends(get_session),
    order_data: OrderModel = Depends(OrderModel.as_form),
    comment: str = Form(""),

    termos_size: str = Form("500"),           # "500" | "750"
    termos_color: str = Form("black"),        # "black" etc
    termos_text: str = Form("NUMELE"),
    termos_font: str = Form("Poppins, sans-serif"),
    termos_text_color: str = Form("#ffffff"),

    design_image: UploadFile = File(...),
    files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(x for x in (order_data.name or "") if x.isalnum()) or "client"
    order_folder = f"{safe_name}_{timestamp}"
    order_dir = os.path.join(UPLOAD_DIR, order_folder)
    os.makedirs(order_dir, exist_ok=True)

    # main design png
    design_path = os.path.join(order_dir, "design.png")
    async with aiofiles.open(design_path, "wb") as f:
        content = await design_image.read()
        await f.write(content)

    design_url = f"/uploads/{order_folder}/design.png"

    # extra files
    file_paths = []
    for idx, file in enumerate(files):
        if not file.filename:
            continue
        path = os.path.join(order_dir, f"user_{idx}_{file.filename}")
        async with aiofiles.open(path, "wb") as out_file:
            while chunk := await file.read(1024 * 1024):
                await out_file.write(chunk)
        file_paths.append(path)

    # DB save (без миграций: пишем в ту же таблицу Order)
    try:
        new_order = Order(
            c_name=order_data.name,
            phone_number=order_data.phone,
            address=order_data.address,

            brand="termos",
            phone_model=f"{termos_size}_{termos_color}",
            design_url=design_url
        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        logging.error(f"DB Error (termos): {e}")
        raise HTTPException(status_code=400, detail="Ошибка сохранения заказа в БД")

    # Telegram
    try:
        await send_order_to_telegram(
            {
                "type": "TERMOS",
                "name": order_data.name,
                "phone": order_data.phone,
                "address": order_data.address,
                "comment": comment,

                "termos_size": termos_size,
                "termos_color": termos_color,
                "termos_text": termos_text,
                "termos_font": termos_font,
                "termos_text_color": termos_text_color,
            },
            design_path=design_path,
            file_paths=file_paths
        )
    except Exception as e:
        logging.error(f"Telegram send error (termos): {e}")

    return {"message": "Thermos order received"}