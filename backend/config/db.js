const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// Test connection
supabase.from('users').select('id').limit(1)
    .then(({ error }) => {
        if (error) console.error('❌ Database connection error:', error.message);
        else console.log('✅ Connected to Supabase');
    });

module.exports = supabase;