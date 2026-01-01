import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BACKUP_DIR = join(process.cwd(), 'backups');
const TABLES_TO_BACKUP = [
  'crm_leads',
  'blog_posts',
  'city_pages',
  'news_articles',
  'faq_items',
  'admin_users',
  'partners',
  'email_campaigns',
  'whatsapp_conversations',
];

async function createBackupDirectory() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

async function backupTable(tableName) {
  console.log(`\nBacking up table: ${tableName}...`);

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      console.error(`Error backing up ${tableName}:`, error.message);
      return { success: false, error: error.message };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${tableName}_${timestamp}.json`;
    const filepath = join(BACKUP_DIR, filename);

    const backupData = {
      table: tableName,
      timestamp: new Date().toISOString(),
      recordCount: count,
      data: data,
    };

    writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Backed up ${count} records to ${filename}`);

    const csvFilename = `${tableName}_${timestamp}.csv`;
    const csvFilepath = join(BACKUP_DIR, csvFilename);
    exportToCSV(data, csvFilepath);

    return {
      success: true,
      table: tableName,
      recordCount: count,
      filename,
    };
  } catch (error) {
    console.error(`Unexpected error backing up ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

function exportToCSV(data, filepath) {
  if (!data || data.length === 0) {
    console.log('No data to export to CSV');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',')
    ),
  ].join('\n');

  writeFileSync(filepath, csvContent);
  console.log(`📊 Exported CSV: ${filepath}`);
}

async function performFullBackup() {
  console.log('=================================');
  console.log('Starting Full Database Backup');
  console.log('=================================');

  await createBackupDirectory();

  const results = [];

  for (const tableName of TABLES_TO_BACKUP) {
    const result = await backupTable(tableName);
    results.push(result);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryFilename = `backup_summary_${timestamp}.json`;
  const summaryFilepath = join(BACKUP_DIR, summaryFilename);

  const summary = {
    timestamp: new Date().toISOString(),
    totalTables: TABLES_TO_BACKUP.length,
    successfulBackups: results.filter(r => r.success).length,
    failedBackups: results.filter(r => !r.success).length,
    results,
  };

  writeFileSync(summaryFilepath, JSON.stringify(summary, null, 2));

  console.log('\n=================================');
  console.log('Backup Summary');
  console.log('=================================');
  console.log(`Total tables: ${summary.totalTables}`);
  console.log(`Successful: ${summary.successfulBackups}`);
  console.log(`Failed: ${summary.failedBackups}`);
  console.log(`Backup directory: ${BACKUP_DIR}`);

  if (summary.failedBackups > 0) {
    console.log('\n⚠️  Some backups failed. Check the summary file for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All backups completed successfully!');
  }
}

async function backupCriticalLeads() {
  console.log('Backing up critical leads...');

  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .in('status', ['qualified', 'proposal_sent', 'negotiation'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error backing up critical leads:', error);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `critical_leads_${timestamp}.csv`;
  const filepath = join(BACKUP_DIR, filename);

  exportToCSV(data, filepath);

  console.log(`✅ Backed up ${data.length} critical leads`);
}

const command = process.argv[2];

if (command === 'full') {
  performFullBackup().catch(error => {
    console.error('Backup failed:', error);
    process.exit(1);
  });
} else if (command === 'critical') {
  createBackupDirectory()
    .then(() => backupCriticalLeads())
    .catch(error => {
      console.error('Critical backup failed:', error);
      process.exit(1);
    });
} else {
  console.log(`
Usage:
  npm run backup:full     - Backup all tables
  npm run backup:critical - Backup critical leads only

Examples:
  node scripts/backup-system.js full
  node scripts/backup-system.js critical
  `);
}
