from unittest.mock import MagicMock, patch

import numpy as np
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_tokenize_returns_tokens_and_ids():
    mock_enc = MagicMock()
    mock_enc.encode.return_value = [15496, 995]
    mock_enc.decode_single_token_bytes.side_effect = lambda t: {
        15496: b"Hello",
        995: b" world",
    }[t]

    with patch("main.tiktoken.get_encoding", return_value=mock_enc):
        response = client.get("/tokenize?text=Hello world")

    assert response.status_code == 200
    data = response.json()
    assert data["tokens"] == ["Hello", " world"]
    assert data["token_ids"] == [15496, 995]


def test_tokenize_missing_text_returns_422():
    response = client.get("/tokenize")
    assert response.status_code == 422


def test_tokenize_empty_string():
    mock_enc = MagicMock()
    mock_enc.encode.return_value = []

    with patch("main.tiktoken.get_encoding", return_value=mock_enc):
        response = client.get("/tokenize?text=")

    assert response.status_code == 200
    data = response.json()
    assert data["tokens"] == []
    assert data["token_ids"] == []


def _fake_glove(*words):
    """Return a dict of word -> random 50-dim vector for testing."""
    rng = np.random.default_rng(42)
    return {w: rng.random(50).astype(np.float32) for w in words}


def test_embed_returns_3d_points():
    fake = _fake_glove("king", "queen", "dog")
    with patch.dict("main.glove_vectors", fake, clear=True):
        response = client.post("/embed", json={"words": ["king", "queen", "dog"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["points"]) == 3
    assert data["unknown"] == []
    point = data["points"][0]
    assert all(k in point for k in ["word", "x", "y", "z"])


def test_embed_unknown_words():
    with patch.dict("main.glove_vectors", {}, clear=True):
        response = client.post("/embed", json={"words": ["zzznonsense"]})
    assert response.status_code == 200
    data = response.json()
    assert data["points"] == []
    assert "zzznonsense" in data["unknown"]


def test_embed_mixed_known_unknown():
    fake = _fake_glove("cat", "dog")
    with patch.dict("main.glove_vectors", fake, clear=True):
        response = client.post("/embed", json={"words": ["cat", "zzznonsense", "dog"]})
    assert response.status_code == 200
    data = response.json()
    words_returned = [p["word"] for p in data["points"]]
    assert "cat" in words_returned
    assert "dog" in words_returned
    assert "zzznonsense" in data["unknown"]


def test_embed_single_word():
    fake = _fake_glove("hello")
    with patch.dict("main.glove_vectors", fake, clear=True):
        response = client.post("/embed", json={"words": ["hello"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["points"]) == 1
    p = data["points"][0]
    assert p["word"] == "hello"
    assert p["x"] == 0.0 and p["y"] == 0.0 and p["z"] == 0.0


def test_embed_two_words():
    fake = _fake_glove("hello", "world")
    with patch.dict("main.glove_vectors", fake, clear=True):
        response = client.post("/embed", json={"words": ["hello", "world"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data["points"]) == 2
    for p in data["points"]:
        assert p["y"] == 0.0 and p["z"] == 0.0


def test_embed_empty_word_list():
    with patch.dict("main.glove_vectors", {}, clear=True):
        response = client.post("/embed", json={"words": []})
    assert response.status_code == 200
    data = response.json()
    assert data["points"] == []
    assert data["unknown"] == []
