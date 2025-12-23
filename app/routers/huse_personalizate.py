import logging
from datetime import datetime
import os
from sqlalchemy.exc import IntegrityError, DataError
import aiofiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import  Request, Form, UploadFile, File, Depends, HTTPException, APIRouter
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


@router.get("/huse_personalizate", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("huse_personalizate.html", {"request": request})


# === ЗАКАЗ ===
@router.post("/order")
async def receive_order(
        session: AsyncSession = Depends(get_session),
        order_data: OrderModel = Depends(OrderModel.as_form),
        # Переименовал переменную, чтобы не путать с модулем order
        comment: str = Form(""),
        brand: str = Form(""),
        model: str = Form(""),
        design_image: UploadFile = File(...),
        files: List[UploadFile] = File(default=[])
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Используем ID или имя, чистим от спецсимволов по хорошему
    safe_name = "".join(x for x in order_data.name if x.isalnum())
    order_folder = f"{safe_name}_{timestamp}"
    order_dir = os.path.join(UPLOAD_DIR, f"{safe_name}_{timestamp}")

    # os.makedirs блокирующий, но быстрый. Для идеала можно aiofiles.os.makedirs, но и так сойдет
    os.makedirs(order_dir, exist_ok=True)

    # 1. Асинхронное сохранение дизайна
    design_path = os.path.join(order_dir, "design.png")
    async with aiofiles.open(design_path, "wb") as f:
        content = await design_image.read()
        await f.write(content)
    design_url = f"/uploads/{order_folder}/design.png"
    # 2. Асинхронное сохранение файлов
    file_paths = []
    for idx, file in enumerate(files):
        if not file.filename: continue  # Пропуск пустых
        path = os.path.join(order_dir, f"user_{idx}_{file.filename}")
        async with aiofiles.open(path, "wb") as out_file:
            while content := await file.read(1024 * 1024):  # Читаем кусками по 1Мб (если файлы большие)
                await out_file.write(content)
        file_paths.append(path)

    # 3. Сначала пишем в БД (чтобы ID заказа получить или гарантировать сохранность)
    try:
        new_order = Order(
            c_name=order_data.name,
            phone_number=order_data.phone,
            address=order_data.address,
            brand=brand,
            phone_model=model,
            design_url=design_url
        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        logging.error(f"DB Error: {e}")
        raise HTTPException(status_code=400, detail="Ошибка сохранения заказа в БД")

    # 4. Отправляем в Telegram
    # Лучше обернуть в try/except, чтобы ошибка ТГ не крашила ответ юзеру, если заказ уже в базе
    try:
        await send_order_to_telegram(
            {
                "name": order_data.name,
                "phone": order_data.phone,
                "brand": brand,
                "model": model,
                "address": order_data.address,
                "comment": comment,
            },
            design_path=design_path,
            file_paths=file_paths
        )
    except Exception as e:
        logging.error(f"Telegram send error: {e}")
        # Можно вернуть warning, но заказ принят

    return {"message": "Order received"}