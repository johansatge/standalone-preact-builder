# Standalone Preact Builder ⚛️

> Build custom, self-contained & self-hosted Preact script in the browser

---

* [Why](#why)
* [Usage](#usage)
* [Changelog](#changelog)
* [License](#license)

## Why

[Preact](https://preactjs.com) offers two major advantages compared to the original React:
- It's lightweight
- It offers a [no build tools route](https://preactjs.com/guide/v10/getting-started#no-build-tools-route)

When using Preact without build tools, users are advised to use a CDN to import Preact into their app ([`esm.sh/preact`](https://esm.sh/preact) for instance), and a few other CDNs provide the same feature, **but**:
- The whole package is usually exposed (it's lightweight, but still)
- Things may get complicated when other packages are needed: effects, signals, htm... CDNs don't always provide a clear documentation and finding the right URL with the right module to have everything working together is cumbersome
- What if the CDN is discontinued? Unlikely but still possible in the long term, and developers who go with no build tools usually do so for projects that are there to stay for years; how enjoyable is it to reopen a project after 5 years and finding everything working as expected, without having to update Node, npm, and various packages or build scripts?
- What if the app lives in a restricted environment? Limited network connectivity, intranet with no public internet/CDN access...

This project exists as an answer to those problems.

## Usage

- Navigate to [standalonepreact.satge.net](https://standalonepreact.satge.net)
- Check/uncheck the imports you need from Preact and its most used dependencies
- Choose the desired output format
  - `ESM` will allow you to import the script from a `<script type="module">`
  - `IIFE` will expose a `window.standalonePreact` object in the browser context, containing the requested imports
- Download the final script or copy it to the clipboard
- Self-host it: commit it in your Git project, deploy it with your other assets...
- _Never think about it again_

## Changelog

This project uses [semver](http://semver.org/).

| Version | Date | Notes |
| --- | --- | --- |
| `1.0.0` | 2023-10-01 | Initial version |

## License

This project is released under the [MIT License](license.md).