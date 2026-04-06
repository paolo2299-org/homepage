PROJECT_ID := paul-personal-306310
IMAGE := gcr.io/$(PROJECT_ID)/homepage-backend
REGION := europe-west2
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
	gcloud builds submit --project $(PROJECT_ID) --tag $(IMAGE)
	gcloud run deploy $(SERVICE) \
		--project $(PROJECT_ID) \
		--image $(IMAGE) \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated
