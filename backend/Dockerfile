FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download tiktoken encoding so it's baked into the image
# (avoids a network call on first request at runtime)
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

COPY . .

# Cloud Run expects the app to listen on port 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
