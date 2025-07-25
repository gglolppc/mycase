import shutil
from datetime import datetime
from typing import List
import os
import telegram
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, Response
import uvicorn
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from app.models import OrderModel
from dotenv import load_dotenv

load_dotenv()


app = FastAPI()
templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

MAX_REQUEST_SIZE = 50 * 1024 * 1024  # 50 MB

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    body = await request.body()
    if len(body) > MAX_REQUEST_SIZE:
        return Response("Request too large", status_code=413)
    return await call_next(request)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)



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
async def send_order_to_telegram(data: dict, design_path: str | None = None, file_paths: List[str] = []):
    text = (
        f"<b>📦 Новый заказ</b>\n\n"
        f"<b>Имя:</b> {escape_html(data.get('name', ''))}\n"
        f"<b>Телефон:</b> {escape_html(data.get('phone', ''))}\n"
        f"<b>Марка:</b> {escape_html(data.get('brand', ''))}\n"
        f"<b>Модель:</b> {escape_html(data.get('model', ''))}\n"
        f"<b>Адрес:</b> {escape_html(data.get('address', ''))}\n"
    )
    if data.get("comment"):
        text += f"<b>Комментарий:</b> {escape_html(data['comment'])}\n"

    # Отправляем дизайн
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

    # Отправляем дополнительные файлы
    for path in file_paths:
        if os.path.exists(path):
            filename = os.path.basename(path)
            with open(path, "rb") as file:
                await bot.send_document(
                    chat_id=TELEGRAM_CHAT_ID,
                    document=file,
                    caption=f"<b>Файл:</b> {escape_html(filename)}",
                    parse_mode=telegram.constants.ParseMode.HTML
                )

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# === ЗАКАЗ ===
@app.post("/order")
async def receive_order(
    order: OrderModel = Depends(OrderModel.as_form),
    comment: str = Form(""),
    brand: str = Form(""),
    model: str = Form(""),
    design_image: UploadFile = File(...),
    files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    order_dir = os.path.join(UPLOAD_DIR, f"{order.name}_{timestamp}")
    os.makedirs(order_dir, exist_ok=True)

    # Сохраняем дизайн
    design_path = os.path.join(order_dir, "design.png")
    with open(design_path, "wb") as f:
        shutil.copyfileobj(design_image.file, f)

    # Сохраняем остальные файлы
    file_paths = []
    for idx, file in enumerate(files):
        path = os.path.join(order_dir, f"user_file_{idx}_{file.filename}")
        with open(path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
        file_paths.append(path)

    # Отправляем заказ в Telegram
    await send_order_to_telegram(
        {
            "name": order.name,
            "phone": order.phone,
            "brand": brand,
            "model": model,
            "address": order.address,
            "comment": comment,
        },
        design_path=design_path,
        file_paths=file_paths
    )

    return {"message": "Order received"}
