const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { value:'', textContent:'', innerHTML:'', style:{}, className:'', disabled:false, checked:false,
    classList:{add(){},remove(){}}, addEventListener(){}, setAttribute(){}, querySelectorAll(){return []}, getContext(){return {}}, appendChild(){} });
  return nodes.get(id);
}
const chart = () => ({data:{labels:[],datasets:[{data:[],pointBackgroundColor:[]},{data:[]}]},options:{scales:{x:{grid:{},ticks:{}},y:{grid:{},ticks:{}},y1:{}}},update(){}});
let copied = '', alerts = [];
const context = { console, URL, AbortController, performance, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: cb => cb(), alert: x => alerts.push(x), confirm: () => true,
  navigator:{clipboard:{writeText:async x => {copied=x}}}, localStorage:{getItem(){},setItem(){}},
  window:{location:{origin:'https://example.test',pathname:'/',hash:''}},
  document:{getElementById:node,addEventListener(){},documentElement:{getAttribute(){return 'light'},setAttribute(){}}},
  Chart:function(){return chart()}, fetch:async (_url,opts) => new Promise((resolve,reject) => {
    opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));
  })
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
vm.runInContext('latencyChart = new Chart(); statusChart = new Chart();',context);
async function main() {
  node('target-url').value='https://example.test/api?secret=hidden'; node('http-method').value='GET';
  node('total-requests').value='2'; node('concurrency-slider').value='2'; node('delay-slider').value='0';
  node('request-body').value='secret-body';
  vm.runInContext('shareConfiguration()',context); await Promise.resolve();
  assert(!copied.includes('secret')); assert(!copied.includes('example.test/api'));
  node('total-requests').value='-1'; await vm.runInContext('startTest()',context);
  assert(alerts.some(x=>x.includes('50,000'))); assert.equal(vm.runInContext('state.isRunning',context),false);
  node('total-requests').value='2'; const run=vm.runInContext('startTest()',context);
  assert.equal(vm.runInContext('state.activeWorkers',context),2);
  vm.runInContext('stopTest()',context); assert.equal(node('btn-start').disabled,true);
  await run; assert.equal(vm.runInContext('state.isRunning',context),false);
  assert.equal(vm.runInContext('state.results.length',context),0);
  assert.equal(node('btn-start').disabled,false); assert.equal(node('status-badge').textContent,'Stopped');
  console.log('Passed: sharing redacts secrets, validation rejects invalid volume, cancellation waits for workers.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
