import json
from pathlib import Path
from typing import Dict, Any

from fastapi import Request
from jinja2 import pass_context

DEFAULT_LANG = "ro"
SUPPORTED_LANGS = {"ro", "ru"}

_CACHE: Dict[str, Dict[str, str]] = {}

def _load_lang(lang: str, locales_dir: str = "app/locales") -> Dict[str, str]:
    lang = (lang or DEFAULT_LANG).lower()
    if lang not in SUPPORTED_LANGS:
        lang = DEFAULT_LANG
    if lang in _CACHE:
        return _CACHE[lang]

    path = Path(locales_dir) / f"{lang}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    _CACHE[lang] = data
    return data


def get_lang(request: Request) -> str:
    # priority: ?lang=ru -> cookie -> session -> default
    q = (request.query_params.get("lang") or "").lower()
    if q in SUPPORTED_LANGS:
        request.session["lang"] = q
        return q

    c = (request.cookies.get("lang") or "").lower()
    if c in SUPPORTED_LANGS:
        return c

    s = (request.session.get("lang") or "").lower()
    if s in SUPPORTED_LANGS:
        return s

    return DEFAULT_LANG


def build_i18n_payload(lang: str, locales_dir: str = "app/locales") -> Dict[str, Any]:
    return {"lang": lang, "dict": _load_lang(lang, locales_dir=locales_dir)}


def install_jinja_i18n(templates, locales_dir: str = "app/locales"):
    @pass_context
    def t(ctx, key: str) -> str:
        req: Request = ctx.get("request")
        lang = ctx.get("lang") or (getattr(req.state, "lang", None) if req else None) or DEFAULT_LANG
        d = _load_lang(lang, locales_dir=locales_dir)
        return d.get(key, key)

    templates.env.globals["t"] = t