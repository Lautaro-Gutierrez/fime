const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectEnum() {
  console.log('Querying database enum values...');
  
  // Since we cannot run raw SQL directly, let's see if we can get list of enums 
  // via pg_catalog tables exposed by postgrest if they are.
  // Wait, pg_catalog is usually not exposed, but let's try calling a query or inspect.
  // Alternatively, let's try to insert an expense with category "suscripciones" and see if it fails with enum error.
  
  const dummyExpense = {
    amount: 100,
    category: 'suscripciones',
    type: 'variable',
    date: new Date().toISOString().split('T')[0],
    note: 'Enum Test',
  };

  const { data: users } = await supabase.auth.admin.listUsers({ limit: 1 });
  if (users && users.users.length > 0) {
    const userId = users.users[0].id;
    const { error } = await supabase
      .from('expenses')
      .insert({ ...dummyExpense, user_id: userId })
      .select();
      
    if (error) {
      console.log('INSERT WITH "suscripciones" RESULT:', error);
    } else {
      console.log('INSERT WITH "suscripciones" SUCCESS!');
      // clean up
    }
  }
}

inspectEnum();
