# walk-in -- build and deploy
#
# Production server is fixed at 216.128.182.35 (Vultr, x86_64, root).
# The image is built locally for linux/amd64 and streamed to the server over
# SSH, so nothing is pushed to Docker Hub -- the local Docker CLI being signed
# in to the wrong account does not matter. The server is signed in as
# hollyburnproperties, which is only relevant if you ever use `make push`.
#
# Like lead-qualify, walk-in runs as its own compose project out of REMOTE_DIR
# rather than out of /root/docker-compose.yml: it needs the static IP 10.10.0.6,
# which is where nginx-proxy-manager forwards to.
#
# Addresses taken on the 10.10.0.0/24 bridge: .1 gateway, .2 lead-qualify,
# .3 docker-watchdog, .4 self-booking, .5 nginx-proxy-manager, .6 walk-in.

SERVER_IP     := 216.128.182.35
SERVER_USER   := root
SERVER        := $(SERVER_USER)@$(SERVER_IP)
IMAGE         := hollyburnproperties/walk-in
SERVICE       := walk-in
APP_PORT      := 3004
STATIC_IP     := 10.10.0.6
DOCKER_NET    := custom bridge
REMOTE_DIR    := /root/apps/walk-in
COMPOSE_FILE  := $(REMOTE_DIR)/docker-compose.yml
LOCAL_COMPOSE := docker-compose.prod.yml
LOCAL_ENV     := .env.production
PLATFORM      := linux/amd64

# The submit routes call Hollyburn API with this key. Missing it makes every
# /api/*-submit route throw at runtime, so the build stops rather than shipping
# an app whose forms cannot submit. HOLLYBURN_API_BASE_URL is optional.
REQUIRED_KEYS := HOLLYBURN_API_KEY

# Tag = short commit sha, plus -dirty when the tree has uncommitted changes.
GIT_SHA  := $(shell git rev-parse --short HEAD 2>/dev/null || echo nogit)
DIRTY    := $(shell test -n "$$(git status --porcelain 2>/dev/null)" && echo -dirty)
TAG      ?= $(GIT_SHA)$(DIRTY)

SSH := ssh -o ConnectTimeout=15
EXPORTS := IMAGE=$(IMAGE) TAG=$(TAG) PLATFORM=$(PLATFORM) SERVER_IP=$(SERVER_IP) \
           SERVER_USER=$(SERVER_USER) SERVICE=$(SERVICE) APP_PORT=$(APP_PORT) \
           STATIC_IP=$(STATIC_IP) DOCKER_NET="$(DOCKER_NET)" REMOTE_DIR=$(REMOTE_DIR) \
           COMPOSE_FILE=$(COMPOSE_FILE) LOCAL_COMPOSE=$(LOCAL_COMPOSE) LOCAL_ENV=$(LOCAL_ENV)

.DEFAULT_GOAL := help
.PHONY: help check-env build deploy release push logs ps status health restart \
        rollback shell ssh clean env-check

help: ## Show this help
	@echo "walk-in -> $(SERVER_IP):$(APP_PORT)   image $(IMAGE):$(TAG)"
	@echo "          static ip $(STATIC_IP) on '$(DOCKER_NET)'"
	@echo
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

check-env: ## Verify .env.production exists and has the keys the app needs
	@test -f $(LOCAL_ENV) || { \
	  echo "!! $(LOCAL_ENV) not found."; \
	  echo "   It is not in git. Create it with HOLLYBURN_API_KEY set to an api_users row."; \
	  echo "   HOLLYBURN_API_BASE_URL is optional and defaults to https://api.hollyburn.com."; \
	  exit 1; }
	@missing=""; \
	for k in $(REQUIRED_KEYS); do \
	  v=$$(grep -E "^$$k=" $(LOCAL_ENV) | head -1 | cut -d= -f2-); \
	  [ -n "$$v" ] || missing="$$missing $$k"; \
	done; \
	if [ -n "$$missing" ]; then \
	  echo "!! $(LOCAL_ENV) is missing values for:$$missing"; \
	  echo "   HOLLYBURN_API_KEY must be an api_users row. The submit routes read it at runtime."; \
	  exit 1; \
	fi
	@if [ -f .env.local ]; then \
	  a=$$(mktemp); b=$$(mktemp); \
	  sed -E 's/=.*//' .env.local   | grep -E '^[A-Z]' | sort -u > $$a; \
	  sed -E 's/=.*//' $(LOCAL_ENV) | grep -E '^[A-Z]' | sort -u > $$b; \
	  only=$$(comm -23 $$a $$b); rm -f $$a $$b; \
	  [ -z "$$only" ] || { echo "   note: in .env.local but not $(LOCAL_ENV):"; echo "$$only" | sed 's/^/     /'; }; \
	fi
	@echo "==> $(LOCAL_ENV) ok"

build: check-env ## Build the linux/amd64 image locally
	@$(EXPORTS) ./scripts/build.sh

deploy: check-env ## Stream the built image to the server and restart the service
	@$(EXPORTS) ./scripts/deploy.sh

release: build deploy ## Build and deploy in one step

push: ## Push to Docker Hub instead (needs `docker login -u hollyburnproperties`)
	@docker push $(IMAGE):$(TAG)
	@docker push $(IMAGE):latest

logs: ## Tail the container logs (ctrl-c to stop)
	@$(SSH) $(SERVER) "docker logs -f --tail 200 $(SERVICE)"

ps: ## Show all containers on the server
	@$(SSH) $(SERVER) "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"

status: ## Show this service's state, health, IP and restart count
	@$(SSH) $(SERVER) "docker inspect $(SERVICE) --format \
	  'image:    {{.Config.Image}}{{println}}state:    {{.State.Status}}{{println}}health:   {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}{{println}}ip:       {{(index .NetworkSettings.Networks \"$(DOCKER_NET)\").IPAddress}} (proxy expects $(STATIC_IP)){{println}}restarts: {{.RestartCount}}{{println}}started:  {{.State.StartedAt}}'"

health: ## Hit the app through the public IP
	@curl -sS -o /dev/null -w 'http://$(SERVER_IP):$(APP_PORT)/ -> HTTP %{http_code}\n' \
	  http://$(SERVER_IP):$(APP_PORT)/

restart: ## Restart the container without redeploying
	@$(SSH) $(SERVER) "docker restart $(SERVICE)"

rollback: ## Roll back to the image replaced by the last deploy
	@$(SSH) $(SERVER) "docker image inspect $(IMAGE):previous >/dev/null 2>&1 || \
	  { echo 'No :previous image on the server'; exit 1; }; \
	  docker tag $(IMAGE):previous $(IMAGE):latest && \
	  cd $(REMOTE_DIR) && docker compose -f $(COMPOSE_FILE) -p $(SERVICE) up -d --force-recreate $(SERVICE)"
	@$(MAKE) --no-print-directory status

shell: ## Open a shell inside the running container
	@$(SSH) -t $(SERVER) "docker exec -it $(SERVICE) sh"

ssh: ## SSH into the server
	@$(SSH) -t $(SERVER)

clean: ## Remove dangling images on the server
	@$(SSH) $(SERVER) "docker image prune -f"

env-check: ## Compare local .env.production keys against the running container
	@$(EXPORTS) ./scripts/env-check.sh
