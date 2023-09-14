const esbuild = require('esbuild')
const path = require('node:path')
const fsp = require('node:fs').promises
const http = require('node:http')
const util = require('node:util')
const zlib = require('node:zlib')

const serverPort = 9697
const server = http.createServer()
server.on('listening', () => {
  console.log(`http://localhost:${serverPort}`)
})
server.on('error', (error) => {
  console.log(`A server error occurred: ${error.message}`)
  process.exitCode = 1
})
server.on('request', onLocalServerRequest)
server.listen(serverPort)

async function onLocalServerRequest(request, response) {
  try {
    if (request.method !== 'GET') {
      throw new Error(`Invalid method ${request.method}`)
    }
    const handlers = {
      '/': onServeUiHtml,
      '/ui.js': onServeUiJs,
      '/bundle': onServeBundle,
    }
    const requestPath = new URL(request.url, 'http://localhost').pathname
    if (handlers[requestPath]) {
      await handlers[requestPath](request, response)
    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain' })
      response.end('404 Not Found')
    }
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain' })
    response.end(`An error occurred: ${error.message}\n(${error.stack})`)
    console.log(`500: ${error.message}`)
  }
}

async function onServeUiHtml(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache, no-store',
  })
  const html = await fsp.readFile(path.join(__dirname, 'ui.html'), 'utf8')
  response.end(html)
}

async function onServeUiJs(request, response) {
  response.writeHead(200, {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'no-cache, no-store',
  })
  const js = await buildBundle(path.join(__dirname, 'ui.js'), '', 'file', false)
  response.end(js.contents)
}

async function onServeBundle(request, response) {
  const rawImports = new URL(request.url, 'http://localhost').searchParams.get('imports') || ''
  const imports = JSON.parse(rawImports)
  let bundleComments = `// Preact Standalone ${getDate()}\n`
  let bundleExports = []
  let bundleSource = ''
  for (const pkg in imports) {
    const pkgVersion = await getPackageVersion(pkg)
    bundleComments += `// ${pkg}@${pkgVersion}:${imports[pkg].join(',')}\n`
    const importedModules = imports[pkg].includes(pkg) ? pkg : `{ ${imports[pkg].join(', ')} }`
    bundleSource += `import ${importedModules} from '${pkg}';\n`
    bundleExports = [...bundleExports, ...imports[pkg]]
  }
  bundleSource += `export { ${bundleExports.join(', ')} };\n`
  try {
    const js = await buildBundle(bundleSource, bundleComments, 'string', true)
    response.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store',
      'X-Bundle-SizeKb': js.sizeKb,
      'X-Bundle-SizeGzippedKb': js.sizeGzippedKb,
      'X-Bundle-Usage': `<script>import { ${bundleExports.join(', ')} } from "file.js"</script>`,
    })
    response.end(js.contents)
  } catch(error) {
    response.writeHead(500, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache, no-store',
    })
    response.end(`Error: ${error.message}`)
  }
}

function getDate() {
  const d = new Date()
  return [
    d.getFullYear(),
    (d.getMonth() + 1 + '').padStart(2, '0'),
    (d.getDate() + '').padStart(2, '0'),
  ].join('-')
}

async function getPackageVersion(pkg) {
  const pkgJsonPath = path.join(__dirname, 'node_modules', pkg, 'package.json')
  const pkgJson = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf8'))
  return pkgJson.version
}

async function buildBundle(fileOrSource, comments, type, withMinify) {
  const params = {
    bundle: true,
    minify: withMinify,
    write: false,
  }
  if (type === 'file') {
    params.entryPoints = [fileOrSource]
  }
  if (type === 'string') {
    params.stdin = {
      contents: fileOrSource,
      resolveDir: __dirname,
    }
  }
  const result = await esbuild.build(params)
  if (result.errors.length > 0) {
    throw new Error(`esbuild error (${errors.map((error) => error.message).join(', ')})`)
  }
  const js = comments + result.outputFiles[0].text
  const sizeInKb = (size) => Math.round(size / 1024 * 100) / 100
  const size = sizeInKb(new Blob([js]).size)
  const sizeGzipped = sizeInKb((await util.promisify(zlib.gzip)(js)).length)
  return { contents: js, sizeKb: size, sizeGzippedKb: sizeGzipped }
}
