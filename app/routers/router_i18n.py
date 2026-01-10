from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse

from app.i18n import SUPPORTED_LANGS, DEFAULT_LANG

router = APIRouter()

@router.get("/set-lang/{lang}")
async def set_lang(lang: str, request: Request, next: str = "/"):
    lang = (lang or "").lower()
    if lang not in SUPPORTED_LANGS:
        lang = DEFAULT_LANG

    # cookie (fast) + session (optional)
    request.session["lang"] = lang
    resp = RedirectResponse(url=next or "/", status_code=302)
    resp.set_cookie("lang", lang, max_age=60 * 60 * 24 * 365, samesite="lax")
    return resp
