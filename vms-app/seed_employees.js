const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xnovmmctzrcdionvyfoo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3ZtbWN0enJjZGlvbnZ5Zm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODQ4NTksImV4cCI6MjEwMjY2MDg1OX0.s8getZpdHpEmZumBPiF2Dpr4DEo0YMSTUogdZ3ua-DI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

async function seed() {
  const csvPath = path.join(__dirname, 'employees.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('employees.csv not found');
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) return;

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    records.push({
      display_name: fields[0] || '',
      email: fields[1] || '',
      department: fields[2] || '',
      job_title: fields[3] || ''
    });
  }

  console.log(`Seeding ${records.length} employees to Supabase...`);
  const { data, error } = await supabase.from('employees').insert(records).select();
  if (error) {
    console.error('Error seeding employees:', error);
  } else {
    console.log(`Successfully seeded ${data.length} employees into Supabase!`);
  }
}

seed();
