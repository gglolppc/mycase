import os
from dotenv import load_dotenv
import telegram
from typing import List
load_dotenv()

TELEGRAM_TOKEN = os.getenv("TG_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TG_CHAT_ID")


bot = telegram.Bot(token=TELEGRAM_TOKEN)
def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
    )

# === ОТПРАВКА В TELEGRAM ===
async def send_order_to_telegram(
    data: dict,
    design_path: str | None = None,
    file_paths: List[str] = None
):
    if file_paths is None:
        file_paths = []

    # --- TEXT ---
    if data.get("type") == "TERMOS":
        text = (
            f"<b>🧴 Новый заказ TERMOS</b>\n\n"
            f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
            f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
            f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n"
        )
        if data.get("comment"):
            text += f"<b>Комментарий:</b> {escape_html(data.get('comment', ''))}\n"

        text += (
            "\n"
            f"<b>Объем:</b> {escape_html(str(data.get('termos_size', '')))} ml\n"
            f"<b>Цвет:</b> {escape_html(str(data.get('termos_color', '')))}\n"
            f"<b>Текст:</b> {escape_html(str(data.get('termos_text', '')))}\n"
            f"<b>Шрифт:</b> {escape_html(str(data.get('termos_font', '')))}\n"
            f"<b>Цвет текста:</b> {escape_html(str(data.get('termos_text_color', '')))}\n"
        )

    else:
        text = (
            f"<b>📦 Новый заказ</b>\n\n"
            f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
            f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
            f"<b>Марка:</b> {escape_html(data.get('brand', ''))}\n"
            f"<b>Модель:</b> {escape_html(data.get('model', ''))}\n"
            f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n"
        )
        if data.get("comment"):
            text += f"<b>Комментарий:</b> {escape_html(data.get('comment', ''))}\n"

    # --- DESIGN (photo) ---
    if design_path and os.path.exists(design_path):
        with open(design_path, "rb") as photo:
            await bot.send_photo(
                chat_id=TELEGRAM_CHAT_ID,
                photo=photo,
                caption=text,
                parse_mode=telegram.constants.ParseMode.HTML
            )
    else:
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=text + "\n⚠️ Дизайн-файл отсутствует.",
            parse_mode=telegram.constants.ParseMode.HTML
        )

    # --- EXTRA FILES ---
    for path in file_paths:
        if os.path.exists(path):
            filename = os.path.basename(path)
            with open(path, "rb") as f:
                await bot.send_document(
                    chat_id=TELEGRAM_CHAT_ID,
                    document=f,
                    caption=f"<b>Файл:</b> {escape_html(filename)}",
                    parse_mode=telegram.constants.ParseMode.HTML
                )