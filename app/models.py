from fastapi import Form
from pydantic import BaseModel, Field


class OrderModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    address: str  = Field(..., min_length=2, max_length=250)
    phone: str = Field(..., min_length=6, max_length=16, pattern=r"^\+?\d+$")

    @classmethod
    def as_form(
            cls,
            name: str = Form(...),
            address: str = Form(""),
            phone: str = Form(...)
    ):
        return cls(name=name, address=address, phone=phone)