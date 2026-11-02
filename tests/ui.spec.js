const { test, expect } = require('@playwright/test')
const { downloadPreactBundle, testBundleAndExamplePage, testHooksAndSignals } = require('./helpers.js')

for(const output of ['esm', 'iife']) {
  for(const selection of ['default', 'all']) {
    test(`Check generated bundle exports for ${selection} imports (${output})`, async({ page }) => {
      await page.goto('index.html')
      await expect(page.getByTestId('preact/hooks-version')).toHaveText(await page.getByTestId('preact-version').innerText())
      await page.getByTestId(`output-${output}`).click()
      if (selection === 'all') {
        await page.getByRole('button', { name: 'Check all' }).click()
      }
      const selectedImports = await page.locator('input[data-imp]:checked').evaluateAll((inputs) =>
        inputs.map((input) => input.dataset.imp)
      )
      if (selectedImports.includes('htm')) selectedImports.push('html')
      const { preactBundle } = await downloadPreactBundle({ page })
      const exports = await page.evaluate(async ({ preactBundle, output }) => {
        if (output === 'esm') {
          const url = URL.createObjectURL(new Blob([preactBundle], { type: 'text/javascript' }))
          try {
            return Object.keys(await import(url))
          } finally {
            URL.revokeObjectURL(url)
          }
        }
        const script = document.createElement('script')
        script.textContent = preactBundle
        document.body.appendChild(script)
        script.remove()
        return Object.keys(window.standalonePreact)
      }, { preactBundle, output })
      expect(exports.sort()).toEqual(selectedImports.sort())
    })
  }

  test(`Run hooks and signals together in a generated bundle (${output})`, async({ page }) => {
    await page.goto('index.html')
    await page.getByTestId(`output-${output}`).click()
    await testHooksAndSignals({ page, output })
  })
}

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
