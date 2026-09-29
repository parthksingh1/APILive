# Privacy Policy

**Effective date:** 29 September 2026 · **Applies to:** apilive 1.1.0 and later

apilive is free, open-source software that runs entirely on your own computer. This policy explains what the software does with information, and what the people who maintain it ("we", "us") receive. Short answer: **we receive nothing.**

## Summary

| Question | Answer |
|---|---|
| Does apilive collect or sell personal data? | No. |
| Do the maintainers receive your API keys? | No. We have no servers that receive them. |
| Is there telemetry, analytics or crash reporting? | No. |
| Are cookies or trackers used? | No. The local page uses browser storage only for your theme and a one-time notice. |
| Where do my keys go? | Only to the official API of the provider that issued them, when you ask apilive to check them. |
| Does apilive connect to anything else? | Only an optional daily update check to the public npm registry, which you can turn off. |

## 1. Who we are

apilive is an open-source project maintained by Parth Kumar Singh and contributors, and distributed under the [MIT License](LICENSE). We do not operate a hosted service. You download the software (for example with `npx apilive`) and run it on your device.

## 2. Information processed on your device

**API keys.** When you paste a key, or when apilive finds one in a `.env` file or environment variable, the key is held **in the memory of the apilive process on your computer**. It is never written to disk or logs, and never sent to your browser in full (the web page receives a masked copy such as `sk-proj…7Hq2`). When you stop apilive, the keys are gone.

**`.env` files and environment variables.** apilive reads `.env*` files in the folder you run it from, plus your environment variables, to look for values that match known API-key formats or variable names. Other values are ignored and never leave your computer.

**Check results.** Status, latency, model lists and credit balances returned by providers are shown to you and held in memory only.

**Browser storage.** The local web page stores two preferences in your browser's `localStorage`: your colour theme, and whether you have seen the first-run notice. This data never leaves your browser.

**Local state file.** apilive writes one small file, `state.json`, in your user configuration folder (`%APPDATA%\apilive` on Windows, `~/Library/Preferences/apilive` on macOS, `~/.config/apilive` on Linux). It records the time of the last update check, the latest version number seen, and whether you have seen the command-line notice. It contains no keys or personal data. You can delete it at any time.

## 3. Information sent to third parties

apilive makes network requests only in these cases:

1. **Checking a key.** When you choose to check a key, apilive sends it to **the API of the provider it belongs to** (for example, an OpenAI key goes only to `api.openai.com`). It uses endpoints that list models or show account or balance details, and never generates content. The provider receives the key, your IP address and standard request metadata, and handles them under **its own privacy policy and terms**. apilive never sends a key to more than one provider. If it can't tell which provider a key belongs to, it asks you.
2. **Update check.** Once a day at most, apilive asks the public npm registry (`registry.npmjs.org`, operated by GitHub, Inc.) for the latest version number of the `apilive` package. The request contains no keys, usage data or identifiers. Like any web request, it reveals your IP address to the registry operator, which handles it under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). To turn it off, use any of:
   - the `--no-update-check` flag
   - `NO_UPDATE_NOTIFIER=1`
   - `APILIVE_NO_UPDATE_CHECK=1`
   - `DO_NOT_TRACK=1`

   It is skipped automatically in CI environments.
3. **Links you open.** Links to provider dashboards, GitHub or documentation open in your browser like any other link.

The web page itself loads nothing from the internet: no fonts, scripts, images or analytics. A strict Content Security Policy enforces this.

## 4. What the maintainers receive

Nothing. We do not receive keys, results, file contents, device information, usage statistics or error reports. If you contact us, for example by opening a GitHub issue, we receive only what you choose to write. That is handled under GitHub's terms and privacy statement. **Never include real API keys in an issue or message.**

## 5. Legal bases and your rights

Because the maintainers do not collect, receive or store personal data through the software, we are not a data controller or processor for the information apilive handles on your device. That includes processing under the EU and UK GDPR, the California Consumer Privacy Act (CCPA/CPRA) and India's Digital Personal Data Protection Act, 2023. You stay in control of that information throughout.

AI providers who receive your keys when you check them, and the npm registry operator, are independent controllers under their own policies. To exercise privacy rights over data they hold, contact them directly.

## 6. Children

apilive is a developer tool and is not directed at children under 16.

## 7. Security

We design apilive to keep keys safe on your machine: the local server listens only on `127.0.0.1`, it uses a per-session access token, it rejects requests from other websites, and it has no third-party dependencies. See the [Security Policy](SECURITY.md) for details and for how to report a vulnerability.

## 8. Changes to this policy

If a future version changes how apilive handles information, we will update this policy, change the effective date, and note it in the [Changelog](CHANGELOG.md) **before** that version is released. The policy that ships with the version you run applies to that version.

## 9. Contact

Questions about this policy: open a discussion or issue at https://github.com/parthksingh1/apilive. For sensitive matters, use GitHub's private vulnerability reporting described in the [Security Policy](SECURITY.md).
