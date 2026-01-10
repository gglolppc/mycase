from app.core.templates import templates
from app.i18n import get_lang, build_i18n_payload


def render(request, template_name: str, context: dict):
    lang = get_lang(request)
    context.update({
        "request": request,
        "lang": lang,
        "i18n": build_i18n_payload(lang, locales_dir="app/locales"),
    })
    return templates.TemplateResponse(template_name, context)