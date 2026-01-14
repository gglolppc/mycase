from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

# Создаем лимитер, который определяет юзера по IP
limiter = Limiter(key_func=get_remote_address)



async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Твой собственный обработчик превышения лимитов.
    """
    return JSONResponse(
        status_code=429,
        content={"error": "Слишком много попыток. Подожди минуту и попробуй снова."},
    )