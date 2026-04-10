.PHONY: deploy deploy-frontend deploy-backend create-main-trigger

deploy: deploy-backend deploy-frontend

deploy-frontend:
	$(MAKE) -C frontend deploy

deploy-backend:
	$(MAKE) -C backend deploy

create-main-trigger:
	./scripts/create-main-trigger.sh
