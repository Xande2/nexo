// Runs only against the private server/database created by integration_smoke.py.
// Imports the real mobile HTTP client rather than reproducing its requests.
import assert from 'node:assert/strict';
import {createApi} from '../app-mobile/src/api.ts';
import {createTaskStore} from '../app-mobile/src/store.ts';

const origin = process.env.NEXO_TEST_ORIGIN;
assert.ok(origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Use the private loopback test server');
const api = createApi({baseUrl: `${origin}/api`});
const title = 'Integração mobile <financeiro> & revisão';
const task = await api.create({titulo: title, descricao: 'Criado pelo cliente real do app', prioridade: 'Alta'});
assert.equal(task.status, 'Aberto');
assert.ok((await api.list()).some(item => item.id === task.id));
let cookies = '';
async function page(path, options = {}) {
  const response = await fetch(`${origin}${path}`, {
    ...options, redirect: 'manual', headers: {...options.headers, ...(cookies ? {Cookie: cookies} : {})},
  });
  const setCookies = response.headers.getSetCookie();
  if (setCookies.length) cookies = setCookies.map(value => value.split(';')[0]).join('; ');
  return {response, html: await response.text()};
}
let result = await page('/');
assert.equal(result.response.status, 200);
assert.ok(result.html.includes('Integração mobile &lt;financeiro&gt; &amp; revisão'), 'Web escapes the real mobile-created title');
assert.ok(!result.html.includes(title), 'Stored HTML is never interpreted');
await api.setStatus(task.id, 'Concluido');
await api.setStatus(task.id, 'Concluido'); // explicit status is idempotent
result = await page('/?status=Concluido');
assert.equal(result.response.status, 200);
assert.ok(result.html.includes('&lt;financeiro&gt;'), 'Completed filter contains the task');
const open = await page('/?status=Aberto');
assert.ok(!open.html.includes('&lt;financeiro&gt;'), 'Open filter excludes the task');
const confirmationHref = [...result.html.matchAll(/href=["']([^"']+)["']/g)]
  .map(match => match[1].replaceAll('&amp;', '&'))
  .find(href => href.includes('/excluir') && new URL(href, origin).searchParams.get('id') === String(task.id));
assert.ok(confirmationHref, 'Web exposes a real confirmation link for this task');
result = await page(confirmationHref);
assert.equal(result.response.status, 200);
assert.match(result.html, /[Cc]onfirm|[Ee]xcluir/);
const fields = new URLSearchParams();
for (const [tag] of result.html.matchAll(/<input\b[^>]*>/g)) {
  const name = /\bname=["']([^"']+)["']/.exec(tag)?.[1];
  const value = /\bvalue=["']([^"']*)["']/.exec(tag)?.[1];
  if (name && value !== undefined) fields.set(name, value.replaceAll('&amp;', '&'));
}
assert.ok([...fields.keys()].some(name => /csrf|token/i.test(name)), 'Confirmation includes CSRF token');
const store = createTaskStore(api);
await store.refresh();
assert.ok(store.getSnapshot().tasks.some(item => item.id === task.id), 'Mobile store holds the task before Web deletion');
const formAction = /<form\b[^>]*action=["']([^"']*)["']/.exec(result.html)?.[1]?.replaceAll('&amp;', '&') || '/excluir';
result = await page(formAction, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: fields});
assert.ok([302, 303].includes(result.response.status), `Web delete uses PRG, received ${result.response.status}`);
assert.ok(!(await api.list()).some(item => item.id === task.id), 'Mobile refresh reflects Web deletion');
await store.refresh();
assert.ok(!store.getSnapshot().tasks.some(item => item.id === task.id), 'Mobile store refresh drops the deleted task (detail screen returns to the list)');
console.log('PASS: real mobile client creates → Web lists → mobile completes → Web filters → Web confirms/deletes → mobile refreshes');
