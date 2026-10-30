# Invocado por `sam build` (Metadata.BuildMethod: makefile en template.yaml).
# Empaqueta en $(ARTIFACTS_DIR):
#   src/     → backend (handler src/lambda.handler)
#   public/  → frontend compilado, servido por la Lambda en GET /app
#   node_modules/ → dependencias de producción del backend

build-AmapaFunction:
	cd frontend && npm ci --no-audit --no-fund && npx vite build --base=/app/ --outDir "$(ARTIFACTS_DIR)/public" --emptyOutDir
	cp -R backend/src "$(ARTIFACTS_DIR)/src"
	cp backend/package.json backend/package-lock.json "$(ARTIFACTS_DIR)/"
	cd "$(ARTIFACTS_DIR)" && npm ci --omit=dev --no-audit --no-fund

.PHONY: build-AmapaFunction
