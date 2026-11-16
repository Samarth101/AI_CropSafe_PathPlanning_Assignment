"""
api/index.py
------------
FastAPI backend for CropSafe Ops (deployed as a Vercel Python Serverless Function
and runnable locally with `uvicorn api.index:app --reload --port 8000`).
"""

import os
import sys
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure repository root is importable on Vercel and local runs
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from python_engine.api_bridge import evaluate_payload


class EvaluateRequest(BaseModel):
    grid: List[List[str]]
    selectedAlgo: str = Field(default="ASTAR_SAFE")
    penaltyWeight: int = Field(default=5, ge=0, le=20)
    sensorRadius: int = Field(default=2, ge=1, le=5)


app = FastAPI(
    title="CropSafe Ops API",
    description="FastAPI backend running the Python AI path-planning engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "backend": "fastapi"}


@app.post("/api/evaluate")
def evaluate_field(req: EvaluateRequest) -> Dict[str, Any]:
    if not req.grid or not req.grid[0]:
        raise HTTPException(status_code=400, detail="Grid cannot be empty.")
    try:
        return evaluate_payload(req.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
