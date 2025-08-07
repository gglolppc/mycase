import os

from aiogram.types import BotCommand
from dotenv import load_dotenv
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

load_dotenv()
TOKEN = os.getenv('BOT_TG_TOKEN')
tg_bot = Bot(
            token=TOKEN,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )


async def main():
    await tg_bot.set_my_commands([
        BotCommand(command="start", description="🔄 Перезапуск бота"),
        BotCommand(command="info", description="💰 Цена, 🚚 Доставка"),
        BotCommand(command="order", description="📦 Оформить новый заказ"),
        BotCommand(command="my_orders", description="🗂 Посмотреть мои заказы"),
        BotCommand(command="clear", description="🧹 Отменить и очистить данные"),


    ])