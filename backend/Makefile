PROJECT_ID := paul-personal-306310
IMAGE := gcr.io/$(PROJECT_ID)/homepage-backend
REGION := europe-west1
SERVICE := homepage-backend

.PHONY: build run test deploy

build:
	docker build -t $(SERVICE) .

run: build
	docker run -p 8080:8080 $(SERVICE)

test:
	pip install -r requirements-test.txt
	pytest test_main.py -v

deploy:
	gcloud builds submit --project $(PROJECT_ID) --config cloudbuild.yaml .
