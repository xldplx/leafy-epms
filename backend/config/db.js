const path = require('path');

// only look for a local .env file if we aren't running inside vercel production
if (!process.env.VERCEL) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

module.exports = supabase;