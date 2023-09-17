import * as esbuild from 'esbuild-wasm'
import { h, render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import htm from 'htm'

const esbuildInitPromise = esbuild.initialize({
  wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.19.3/esbuild.wasm',
})

function wasmJsResolver() {
  return {
    name: 'wasmJsResolver',
    setup: (build) => {
      build.onResolve({ filter: /.*/, }, (args) => {
        if (args.kind === 'import-statement') {
          return {
            path: args.path,
            namespace: args.path,
          }
        }
      })
      build.onLoad({ filter: /.*/ }, (args) => {
        return {
          contents: window.preactEcosystem[args.path].code,
          loader: 'js',
        }
      })
    }
  }
}

async function buildBundle(requestedImports, format) {
  let bundleComments = `// Preact Standalone ${getDate()} (${format.toUpperCase()})\n`
  let bundleExports = []
  let bundleSource = ''
  for (const pkg in requestedImports) {
    const pkgVersion = window.preactEcosystem[pkg].version
    bundleComments += `// ${pkg}@${pkgVersion}:${requestedImports[pkg].join(',')}\n`
    const imports = requestedImports[pkg].includes(pkg) ? pkg : `{ ${requestedImports[pkg].join(', ')} }`
    bundleSource += `import ${imports} from '${pkg}';\n`
    bundleExports = [...bundleExports, ...requestedImports[pkg]]
  }
  let usage = ''
  if (format === 'esm') {
    bundleSource += `export { ${bundleExports.join(', ')} };\n`
    usage = [
      '<script type="module">',
      `  import { ${bundleExports.join(', ')} } from "standalone-preact.js"`,
      '</script>',
    ].join('<br>')
  }
  if (format === 'iife') {
    bundleSource += `window.standalonePreact = { ${bundleExports.join(', ')} };\n`
    usage = [
      '<script src="standalone-preact.js"></script>',
      '<script>',
      `  const { ${bundleExports.join(', ')} } = window.standalonePreact`,
      '</script>',
    ].join('<br>')
  }
  await esbuildInitPromise
  const params = {
    stdin: {
      contents: bundleSource,
    },
    plugins: [wasmJsResolver()],
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
  }
  const result = await esbuild.build(params)
  if (result.errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join(', '))
  }
  const code = bundleComments + result.outputFiles[0].text
  const size = (new TextEncoder().encode(code)).length
  const sizeGzipped = await getGzippedSize(code)
  return {
    code,
    usage,
    sizeKb: Math.round(size / 1024 * 100) / 100,
    sizeGzippedKb: Math.round(sizeGzipped / 1024 * 100) / 100
  }
}

async function getGzippedSize(string) {
  const byteArray = new TextEncoder().encode(string)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(byteArray)
  writer.close()
  const buffer = await (new Response(cs.readable)).arrayBuffer()
  return buffer.byteLength
}

function getDate() {
  const d = new Date()
  return [
    d.getFullYear(),
    (d.getMonth() + 1 + '').padStart(2, '0'),
    (d.getDate() + '').padStart(2, '0'),
  ].join('-')
}

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
      const index = newSelectedImports[pkg].indexOf(newSelectedImports[pkg])
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
    <h1 class="title">Standalone Preact Generator</h1>
    ${Object.keys(window.preactEcosystem).map((pkg) => html`
      <div class="column">
        <h2 class="subtitle">${pkg}</h2>
        <${ImportsList}
          pkg="${pkg}" imports=${window.preactEcosystem[pkg].imports}
          selectedImports=${selectedImports} onImportChange=${onImportChange}
        />
      </div>
    `)}
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
