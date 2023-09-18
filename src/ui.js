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

  const highlightedBundleCode = Prism.highlight(bundle.code || 'No bundle', Prism.languages.javascript, 'javascript')
  const highlightedBundleUsage = Prism.highlight(bundle.usage || 'No usage', Prism.languages.html, 'html')

  return html`
    <header class="header">
      <h1 class="title">
        ⚛️ Standalone <a href="https://preactjs.com/">Preact</a> Builder
      </h1>
      <a class="help" href="https://github.com/johansatge/standalone-preact">
        Help on GitHub
      </a>
    </header>
    <section class="section">
      ${Object.keys(window.preactEcosystem).map((pkg) => html`
        <div class="column">
          <h2 class="subtitle">
            ${pkg}
            <span class="version">${window.preactEcosystem[pkg].version}</span>
          </h2>
          <${ImportsList}
            pkg="${pkg}" imports=${window.preactEcosystem[pkg].imports}
            selectedImports=${selectedImports} onImportChange=${onImportChange}
          />
        </div>
      `)}
    </section>
    <section class="section">
      <h2 class="subtitle">
        Generated bundle
        ${isLoadingBundle && html`<span class="loader"></span>`}
      </h2>
      <p>
        <label>
          <input
            type="radio" name="format" value="esm"
            onChange=${onFormatChange}
            checked=${format === 'esm'}
          />
          ESM
        </label>
        <label>
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
      <p>
        <button onClick=${onCopyToClipboard}>Copy to clipboard</button>
        <button onClick=${onDownload}>Download file</button>
        Size: ${bundle.sizeKb || 0}Kb (${bundle.sizeGzippedKb || 0}Kb gzipped)
      </p>
      <h2 class="subtitle">Usage</h2>
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
    <label key=${imp}>
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
