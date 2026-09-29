# Changelog

All notable changes to apilive are documented here. This project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [1.1.0] - 2026-09-29

### Added

- **Redesigned app.** A table view with a details panel, an add-keys dialog with a live detection preview, search, status filters and keyboard shortcuts.
- **Docs inside the app.** The Guide, Changelog, Privacy Policy, Terms of Use, Security Policy, Support and License are available offline from the app.
- **Update notifications.** At most once a day, apilive checks the npm registry for a newer version and shows it in the app and the terminal.
- `apilive update` updates a global install in place. For npx users it prints the right command.
- `apilive privacy` and `apilive terms` print the policies in the terminal.
- `--no-update-check` flag, plus support for `NO_UPDATE_NOTIFIER`, `APILIVE_NO_UPDATE_CHECK` and `DO_NOT_TRACK`.
- A first-run notice confirming you'll only check keys you're authorized to use.
- Releases are published from GitHub Actions with npm provenance.

### Changed

- Provider marks are now neutral monograms. apilive no longer uses provider brand colours, and states clearly that it is not affiliated with any provider.
- At most 100 keys per session, in both the app and the CLI.

### Fixed

- SambaNova could report a fake key as live when requests came from some regions, which returned an empty 404. Validation-probe providers now count a key as live only when the provider returns a genuine validation error.
- A 2xx response that isn't JSON (for example a captive portal or bot-challenge page) now shows as unverified instead of live.

### Privacy

- New: the optional update check sends one anonymous request to `registry.npmjs.org`. It contains no keys or usage data. See the [Privacy Policy](PRIVACY.md).
- New: a small `state.json` in your config folder stores the update-check time and whether you've seen the notice.

## [1.0.0] - 2026-09-29

### Added

- `npx apilive` local web app and `npx apilive check` CLI with exit codes and `--json`.
- 24 providers, with credit balances for OpenRouter, DeepSeek, Kimi, SiliconFlow and Novita.
- Scanning of `.env*` files and environment variables, with provider detection by key format or variable name.
- Five statuses: live, invalid, no credit, rate-limited and unverified.
- Zero dependencies. The server listens only on your machine and uses Host checks, a session token and a strict Content Security Policy.
- `npm run verify` proves every provider endpoint rejects a fake key.
- `--demo` mode for screenshots.

[1.1.0]: https://github.com/parthksingh1/apilive/releases/tag/v1.1.0
[1.0.0]: https://github.com/parthksingh1/apilive/releases/tag/v1.0.0
