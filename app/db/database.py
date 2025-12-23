import os
from datetime import datetime
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import DateTime, func, Column, Integer, String, Boolean, ForeignKey
from dotenv import load_dotenv


load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DB_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(AsyncAttrs, DeclarativeBase):
    pass

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # --- клиент ---
    c_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- телефон ---
    brand: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone_model: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- тип заказа ---
    order_kind: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="custom"
    )
    # custom | ready

    # --- кастомный дизайн (canvas) ---
    design_url: Mapped[str | None] = mapped_column(String, nullable=True)

    # --- готовый дизайн ---
    design_id: Mapped[int | None] = mapped_column(
        ForeignKey("designs.id", ondelete="SET NULL"),
        nullable=True
    )
    personal_text: Mapped[str | None] = mapped_column(
        String(30),  # имя / ник / год
        nullable=True
    )

    # --- статус ---
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="pending"
    )

    # --- даты ---
    order_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

    # --- relationships ---
    design: Mapped["Designs"] = relationship(
        "Designs",
        lazy="joined"
    )

class Designs(Base):
    __tablename__ = "designs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    category: Mapped[str] = mapped_column(String(50), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(50), nullable=True)

    title: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    image_url: Mapped[str] = mapped_column(String, nullable=False)
    price_mdl: Mapped[int] = mapped_column(Integer, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session