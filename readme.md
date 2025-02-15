# Standalone Preact Builder ⚛️

[![Test](https://github.com/johansatge/standalone-preact-builder/actions/workflows/test.yml/badge.svg)](https://github.com/johansatge/standalone-preact-builder/actions)

> Build custom, self-contained & self-hosted Preact script in the browser

---

* [What is this tool](#what-is-this-tool)
* [Usage](#usage)
* [What is the point?](#what-is-the-point)
* [Changelog](#changelog)
* [License](#license)

## What is this tool

_Standalone Preact Builder_ generates a standalone JavaScript file that contains [Preact](https://preactjs.com) and its most popular dependencies, to be self-hosted along with the rest of a JS app.

The generator runs in the browser; no installation is needed.

## Usage

- Open [standalonepreact.satge.net](https://standalonepreact.satge.net)
- Check/uncheck the needed imports
- Choose the desired output format
  - `ESM` will allow the script to be imported from a `<script type="module">`
  - `IIFE` will expose a `window.standalonePreact` object in the browser context, containing the requested imports
- Download the generated script or copy it to the clipboard
- Self-host it: it's small enough to be committed in the app's Git project, and deployed with the rest of the app

## What is the point?

Preact offers two major advantages compared to the original React:
- It's lightweight
- It offers a [no build tools route](https://preactjs.com/guide/v10/getting-started#no-build-tools-route)

When using Preact without build tools, users are advised to rely on a CDN to import Preact into their app ([`esm.sh/preact`](https://esm.sh/preact) for instance, and a few other CDNs provide the same feature) **but**:
- The whole Preact package is usually exposed (it's lightweight, but still)
- Things may get complicated when other packages are needed: effects, signals, [htm](https://github.com/developit/htm/issues/229)... CDNs don't always provide a clear documentation and finding the right URL with the right module to have everything working together is cumbersome
- What if the CDN is discontinued? Unlikely but still possible in the long term, and developers who go with no build tools usually do so for projects that are there to stay for years; how enjoyable is it to reopen a project after 5 years and finding everything working as expected, without having to update Node, npm, and various packages or build scripts?
- What if the CDN is down? [_Unpkg CDN down?_](https://github.com/mjackson/unpkg/issues/384)
- What if the app lives in a restricted environment? Limited network connectivity, intranet with no public internet/CDN access...

This project exists as an answer to those problems.

## Changelog

This project uses [semver](http://semver.org/).

| Version | Date | Notes |
| --- | --- | --- |
| `2.0.0` | 2025-02-15 | Add Playwright tests, update deps, make `Component` mandatory |
| `1.5.0` | 2024-07-21 | Expose `html`, update deps, add mandatory imports |
| `1.4.0` | 2024-07-05 | Add more defaults |
| `1.3.0` | 2024-03-24 | Update deps, add `signals` & `useState` examples |
| `1.2.1` | 2023-10-14 | Fix ESM example |
| `1.2.0` | 2023-10-14 | Add format in filename |
| `1.1.0` | 2023-10-04 | Add md5 substring in code & downloaded file to simplify self-hosting |
| `1.0.0` | 2023-10-01 | Initial version |

## License

This project is released under the [MIT License](license.md).
