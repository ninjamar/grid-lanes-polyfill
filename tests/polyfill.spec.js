import { test, expect } from '@playwright/test';

/**
 * Setup helper: inject test HTML with demo-accurate CSS and polyfill initialization
 * KEY: Must include `display: grid-lanes` in CSS for Chrome to compute grid-template-* values
 */
async function setupGrid(page, { css = '', html = '' } = {}) {
  await page.goto('/');
  await page.setContent(`<!DOCTYPE html><html><head><style>
    body { margin: 0; padding: 0; }
    ${css}
  </style></head><body>
    ${html}
    <script type="module">
      import GridLanesPolyfill from '/grid-lanes-polyfill.js';
      window.GridLanesPolyfill = GridLanesPolyfill;
      window.__result = GridLanesPolyfill.init({ force: true });
      window.__ready = true;
    </script>
  </body></html>`);
  await page.waitForFunction(() => window.__ready === true);
}

/**
 * Test 1: API surface
 */
test('API: supportsGridLanes returns boolean', async ({ page }) => {
  await setupGrid(page, {
    css: '.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }',
    html: '<div class="g"><div style="height:100px"></div></div>'
  });

  const result = await page.evaluate(() => {
    return typeof window.GridLanesPolyfill.supportsGridLanes();
  });
  expect(result).toBe('boolean');
});

test('API: init() returns expected shape', async ({ page }) => {
  await setupGrid(page, {
    css: '.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }',
    html: '<div class="g"><div style="height:100px"></div></div>'
  });

  const supported = await page.evaluate(() => window.__result.supported);
  const instancesSize = await page.evaluate(() => window.__result.instances.size);
  const refreshType = await page.evaluate(() => typeof window.__result.refresh);
  const destroyType = await page.evaluate(() => typeof window.__result.destroy);

  expect(supported).toBe(false); // No native support in test env
  expect(instancesSize).toBeGreaterThan(0);
  expect(refreshType).toBe('function');
  expect(destroyType).toBe('function');
});

test('API: version string exists', async ({ page }) => {
  await setupGrid(page, {
    css: '.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }',
    html: '<div class="g"><div style="height:100px"></div></div>'
  });

  const version = await page.evaluate(() => window.GridLanesPolyfill.version);
  expect(typeof version).toBe('string');
});

/**
 * Test 2: Container detection and marking
 */
test('Container: data-grid-lanes-polyfilled attribute set', async ({ page }) => {
  await setupGrid(page, {
    css: '.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }',
    html: '<div id="c1" class="g"><div style="height:100px"></div></div>'
  });

  const hasAttr = await page.evaluate(() => {
    return document.querySelector('#c1').hasAttribute('data-grid-lanes-polyfilled');
  });
  expect(hasAttr).toBe(true);
});

test('Container: position:relative and display:block set', async ({ page }) => {
  await setupGrid(page, {
    css: '.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }',
    html: '<div id="c1" class="g"><div style="height:100px"></div></div>'
  });

  const result = await page.evaluate(() => {
    const el = document.querySelector('#c1');
    return {
      pos: el.style.position,
      dis: el.style.display,
    };
  });
  expect(result.pos).toBe('relative');
  expect(result.dis).toBe('block');
});

/**
 * Test 3: Waterfall with fixed columns (mirrors demo 4 structure)
 */
test('Demo 4 (placed): repeat(5, 1fr) with fixed container width', async ({ page }) => {
  // From demo: grid-template-columns: repeat(5, 1fr), gap: 16px
  // Container width 480px: 480 - 64(gaps) = 416, 416/5 = 83.2px per lane
  await setupGrid(page, {
    css: `
      .placed {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        width: 480px;
      }
    `,
    html: `
      <div class="placed">
        <div style="height: 80px">1</div>
        <div style="height: 90px">2</div>
        <div style="height: 85px">3</div>
        <div style="height: 100px">4</div>
        <div style="height: 95px">5</div>
      </div>
    `
  });

  // All items should be positioned absolutely
  const positions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.placed > div')).map(el => el.style.position);
  });
  expect(positions.every(p => p === 'absolute')).toBe(true);

  // Should have 5 distinct left values (5 lanes)
  const leftValues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.placed > div')).map(el => el.style.left);
  });
  const uniqueLefts = new Set(leftValues);
  expect(uniqueLefts.size).toBe(5);

  // Container should have minHeight
  const minHeight = await page.evaluate(() => {
    return document.querySelector('.placed').style.minHeight;
  });
  expect(minHeight).toMatch(/^\d+(\.\d+)?px$/);
});

/**
 * Test 4: Demo 1 - Gallery (auto-fill with minmax)
 */
test('Demo 1 (gallery): repeat(auto-fill, minmax(200px, 1fr))', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .gallery {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        width: 600px;
      }
    `,
    html: `
      <div class="gallery">
        <div style="height: 250px"></div>
        <div style="height: 280px"></div>
        <div style="height: 300px"></div>
        <div style="height: 270px"></div>
      </div>
    `
  });

  // Should create 3 lanes from 600px width
  const leftValues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.gallery > div')).map(el => el.style.left);
  });
  const uniqueLefts = new Set(leftValues);
  expect(uniqueLefts.size).toBeGreaterThanOrEqual(2); // At least 2 lanes
});

/**
 * Test 5: Demo 2 - Varying columns
 */
test('Demo 2 (varying-cols): complex repeat pattern', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .varying-cols {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr) minmax(180px, 2fr)) minmax(120px, 1fr);
        gap: 12px;
        width: 500px;
      }
    `,
    html: `
      <div class="varying-cols">
        <div style="height: 100px">1</div>
        <div style="height: 120px">2</div>
        <div style="height: 110px">3</div>
        <div style="height: 130px">4</div>
      </div>
    `
  });

  // Should parse complex template without error
  const positions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.varying-cols > div')).map(el => el.style.position);
  });
  expect(positions.every(p => p === 'absolute')).toBe(true);
});

/**
 * Test 6: Demo 3 - Newspaper with spanning
 */
test('Demo 3 (newspaper): spanning items', async ({ page }) => {
  // From demo: grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)), gap: 24px
  // With 400px width: 400 - 72(gaps for 4 lanes) = 328, 328/4 ≈ 82px per lane
  await setupGrid(page, {
    css: `
      .newspaper {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 24px;
        width: 400px;
        --flow-tolerance: 1em;
      }
      .article.hero { grid-column: span 3; }
      .article.featured { grid-column: span 2; }
    `,
    html: `
      <div class="newspaper">
        <article class="article hero" style="height: 100px">Hero</article>
        <article class="article featured" style="height: 120px">Featured</article>
        <article class="article" style="height: 100px">Regular</article>
      </div>
    `
  });

  // Hero should span 3 lanes
  const heroWidth = await page.evaluate(() => {
    return document.querySelector('.article.hero').style.width;
  });
  expect(heroWidth).toMatch(/^\d+(\.\d+)?px$/);
  expect(parseInt(heroWidth)).toBeGreaterThan(200); // Should be ~3 lanes worth

  // Featured should span 2 lanes
  const featuredWidth = await page.evaluate(() => {
    return document.querySelector('.article.featured').style.width;
  });
  expect(parseInt(featuredWidth)).toBeGreaterThan(150); // Should be ~2 lanes worth

  // Regular items should be positioned below spanning items
  const regularTop = await page.evaluate(() => {
    return parseInt(document.querySelector('.article:nth-child(3)').style.top);
  });
  expect(regularTop).toBeGreaterThan(0);
});

/**
 * Test 7: Demo 4 - Explicit placement with negative indices
 */
test('Demo 4 (placed): grid-column: -2 / -1 (negative index)', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .placed {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        width: 480px;
      }
      .special { grid-column: -2 / -1; }
    `,
    html: `
      <div class="placed">
        <div class="special" style="height: 80px">Special</div>
        <div style="height: 90px">Auto 1</div>
        <div style="height: 85px">Auto 2</div>
      </div>
    `
  });

  const specialLeft = await page.evaluate(() => {
    return document.querySelector('.special').style.left;
  });
  const specialWidth = await page.evaluate(() => {
    return document.querySelector('.special').style.width;
  });

  // Should be positioned in lane 4 (0-indexed) = -2/-1 for 5-col grid
  // Width should be 1 lane wide
  expect(specialLeft).toMatch(/^\d+(\.\d+)?px$/);
  expect(parseInt(specialWidth)).toBeGreaterThan(70); // ~1 lane worth

  // Auto items should NOT be at same left as special
  const auto1Left = await page.evaluate(() => {
    return document.querySelector('.placed > div:nth-child(2)').style.left;
  });
  expect(auto1Left).not.toBe(specialLeft);
});

/**
 * Test 8: Demo 5 - Brick layout (row-based)
 */
test('Demo 5 (brick): grid-template-rows horizontal flow', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .brick {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-rows: repeat(3, 100px);
        gap: 12px;
      }
    `,
    html: `
      <div class="brick">
        <div style="height: 100px; width: 120px">Brick 1</div>
        <div style="height: 100px; width: 180px">Brick 2</div>
        <div style="height: 100px; width: 100px">Brick 3</div>
        <div style="height: 100px; width: 150px">Brick 4</div>
      </div>
    `
  });

  // All should be absolutely positioned
  const positions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.brick > div')).map(el => el.style.position);
  });
  expect(positions.every(p => p === 'absolute')).toBe(true);

  // Top values should cycle through row lanes (0, 112, 224 for 100px + 12px gap)
  const topValues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.brick > div')).map(el => el.style.top);
  });
  const uniqueTops = new Set(topValues);
  expect(uniqueTops.size).toBe(3); // 3 rows
});

/**
 * Test 9: Demo 6 - Gap parsing
 */
test('Demo 6 (mega-menu): gap shorthand (row-gap / column-gap)', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .mega-menu {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(3, 100px);
        gap: 32px 24px;
        width: 348px;
      }
    `,
    html: `
      <div class="mega-menu">
        <div style="height: 100px">G1</div>
        <div style="height: 150px">G2</div>
        <div style="height: 120px">G3</div>
        <div style="height: 80px">G4</div>
      </div>
    `
  });

  // Lane offsets should reflect column-gap (24px):
  // Lane 0: 0px
  // Lane 1: 100 + 24 = 124px
  // Lane 2: 200 + 48 = 248px
  const leftValues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.mega-menu > div')).map(el => el.style.left);
  });
  const uniqueLefts = [...new Set(leftValues)].sort((a, b) => parseInt(a) - parseInt(b));
  expect(uniqueLefts.length).toBe(3); // 3 lanes
  expect(parseInt(uniqueLefts[0])).toBe(0);
  expect(parseInt(uniqueLefts[1])).toBe(124);
  expect(parseInt(uniqueLefts[2])).toBe(248);
});

/**
 * Test 10: refresh() method
 */
test('refresh() re-runs layout after content change', async ({ page }) => {
  await setupGrid(page, {
    css: `
      .g {
        --grid-lanes-polyfill: 1;
        display: grid-lanes;
        grid-template-columns: repeat(2, 100px);
        gap: 10px;
        width: 220px;
      }
    `,
    html: `
      <div class="g">
        <div id="d1" style="height: 100px">Item 1</div>
        <div style="height: 150px">Item 2</div>
      </div>
    `
  });

  const minHeightBefore = await page.evaluate(() => {
    return parseInt(document.querySelector('.g').style.minHeight);
  });

  // Increase item height
  await page.evaluate(() => {
    document.querySelector('#d1').style.height = '300px';
  });

  // Call refresh
  await page.evaluate(() => window.__result.refresh());

  const minHeightAfter = await page.evaluate(() => {
    return parseInt(document.querySelector('.g').style.minHeight);
  });

  expect(minHeightAfter).toBeGreaterThan(minHeightBefore);
});

/**
 * Test 11: destroy() cleanup
 */
test('destroy() removes data attribute', async ({ page }) => {
  await setupGrid(page, {
    css: `.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }`,
    html: `<div id="c" class="g"><div style="height:100px"></div></div>`
  });

  expect(await page.evaluate(() => document.querySelector('#c').hasAttribute('data-grid-lanes-polyfilled'))).toBe(true);

  await page.evaluate(() => window.__result.destroy());

  expect(await page.evaluate(() => document.querySelector('#c').hasAttribute('data-grid-lanes-polyfilled'))).toBe(false);
});

test('destroy() clears inline styles', async ({ page }) => {
  await setupGrid(page, {
    css: `.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }`,
    html: `<div id="c" class="g"><div style="height:100px"></div></div>`
  });

  await page.evaluate(() => window.__result.destroy());

  const result = await page.evaluate(() => {
    const c = document.querySelector('#c');
    const item = document.querySelector('#c > div');
    return {
      cPos: c.style.position,
      cDis: c.style.display,
      itemPos: item.style.position,
    };
  });

  expect(result.cPos).toBe('');
  expect(result.cDis).toBe('');
  expect(result.itemPos).toBe('');
});

/**
 * Test 12: MutationObserver
 */
test('MutationObserver: dynamically added item is positioned', async ({ page }) => {
  await setupGrid(page, {
    css: `.g { --grid-lanes-polyfill: 1; display: grid-lanes; grid-template-columns: repeat(2, 100px); gap: 10px; width: 220px; }`,
    html: `<div class="g"><div style="height:100px">Item 1</div></div>`
  });

  // Add a new item
  await page.evaluate(() => {
    const newItem = document.createElement('div');
    newItem.style.height = '150px';
    newItem.textContent = 'Item 2';
    document.querySelector('.g').appendChild(newItem);
  });

  // Wait for it to be positioned
  await page.waitForFunction(() => {
    const newItem = document.querySelector('.g > div:last-child');
    return newItem.style.position === 'absolute';
  });

  const newItemLeft = await page.evaluate(() => {
    return document.querySelector('.g > div:last-child').style.left;
  });
  expect(newItemLeft).toMatch(/^\d+(\.\d+)?px$/);
});
