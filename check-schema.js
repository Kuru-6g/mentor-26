import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lvvqscckpqdpyndtwkmo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnFzY2NrcHFkcHluZHR3a21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTc1MzQsImV4cCI6MjA3ODM3MzUzNH0.d8I5bK_6YL49wqoid_geGcSAOsGIVdYX8tdmQ5gGcWo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schema...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        console.log('Column "profile_completed" exists?', 'profile_completed' in data[0]);
        console.log('Sample keys:', Object.keys(data[0]));
    } else {
        console.log('No profiles found to check schema.');
    }
}

checkSchema();
