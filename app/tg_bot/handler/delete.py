import os


from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import StatesGroup, State
from dotenv import load_dotenv
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.tg_bot.db.database import DbOrder
from sqlalchemy import delete, select

load_dotenv()
delete_router = Router()
ADMIN = os.getenv("ADMIN")
@delete_router.message(Command("delete"))
async def delete_orders(message: Message,   session: AsyncSession):
    user_id = message.from_user.id
    if str(user_id) == str(ADMIN):
        try:
            query = delete(DbOrder)
            await session.execute(query)
            await session.commit()
            await message.answer("SUCCESS")
        except IntegrityError:
            await session.rollback()
    else:
        await message.answer("NO WAY")
        await message.answer(f"{user_id}")

class GetOrder(StatesGroup):
    get_order_by_id = State()

@delete_router.message(Command("getorder"))
async def ger_order (message: Message, state : FSMContext):
    await message.answer("ИД заказа")
    await state.set_state(GetOrder.get_order_by_id)


@delete_router.message(GetOrder.get_order_by_id)
async def get_orders(message: Message, session: AsyncSession):
    order_id = message.text
    user_id = message.from_user.id
    if str(user_id) == str(ADMIN):
        try:
            query = select(DbOrder).where(DbOrder.id == int(order_id))
            result = (await session.execute(query)).scalar_one_or_none()
            if result:
                photo = result.file_id
                try:
                    await message.answer_document(photo,
                                                  caption=f"📱 Модель: {result.phone_model}\n📦 Адрес: {result.address}\n🗓 Дата: {result.order_date.date()}")
                except TelegramBadRequest:
                    await message.answer_photo(photo,
                                               caption=f"📱 Модель: {result.phone_model}\n📦 Адрес: {result.address}\n🗓 Дата: {result.order_date.date()}")


            else:
                await message.answer("Заказы не найдены")
        except (KeyError, ValueError):
            await message.answer("Ошибка БД")

@delete_router.message(Command("clear"))
async def clear_status(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Бот сброшен, введите команду")
