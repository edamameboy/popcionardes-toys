import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://tatimwugdrekzcadmsnc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdGltd3VnZHJla3pjYWRtc25jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjA0MTEsImV4cCI6MjA5NzAzNjQxMX0.YsVBVmiCOFyv-oiofjQFs_yRtN4s-LkOjW5tkUNiLbE');

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

check();
