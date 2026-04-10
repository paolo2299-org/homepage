PROJECT_ID := paul-personal-306310
IMAGE := gcr.io/$(PROJECT_ID)/homepage-frontend
REGION := europe-west1
SERVICE := homepage-frontend
BACKEND_ORIGIN ?= https://api.pdlawson.com

.PHONY: build run deploy

build:
	docker build -t $(SERVICE) .

run: build
	docker run --rm -p 8080:8080 -e PORT=8080 -e BACKEND_ORIGIN=$(BACKEND_ORIGIN) $(SERVICE)

deploy:
	gcloud builds submit --project $(PROJECT_ID) --config cloudbuild.yaml \
		--substitutions _BACKEND_ORIGIN=$(BACKEND_ORIGIN) .
