IMAGE_NAME = homepage
COMPOSE = docker compose -f compose.yml -f compose.dev.yml
COMPOSE_PROD = docker compose -f compose.yml -f compose.prod.yml

dev:
	$(COMPOSE) up --build homepage

build:
	docker build -t $(IMAGE_NAME) frontend

run:
	$(COMPOSE) up --build homepage

down:
	$(COMPOSE) down --remove-orphans

prod-start:
	$(COMPOSE_PROD) up -d homepage

prod-stop:
	$(COMPOSE_PROD) stop homepage

prod-restart:
	$(COMPOSE_PROD) restart homepage

.PHONY: dev build run down prod-start prod-stop prod-restart
