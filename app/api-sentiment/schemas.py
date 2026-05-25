from pydantic import BaseModel, field_validator
from typing import Optional


class TextInput(BaseModel):
    text: str

    @field_validator('text')
    @classmethod
    def text_tidak_kosong(cls, v):
        if not v.strip():
            raise ValueError('Teks tidak boleh kosong')
        return v


class BatchInput(BaseModel):
    texts: list[str]

    @field_validator('texts')
    @classmethod
    def validasi_batch(cls, v):
        if not v:
            raise ValueError('List teks tidak boleh kosong')
        if len(v) > 50:
            raise ValueError('Maksimal 50 teks per request')
        return v


class Probabilitas(BaseModel):
    model_config = {'protected_namespaces': ()}

    negatif: str
    netral: str
    positif: str


class PrediksiResponse(BaseModel):
    input_asli: str
    teks_bersih: str
    sentimen: str
    confidence: str
    probabilitas: Probabilitas


class BatchResponse(BaseModel):
    total: int
    results: list[PrediksiResponse]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    vocab_size: int
    classes: list[str]


class ErrorResponse(BaseModel):
    detail: str
    kode: Optional[int] = None