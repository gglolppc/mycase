from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

info_router = Router()

@info_router.message(Command("info"))
async def info_command(message: Message):
    await message.answer(
        "<b>💰 Цена</b>\n"
        "• Чехол с вашим фото, рисунком или текстом — <b>200 лей</b>\n\n"
        "<b>🛠 Срок изготовления</b>\n"
        "• Готов за <b>1–2 дня</b>\n\n"
        "<b>🚚 Доставка</b>\n"
        "• Курьер по Кишиневу — <b>50 лей</b>\n"
        "• В другие города и сёла — <b>почтой</b> (забор с отделения)\n"
        "• <b>Самовывоз</b> — bd. Moscova 11 / Kiev 12, Кишинев (Рышкановка)\n\n"
        "<b>💵 Оплата</b>\n"
        "• <b>При получении</b> — курьеру или на почте", parse_mode="HTML"
    )