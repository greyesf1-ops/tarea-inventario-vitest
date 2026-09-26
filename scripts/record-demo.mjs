import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Graba un navegador real. Las operaciones se envían a la API en ejecución;
// los resultados de las suites se leen de los logs de esta misma ejecución.
const output = 'evidencias/generated';
await mkdir(output, { recursive: true });
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const read = file => readFile(file, 'utf8');
const unit = await read(`${output}/unit.log`);
const integration = await read(`${output}/integration.log`);
const domain = await read('src/domain.ts');
const tests = await read('tests/integration/postgres.test.ts');
const unitTests = await read('tests/unit/inventory.test.ts');
const scenes = [
  { title: 'Inventario · TypeScript + PostgreSQL', subtitle: 'Registrar, consultar y retirar productos con reglas verificables.', body: '<h2>Un flujo completo de inventario</h2><ul><li>SKU único y nombre obligatorio.</li><li>Stock entero entre 0 y 1 000 000.</li><li>Retirar exactamente el stock es válido; excederlo devuelve 409.</li><li>Actualización SQL atómica contra sobreventa.</li></ul><p>Dominio → servicio → repositorio PostgreSQL → API HTTP</p><p>Las migraciones versionadas mantienen el esquema.</p>' },
  { title: 'API real · base de la aplicación', subtitle: 'Peticiones HTTP en vivo. PostgreSQL de Compose, separado del contenedor de pruebas.', body: '<div id="buttons"><button data-action="create">1. Registrar 5 unidades</button><button data-action="list">2. Consultar</button><button data-action="withdraw">3. Retirar 5</button><button data-action="reject">4. Retirar otra</button><button data-action="list">5. Ver stock final</button></div><pre id="api">API lista. Pulsa una operación.</pre>' },
  { title: 'Prueba unitaria · límites válidos', subtitle: 'Arrange: stock 0 o 1 000 000. Act: validar. Assert: producto normalizado. Sin base de datos.', body: `<pre>${escape(unitTests.split('\n').slice(0,14).join('\n'))}</pre>` },
  { title: 'Vitest · resultados unitarios', subtitle: 'Salida real del paso unitario de GitHub Actions. Se ejecuta con vitest run, sin modo watch.', body: `<pre class="logs">${escape(unit.split('\n').filter(line => /Test Files|Tests |Duration|Start at|RUN |✓|✔/.test(line)).slice(-22).join('\n'))}</pre>` },
  { title: 'Integración · PostgreSQL temporal', subtitle: 'Testcontainers crea PostgreSQL, entrega el URI y aplica migraciones. No lee DATABASE_URL.', body: `<pre>${escape(tests.split('\n').slice(14,30).join('\n'))}</pre><p>Antes de cada caso: TRUNCATE. Al finalizar: cerrar servidor, pool y contenedor.</p>` },
  { title: 'Vitest · resultados de integración', subtitle: 'Repositorio y API reales: escritura/lectura, unicidad, CHECK, stock cero y concurrencia.', body: `<pre class="logs">${escape(integration.split('\n').filter(line => /Test Files|Tests |Duration|Start at|RUN |✓|✔|Testcontainers:/.test(line)).join('\n'))}</pre>` },
  { title: 'Persistencia · escritura y recuperación', subtitle: 'El producto insertado se consulta de nuevo. PostgreSQL también rechaza SKU duplicado.', body: `<pre>${escape(tests.split('\n').slice(38,52).join('\n'))}</pre><p>El workflow ejecuta ambas suites en pasos independientes y falla si cualquiera falla.</p>` }
];
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Demostración de inventario</title><style>*{box-sizing:border-box}body{margin:0;background:#0c1627;color:#eef4fc;font:21px Arial}header{padding:28px 42px 14px;border-bottom:1px solid #345}small{color:#59dfc1;font-size:15px;letter-spacing:2px}h1{font-size:32px;margin:12px 0}header p{font-size:19px;color:#b9cbe1;margin:10px 0}main{padding:24px 42px}h2{font-size:28px}li{margin:18px 0}pre{font:17px/1.42 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0;padding:20px;background:#13243c;border-radius:12px}pre.logs{font-size:16px;line-height:1.35}button{background:#59dfc1;color:#082b28;border:0;border-radius:7px;padding:12px;margin-right:8px;font-weight:bold;cursor:pointer}footer{position:fixed;bottom:0;left:0;right:0;background:#172b44;padding:13px 42px;font-size:15px;color:#b9cbe1}#api{font-size:19px;line-height:1.55}</style><header><small>ASEGURAMIENTO DE CALIDAD · DEMOSTRACIÓN GRABADA</small><h1 id="title"></h1><p id="subtitle"></p></header><main id="content"></main><footer>greyesf1-ops/tarea-inventario-vitest · Código y logs de la misma ejecución · <span id="number"></span></footer><script>const scenes=${JSON.stringify(scenes).replaceAll('<','\u003c')};let productId;window.showScene=i=>{document.querySelector('#title').textContent=scenes[i].title;document.querySelector('#subtitle').textContent=scenes[i].subtitle;document.querySelector('#content').innerHTML=scenes[i].body;document.querySelector('#number').textContent=(i+1)+' / '+scenes.length};showScene(0);document.addEventListener('click',async event=>{const action=event.target.dataset.action;if(!action)return;const response=await fetch('/operation/'+action,{method:'POST'});const result=await response.json();document.querySelector('#api').textContent=result.method+' '+result.path+'\\nHTTP '+result.status+'\\n\\n'+JSON.stringify(result.body,null,2);window.lastResult=result;});</script></html>`;
let productId;
const operations = [];
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(html); }
  try {
    const action = req.url.split('/').at(-1);
    const method = action === 'list' ? 'GET' : 'POST';
    const path = ['withdraw','reject'].includes(action) ? `/products/${productId}/withdrawals` : '/products';
    const body = action === 'create' ? {sku:'VIDEO-01',name:'Cuaderno',stock:5} : action === 'withdraw' ? {quantity:5} : {quantity:1};
    const result = await fetch('http://127.0.0.1:3001'+path, {method, headers:{'Content-Type':'application/json'}, ...(method === 'POST' ? {body:JSON.stringify(body)} : {})});
    const data = await result.json();
    if (action === 'create') productId=data.id;
    const evidence = {method,path,status:result.status,body:data};
    operations.push(evidence);
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(evidence));
  } catch(error) { res.statusCode=500; res.end(JSON.stringify({error:String(error)})); }
});
await new Promise(resolve => server.listen(3099,'127.0.0.1',resolve));
let browser;
try {
  for(let attempt=0;attempt<30;attempt++) {
    try { const response=await fetch('http://127.0.0.1:3001/products'); if(response.ok) break; } catch {}
    if(attempt===29) throw new Error('La API no arrancó');
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:output,size:{width:1280,height:720}}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3099');
  await page.screenshot({path:`${output}/01-problema.png`});
  await page.waitForTimeout(12000);
  await page.evaluate(()=>window.showScene(1));
  for(const [index,action] of ['create','list','withdraw','reject','list'].entries()) {
    await page.evaluate(()=>{window.lastResult=null;});
    await page.locator(`[data-action="${action}"]`).first().click();
    await page.waitForFunction(()=>window.lastResult!==null);
    const evidence=await page.evaluate(()=>window.lastResult);
    assert.equal(evidence.status,action==='create'?201:action==='reject'?409:200);
    if(index===4) assert.equal(evidence.body[0].stock,0);
    await page.screenshot({path:`${output}/02-api-${index+1}.png`});
    await page.waitForTimeout(6500);
  }
  for(let i=2;i<scenes.length;i++) {
    await page.evaluate(i=>window.showScene(i),i);
    await page.screenshot({path:`${output}/0${i+1}-evidencia.png`});
    await page.waitForTimeout(i===4?16000:12000);
  }
  const video=page.video();
  await context.close();
  await rename(await video.path(),`${output}/demostracion.webm`);
  await writeFile(`${output}/api-responses.json`,JSON.stringify({commit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,operations},null,2));
  console.log('Grabación real y capturas guardadas; respuestas de API verificadas.');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
