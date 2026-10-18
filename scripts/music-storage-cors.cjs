// Uses the existing Firebase CLI login; credentials are never printed or stored here.
const auth = require('../firebase/functions/node_modules/firebase-tools/lib/auth');
const { requireAuth } = require('../firebase/functions/node_modules/firebase-tools/lib/requireAuth');
const { Client } = require('../firebase/functions/node_modules/firebase-tools/lib/apiv2');
(async () => {
  const options = { project: 'geeta-56cdb', projectRoot: process.cwd() };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (account) auth.setActiveAccount(options, account);
  await requireAuth(options);
  const client = new Client({ urlPrefix: 'https://storage.googleapis.com/storage', apiVersion: 'v1', auth: true });
  const path = '/b/geeta-56cdb.firebasestorage.app';
  const response = await client.get(path, { queryParams: { fields: 'name,cors,metageneration' } });
  const existing = response.body.cors ?? [];
  console.log(JSON.stringify({ bucket: response.body.name, cors: existing }, null, 2));
  if (!process.argv.includes('--apply')) return;
  const origins = ['https://geeta-56cdb.firebaseapp.com', 'https://geeta-56cdb.web.app'];
  const cors = [...existing];
  for (const origin of origins) if (!existing.some(rule => (rule.origin.includes(origin) || rule.origin.includes('*')) && rule.method.includes('GET') && rule.method.includes('HEAD'))) cors.push({ origin: [origin], method: ['GET', 'HEAD'], responseHeader: ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'], maxAgeSeconds: 3600 });
  await client.patch(path, { cors }, { queryParams: { ifMetagenerationMatch: response.body.metageneration } });
  console.log('Music bucket browser-download CORS updated for the two existing admin origins. Existing CORS entries retained.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
