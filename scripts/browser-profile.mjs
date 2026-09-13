import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { platform, arch, release } from 'node:os';

// Pass two static preview URLs. Runs are sequential so browsers do not compete.
const urls=process.argv.slice(2);
if (urls.length!==2) throw new Error('Usage: node scripts/browser-profile.mjs <baseline URL> <candidate URL>');
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  for(let trial=0;trial<3;trial++) for(const [viewportName,width,height] of [['desktop',1440,900],['mobile',390,844]]) for(const [version,url] of urls.entries()) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:viewportName==='mobile',hasTouch:viewportName==='mobile'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const cdp=await context.newCDPSession(page);
    await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const start=performance.now();await page.goto(url);await page.locator('#nav button').first().waitFor();
    const readyMs=performance.now()-start;
    const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.js')).map(e=>({file:e.name.split('/').pop(),bytes:e.decodedBodySize})));
    async function sample(duration) {
      const before=await cdp.send('Performance.getMetrics');
      const frames=await page.evaluate(ms=>new Promise(resolve=>{
        let previous=null,start;const frames=[];
        function tick(now){start??=now;if(previous!==null)frames.push(now-previous);previous=now;if(now-start<ms)requestAnimationFrame(tick);else resolve(frames.sort((a,b)=>a-b));}requestAnimationFrame(tick);
      }),duration);
      const after=await cdp.send('Performance.getMetrics');
      const delta=name=>after.metrics.find(m=>m.name===name).value-before.metrics.find(m=>m.name===name).value;
      return {taskSeconds:delta('TaskDuration'),layoutSeconds:delta('LayoutDuration'),frameP95:frames[Math.floor(frames.length*.95)],framesOver50ms:frames.filter(n=>n>50).length};
    }
    await page.waitForTimeout(2500);
    const overview=await sample(3000);
    await page.locator('#nav .c-purple').click();await page.waitForTimeout(2500);
    const reading=await sample(2000);
    results.push({trial,viewport:viewportName,version:version?'candidate':'baseline',readyMs,resources,overview,reading,errors});
    console.log(`Trial ${trial+1}: ${viewportName} ${version?'candidate':'baseline'} complete`);
    await context.close();
  }
  const report={browser:browser.version(),platform:platform()+' '+release()+' '+arch(),cpuThrottle:4,deviceScaleFactor:1,urls,results};
  await mkdir('browser-results',{recursive:true});
  await writeFile('browser-results/performance.json',JSON.stringify(report,null,2));
} finally { await browser.close(); }
