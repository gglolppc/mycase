import asyncio
from app.tg_bot.db.database import Base, engine

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Таблицы созданы")

if __name__ == "__main__":
    asyncio.run(create())