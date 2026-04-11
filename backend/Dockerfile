FROM python:3.12-slim AS base

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS test

COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt

COPY . .

CMD ["python", "-m", "pytest", "test_main.py", "-v"]

FROM base AS runtime

# Pre-download tiktoken encoding so it's baked into the image
# (avoids a network call on first request at runtime)
RUN python -c "import tiktoken; tiktoken.get_encoding('cl100k_base')"

# Download GloVe 6B 50d word vectors for the embedding endpoint.
# Store them outside /app so a bind-mounted dev workspace does not hide them.
RUN export DEBIAN_FRONTEND=noninteractive && apt-get update && apt-get install -y --no-install-recommends wget unzip \
    && wget -q https://downloads.cs.stanford.edu/nlp/data/glove.6B.zip -O /tmp/glove.zip \
    && mkdir -p /opt/glove \
    && unzip -j /tmp/glove.zip glove.6B.50d.txt -d /opt/glove \
    && rm /tmp/glove.zip \
    && apt-get purge -y --auto-remove wget unzip \
    && rm -rf /var/lib/apt/lists/*

COPY . .

# Cloud Run expects the app to listen on port 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
