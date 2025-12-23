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
from app.db.database import Order, Designs  # твоя модель Order


router = APIRouter(prefix="/admin", tags=["admin"])
templates = Jinja2Templates(directory="app/templates/admin")


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
            "active_page": "orders",
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
        {
            "request": request,
            "order": order,
            "active_page": "orders",
        },
    )

@router.get("/designs", include_in_schema=False)
async def admin_designs(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    stmt = select(Designs).order_by(Designs.created_at.desc(), Designs.id.desc())
    items = (await session.execute(stmt)).scalars().all()

    return templates.TemplateResponse(
        "admin_designs.html",
        {
            "request": request,
            "items": items,
            "active_page": "designs",
        },
    )

@router.get("/designs/new", include_in_schema=False)
async def admin_design_new_page(
    request: Request,
    _=Depends(require_admin),
):
    return templates.TemplateResponse(
        "admin_design_form.html",
        {
            "request": request,
            "active_page": "designs",
            "mode": "new",
            "design": None,
            "error": None,
        },
    )


@router.post("/designs/new", include_in_schema=False)
async def admin_design_new(
    request: Request,
    category: str = Form(...),
    brand: str = Form(""),
    title: str = Form(...),
    slug: str = Form(...),
    image_url: str = Form(...),
    price_mdl: int = Form(...),
    is_active: bool = Form(False),
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    slug = slug.strip()
    title = title.strip()
    category = category.strip()
    brand = brand.strip() or None
    image_url = image_url.strip()

    # проверка уникальности slug
    exists_stmt = select(Designs.id).where(Designs.slug == slug)
    exists = (await session.execute(exists_stmt)).scalar_one_or_none()
    if exists:
        return templates.TemplateResponse(
            "admin_design_form.html",
            {
                "request": request,
                "active_page": "designs",
                "mode": "new",
                "design": None,
                "error": "Slug deja există. Alege alt slug.",
            },
            status_code=400,
        )

    d = Designs(
        category=category,
        brand=brand,
        title=title,
        slug=slug,
        image_url=image_url,
        price_mdl=price_mdl,
        is_active=is_active,
    )

    session.add(d)
    await session.commit()

    return RedirectResponse(url="/admin/designs", status_code=303)

@router.get("/designs/{design_id}/edit", include_in_schema=False)
async def admin_design_edit_page(
    request: Request,
    design_id: int,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    design = await session.get(Designs, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    return templates.TemplateResponse(
        "admin_design_form.html",
        {
            "request": request,
            "active_page": "designs",
            "mode": "edit",
            "design": design,
            "error": None,
        },
    )


@router.post("/designs/{design_id}/edit", include_in_schema=False)
async def admin_design_edit(
    request: Request,
    design_id: int,
    category: str = Form(...),
    brand: str = Form(""),
    title: str = Form(...),
    slug: str = Form(...),
    image_url: str = Form(...),
    price_mdl: int = Form(...),
    is_active: bool = Form(False),
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    design = await session.get(Designs, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    slug = slug.strip()
    title = title.strip()
    category = category.strip()
    brand = brand.strip() or None
    image_url = image_url.strip()

    # slug уникален, кроме текущей записи
    exists_stmt = select(Designs.id).where(Designs.slug == slug, Designs.id != design_id)
    exists = (await session.execute(exists_stmt)).scalar_one_or_none()
    if exists:
        return templates.TemplateResponse(
            "admin_design_form.html",
            {
                "request": request,
                "active_page": "designs",
                "mode": "edit",
                "design": design,
                "error": "Slug deja există. Alege alt slug.",
            },
            status_code=400,
        )

    design.category = category
    design.brand = brand
    design.title = title
    design.slug = slug
    design.image_url = image_url
    design.price_mdl = price_mdl
    design.is_active = is_active

    await session.commit()
    return RedirectResponse(url="/admin/designs", status_code=303)


@router.post("/designs/{design_id}/delete", include_in_schema=False)
async def admin_design_delete(
    request: Request,
    design_id: int,
    session: AsyncSession = Depends(get_async_session),
    _=Depends(require_admin),
):
    design = await session.get(Designs, design_id)
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    await session.delete(design)
    await session.commit()

    return RedirectResponse(url="/admin/designs", status_code=303)
