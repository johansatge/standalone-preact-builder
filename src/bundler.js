import { build as esbuildBuild, initialize as esbuildInitialize } from 'esbuild-wasm'
import md5 from 'crypto-js/md5'
import pkg from '../package.json'

// Init esbuild-wasm as soon as possible
const esbuildInitPromise = esbuildInitialize({
  wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.7/esbuild.wasm',
})

// Custom esbuild resolver to map imports (import { x } from "y")
// to the corresponding code in window.preactEcosystem.jsModules, since esbuild-wasm
// has no access to physical files in the browser
function wasmJsResolver() {
  return {
    name: 'wasmJsResolver',
    setup: (build) => {
      build.onResolve({ filter: /.*/, }, (args) => {
        if (args.kind === 'import-statement') {
          return { path: args.path, namespace: args.path }
        }
      })
      build.onLoad({ filter: /.*/ }, (args) => {
        const contents = window.preactEcosystem.jsModules[args.path]
        return { contents, loader: 'js' }
      })
    }
  }
}

// Build the final bundle as a file from a list of requested imports and a format (IIFE/ESM)
// Function sends back the code, sample usage code and stats
export async function buildBundle(requestedImports, format) {
  const { bundleSource, bundleComments, usage } = getBundleSource(requestedImports, format)
  await esbuildInitPromise
  const params = {
    stdin: {
      contents: bundleSource,
    },
    plugins: [wasmJsResolver()],
    bundle: true,
    minify: true,
    write: false,
    format,
  }
  const result = await esbuildBuild(params)
  if (result.errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join(', '))
  }
  const builtCode = result.outputFiles[0].text
  const hash = md5(builtCode).toString().substring(0, 7)
  const finalCode = [
    `// Standalone Preact ${pkg.version} ${getDate()} ${hash} (${format.toUpperCase()})\n`,
    '// https://github.com/johansatge/standalone-preact-builder\n',
    '\n',
    bundleComments,
    builtCode,
  ].join('')
  const size = (new TextEncoder().encode(finalCode)).length
  const sizeGzipped = await getGzippedSize(finalCode)
  return {
    code: finalCode,
    usage: usage.replaceAll('__hash__', hash),
    sizeKb: Math.round(size / 1024 * 10) / 10,
    sizeGzippedKb: Math.round(sizeGzipped / 1024 * 10) / 10,
    filename: `standalone-preact.${format}.${hash}.js`,
  }
}

// Get the bundle source (a list of imports) that is feeded to esbuild to generate the final bundle
// This also returns the final bundle comments and usage example
function getBundleSource(requestedImports, format) {
  let bundleComments = ''
  let bundleExports = []
  let bundleReadableExports = []
  let bundleSource = ''
  for (const pkg in requestedImports) {
    const pkgVersion = window.preactEcosystem.versions[pkg]
    bundleComments += `// ${pkg}@${pkgVersion} (${requestedImports[pkg].join(', ')})\n`
    const imports = requestedImports[pkg].includes(pkg) ? pkg : `{ ${requestedImports[pkg].join(', ')} }`
    bundleSource += `import ${imports} from '${pkg}';\n`
    bundleExports = [...bundleExports, ...requestedImports[pkg]]
    bundleReadableExports = [...bundleReadableExports, requestedImports[pkg].join(', ')]
    if (pkg === 'htm') {
      bundleSource += 'const html = htm.bind(h);\n'
      bundleExports.push('html')
      bundleReadableExports[bundleReadableExports.length - 1] += ', html'
    }
  }
  let usageByFormat = ''
  const withSignals = requestedImports['@preact/signals'] && requestedImports['@preact/signals'].includes('signal')
  const withUseState = requestedImports['preact/hooks'] && requestedImports['preact/hooks'].includes('useState')
  if (format === 'esm') {
    bundleSource += `export { ${bundleExports.join(', ')} };\n`
    usageByFormat = [
      '    <script type="module">',
      '      import {',
      `        ${bundleReadableExports.join(',\n        ')}`,
      `      } from "./standalone-preact.${format}.__hash__.js"`,
      ...(requestedImports.htm ? getAppUsageWithHtm(withSignals, withUseState) : getAppUsageWithoutHtm()),
      '    </script>',
    ]
  }
  if (format === 'iife') {
    bundleSource += `window.standalonePreact = { ${bundleExports.join(', ')} };\n`
    usageByFormat = [
      `    <script src="standalone-preact.${format}.__hash__.js"></script>`,
      '    <script>',
      '      const {',
      `        ${bundleReadableExports.join(',\n        ')}`,
      '      } = window.standalonePreact',
      ...(requestedImports.htm ? getAppUsageWithHtm(withSignals, withUseState) : getAppUsageWithoutHtm()),
      '    </script>',
    ]
  }
  const usage = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <title>My Preact App</title>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width,initial-scale=1">',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    ...usageByFormat,
    '  </body>',
    '</html>',
  ].join('\n')
  return { bundleSource, bundleComments, usage }
}

function getAppUsageWithHtm(withSignals, withUseState,) {
  if (withSignals) {
    return [
      '',
      '      const count = signal(0)',
      '      function App(props) {',
      '        const value = count.value',
      '        return html`',
      '          <h1>Hello ${props.name}!</h1>',
      '          <p>Count: ${count.value}</p>',
      '          <button onclick=${() => count.value += 1}>Increment</button>',
      '        `',
      '      }',
      '',
      '      render(html`<${App} name="World" />`, document.querySelector(\'#root\'))', 
    ]
  }
  if (withUseState) {
    return [
      '',
      '      function App(props) {',
      '        const [value, setValue] = useState(0)',
      '        return html`',
      '          <h1>Hello ${props.name}!</h1>',
      '          <p>Count: ${value}</p>',
      '          <button onclick=${() => setValue(value + 1)}>Increment</button>',
      '        `',
      '      }',
      '',
      '      render(html`<${App} name="World" />`, document.querySelector(\'#root\'))', 
    ]
  }
  return [
    '',
    '      class App extends Component {',
    '        constructor(props) {',
    '          super(props)',
    '          this.state = { count: 0 }',
    '        }',
    '        incrementCount = () => {',
    '          this.setState((prevState) => ({ count: prevState.count + 1 }))',
    '        }',
    '        render() {',
    '          return html`',
    '            <h1>Hello ${this.props.name}!</h1>',
    '            <p>Count: ${this.state.count}</p>',
    '            <button onclick=${this.incrementCount}>Increment</button>',
    '          `',
    '        }',
    '      }',
    '      render(h(App, { name: \'World\' }), document.querySelector(\'#root\'))',
  ]
}

function getAppUsageWithoutHtm() {
  return [
    '',
    '      class App extends Component {',
    '        constructor(props) {',
    '          super(props)',
    '          this.state = { count: 0 }',
    '        }',
    '        incrementCount = () => {',
    '          this.setState((prevState) => ({ count: prevState.count + 1 }))',
    '        }',
    '        render() {',
    '          return h(\'div\', null, [',
    '            h(\'h1\', null, [`Hello ${this.props.name}!`]),',
    '            h(\'p\', null, [`Count: ${this.state.count}`]),',
    '            h(\'button\', { onClick: this.incrementCount }, [\'Increment\']),',
    '          ])',
    '        }',
    '      }',
    '      render(h(App, { name: \'World\' }), document.querySelector(\'#root\'))',
  ]
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