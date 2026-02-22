
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dkmiwnvcodkjrevreqdd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbWl3bnZjb2RranJldnJlcWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDM1MDUsImV4cCI6MjA4NjkxOTUwNX0.CAenoDu5zNxTUHSqqBYDg-pesXQvN7-X9rlWzJsV9Tc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("🔍 Checking 'members' table structure...");

    // Fetch one row to see existing columns
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching data:", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ Current columns detected:", Object.keys(data[0]).join(', '));
    } else {
        console.log("⚠️ Table is empty. Trying to fetch column names via RPC or a dummy insert (don't worry, it won't actually insert if schema is wrong).");
        // Try a dummy insert with all fields to see which one fails first
        const { error: insertError } = await supabase
            .from('members')
            .insert([{ user_id: 'schema_check', username: 'test', bio: 'test', gender: 'Male', language: 'en' }]);

        if (insertError) {
            console.log("❌ Schema validation failed with:", insertError.message);
        } else {
            console.log("✅ All columns seem to exist!");
            // Clean up
            await supabase.from('members').delete().eq('user_id', 'schema_check');
        }
    }
}

checkSchema();
