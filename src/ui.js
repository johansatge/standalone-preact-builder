import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import htm from 'htm'
import { buildBundle } from './bundler.js'

const defaultImports = {
  preact: ['h', 'render'],
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
      <h2 class="subtitle">Bundle format</h2>
      <p>
        <select name="format" onChange=${onFormatChange}>
          <option value="esm" selected=${format === 'esm'}>ESM</option>
          <option value="iife" selected=${format === 'iife'}>IIFE</option>
        </select>
      </p>
    </section>
    <section class="section">
      <h2 class="subtitle">Generated file</h2>
      <textarea class="code"
        readonly
        disabled=${isLoadingBundle}
      >${bundle.code || ''}</textarea>
      <p>
        <button onClick=${onCopyToClipboard}>Copy to clipboard</button>
        Size: ${bundle.sizeKb || 0}Kb (${bundle.sizeGzippedKb || 0}Kb gzipped)
      </p>
      <h2 class="subtitle">Usage</h2>
      <textarea
        class="usage"
        readonly
        disabled=${isLoadingBundle}
      >${(bundle.usage || 'No usage').replaceAll('<br>', '\n')}</textarea>
    </section>
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
