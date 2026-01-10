from fastapi.templating import Jinja2Templates
from app.i18n import install_jinja_i18n

templates = Jinja2Templates(directory="app/templates")
install_jinja_i18n(templates, locales_dir="app/locales")
