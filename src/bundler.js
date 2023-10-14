import { build as esbuildBuild, initialize as esbuildInitialize } from 'esbuild-wasm'
import md5 from 'crypto-js/md5'

// Init esbuild-wasm as soon as possible
const esbuildInitPromise = esbuildInitialize({
  wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.19.3/esbuild.wasm',
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
    `// Standalone Preact ${getDate()} ${hash} (${format.toUpperCase()})\n`,
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
  let bundleSource = ''
  for (const pkg in requestedImports) {
    const pkgVersion = window.preactEcosystem.versions[pkg]
    bundleComments += `// ${pkg}@${pkgVersion} (${requestedImports[pkg].join(', ')})\n`
    const imports = requestedImports[pkg].includes(pkg) ? pkg : `{ ${requestedImports[pkg].join(', ')} }`
    bundleSource += `import ${imports} from '${pkg}';\n`
    bundleExports = [...bundleExports, ...requestedImports[pkg]]
  }
  let usage = ''
  if (format === 'esm') {
    bundleSource += `export { ${bundleExports.join(', ')} };\n`
    usage = [
      '<script type="module">',
      `  import { ${bundleExports.join(', ')} } from "./standalone-preact.${format}.__hash__.js"`,
      ...(requestedImports.htm ? getAppUsage() : []),
      '</script>',
    ].join('\n')
  }
  if (format === 'iife') {
    bundleSource += `window.standalonePreact = { ${bundleExports.join(', ')} };\n`
    usage = [
      `<script src="standalone-preact.${format}.__hash__.js"></script>`,
      '<script>',
      `  const { ${bundleExports.join(', ')} } = window.standalonePreact`,
      ...(requestedImports.htm ? getAppUsage() : []),
      '</script>',
    ].join('\n')
  }
  return { bundleSource, bundleComments, usage }
}

function getAppUsage() {
  return [
    '  const html = htm.bind(h)',
    '  function App (props) {',
    '    return html`<h1>Hello ${props.name}!</h1>`',
    '  }',
    '  render(html`<${App} name="World" />`, document.body)',
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