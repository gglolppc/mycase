import os
from datetime import datetime
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy import DateTime, func, Column, Integer, String
from dotenv import load_dotenv
from sqlalchemy.testing.schema import mapped_column

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DB_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(AsyncAttrs, DeclarativeBase):
    pass

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    c_name: Mapped[str] = mapped_column(String, nullable=True)
    phone_number: Mapped[str] = mapped_column(String, nullable=True)
    address: Mapped[str] = mapped_column(String, nullable=True)
    brand: Mapped[str] = mapped_column(String, nullable=True)
    phone_model: Mapped[str] = mapped_column(String, nullable=True)
    design_url: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=True, server_default="pending")
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session