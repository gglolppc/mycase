import os
import logging

from contextlib import asynccontextmanager

from app.routers.pages import router as pages_router
from aiogram import Dispatcher, types
from aiogram.fsm.storage.memory import MemoryStorage
from dotenv import load_dotenv
from fastapi import FastAPI, Request, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from starlette.middleware.sessions import SessionMiddleware

from app.tg_bot.bot_init import tg_bot
from app.tg_bot.db.database import DbSessionMiddleware
from app.tg_bot.handler import order, delete, start, info

from app.admin.router import router as admin_router
from app.routers import termos, huse_personalizate, designs, orders_ready, router_i18n

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
    https_only=True,   # если у тебя HTTPS (на проде да). Если пока нет — поставь False.
)

app.include_router(admin_router)
app.include_router(termos.router)
app.include_router(huse_personalizate.router)
app.include_router(pages_router)
app.include_router(designs.router)
app.include_router(orders_ready.router)
app.include_router(router_i18n.router)

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