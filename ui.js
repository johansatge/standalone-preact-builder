import * as preact from 'preact'
import * as hooks from 'preact/hooks'
import * as signals from '@preact/signals'
import htm from 'htm'

const defaultImports = {
  preact: ['h', 'render'],
  htm: ['htm'],
}

const html = htm.bind(preact.h)
preact.render(html`<${App} defaultImports=${defaultImports} />`, document.body)

function App({ defaultImports }) {
  const [selectedImports, setSelectedImports] = hooks.useState(defaultImports)
  const [format, setFormat] = hooks.useState('esm')
  const [bundle, setBundle] = hooks.useState({})
  const [isLoadingBundle, setLoadingBundle] = hooks.useState(false)
  const onFormatChange = (evt) => {
    setFormat(evt.currentTarget.value)
  }
  const onImportChange = (evt) => {
    const newSelectedImports = {...selectedImports}
    const pkg = evt.currentTarget.dataset.pkg
    const mod = evt.currentTarget.dataset.mod
    if (evt.currentTarget.checked) {
      if (typeof newSelectedImports[pkg] === 'undefined') {
        newSelectedImports[pkg] = []
      }
      newSelectedImports[pkg].push(mod)
    } else {
      const index = newSelectedImports[pkg].indexOf(newSelectedImports[pkg])
      newSelectedImports[pkg].splice(index, 1)
      if (newSelectedImports[pkg].length === 0) {
        newSelectedImports[pkg] = undefined
      }
    }
    setSelectedImports(newSelectedImports)
  }
  const onCopyToClipboard = (evt) => {
    evt.preventDefault()
    navigator.clipboard.writeText(bundle.contents)
  }
  hooks.useEffect(() => {
    setLoadingBundle(true)
    const params = new URLSearchParams()
    params.set('imports', JSON.stringify(selectedImports))
    params.set('format', format)
    let headers
    window.fetch(`/bundle?${params.toString()}`)
      .then((response) => {
        headers = response.headers
        return response.text()
      })
      .then((text) => {
        setLoadingBundle(false)
        setBundle({
          contents: text,
          usage: headers.get('x-bundle-usage'),
          sizeKb: headers.get('x-bundle-sizekb'),
          sizeGzippedKb: headers.get('x-bundle-sizegzippedkb'),
        })
      })
      .catch((error) => {
        setLoadingBundle(false)
        setBundle({ contents: `Error: ${error.message}` })
      })
  }, [selectedImports, format])
  return html`
    <h1 class="title">Standalone Preact Generator</h1>
    <div class="column">
      <h2 class="subtitle">Preact</h2>
      <${ImportsList}
        pkg="preact" modules=${Object.keys(preact)}
        selectedImports=${selectedImports} onImportChange=${onImportChange}
      />
    </div>
    <div class="column">
      <h2 class="subtitle">Preact Hooks</h2>
      <${ImportsList}
        pkg="preact/hooks" modules=${Object.keys(hooks)}
        selectedImports=${selectedImports} onImportChange=${onImportChange}
      />
    </div>
    <div class="column">
      <h2 class="subtitle">Preact Signals</h2>
      <${ImportsList}
        pkg="@preact/signals" modules=${Object.keys(signals)}
        selectedImports=${selectedImports} onImportChange=${onImportChange}
      />
    </div>
    <div class="column">
      <h2 class="subtitle">HTM</h2>
      <${ImportsList}
        pkg="htm" modules=${['htm']}
        selectedImports=${selectedImports} onImportChange=${onImportChange}
      />
    </div>
    <h2 class="subtitle">Bundle format</h2>
    <p>
      <select name="format" onChange=${onFormatChange}>
        <option value="esm" selected=${format === 'esm'}>ESM</option>
        <option value="iife" selected=${format === 'iife'}>IIFE</option>
      </select>
    </p>
    <h2 class="subtitle">Generated file</h2>
    <textarea class="code"
      readonly
      disabled=${isLoadingBundle}
    >${bundle.contents || ''}</textarea>
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
  `
}

function ImportsList({ pkg, modules, selectedImports, onImportChange }) {
  return modules.map((mod) => html`
    <label key=${mod}>
      <input
        type="checkbox" autocomplete="off"
        data-pkg=${pkg} data-mod=${mod}
        checked=${selectedImports[pkg] && selectedImports[pkg].includes(mod)}
        value="1"
        onChange=${onImportChange}
      />
      ${mod}
    </label>
    <br />
  `)
}
