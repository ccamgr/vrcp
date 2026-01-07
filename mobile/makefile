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

.PHONY : gen-oss
gen-oss:  # generate open source software notice
	@npx license-checker --production --json --out ./src/assets/licenses.json --start . --unknown --excludePrivatePackages

.PHONY : gen-vrcapi gen-vrcpipe
gen-vrcapi:  # generate the vrcapi types and clients from openapi spec
# config on openapitools.json
	@rm -rf ./src/generated/api/* ./src/generated/openapi.yaml
	@curl -fsSL https://vrchat.community/openapi.yaml -o ./src/generated/openapi.yaml
	@npx @openapitools/openapi-generator-cli generate \
		-i ./src/generated/openapi.yaml \
		-g typescript-axios \
		-o ./src/generated/api/ \
		--additional-properties="useSingleRequestParameter=true"
	@rm -f ./src/generated/openapi.yaml

gen-vrcpipe: # generate the vrcpipe types from websocket spec
	@npx tsx ./tools/gen-vrcpipe.ts

.PHONY : migrate/generate
migrate/generate:  # generate migration files based on schema changes
	@npx drizzle-kit generate
	@echo "Migration .sql files generated in src/db/migration/drizzle-kit"
	@npx tsx ./src/db/migration/gen-migration.ts

.PHONY : version-bump/ota version-bump/major version-bump/minor version-bump/patch
version-bump/major:  # generate draft of versions.json with major bump
	@npx tsx ./tools/version-bump.ts native major
version-bump/minor:  # generate draft of versions.json with minor bump
	@npx tsx ./tools/version-bump.ts native minor
version-bump/patch:  # generate draft of versions.json with patch bump
	@npx tsx ./tools/version-bump.ts native patch
version-bump/ota:  # generate draft of versions.json with OTA bump
	@npx tsx ./tools/version-bump.ts ota

.PHONY : prebuild
prebuild: # pre build tasks
	@npx expo prebuild --clean

.PHONY : build/dev build/pre build/prod
build/dev:  # build the application for development-client
	@eas build --profile development --platform android
build/pre:  # build the application for preview
	@eas build --profile preview --platform android
build/prod:  # build the application for production (apk)
	@eas build --profile prod-apk --platform android
# build/submit:  # submit the production application (aab) for store
# 	@eas build --profile production --platform android --submit


.PHONY: lint
lint: # lint the codebase
# @npx eslint . --fix
	@npx prettier --write "**/*.tsx"
	@echo "tsc checking..." && npx tsc --noEmit && echo "done"
# @npx next lint --fix
