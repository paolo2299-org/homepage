from unittest.mock import MagicMock, patch

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
