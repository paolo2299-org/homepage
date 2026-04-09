from contextlib import asynccontextmanager
from typing import List

import numpy as np
from sklearn.decomposition import PCA
from pydantic import BaseModel
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import tiktoken

glove_vectors: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with open("glove.6B.50d.txt", "r", encoding="utf-8") as f:
            for line in f:
                parts = line.split()
                glove_vectors[parts[0]] = np.array(parts[1:], dtype=np.float32)
    except FileNotFoundError:
        pass  # allows tests and local dev to run without the file
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pdlawson.com", "https://paolo2299.github.io", "null"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/tokenize")
def tokenize(text: str = Query(..., description="Text to tokenise")):
    enc = tiktoken.get_encoding("cl100k_base")
    token_ids = enc.encode(text)
    tokens = [enc.decode_single_token_bytes(t).decode("utf-8", errors="replace") for t in token_ids]
    return {"tokens": tokens, "token_ids": token_ids}


class EmbedRequest(BaseModel):
    words: List[str]


@app.post("/embed")
def embed(request: EmbedRequest):
    known, unknown, vectors = [], [], []
    for word in request.words:
        w = word.lower()
        if w in glove_vectors:
            known.append(word)
            vectors.append(glove_vectors[w])
        else:
            unknown.append(word)

    if not known:
        return {"points": [], "unknown": unknown}

    arr = np.array(vectors)
    n = len(known)

    if n == 1:
        coords = np.zeros((1, 3))
    elif n == 2:
        pca = PCA(n_components=1)
        r = pca.fit_transform(arr)
        coords = np.hstack([r, np.zeros((2, 2))])
    else:
        n_components = min(3, n)
        pca = PCA(n_components=n_components)
        r = pca.fit_transform(arr)
        pad = np.zeros((n, 3 - r.shape[1]))
        coords = np.hstack([r, pad])

    points = [
        {"word": known[i], "x": float(coords[i, 0]), "y": float(coords[i, 1]), "z": float(coords[i, 2])}
        for i in range(n)
    ]
    return {"points": points, "unknown": unknown}
