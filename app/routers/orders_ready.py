import logging

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.bot import send_order_to_telegram
from app.db.database import get_async_session, Order, Designs

router = APIRouter()

def make_abs_url(request: Request, path: str) -> str:
    if not path:
        return ""
    if path.startswith("http"):
        return path
    return str(request.base_url).rstrip("/") + path


@router.post("/order/ready", include_in_schema=False)
async def create_ready_order(
    request: Request,
    design_id: int = Form(...),
    brand: str = Form(...),
    phone_model: str = Form(...),

    personal_text: str = Form(""),

    name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),

    session: AsyncSession = Depends(get_async_session),
):
    # 1) проверяем дизайн
    stmt = select(Designs).where(Designs.id == design_id, Designs.is_active == True)
    design = (await session.execute(stmt)).scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    # 2) чистим ввод
    personal_text = personal_text.strip() or None

    # необязательно, но полезно: лимит
    if personal_text and len(personal_text) > 30:
        personal_text = personal_text[:30]

    # 3) создаём заказ
    new_order = Order(
        c_name=name.strip(),
        phone_number=phone.strip(),
        address=address.strip(),
        brand=brand.strip(),
        phone_model=phone_model.strip(),

        order_kind="ready",
        design_id=design.id,
        personal_text=personal_text,

        status="pending",
        design_url=None,
    )
    session.add(new_order)
    await session.commit()
    design_url = make_abs_url(request, design.image_url)
    try:
        await send_order_to_telegram(
            {
                "order_type": "ready",
                "name": name,
                "phone": phone,
                "brand": brand,
                "model": phone_model,
                "address": address,
                "comment": personal_text,
                "design_title": design.title,
                "design_url": design_url,
            },
        )
    except Exception as e:
        logging.error(f"Telegram send error: {e}")

    # 4) редирект обратно на страницу дизайна (или на /, как хочешь)
    return RedirectResponse(url=f"/designuri/{design.slug}?ok=1", status_code=303)
