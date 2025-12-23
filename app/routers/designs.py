# routers/designs.py
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_async_session, Designs
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

@router.get("/designuri", include_in_schema=False)
async def designs_list(
    request: Request,
    category: str | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    # категории для фильтра
    cats_stmt = (
        select(Designs.category)
        .where(
            Designs.is_active == True,
            Designs.category.is_not(None),
        )
        .distinct()
        .order_by(Designs.category)
    )
    categories = [c for c in (await session.execute(cats_stmt)).scalars().all() if c]

    # список дизайнов
    stmt = select(Designs).where(Designs.is_active == True)

    if category:
        stmt = stmt.where(Designs.category == category)

    stmt = stmt.order_by(Designs.created_at.desc(), Designs.id.desc())
    items = (await session.execute(stmt)).scalars().all()

    return templates.TemplateResponse(
        "designs_list.html",
        {
            "request": request,
            "items": items,
            "categories": categories,
            "active_category": category,
        },
    )


@router.get("/designuri/{slug}", response_class=HTMLResponse)
async def design_detail(
    request: Request,
    slug: str,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(Designs).where(
        Designs.slug == slug,
        Designs.is_active == True,
    )

    result = await session.execute(stmt)
    design = result.scalar_one_or_none()

    if not design:
        return templates.TemplateResponse(
            "404.html",
            {"request": request},
            status_code=404,
        )

    return templates.TemplateResponse(
        "design_detail.html",
        {
            "request": request,
            "design": design,
        },
    )
