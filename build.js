const esbuild = require('esbuild')
const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')

const srcPath = path.join(__dirname, 'src')
const distPath = path.join(__dirname, 'dist')

build()
if (process.argv.includes('--watch')) {
  const httpdir = require('/usr/local/lib/node_modules/httpdir')
  const server = httpdir.createServer({ basePath: distPath, httpPort: 9697 })
  server.onStart(({ urls }) => {
    console.log(urls.join('\n'))
  })
  server.start()
  buildOnChange()
}

async function build() {
  const startMs = Date.now()
  try {
    await makeDist()
    let html = await fsp.readFile(path.join(srcPath, 'index.html'), 'utf8')
    const preactEcosystem = await makePreactEcosystem()
    html = html.replace('__preactEcosystem__', JSON.stringify(preactEcosystem))
    const { uiScript, uiStyles, prismStyles } = await makeUi()
    // Replace JS with a function to avoid automatic JS pattern replacement, like $&
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
    html = html.replace('__uiScript__', () => uiScript)
    html = html.replace('__uiStyles__', uiStyles)
    html = html.replace('__prismStyles__', prismStyles)
    await fsp.writeFile(path.join(distPath, 'index.html'), html, 'utf8')
    console.log(`Built (${Date.now() - startMs}ms)`)
  } catch (error) {
    console.log(`Build error: ${error.message} (${error.stack})`)
  }
}

async function buildOnChange() {
  console.log(`Watching ${srcPath}`)
  fs.watch(srcPath, { recursive: true }, (evtType, file) => {
    console.log(`Event ${evtType} on ${file}, building...`)
    build()
  })
}

async function makeDist() {
  try {
    await fsp.rm(distPath, { recursive: true })
  } catch(error) {}
  await fsp.mkdir(distPath, { recursive: true })
}

async function makePreactEcosystem() {
  const ecosystem = {
    imports: {
      'preact': Object.keys(require('preact')),
      'preact/hooks': Object.keys(require('preact/hooks')),
      '@preact/signals': Object.keys(require('@preact/signals')),
      'htm': ['htm'],
    },
    versions: {
      'preact': await getPackageVersion('preact'),
      'preact/hooks': await getPackageVersion('preact/hooks'),
      '@preact/signals': await getPackageVersion('@preact/signals'),
      'htm': await getPackageVersion('htm'),
    },
    jsModules: {}
  }
  // Read raw ESM module from each package and expose it to the frontend,
  // to be injected in the runtime when esbuild-wasm requires them.
  // The list includes "@preact/signals-core" because it is imported in "@preact/signals"
  const neededJsModules = ['preact', 'preact/hooks', '@preact/signals', '@preact/signals-core', 'htm']
  for (const mod of neededJsModules) {
    ecosystem.jsModules[mod] = await getJsModuleFromNodeModule(mod)
  }
  return ecosystem
}

async function getPackageVersion(pkg) {
  const pkgJsonPath = path.join(__dirname, 'node_modules', pkg, 'package.json')
  const pkgJson = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf8'))
  return pkgJson.version
}

async function getJsModuleFromNodeModule(pkg) {
  const nodeModulePath = path.join(__dirname, 'node_modules', pkg)
  const pkgJson = JSON.parse(await fsp.readFile(path.join(nodeModulePath, 'package.json'), 'utf8'))
  return await fsp.readFile(path.join(nodeModulePath, pkgJson.module), 'utf8')
}

async function makeUi() {
  const result = await esbuild.build({
    entryPoints: [
      path.join(srcPath, 'ui.js'),
      path.join(srcPath, 'ui.css'),
      path.join(__dirname, 'node_modules/prismjs/themes/prism-funky.css')
    ],
    bundle: true,
    minify: true,
    write: false,
    outdir: distPath,
    format: 'iife',
  })
  if (result.errors.length > 0) {
    throw new Error(`UI script: ${errors.map((error) => error.message).join(', ')}`)
  }
  return {
    uiScript: result.outputFiles[0].text,
    uiStyles: result.outputFiles[1].text,
    prismStyles: result.outputFiles[2].text,
  }
}