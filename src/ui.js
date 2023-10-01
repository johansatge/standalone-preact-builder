import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import htm from 'htm'
import Prism from 'prismjs'

import { buildBundle } from './bundler.js'

const defaultImports = {
  preact: ['h', 'render'],
  'preact/hooks': ['useEffect', 'useState'],
  '@preact/signals': ['signal'],
  htm: ['htm'],
}

const html = htm.bind(h)
render(html`<${App} defaultImports=${defaultImports} />`, document.body)

function App({ defaultImports }) {
  const [selectedImports, setSelectedImports] = useState(defaultImports)
  const [format, setFormat] = useState('esm')
  const [bundle, setBundle] = useState({})
  const [isLoadingBundle, setLoadingBundle] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  const onFormatChange = (evt) => {
    setFormat(evt.currentTarget.value)
  }

  const onImportChange = (evt) => {
    const newSelectedImports = {...selectedImports}
    const pkg = evt.currentTarget.dataset.pkg
    const imp = evt.currentTarget.dataset.imp
    if (evt.currentTarget.checked) {
      if (typeof newSelectedImports[pkg] === 'undefined') {
        newSelectedImports[pkg] = []
      }
      newSelectedImports[pkg].push(imp)
    } else {
      const index = newSelectedImports[pkg].indexOf(imp)
      newSelectedImports[pkg].splice(index, 1)
      if (newSelectedImports[pkg].length === 0) {
        delete newSelectedImports[pkg]
      }
    }
    setSelectedImports(newSelectedImports)
  }

  const onCopyToClipboard = (evt) => {
    evt.preventDefault()
    navigator.clipboard.writeText(bundle.code)
    setHasCopied(true)
  }

  const onDownload = (evt) => {
    evt.preventDefault()
    const blob = new Blob([bundle.code], {
      type: 'application/javascript',
    })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'standalone-preact.js'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    setLoadingBundle(true)
    buildBundle(selectedImports, format)
      .then((bundle) => {
        setLoadingBundle(false)
        setBundle({ ... bundle })
      })
      .catch((error) => {
        setLoadingBundle(false)
        setBundle({ code: `Error: ${error.message}` })
      })
  }, [selectedImports, format])

  useEffect(() => {
    if (hasCopied) {
      setTimeout(() => {
        setHasCopied(false)
      }, 1000)
    }
  }, [hasCopied])

  const highlightedBundleCode = Prism.highlight(bundle.code || 'No bundle', Prism.languages.javascript, 'javascript')
  const highlightedBundleUsage = Prism.highlight(bundle.usage || 'No usage', Prism.languages.html, 'html')

  return html`
    <header class="header">
      <h1 class="title">
        <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 296"><path fill="#673AB8" d="m128 0l128 73.9v147.8l-128 73.9L0 221.7V73.9z"/><path fill="#FFF" d="M34.865 220.478c17.016 21.78 71.095 5.185 122.15-34.704c51.055-39.888 80.24-88.345 63.224-110.126c-17.017-21.78-71.095-5.184-122.15 34.704c-51.055 39.89-80.24 88.346-63.224 110.126Zm7.27-5.68c-5.644-7.222-3.178-21.402 7.573-39.253c11.322-18.797 30.541-39.548 54.06-57.923c23.52-18.375 48.303-32.004 69.281-38.442c19.922-6.113 34.277-5.075 39.92 2.148c5.644 7.223 3.178 21.403-7.573 39.254c-11.322 18.797-30.541 39.547-54.06 57.923c-23.52 18.375-48.304 32.004-69.281 38.441c-19.922 6.114-34.277 5.076-39.92-2.147Z"/><path fill="#FFF" d="M220.239 220.478c17.017-21.78-12.169-70.237-63.224-110.126C105.96 70.464 51.88 53.868 34.865 75.648c-17.017 21.78 12.169 70.238 63.224 110.126c51.055 39.889 105.133 56.485 122.15 34.704Zm-7.27-5.68c-5.643 7.224-19.998 8.262-39.92 2.148c-20.978-6.437-45.761-20.066-69.28-38.441c-23.52-18.376-42.74-39.126-54.06-57.923c-10.752-17.851-13.218-32.03-7.575-39.254c5.644-7.223 19.999-8.261 39.92-2.148c20.978 6.438 45.762 20.067 69.281 38.442c23.52 18.375 42.739 39.126 54.06 57.923c10.752 17.85 13.218 32.03 7.574 39.254Z"/><path fill="#FFF" d="M127.552 167.667c10.827 0 19.603-8.777 19.603-19.604c0-10.826-8.776-19.603-19.603-19.603c-10.827 0-19.604 8.777-19.604 19.603c0 10.827 8.777 19.604 19.604 19.604Z"/></svg>
        Standalone <br /><a href="https://preactjs.com/">Preact</a> <br />Builder
      </h1>
      <a class="github" href="https://github.com/johansatge/standalone-preact#what-is-this-tool">
        Help on GitHub
      </a>
    </header>
    <section class="section">
      <h2 class="section-title">Select imports to include</h2>
      <div class="columns">
        ${Object.keys(window.preactEcosystem.imports).map((pkg) => html`
          <div class="column">
            <h3 class="column-title">
              ${pkg}
              <span class="version">${window.preactEcosystem.versions[pkg]}</span>
            </h3>
            <${ImportsList}
              pkg="${pkg}" imports=${window.preactEcosystem.imports[pkg]}
              selectedImports=${selectedImports} onImportChange=${onImportChange}
            />
          </div>
        `)}
      </div>
    </section>
    <section class="section">
      <h2 class="section-title">
        Save the bundle
        ${isLoadingBundle && html`<span class="loader"></span>`}
      </h2>
      <p class="paragraph">
        <label class="input-label">
          <input
            type="radio" name="format" value="esm"
            onChange=${onFormatChange}
            checked=${format === 'esm'}
          />
          ESM
        </label>
        <label class="input-label">
          <input
            type="radio" name="format" value="iife"
            onChange=${onFormatChange}
            checked=${format === 'iife'}
          />
          IIFE
        </label>
      </p>
      <pre class="code-wrapper">
        <code
          class="code"
          dangerouslySetInnerHTML=${{__html: highlightedBundleCode}}
        ></code>
      </pre>
      <p class="paragraph">
        <button class="action ${hasCopied ? 'copied' : ''}" onClick=${onCopyToClipboard}>
          Copy to clipboard
        </button>
        <button class="action" onClick=${onDownload}>Download file</button>
        <span class="size">
          Size: ${bundle.sizeKb || 0}Kb (${bundle.sizeGzippedKb || 0}Kb gzipped)
        </span>
      </p>
    </section>
    <section class="section">
      <h2 class="section-title">Host and import the bundle in the app</h2>
      <pre class="code-wrapper">
        <code
          class="code"
          dangerouslySetInnerHTML=${{__html: highlightedBundleUsage}}
        ></code>
      </pre>
    </section>
    <footer class="footer">
      Made in Antibes with ♥
    </footer>
  `
}

function ImportsList({ pkg, imports, selectedImports, onImportChange }) {
  return imports.map((imp) => html`
    <label class="input-label" key=${imp}>
      <input
        type="checkbox" autocomplete="off"
        data-pkg=${pkg} data-imp=${imp}
        checked=${selectedImports[pkg] && selectedImports[pkg].includes(imp)}
        value="1"
        onChange=${onImportChange}
      />
      ${imp}
    </label>
    <br />
  `)
}
