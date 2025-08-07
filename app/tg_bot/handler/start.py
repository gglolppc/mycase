from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message, KeyboardButton, ReplyKeyboardMarkup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.exceptions import TelegramBadRequest
from app.tg_bot.db.database import DbOrder, DbUser

start_router = Router()

@start_router.message(CommandStart())
async def start_handler(message: Message, **kwargs):
    import logging
    logging.warning("🔥 START_HANDLER DUMMY TRIGGERED")
    try:
        await message.answer("✅ Я жив, брат!")
    except Exception as e:
        logging.exception("💥 Exception in dummy handler: %s", e)