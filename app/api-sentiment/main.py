import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from model import SentimentModel
from schemas import (
    TextInput,
    BatchInput,
    PrediksiResponse,
    BatchResponse,
    HealthResponse,
)

MODEL_PATH = os.getenv("MODEL_PATH", "final_model.keras")
VECTORIZER_PATH = os.getenv("VECTORIZER_PATH", "vectorizer_config.json")

sentiment_model: SentimentModel = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sentiment_model
    print("Memuat model...")
    sentiment_model = SentimentModel(MODEL_PATH, VECTORIZER_PATH)
    print(f"Model siap. Vocab size: {sentiment_model.vocab_size}")
    yield
    print("API dimatikan.")


app = FastAPI(
    title="Sentiment Analysis API — PKKMB",
    description=(
        "REST API untuk analisis sentimen feedback mahasiswa PKKMB "
        "menggunakan model Deep Learning berbasis TensorFlow. "
        "Mendukung prediksi tunggal dan batch."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "kode": 500},
    )


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Sentiment Analysis API — PKKMB",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health():
    return HealthResponse(
        status="healthy",
        model_loaded=sentiment_model is not None,
        vocab_size=sentiment_model.vocab_size if sentiment_model else 0,
        classes=["negatif", "netral", "positif"],
    )


@app.post("/predict", response_model=PrediksiResponse, tags=["Prediksi"])
def predict(payload: TextInput):
    try:
        return sentiment_model.predict(payload.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=BatchResponse, tags=["Prediksi"])
def predict_batch(payload: BatchInput):
    try:
        results = sentiment_model.predict_batch(payload.texts)
        return BatchResponse(total=len(results), results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)