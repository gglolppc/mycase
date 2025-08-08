import os
from datetime import datetime
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy import DateTime, func, text, BigInteger
from sqlalchemy.orm import mapped_column
from dotenv import load_dotenv
from aiogram.dispatcher.middlewares.base import BaseMiddleware

load_dotenv()
DB_URL = os.environ.get("DB_URL_TG_BOT")
engine = create_async_engine(DB_URL, pool_pre_ping=True)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)  # <-- rename here

# Базовая модель
class Base(AsyncAttrs, DeclarativeBase):
    pass

# Модели
class DbUser(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True, nullable=False)
    c_name: Mapped[str] = mapped_column(nullable=True)
    total_orders: Mapped[int] = mapped_column(server_default=text("1"))
    language: Mapped[str] = mapped_column(nullable=True)


class DbOrder(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(nullable=True)
    c_name: Mapped[str] = mapped_column(nullable=True)
    phone_number: Mapped[str] = mapped_column(nullable=True)
    address: Mapped[str] = mapped_column(nullable=True)
    phone_model: Mapped[str] = mapped_column(nullable=True)
    file_id: Mapped[str] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(nullable=True, server_default="pending")
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )




class DbSessionMiddleware(BaseMiddleware):
    async def __call__(self, handler, event, data):
        async with async_session_maker() as session:
            data["session"] = session
            try:
                result = await handler(event, data)
                return result
            finally:
                await session.close()
