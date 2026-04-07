# Firebase to Supabase Migration

This directory contains scripts to migrate your data from Firebase to Supabase.

## Prerequisites

1. **Firebase Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `scripts/serviceAccountKey.json`

2. **Supabase Service Role Key**
   - Go to Supabase Dashboard → Project Settings → API
   - Copy the `service_role` key (NOT the anon key)
   - This key bypasses RLS and is needed for bulk inserts

3. **Install dependencies**
   ```bash
   cd scripts
   npm install firebase-admin @supabase/supabase-js
   ```

## Environment Variables

Set these before running the scripts:

```bash
# Windows PowerShell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-service-role-key"

# Or create a .env file in the scripts directory
```

## Running the Migrations

### 1. Migrate Firestore Data

This migrates all your collections (shops, customers, racquets, jobs, inventory, profiles):

```bash
cd scripts
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-service-role-key"
node migrate-firestore.js
```

**Migration Order (respects foreign keys):**
1. Shops
2. Profiles (from Firestore `users` collection)
3. Customers
4. Racquets
5. Stringing Jobs
6. Inventory

### 2. Migrate Firebase Auth Users

This exports Firebase Auth users and creates matching accounts in Supabase:

```bash
cd scripts
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY="your-service-role-key"
node migrate-auth.js export
```

**Important Notes:**
- Passwords **cannot** be migrated (Firebase stores them as hashes)
- Users will be created with temporary passwords
- An export file `firebase-users-export.json` is created for reference

### 3. Send Password Reset Emails (Optional)

After migrating auth users, send them password reset emails:

```bash
node migrate-auth.js reset-emails
```

Or alternatively, manually notify users to use "Forgot Password" on their first login.

## Troubleshooting

### Foreign Key Constraint Errors
If you get errors about missing references, ensure:
1. You're using the **Service Role Key** (not anon key)
2. The schema.sql has been run in Supabase
3. Data is migrated in the correct order (shops → customers → racquets → jobs)

### Duplicate Key Errors
The scripts use `upsert` which will update existing records. If you see duplicate errors, clear the Supabase tables first:
```sql
TRUNCATE TABLE racquets, stringing_jobs, customers, shops, inventory, profiles CASCADE;
```

### Missing Data
Check `firebase-users-export.json` and `migration-errors.json` (if created) for details on any failed migrations.

## Post-Migration Checklist

- [ ] All shops migrated
- [ ] All customers migrated  
- [ ] All racquets migrated
- [ ] All stringing jobs migrated
- [ ] All inventory items migrated
- [ ] Firebase Auth users exported to Supabase Auth
- [ ] Password reset emails sent or users notified
- [ ] Test login with a migrated user account
- [ ] Verify data integrity in Supabase Dashboard
