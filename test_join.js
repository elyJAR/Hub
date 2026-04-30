const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Current HTML:');
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  console.log(html.substring(0, 500) + '...');
  
  // Wait a bit to see if anything changes
  await new Promise(r => setTimeout(r, 2000));
  
  const hasJoinBtn = await page.$('button[type="submit"]');
  if (hasJoinBtn) {
    console.log('Found Join button, filling form...');
    await page.type('#displayName', 'TestUser');
    await page.click('button[type="submit"]');
    console.log('Clicked Join button. Waiting 5 seconds...');
    
    // Log DOM changes for 5 seconds
    let lastHtml = '';
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const currentHtml = await page.evaluate(body => body.innerHTML, bodyHandle);
      if (currentHtml !== lastHtml) {
        console.log(`DOM changed at second ${i+1}. Length: ${currentHtml.length}`);
        if (currentHtml.includes('MainInterface') || currentHtml.includes('ChatInterface')) {
          console.log('Main interface detected!');
        } else if (currentHtml.includes('displayName')) {
          console.log('Join form detected!');
        } else {
          console.log('Other content detected:', currentHtml.substring(0, 100));
        }
        lastHtml = currentHtml;
      }
    }
  } else {
    console.log('No Join button found. Are we stuck on loading?');
    const fullHtml = await page.evaluate(body => body.innerHTML, bodyHandle);
    console.log('Full HTML:');
    console.log(fullHtml);
  }
  
  await browser.close();
  console.log('Done.');
})();
