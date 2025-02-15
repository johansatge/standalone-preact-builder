const { test, expect } = require('@playwright/test')
const { testBundleAndExamplePage } = require('./helpers.js')

for(const output of ['esm', 'iife']) {
  test(`Generate a minimal Preact bundle (${output})`, async({ page }) => {
    await page.goto('index.html')
    // Configure output (IIFE / ESM)
    await page.getByTestId(`output-${output}`).click()
    // Check the less possible dependencies
    await page.getByTestId('check-none').click()
    // Test bundle (static contents & run example page)
    const preactBundle = await testBundleAndExamplePage({ page })
    expect(preactBundle).not.toContain('// htm')
    expect(preactBundle).not.toContain('// preact/hooks')
    expect(preactBundle).not.toContain('// @preact/signals')
  })
}

for(const output of ['esm', 'iife']) {
  test(`Generate a Preact bundle with htm  (${output})`, async({ page }) => {
    await page.goto('index.html')
    // Configure output (IIFE / ESM)
    await page.getByTestId(`output-${output}`).click()
    // Check Preact mandatory imports & htm
    await page.getByTestId('check-none').click()
    await page.getByTestId('check-htm-htm').click()
    // Test bundle (static contents & run example page)
    const preactBundle = await testBundleAndExamplePage({ page })
    expect(preactBundle).toContain('// htm')
    expect(preactBundle).not.toContain('// preact/hooks')
    expect(preactBundle).not.toContain('// @preact/signals')
  })
}

for(const output of ['esm', 'iife']) {
  test(`Generate a Preact bundle with htm & hooks (${output})`, async({ page }) => {
    await page.goto('index.html')
    // Configure output (IIFE / ESM)
    await page.getByTestId(`output-${output}`).click()
    // Check Preact mandatory imports & htm & useState
    await page.getByTestId('check-none').click()
    await page.getByTestId('check-htm-htm').click()
    await page.getByTestId('check-preact/hooks-useState').click()
    // Test bundle (static contents & run example page)
    const preactBundle = await testBundleAndExamplePage({ page })
    expect(preactBundle).toContain('// htm')
    expect(preactBundle).toContain('// preact/hooks')
    expect(preactBundle).not.toContain('// @preact/signals')
  })
}

for(const output of ['esm', 'iife']) {
  test(`Generate a Preact bundle with htm & signals (${output})`, async({ page }) => {
    await page.goto('index.html')
    // Configure output (IIFE / ESM)
    await page.getByTestId(`output-${output}`).click()
    // Check Preact mandatory imports & htm & signal
    await page.getByTestId('check-none').click()
    await page.getByTestId('check-htm-htm').click()
    await page.getByTestId('check-@preact/signals-signal').click()
    // Test bundle (static contents & run example page)
    const preactBundle = await testBundleAndExamplePage({ page })
    expect(preactBundle).toContain('// htm')
    expect(preactBundle).not.toContain('// preact/hooks')
    expect(preactBundle).toContain('// @preact/signals')
  })
}