SERVICE := homepage-frontend

.PHONY: build run

build:
	docker build -t $(SERVICE) .

run: build
	docker run --rm -p 8080:8080 -e PORT=8080 $(SERVICE)
