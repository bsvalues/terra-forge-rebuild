// Quick check if the new Supabase project has tables
const url = 'https://udjoodlluygvlqccwade.supabase.co/rest/v1/counties?select=id&limit=1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkam9vZGxsdXlndmxxY2N3YWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjE4OTcsImV4cCI6MjA4OTY5Nzg5N30.Usa9Lr6LR2-3kxiIkrChWxWvesAOXhUMgSZW8aIfghg';

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
