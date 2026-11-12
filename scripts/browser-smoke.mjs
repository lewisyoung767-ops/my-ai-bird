import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('test-results',{recursive:true});
const server=spawn(process.execPath,['start.js'],{env:{...process.env,PORT:'3099',DEMO_MODE:'true',CYCLE_SECONDS:'5'},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
let browser;
try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3099/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,output);
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3099');await page.getByText('Connected',{exact:true}).waitFor();
  await page.waitForTimeout(2000);assert.equal(await page.locator('#renderError').isVisible(),false);
  await page.screenshot({path:'test-results/room-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Pause Brain',exact:true}).click();await page.getByRole('button',{name:'Resume Brain',exact:true}).waitFor();
  await page.getByRole('button',{name:'Gallery / Desk'}).click();await page.getByRole('button',{name:/first-sketch.svg/}).click();await page.locator('#preview').waitFor({state:'visible'});
  await page.screenshot({path:'test-results/gallery-desktop.png',fullPage:true});
  const frame=page.frameLocator('#preview');await frame.locator('svg').waitFor();
  await fs.writeFile('bird_creations/sandbox-test.html',`<button id="test">Click</button><p id="result">Waiting</p><script>document.querySelector('#test').onclick=()=>{let blocked=false;try{void parent.document.body}catch(e){blocked=true}document.querySelector('#result').textContent=blocked?'Interactive and isolated':'UNSAFE'}</script>`);
  await page.getByRole('button',{name:'Close gallery'}).click();await page.getByRole('button',{name:'Gallery / Desk'}).click();await page.getByRole('button',{name:/sandbox-test.html/}).click();
  await frame.getByRole('button',{name:'Click'}).click();await frame.getByText('Interactive and isolated').waitFor();
  assert.equal(await frame.locator('body').evaluate(()=>fetch('/api/state').then(()=>false,()=>true)),true);
  await page.getByRole('button',{name:'Close gallery'}).click();
  await page.locator('#messageInput').fill('I like green beetles. What will you make next?');await page.getByRole('button',{name:'Send'}).click();await page.getByText('I like green beetles. What will you make next?',{exact:true}).waitFor();
  await page.locator('#taskDescription').fill('Draw a lighthouse at sunrise');await page.getByRole('button',{name:'Suggest idea'}).click();await page.getByText('Draw a lighthouse at sunrise',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Resume Brain',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.request-card').length>0,{},{timeout:40000});
  await page.getByRole('button',{name:'Grant',exact:true}).first().click();await page.getByText('✓ You granted this request').waitFor();
  await page.getByRole('button',{name:'Open result',exact:true}).first().waitFor();await page.getByRole('button',{name:'Open result',exact:true}).first().click();await page.frameLocator('#preview').locator('svg').waitFor();await page.getByRole('button',{name:'Close gallery'}).click();
  assert.ok((await(await fetch('http://127.0.0.1:3099/api/world')).json()).objects.length>0);
  await page.getByRole('button',{name:'Internet: on',exact:true}).click();await page.getByRole('button',{name:'Internet: off',exact:true}).waitFor();await page.getByRole('button',{name:'Reset room additions'}).click();
  await page.screenshot({path:'test-results/conversation.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'test-results/room-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.doesNotMatch(output,/Brain cycle:|Error:/);
  console.log('Browser checks passed: WebGL, gallery, isolated interactive HTML, pause/resume, messages, requests and mobile layout.');
}finally{await browser?.close();const closed=new Promise(r=>server.once('exit',r));server.kill();await closed;}
