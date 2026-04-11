.PHONY: run stop test-frontend deploy deploy-frontend deploy-backend create-main-trigger

run:
	docker-compose up --build

stop:
	docker-compose down

test-frontend:
	npm test --prefix frontend

deploy: deploy-backend deploy-frontend

deploy-frontend:
	$(MAKE) -C frontend deploy

deploy-backend:
	$(MAKE) -C backend deploy

create-main-trigger:
	./scripts/create-main-trigger.sh
