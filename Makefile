.PHONY: deploy-frontend deploy-backend

deploy-frontend:
	$(MAKE) -C frontend deploy

deploy-backend:
	$(MAKE) -C backend deploy
