# makefile
.DEFAULT_GOAL := help
.PHONY : help
help:   # show this list
	@echo "---- list of available commands ---"
	@grep -E '^[[:alnum:]_/-]+ *:.*?#.*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?# "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
# ----

.PHONY : run
run:  # run the application
	@npx expo start

.PHONY : gen-d-ts
gen-d-ts:  # generate missing d.ts files for not typed modules
	@rm -rf ./src/types/*
# 	@npx tsc --emitDeclarationOnly --declaration --outDir ./src/types --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule --lib es6,dom --module commonjs --target es6 --skipLibCheck --forceConsistentCasingInFileNames --noImplicitAny true

.PHONY : gen-vrcapi
gen-vrcapi:  # generate the vrcapi types
	@rm -rf ./src/vrchat/api/* ./src/vrchat/openapi.yaml
	@curl -L https://vrchat.community/openapi.yaml -o ./src/vrchat/openapi.yaml
	@npx @openapitools/openapi-generator-cli generate -i ./src/vrchat/openapi.yaml -g typescript-axios -o ./src/vrchat/api/

.PHONY : build-dev build-pre submit
build-dev:  # build the application for development-client
	@eas build --profile development --platform android
build-pre:  # build the application for preview
	@eas build --profile preview --platform android
build-submit:  # submit the application for store
	@eas build --profile production --platform android --submit