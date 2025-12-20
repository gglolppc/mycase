import logging
from datetime import datetime
import os
from sqlalchemy.exc import IntegrityError, DataError
import aiofiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import send_order_to_telegram
from app.db.database import Order, get_session
from app.models import OrderModel
from typing import List

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

UPLOAD_DIR = "uploads"

# Создаем папку при старте скрипта (синхронно ок)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/termos", response_class=HTMLResponse)
async def termos_page(request: Request):
    return templates.TemplateResponse("termos.html", {"request": request})


@router.post("/order-termos")
async def receive_termos_order(
    session: AsyncSession = Depends(get_session),
    order_data: OrderModel = Depends(OrderModel.as_form),
    comment: str = Form(""),

    termos_size: str = Form("500"),           # "500" | "750"
    termos_color: str = Form("black"),        # "black" etc
    termos_text: str = Form("NUMELE"),
    termos_font: str = Form("Poppins, sans-serif"),
    termos_text_color: str = Form("#ffffff"),

    design_image: UploadFile = File(...),
    files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(x for x in (order_data.name or "") if x.isalnum()) or "client"
    order_folder = f"{safe_name}_{timestamp}"
    order_dir = os.path.join(UPLOAD_DIR, order_folder)
    os.makedirs(order_dir, exist_ok=True)

    # main design png
    design_path = os.path.join(order_dir, "design.png")
    async with aiofiles.open(design_path, "wb") as f:
        content = await design_image.read()
        await f.write(content)

    design_url = f"/uploads/{order_folder}/design.png"

    # extra files
    file_paths = []
    for idx, file in enumerate(files):
        if not file.filename:
            continue
        path = os.path.join(order_dir, f"user_{idx}_{file.filename}")
        async with aiofiles.open(path, "wb") as out_file:
            while chunk := await file.read(1024 * 1024):
                await out_file.write(chunk)
        file_paths.append(path)

    # DB save (без миграций: пишем в ту же таблицу Order)
    try:
        new_order = Order(
            c_name=order_data.name,
            phone_number=order_data.phone,
            address=order_data.address,

            brand="termos",
            phone_model=f"{termos_size}_{termos_color}",
            design_url=design_url
        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        logging.error(f"DB Error (termos): {e}")
        raise HTTPException(status_code=400, detail="Ошибка сохранения заказа в БД")

    # Telegram
    try:
        await send_order_to_telegram(
            {
                "type": "TERMOS",
                "name": order_data.name,
                "phone": order_data.phone,
                "address": order_data.address,
                "comment": comment,

                "termos_size": termos_size,
                "termos_color": termos_color,
                "termos_text": termos_text,
                "termos_font": termos_font,
                "termos_text_color": termos_text_color,
            },
            design_path=design_path,
            file_paths=file_paths
        )
    except Exception as e:
        logging.error(f"Telegram send error (termos): {e}")

    return {"message": "Thermos order received"}