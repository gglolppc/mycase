import shutil
from datetime import datetime
from typing import List
import os

from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot import send_order_to_telegram
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, Response, HTTPException
import uvicorn
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from app.models import OrderModel
from dotenv import load_dotenv
from app.db.database import get_session, Order



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


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# === ЗАКАЗ ===
@app.post("/order")
async def receive_order(
    session: AsyncSession = Depends(get_session),
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
    try:
        new_order = Order(
            c_name=order.name,
            phone_number=order.phone,
            address=order.address,
            brand=brand,
            phone_model=model,
            design_url=design_path

        )
        session.add(new_order)
        await session.commit()
    except (IntegrityError, DataError) as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Order received"}
