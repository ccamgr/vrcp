# makefile
.DEFAULT_GOAL := help
.PHONY : help
help:   # show this list
	@echo "---- list of available commands ---"
	@grep -E '^[[:alnum:]_/-]+ *:.*?#.*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?# "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
# ----

.PHONY : run run-front
run:  # run the tauri application (ts-front and rust-backend)
	@npm run tauri -- dev --config src-tauri/tauri.conf.dev.json
run-front:  # run the application (ts-front only)
	@npm run dev

.PHONY : gen-bindings
gen-bindings:  # generate the bindings for commands and events
	@cd src-tauri && cargo run --bin vrcp_cli -- gen-bindings

.PHONY : gen-icons
gen-icons:  # generate the icons for the application, from PNG image (1024x1024)
	@npm run tauri icon src/assets/icon.png
	@echo "removing unused icons..."
	@rm -r src-tauri/icons/android src-tauri/icons/ios  # remove mobile icons
	@rm src-tauri/icons/Square*.png src-tauri/icons/StoreLogo.png  # remove AppX/MS Store icon
	@echo "for detail,  https://tauri.app/develop/icons/"


.PHONY : version-bump/major version-bump/minor version-bump/patch
version-bump/major:  # generate draft of versions.json with major bump
	@npx tsx ./tools/version-bump.ts major
version-bump/minor:  # generate draft of versions.json with minor bump
	@npx tsx ./tools/version-bump.ts minor
version-bump/patch:  # generate draft of versions.json with patch bump
	@npx tsx ./tools/version-bump.ts patch


.PHONY: lint
lint: # lint the codebase
	@cd src-tauri && cargo fmt --all
	@cd src-tauri && cargo clippy --fix
# @npx eslint . --fix
	@npx prettier --write "**/*.tsx"
	@echo "tsc checking..." && npx tsc --noEmit && echo "done"
# @npx next lint --fix
