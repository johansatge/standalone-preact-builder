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
    const uiScript = await makeUiScript()
    html = html.replace('__uiScript__', uiScript)
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
  const packages = {
    preact: 'export * from "preact"',
    'preact/hooks': 'export * from "preact/hooks"',
    '@preact/signals': 'export * from "@preact/signals"',
    htm: 'export * from "htm"',
  }
  const ecosystem = {}
  for (const pkg in packages) {
    const result = await esbuild.build({
      stdin: {
        contents: packages[pkg],
        resolveDir: __dirname,
      },
      bundle: true,
      minify: true,
      write: false,
      format: 'esm',
    })
    if (result.errors.length > 0) {
      throw new Error(`Preact ecosystem: ${errors.map((error) => error.message).join(', ')}`)
    }
    ecosystem[pkg] = {
      code: result.outputFiles[0].text,
      version: await getPackageVersion(pkg)
    }
  }
  return ecosystem
}

async function getPackageVersion(pkg) {
  const pkgJsonPath = path.join(__dirname, 'node_modules', pkg, 'package.json')
  const pkgJson = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf8'))
  return pkgJson.version
}

async function makeUiScript() {
  const result = await esbuild.build({
    entryPoints: [path.join(srcPath, 'ui.js')],
    bundle: true,
    minify: false,
    write: false,
    format: 'iife',
  })
  if (result.errors.length > 0) {
    throw new Error(`UI script: ${errors.map((error) => error.message).join(', ')}`)
  }
  return result.outputFiles[0].text
}