import os

from aiogram import Router, F
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.filters import Command
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.ext.asyncio import AsyncSession

from app.tg_bot.bot_init import tg_bot
from app.tg_bot.db.database import DbOrder


BOT_USERNAME = os.environ.get("BOT_USERNAME")
ADMIN = os.environ.get("ADMIN")
order_router = Router()


class Order(StatesGroup):
    waiting_model = State()
    waiting_photo = State()
    waiting_address = State()
    complete = State()
class Status(StatesGroup):
    check_status = State()
class OrderCheck(StatesGroup):
    check_status = State()
class MyOrders(StatesGroup):
    get_orders = State()


@order_router.message(Command("order"))
async def get_model(message: Message, state: FSMContext):
    await message.answer("Напишите вашу марку и модель телефона.")
    await state.set_state(Order.waiting_model)

@order_router.message(Order.waiting_model)
async def get_photo(message: Message, state: FSMContext):
    try:
        if message.text.startswith("/"):
            await state.clear()
            await message.answer("Модель не должна начинаться с символа /  для заказа начните заного /order")
            return
        await state.update_data(model=message.text)
        await state.update_data(user_id=message.from_user.id)
        await state.update_data(user_name=message.from_user.full_name)
        await message.answer("Отправьте желаемое фото.")
        await state.set_state(Order.waiting_photo)
    except AttributeError:
        await message.answer("Ошибка, укажите модель телефона написав его текстом, начните заного /order")
        await state.clear()

@order_router.message(Order.waiting_photo)
async def get_address(message: Message, state: FSMContext):
    document = message.document

    if document:
        mime_type = message.document.mime_type
        await state.update_data(photo_id=message.document.file_id)
        await state.set_state(Order.waiting_address)
        await message.answer("Данные для доставки.")


    else:
        text = message.text
        if text:
            if message.text.lower() == 'cancel':
                await state.clear()
                await message.answer("Заказ отменен")
                return
            await message.answer("Отправьте фото, а не ссылку или текст, для отмены напишите 'cancel' ")
            await state.set_state(Order.waiting_photo)
            return
        try:
            photo = message.photo[-1]
            await state.update_data(photo_id=photo.file_id)
            await message.answer("Данные для доставки.")
            await state.set_state(Order.waiting_address)
        except NameError:
            await message.answer("bla bla bla ")
            await state.set_state(Order.waiting_photo)


@order_router.message(Order.waiting_address)
async def order_compete(message: Message, state: FSMContext):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить заказ", callback_data="confirm")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")]
    ])
    await state.update_data(address=message.text)
    data = await state.get_data()
    model = data.get("model")
    address = message.text
    file_id = data.get("photo_id")

    if file_id:
        try:
            await message.answer_document(file_id, caption=f"Модель: {model}\nАдрес: {address}\nИтого: 250 mdl", reply_markup=keyboard)
        except TelegramBadRequest:
            await message.answer_photo(file_id, caption=f"Модель: {model}\nАдрес: {address}\nИтого: 250 mdl",
                                          reply_markup=keyboard)


    else:
        await message.answer(f"Модель телефоа: {model}\nАдрес: {address}\n(Фото не найдено)\nИтого: 250 mdl")
    await state.set_state(None)

@order_router.callback_query(F.data == "confirm")
async def process_confirm(callback: CallbackQuery, state: FSMContext, session: AsyncSession):
    data = await state.get_data()
    try:
        new_order = DbOrder(
            c_name=data.get("user_name"),
            phone_number="068109777",
            address=data.get("address"),
            phone_model=data.get("model"),
            file_id=data.get("photo_id"),
            user_id=data.get("user_id"),
        )
        session.add(new_order)
        await session.commit()
        await session.refresh(new_order)
        await callback.message.edit_reply_markup()  # убираем кнопки
        await callback.message.answer(f"✅ Заказ отправлен, ID вашего заказа - {new_order.id}")
        await callback.message.answer("Мои заказы - /my_orders\nЗаказать еще /order")
        await bot.send_message(ADMIN, f"📬 Новый заказ от @{callback.from_user.username}\nID заказа: {new_order.id}")
        await state.clear()

    except (IntegrityError, DataError):
        await callback.message.answer("Ошибка, что-то пошло не так, попробуйте еще раз. /order")

@order_router.callback_query(F.data == "cancel")
async def process_cancel(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_reply_markup()
    await callback.message.delete()
    await callback.message.answer("Заказ удалён")
    await state.clear()





@order_router.message(Command("my_orders"))
async def my_orders(message: Message,  session: AsyncSession):
    try:
        user_id = message.from_user.id
        query = select(DbOrder).where(DbOrder.user_id == user_id)
        result = (await session.execute(query)).scalars().all()
        if len(result) > 0:
            order_l = ""
            for order in result:
                order_l += (
                    f"📦 <a href='https://t.me/{BOT_USERNAME}?start=check_{order.id}'><b>Заказ ID - {order.id}</b></a>\n"
                    f"📱 <b>Модель:</b> {order.phone_model}\n"
                    f"🗓 <b>Дата:</b> {order.order_date.date()}\n\n"
                )
            await message.answer(order_l, parse_mode="HTML")

        else:
            await message.answer("Заказы не найдены")
    except (KeyError, ValueError):
        await message.answer("Ошибка БД")



