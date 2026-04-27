// dotenv already loaded in server.js before this file is required
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('   Make sure backend/.env exists and has the correct values.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

supabase.from('users').select('id').limit(1)
    .then(({ error }) => {
        if (error) console.error('❌ Database connection error:', error.message);
        else console.log('✅ Connected to Supabase (project_management_system)');
    });

module.exports = supabase;