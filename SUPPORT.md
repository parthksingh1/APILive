# Support

apilive is a free, open-source project maintained by volunteers. Support is best effort and has no guaranteed response time.

## Before you ask

1. Read the [Guide](docs/GUIDE.md), especially **Troubleshooting** and **FAQ**.
2. Make sure you're on the latest version: `apilive update`, or run `npx apilive@latest`.
3. Run `npx apilive --demo`. If the demo works but your key doesn't, the problem is most likely the key or the provider, not apilive.

## Where to get help

| You want to… | Go to |
|---|---|
| Ask a question or share an idea | [GitHub Discussions](https://github.com/parthksingh1/apilive/discussions) |
| Report a bug | [Open a bug report](https://github.com/parthksingh1/apilive/issues/new?template=bug_report.yml) |
| Request a new provider | [Request a provider](https://github.com/parthksingh1/apilive/issues/new?template=provider_request.yml) |
| Report a security vulnerability | Privately, see the [Security Policy](SECURITY.md) |
| Fix a problem with your key, billing or account | The provider's own support. apilive can't see or change your account. |

## When reporting a problem

Please include:

- your apilive version (`apilive --version`), operating system and Node.js version (`node --version`);
- the provider, the status apilive showed, and the message in the details panel;
- the output of `apilive check --json`, **with keys removed**. apilive already masks them, but double-check.

> **Never post a real API key**: not in issues, discussions, screenshots or logs. If you post one by accident, revoke it immediately in the provider's dashboard. Deleting the post is not enough.

## Code of conduct

Everyone taking part in the project's spaces is expected to follow the [Code of Conduct](https://github.com/parthksingh1/apilive/blob/main/CODE_OF_CONDUCT.md).
