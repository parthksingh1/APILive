# Contributing

Thanks for helping. apilive has no dependencies and no build step, so you can start straight away.

```bash
git clone https://github.com/parthksingh1/apilive && cd apilive
npm start -- --demo   # app with sample data
npm test             # unit and security tests
npm run verify       # sends a fake key to every provider; all must reject it
```

## Ground rules

- **No runtime dependencies.** Being small enough to audit is part of the security model.
- **Never add an inference call.** Checks must use free metadata endpoints: model lists, account or balance.
- **Never send a key to more than one provider.**
- **Never commit or post real keys**, including in tests, screenshots, issues or pull requests.
- **Use plain names for providers.** No logos or brand colours, which could suggest affiliation.

## Adding a provider

1. Add an entry in `src/providers.js`. Most OpenAI-compatible APIs only need `regions` and `...openAICompatible()`.
2. Add its environment variable names to `env`, and a `pattern` only if the key prefix is unique to that provider.
3. Run `npm run verify`. The new provider **must** report `invalid` for a fake key. If its endpoint answers without authentication, find another endpoint.
4. Add the provider to the lists in `README.md`, `docs/GUIDE.md` and the trademark list in `TERMS.md`.
5. Add a line to `CHANGELOG.md` under an `Unreleased` heading.

## Pull requests

- Keep changes focused, and add or update tests.
- Run `npm test` before pushing.
- Sign off your commits (`git commit -s`) to certify the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change, or have the right to submit it under the project's license.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

## Releasing (maintainers)

1. Move the `Unreleased` notes in `CHANGELOG.md` under a new version heading, and bump `version` in `package.json`.
2. Commit, then tag the commit: `git tag v1.2.0 && git push --follow-tags`.
3. The **Release** workflow tests, publishes to npm with provenance via trusted publishing, and creates the GitHub release.
