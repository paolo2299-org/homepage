PROJECT_ID := paul-personal-306310

.PHONY: deploy

deploy:
	gcloud builds submit --project $(PROJECT_ID) --config cloudbuild.yaml .
