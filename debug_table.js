const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Ignore HTTPS certificate errors
  await page.goto('https://localhost/aw/campaigns', { waitUntil: 'networkidle', timeout: 15000 });

  // Wait for Vue to render the table
  await page.waitForSelector('table.ga-data-table.campaigns', { timeout: 10000 });
  await page.waitForTimeout(2000); // extra time for Vue rendering

  // Take a screenshot
  await page.screenshot({ path: '/Users/dan/Documents/GoogleAds/debug_screenshot.png', fullPage: false });

  // ── Analyze RIGHT scrollable tables ──
  const rightHeaderTable = await page.$('.ga-scroll-right-header table.ga-data-table');
  const rightBodyTable = await page.$('.ga-scroll-right-inner table.ga-data-table');

  if (rightHeaderTable && rightBodyTable) {
    const headerWidth = await rightHeaderTable.evaluate(el => el.getBoundingClientRect().width);
    const bodyWidth = await rightBodyTable.evaluate(el => el.getBoundingClientRect().width);
    console.log(`\n=== RIGHT TABLE WIDTHS ===`);
    console.log(`Header table width: ${headerWidth}px`);
    console.log(`Body table width:   ${bodyWidth}px`);
    console.log(`Difference:          ${headerWidth - bodyWidth}px`);

    // Check header colgroup col widths
    const headerCols = await rightHeaderTable.$$eval('colgroup col', cols =>
      cols.map(c => ({ style: c.style.width, computed: c.getBoundingClientRect().width }))
    );
    const bodyCols = await rightBodyTable.$$eval('colgroup col', cols =>
      cols.map(c => ({ style: c.style.width, computed: c.getBoundingClientRect().width }))
    );

    console.log(`\n=== HEADER COL WIDTHS ===`);
    headerCols.forEach((c, i) => console.log(`Col ${i}: style.width="${c.style}", computed=${c.computed}px`));
    console.log(`\n=== BODY COL WIDTHS ===`);
    bodyCols.forEach((c, i) => console.log(`Col ${i}: style.width="${c.style}", computed=${c.computed}px`));

    // Check TH widths (header first row)
    const headerTHs = await rightHeaderTable.$$eval('thead th', ths =>
      ths.map(t => ({ text: t.textContent.substring(0, 20), computed: t.getBoundingClientRect().width }))
    );
    console.log(`\n=== HEADER TH WIDTHS ===`);
    headerTHs.forEach((t, i) => console.log(`TH ${i}: "${t.text}" = ${t.computed}px`));

    // Check TD widths (body first data row)
    const bodyTDs = await rightBodyTable.$$eval('tbody tr:not(.draft-row):not(.ga-table-skeleton-row):not(.ga-hidden-row):not(.total-row) td', tds =>
      tds.map(t => ({ computed: t.getBoundingClientRect().width }))
    );
    console.log(`\n=== BODY TD WIDTHS (first data row) ===`);
    bodyTDs.forEach((t, i) => console.log(`TD ${i}: ${t.computed}px`));

    // Compare TH vs TD widths
    console.log(`\n=== COMPARISON (TH vs TD) ===`);
    const max = Math.max(headerTHs.length, bodyTDs.length);
    for (let i = 0; i < max; i++) {
      const thW = headerTHs[i] ? headerTHs[i].computed : 'N/A';
      const tdW = bodyTDs[i] ? bodyTDs[i].computed : 'N/A';
      const diff = (thW !== 'N/A' && tdW !== 'N/A') ? (thW - tdW).toFixed(1) : 'N/A';
      console.log(`Col ${i}: TH=${thW}px  TD=${tdW}px  diff=${diff}px`);
    }
  }

  // ── Analyze LEFT frozen tables ──
  const leftHeaderTable = await page.$('.ga-frozen-left-header table.ga-data-table');
  const leftBodyTable = await page.$('.ga-frozen-left table.ga-data-table');

  if (leftHeaderTable && leftBodyTable) {
    const lhWidth = await leftHeaderTable.evaluate(el => el.getBoundingClientRect().width);
    const lbWidth = await leftBodyTable.evaluate(el => el.getBoundingClientRect().width);
    console.log(`\n=== LEFT TABLE WIDTHS ===`);
    console.log(`Header table width: ${lhWidth}px`);
    console.log(`Body table width:   ${lbWidth}px`);

    const lhTHs = await leftHeaderTable.$$eval('thead th', ths =>
      ths.map(t => ({ text: t.textContent.substring(0, 20), computed: t.getBoundingClientRect().width }))
    );
    const lbTDs = await leftBodyTable.$$eval('tbody tr:not(.draft-row):not(.ga-table-skeleton-row):not(.ga-hidden-row):not(.total-row) td', tds =>
      tds.map(t => ({ computed: t.getBoundingClientRect().width }))
    );
    console.log(`\n=== LEFT COMPARISON ===`);
    const max = Math.max(lhTHs.length, lbTDs.length);
    for (let i = 0; i < max; i++) {
      const thW = lhTHs[i] ? lhTHs[i].computed : 'N/A';
      const tdW = lbTDs[i] ? lbTDs[i].computed : 'N/A';
      const diff = (thW !== 'N/A' && tdW !== 'N/A') ? (thW - tdW).toFixed(1) : 'N/A';
      console.log(`Col ${i}: TH=${thW}px  TD=${tdW}px  diff=${diff}px`);
    }
  }

  // ── Check scroll positions ──
  const scrollHeader = await rightHeaderTable?.evaluateHandle(el => el.closest('.ga-scroll-right-header'));
  const scrollInner = await page.$('.ga-scroll-right-inner');
  if (scrollHeader && scrollInner) {
    const headerScroll = await scrollHeader.evaluate(el => el.scrollLeft);
    const innerScroll = await scrollInner.evaluate(el => el.scrollLeft);
    console.log(`\n=== SCROLL POSITIONS ===`);
    console.log(`Header scrollLeft: ${headerScroll}`);
    console.log(`Inner scrollLeft:  ${innerScroll}`);
  }

  // ── Check container widths ──
  const rightHeaderContainer = await page.$eval('.ga-scroll-right-header', el => el.getBoundingClientRect().width);
  const rightContainer = await page.$eval('.ga-scroll-right', el => el.getBoundingClientRect().width);
  const rightInnerContainer = await page.$eval('.ga-scroll-right-inner', el => el.getBoundingClientRect().width);
  console.log(`\n=== CONTAINER WIDTHS ===`);
  console.log(`ga-scroll-right-header:  ${rightHeaderContainer}px`);
  console.log(`ga-scroll-right:         ${rightContainer}px`);
  console.log(`ga-scroll-right-inner:   ${rightInnerContainer}px`);

  // Also check if initTableColumnWidths ran by checking inline styles
  const headerTableStyle = await rightHeaderTable?.getAttribute('style');
  console.log(`\n=== HEADER TABLE INLINE STYLE ===`);
  console.log(headerTableStyle);

  await browser.close();
  console.log(`\nScreenshot saved to debug_screenshot.png`);
})();
