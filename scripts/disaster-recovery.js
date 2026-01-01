import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
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

async function listBackups() {
  if (!existsSync(BACKUP_DIR)) {
    console.log('No backup directory found');
    return [];
  }

  const files = readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(f => f.endsWith('.json') && !f.includes('summary'));

  console.log('\n=================================');
  console.log('Available Backups');
  console.log('=================================');

  backupFiles.forEach((file, index) => {
    const parts = file.split('_');
    const tableName = parts.slice(0, -1).join('_');
    const timestamp = parts[parts.length - 1].replace('.json', '');
    console.log(`${index + 1}. ${tableName} - ${timestamp}`);
  });

  return backupFiles;
}

async function restoreTable(backupFile, options = {}) {
  const { dryRun = false, clearExisting = false } = options;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Restoring from: ${backupFile}`);
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`Clear existing: ${clearExisting ? 'YES' : 'NO'}`);
  console.log(`${'='.repeat(50)}\n`);

  const filepath = join(BACKUP_DIR, backupFile);

  if (!existsSync(filepath)) {
    console.error(`Backup file not found: ${filepath}`);
    return { success: false, error: 'File not found' };
  }

  try {
    const fileContent = readFileSync(filepath, 'utf-8');
    const backup = JSON.parse(fileContent);

    const { table, data, recordCount } = backup;

    console.log(`Table: ${table}`);
    console.log(`Records to restore: ${recordCount}`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
      return { success: true, dryRun: true };
    }

    if (clearExisting) {
      console.log(`\n⚠️  Clearing existing data from ${table}...`);
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing table:', deleteError.message);
        throw deleteError;
      }
      console.log('✅ Existing data cleared');
    }

    console.log(`\n📦 Restoring ${recordCount} records...`);

    const batchSize = 100;
    let restored = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`Error restoring batch ${i / batchSize + 1}:`, error.message);
        throw error;
      }

      restored += batch.length;
      console.log(`Progress: ${restored}/${recordCount} records restored`);
    }

    console.log(`\n✅ Successfully restored ${restored} records to ${table}`);

    return {
      success: true,
      table,
      recordsRestored: restored,
    };
  } catch (error) {
    console.error('Error during restore:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function verifyBackupIntegrity(backupFile) {
  console.log(`\nVerifying backup: ${backupFile}`);

  const filepath = join(BACKUP_DIR, backupFile);

  try {
    const fileContent = readFileSync(filepath, 'utf-8');
    const backup = JSON.parse(fileContent);

    const checks = [];

    checks.push({
      name: 'Valid JSON',
      passed: true,
    });

    checks.push({
      name: 'Has table name',
      passed: !!backup.table,
    });

    checks.push({
      name: 'Has timestamp',
      passed: !!backup.timestamp,
    });

    checks.push({
      name: 'Has data array',
      passed: Array.isArray(backup.data),
    });

    checks.push({
      name: 'Record count matches',
      passed: backup.data.length === backup.recordCount,
    });

    if (backup.data.length > 0) {
      checks.push({
        name: 'Records have IDs',
        passed: backup.data.every(r => r.id),
      });
    }

    console.log('\n=================================');
    console.log('Verification Results');
    console.log('=================================');

    checks.forEach(check => {
      const status = check.passed ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
    });

    const allPassed = checks.every(c => c.passed);

    if (allPassed) {
      console.log('\n✅ Backup integrity verified');
    } else {
      console.log('\n❌ Backup integrity check failed');
    }

    return allPassed;
  } catch (error) {
    console.error('Error verifying backup:', error.message);
    return false;
  }
}

async function createRestorePoint() {
  console.log('\n=================================');
  console.log('Creating Restore Point');
  console.log('=================================');

  const { execSync } = await import('child_process');

  try {
    console.log('Creating full backup as restore point...');
    execSync('node scripts/backup-system.js full', { stdio: 'inherit' });
    console.log('\n✅ Restore point created successfully');
  } catch (error) {
    console.error('Failed to create restore point:', error.message);
    throw error;
  }
}

const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    if (command === 'list') {
      await listBackups();
    } else if (command === 'restore') {
      if (!arg) {
        console.error('Please specify a backup file to restore');
        process.exit(1);
      }
      await restoreTable(arg, {
        dryRun: process.argv.includes('--dry-run'),
        clearExisting: process.argv.includes('--clear'),
      });
    } else if (command === 'verify') {
      if (!arg) {
        console.error('Please specify a backup file to verify');
        process.exit(1);
      }
      await verifyBackupIntegrity(arg);
    } else if (command === 'restore-point') {
      await createRestorePoint();
    } else {
      console.log(`
Disaster Recovery Tool

Usage:
  node scripts/disaster-recovery.js list
    - List all available backups

  node scripts/disaster-recovery.js restore <backup-file> [--dry-run] [--clear]
    - Restore from a backup file
    - --dry-run: Test restore without making changes
    - --clear: Delete existing data before restore

  node scripts/disaster-recovery.js verify <backup-file>
    - Verify backup file integrity

  node scripts/disaster-recovery.js restore-point
    - Create a restore point before making changes

Examples:
  node scripts/disaster-recovery.js list
  node scripts/disaster-recovery.js restore crm_leads_2024-01-01.json --dry-run
  node scripts/disaster-recovery.js restore crm_leads_2024-01-01.json --clear
  node scripts/disaster-recovery.js verify crm_leads_2024-01-01.json
      `);
    }
  } catch (error) {
    console.error('Command failed:', error.message);
    process.exit(1);
  }
})();
