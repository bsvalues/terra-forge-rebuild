// Quick check if the new Supabase project has tables
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1); }
const base = process.env.SUPABASE_URL;
if (!base) { console.error('SUPABASE_URL not set'); process.exit(1); }
const url = `${base}/rest/v1/counties?select=id&limit=1`;

fetch(url, {
  headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact' }
})
.then(r => {
  console.log('STATUS:', r.status);
  console.log('RANGE:', r.headers.get('content-range'));
  return r.text();
})
.then(t => console.log('BODY:', t.substring(0, 200)))
.catch(e => console.error('ERROR:', e.message));
