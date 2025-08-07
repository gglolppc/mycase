
from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message, KeyboardButton, ReplyKeyboardMarkup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.exceptions import TelegramBadRequest
from app.tg_bot.db.database import DbOrder, DbUser

start_router = Router()

@start_router.message(CommandStart())
async def start_handler(message: Message, command: CommandObject, data: dict):
    try:
        session: AsyncSession = data["session"]

        user = message.from_user
        query = select(DbUser).where(DbUser.tg_id == user.id)
        result = await session.execute(query)
        existing_user = result.scalar_one_or_none()

        if not existing_user:
            new_user = DbUser(
                tg_id=user.id,
                c_name=user.full_name,
                language=user.language_code
            )
            session.add(new_user)
            await session.commit()

        if not command.args:
            await message.answer(
                "👋 Привет! Я MYCASE бот — делаю чехлы на заказ.\n\n"
                "💰 Цена, 🚚 Доставка — /info\n"
                "📱 Заказать чехол — /order\n"
                "🗂 Мои заказы — /my_orders\n"
                "🧹 Отменить заказ — /clear\n"
                "🔄 Перезапустить бота — /start"
            )
            return

        if command.args.startswith("check_"):
            try:
                order_id = int(command.args.replace("check_", ""))
                user_id = message.from_user.id
                query = select(DbOrder).where(DbOrder.id == order_id)
                result = (await session.execute(query)).scalar_one_or_none()

                if result and result.user_id == user_id:
                    photo = result.file_id
                    try:
                        await message.answer_document(photo, caption=f"📱 Модель: {result.phone_model}\n📦 Адрес: {result.address}\n🗓 Дата: {result.order_date.date()}")
                    except TelegramBadRequest:
                        await message.answer_photo(photo, caption=f"📱 Модель: {result.phone_model}\n📦 Адрес: {result.address}\n🗓 Дата: {result.order_date.date()}")
                else:
                    await message.answer("Неверный ID заказа")
            except (KeyError, ValueError):
                await message.answer("Ошибка, введите еще раз.")
    except Exception as e:
        import logging
        logging.exception("💥 Ошибка в start_handler: %s", e)
        await message.answer("❌ Внутренняя ошибка. Попробуйте позже.")