from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import tiktoken

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pdlawson.com"],
    allow_methods=["GET"],
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
