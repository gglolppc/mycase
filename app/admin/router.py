from __future__ import annotations

import os
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# поменяй импорты под свои пути:
from app.db.database import get_async_session  # должна возвращать AsyncSession
from app.db.database import Order  # твоя модель Order


router = APIRouter(prefix="/admin", tags=["admin"])
templates = Jinja2Templates(directory="app/templates")


def _admin_password() -> str:
    pw = os.getenv("ADMIN_PASSWORD")
    if not pw:
        raise RuntimeError("ADMIN_PASSWORD is not set")
    return pw


def require_admin(request: Request) -> None:
    if request.session.get("is_admin") is True:
        return
    raise HTTPException(status_code=401, detail="Not authorized")


@router.get("", include_in_schema=False)
@router.get("/", include_in_schema=False)
async def admin_home(request: Request):
    # если уже залогинен — на список
    if request.session.get("is_admin") is True:
        return RedirectResponse(url="/admin/orders", status_code=303)
    return templates.TemplateResponse("admin_login.html", {"request": request, "error": None})


@router.post("/login", include_in_schema=False)
async def admin_login(request: Request, password: str = Form(...)):
    if password != _admin_password():
        return templates.TemplateResponse("admin_login.html", {"request": request, "error": "Wrong password"})
    request.session["is_admin"] = True
    return RedirectResponse(url="/admin/orders", status_code=303)


@router.post("/logout", include_in_schema=False)
async def admin_logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/admin", status_code=303)


@router.get("/orders", include_in_schema=False)
async def admin_orders(
    request: Request,
    page: int = 1,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    page_size = 20
    page = max(page, 1)
    offset = (page - 1) * page_size

    total_stmt = select(func.count(Order.id))
    total = (await session.execute(total_stmt)).scalar_one()
    pages = max(ceil(total / page_size), 1)

    orders_stmt = (
        select(Order)
        .order_by(Order.order_date.desc(), Order.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    orders = (await session.execute(orders_stmt)).scalars().all()

    return templates.TemplateResponse(
        "admin_orders.html",
        {
            "request": request,
            "orders": orders,
            "page": page,
            "pages": pages,
            "total": total,
            "page_size": page_size,
        },
    )


@router.get("/orders/{order_id}", include_in_schema=False)
async def admin_order_detail(
    request: Request,
    order_id: int,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return templates.TemplateResponse(
        "admin_order_detail.html",
        {"request": request, "order": order},
    )
