const path = require('node:path')
const fsp = require('node:fs').promises
const crypto = require('node:crypto')

const { expect } = require('@playwright/test')

module.exports = {
  downloadPreactBundle,
  testBundleAndExamplePage,
  testHooksAndSignals,
}

async function testBundleAndExamplePage({ page }) {
  // Download & test Preact bundle general contents
  const { preactBundleFilename, preactBundle } = await downloadPreactBundle({ page })
  const preactVersion = await page.getByTestId('preact-version').innerText()
  expect(preactBundle).toContain('// Standalone Preact')
  expect(preactBundle).toContain(`// preact@${preactVersion}`)
  // Download & test example page
  const htmlExampleFilemane = await downloadHtmlExample({ page, preactBundleFilename })
  await page.goto(`tests-tmp/${htmlExampleFilemane}`)
  await expect(page.getByText('Hello World!')).toBeVisible()
  await page.getByText('Increment').click()
  await expect(page.getByText('Count')).toContainText('Count: 1')  
  return preactBundle
}

async function downloadPreactBundle({ page }) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('download-bundle').click()
  const download = await downloadPromise
  const downloadName = path.join(crypto.randomUUID(), download.suggestedFilename())
  const downloadPath = path.join(__dirname, '../dist/tests-tmp', downloadName)
  await download.saveAs(downloadPath)
  return {
    preactBundleFilename: downloadName,
    preactBundle: await fsp.readFile(downloadPath, 'utf8')
  }
}

async function downloadHtmlExample({ page, preactBundleFilename }) {
  const htmlExample = await page.getByTestId('html-example').innerText()
  const htmlFilename = preactBundleFilename.replace('.js', '.html')
  await fsp.writeFile(path.join(__dirname, '../dist/tests-tmp', htmlFilename), htmlExample)
  return htmlFilename
}

async function testHooksAndSignals({ page, output }) {
  const { preactBundleFilename } = await downloadPreactBundle({ page })
  const bundleFilename = path.basename(preactBundleFilename)
  const imports = 'h, render, useState, signal, computed, effect, useSignal, useComputed, useSignalEffect'
  const htmlFilename = preactBundleFilename.replace('.js', '.html')
  let html = await fsp.readFile(path.join(__dirname, 'signals-example.html'), 'utf8')
  html = html.replace('__bundleScript__', output === 'iife' ? `<script src="./${bundleFilename}"></script>` : '')
  html = html.replace('__scriptType__', output === 'esm' ? 'type="module"' : '')
  html = html.replace('__bundleImports__', output === 'esm'
    ? `import { ${imports} } from './${bundleFilename}'`
    : `const { ${imports} } = window.standalonePreact`)
  await fsp.writeFile(path.join(__dirname, '../dist/tests-tmp', htmlFilename), html)
  await page.goto(`tests-tmp/${htmlFilename}`)
  const button = page.locator('#root button')
  await expect(button).toHaveText('0:3')
  await expect(page.locator('#signal-effect')).toHaveText('2')
  await expect(page.locator('#hook-effect')).toHaveText('3')
  await button.click()
  await expect(button).toHaveText('1:6')
  await expect(page.locator('#signal-effect')).toHaveText('4')
  await expect(page.locator('#hook-effect')).toHaveText('6')
}
