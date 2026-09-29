# Security Policy

apilive handles API keys, so we take security reports seriously and appreciate responsible disclosure.

## Supported versions

Only the **latest release** receives security fixes. Update with `apilive update` or run `npx apilive@latest`.

| Version | Supported |
|---|---|
| Latest 1.x | Yes |
| Older releases | No. Please update. |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's private vulnerability reporting:
https://github.com/parthksingh1/apilive/security/advisories/new

Include:

- a description of the issue and its impact;
- steps to reproduce, or a proof of concept;
- affected version(s), operating system and Node.js version.

**Never include real API keys in a report.** Use obviously fake keys or the `--demo` mode.

We aim to acknowledge reports within a few days, keep you informed while we investigate, and credit you in the release notes if you wish. This is a volunteer project, so timelines are best effort.

## Safe harbor

We will not pursue or support legal action against anyone who, in good faith:

- tests only against their own installation and their own keys;
- does not access, change or destroy data that isn't theirs;
- does not degrade services for others, including third-party AI providers;
- gives us reasonable time to fix the issue before disclosing it publicly.

This safe harbor covers apilive itself only. It does not authorize testing of any AI provider's systems. Their own policies govern that.

## Security design

| Protection | How |
|---|---|
| Not reachable from the network | The server binds to `127.0.0.1` only |
| DNS-rebinding protection | Requests whose `Host` header isn't `127.0.0.1` or `localhost` on the running port are rejected |
| Cross-site request protection | Every API call needs a random per-session token embedded in the served page, and cross-origin `Origin` headers are rejected |
| No third-party code in the page | A strict Content-Security-Policy (`default-src 'none'`) blocks external scripts, fonts and trackers |
| Keys don't reach the browser | The browser gets masked keys and opaque references only |
| Keys don't reach disk | Keys live in process memory and are cleared on exit, with no logging |
| No key leakage between providers | Each key is only ever sent to its own provider |
| Supply chain | Zero runtime dependencies; releases are published from GitHub Actions with npm provenance attestations |
| Misuse limits | At most 100 keys per session |

### Verifying a release

Releases are published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements/), which links each package version to the exact GitHub commit and workflow that built it. You can verify installed packages with:

```bash
npm audit signatures
```
