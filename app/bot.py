import logging
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
from typing import List, Optional
import os
from telegram.constants import ParseMode




async def send_order_to_telegram(
    data: dict,
    design_path: Optional[str] = None,
    file_paths: Optional[List[str]] = None,
):
    if file_paths is None:
        file_paths = []

    order_type = data.get("order_type", "custom")  # custom | ready | termos

    # ================= TEXT =================
    if order_type == "termos":
        text = (
            f"<b>🧴 Новый заказ TERMOS</b>\n\n"
            f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
            f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
            f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n\n"
            f"<b>Объем:</b> {escape_html(str(data.get('termos_size', '')))} ml\n"
            f"<b>Цвет:</b> {escape_html(str(data.get('termos_color', '')))}\n"
            f"<b>Текст:</b> {escape_html(str(data.get('termos_text', '')))}\n"
            f"<b>Шрифт:</b> {escape_html(str(data.get('termos_font', '')))}\n"
            f"<b>Цвет текста:</b> {escape_html(str(data.get('termos_text_color', '')))}\n"
        )

        if data.get("comment"):
            text += f"\n<b>Комментарий:</b> {escape_html(data.get('comment'))}\n"

    elif order_type == "ready":
        text = (
            f"<b>🎨 Новый заказ (READY DESIGN)</b>\n\n"
            f"<b>Дизайн:</b> {escape_html(data.get('design_title', ''))}\n"
            f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
            f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
            f"<b>Марка:</b> {escape_html(data.get('brand', ''))}\n"
            f"<b>Модель:</b> {escape_html(data.get('model', ''))}\n"
            f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n"
            f"<b>Дизайн фото:</b> {escape_html(data.get('design_url', ''))}\n"
        )

        if data.get("comment"):
            text += f"<b>Персонализация:</b> {escape_html(data.get('comment'))}\n"

    else:
        # CUSTOM / CANVAS
        text = (
            f"<b>📦 Новый заказ</b>\n\n"
            f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
            f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
            f"<b>Марка:</b> {escape_html(data.get('brand', ''))}\n"
            f"<b>Модель:</b> {escape_html(data.get('model', ''))}\n"
            f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n"
        )

        if data.get("comment"):
            text += f"<b>Комментарий:</b> {escape_html(data.get('comment'))}\n"

    # ================= DESIGN PHOTO =================
    photo_sent = False

    if design_path:
        try:
            # URL → Telegram сам загрузит
            if design_path.startswith("http"):
                await bot.send_photo(
                    chat_id=TELEGRAM_CHAT_ID,
                    photo=design_path,
                    caption=text,
                    parse_mode=ParseMode.HTML,
                )
                photo_sent = True

            # Local file
            elif os.path.exists(design_path):
                with open(design_path, "rb") as photo:
                    await bot.send_photo(
                        chat_id=TELEGRAM_CHAT_ID,
                        photo=photo,
                        caption=text,
                        parse_mode=ParseMode.HTML,
                    )
                photo_sent = True

        except Exception as e:
            logging.error(f"Telegram photo send error: {e}")

    # если фото не отправилось — просто текст
    if not photo_sent:
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=text + "\n⚠️ Дизайн без изображения",
            parse_mode=ParseMode.HTML,
        )

    # ================= EXTRA FILES (ONLY CUSTOM) =================
    for path in file_paths:
        if path and os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    await bot.send_document(
                        chat_id=TELEGRAM_CHAT_ID,
                        document=f,
                        caption=f"<b>Файл:</b> {escape_html(os.path.basename(path))}",
                        parse_mode=ParseMode.HTML,
                    )
            except Exception as e:
                logging.error(f"Telegram document send error: {e}")
