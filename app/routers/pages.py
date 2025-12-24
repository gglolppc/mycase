from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, Request
from fastapi.responses import HTMLResponse

from app.db.database import get_async_session, Designs

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


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
    return templates.TemplateResponse("index.html", {"request": request, "featured_designs": featured})
