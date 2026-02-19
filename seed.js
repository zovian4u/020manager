// Run this to fill your 020 Alliance Hub with sample data
const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual keys from your .env.local file
const supabase = createClient(
    'https://dkmiwnvcodkjrevreqdd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrbWl3bnZjb2RranJldnJlcWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDM1MDUsImV4cCI6MjA4NjkxOTUwNX0.CAenoDu5zNxTUHSqqBYDg-pesXQvN7-X9rlWzJsV9Tc'
);

async function seedData() {
    const members = [
        { username: 'Zovian', total_hero_power: 125500000, vs_score: 950000, desert_points: 4500 },
        { username: 'Jade', total_hero_power: 118000000, vs_score: 820000, desert_points: 3800 },
        { username: 'May', total_hero_power: 95000000, vs_score: 750000, desert_points: 4100 },
        { username: 'Shadow', total_hero_power: 110000000, vs_score: 680000, desert_points: 2900 },
        { username: 'Raptor', total_hero_power: 88000000, vs_score: 550000, desert_points: 3200 },
    ];

    console.log('🚀 Seeding 020 Alliance members...');
    const { error } = await supabase.from('members').insert(members);

    if (error) console.error('❌ Error:', error.message);
    else console.log('✅ Success! 020 Legends have been added.');
}

seedData();