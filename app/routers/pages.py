from fastapi import APIRouter, Request

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, Request
from fastapi.responses import HTMLResponse

from app.db.database import get_async_session, Designs
from app.core.render import render

router = APIRouter()

@router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def home(request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(Designs)
        # .where(Design.is_active == True)  # если есть такое поле — включи
        .order_by(func.random())
        .limit(4)
    )
    featured = (await session.execute(stmt)).scalars().all()
    return  render(request, "index.html", {
     "featured_designs": featured})
