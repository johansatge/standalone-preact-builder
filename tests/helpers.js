const path = require('node:path')
const fsp = require('node:fs').promises
const crypto = require('node:crypto')

const { expect } = require('@playwright/test')

module.exports = {
  testBundleAndExamplePage,
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
