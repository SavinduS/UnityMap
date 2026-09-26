/**
 * seedStaffCredentials.js
 *
 * One-off migration for accounts created before password hashing existed.
 *
 * Before this hardening pass, adminAuthController stored passwords in plaintext
 * and auto-provisioned any email on login, so the database contains a mix of:
 *   - real plaintext passwords  -> transparently re-hashed on next successful login
 *   - 'hashed-password-placeholder' -> not a real credential; the account is
 *     effectively locked and must be given a working password
 *
 * This script fixes the placeholder accounts:
 *   - the documented seed accounts get their documented demo password
 *   - Google-only accounts get a random, unusable secret (they sign in via Google)
 *
 * Safe to re-run: it only touches placeholder-password accounts.
 *
 * Usage: npm run seed:staff
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MunicipalStaff } = require('../models');

const BCRYPT_ROUNDS = 10;
const PLACEHOLDER_PASSWORDS = new Set(['hashed-password-placeholder', 'google-oauth-authenticated']);

/** Documented demo credentials — must stay in sync with SEED_ACCOUNTS in adminAuthController. */
const SEED_PASSWORDS = {
  'admin@unitymap.com': 'Admin@2026',
  'user@unitymap.com': 'User@2026',
  'alex@unitymap.com': 'User@2026',
  'k.perera@cmc.gov.lk': 'CMC@2026',
};

/**
 * Canonical identity fields for the seed accounts.
 *
 * The pre-hardening login path could overwrite these: any unknown email was
 * auto-provisioned with `name = localpart.toUpperCase()` and a random badge, and
 * a matching email could clobber the seeded profile. Restores the documented
 * identity where it was replaced with such placeholder values.
 */
const SEED_IDENTITIES = {
  'admin@unitymap.com': { name: 'UnityMap Super Admin', badgeNumber: 'UM-SADM-01', staffId: 'UM-ADMIN-001' },
  'user@unitymap.com': { name: 'Alex Morgan', badgeNumber: 'UM-CIT-001', staffId: 'UM-USER-001' },
  'alex@unitymap.com': { name: 'Kasun Bandara', badgeNumber: 'UM-CIT-002', staffId: 'UM-USER-002' },
  'k.perera@cmc.gov.lk': { name: 'Eng. K. Perera', badgeNumber: 'CMC-ENG-882', staffId: 'CMC-ENG-882' },
};

const isBcrypt = (v) => typeof v === 'string' && /^\$2[aby]\$/.test(v);

/** True when identity fields look like auto-provisioned placeholders. */
const looksAutoProvisioned = (account, identity) =>
  account.name !== identity.name || account.badgeNumber !== identity.badgeNumber;

(async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });
  console.log(`Connected to database "${process.env.DB_NAME}"\n`);

  const staff = await MunicipalStaff.find({}).select('+password');
  let fixed = 0;
  let hashed = 0;
  let leftAlone = 0;
  let repaired = 0;

  for (const account of staff) {
    const stored = account.password;
    const identity = SEED_IDENTITIES[account.email];

    if (identity && looksAutoProvisioned(account, identity)) {
      const before = `${account.name} / ${account.badgeNumber}`;
      account.name = identity.name;
      account.badgeNumber = identity.badgeNumber;
      account.staffId = identity.staffId;
      await account.save();
      console.log(`  [identity]    ${account.email}: "${before}" -> "${identity.name}" / ${identity.badgeNumber}`);
      repaired += 1;
    }

    if (isBcrypt(stored)) {
      leftAlone += 1;
      continue;
    }

    if (typeof stored === 'string' && stored.startsWith('google-oauth-')) {
      // Google-only account: give it an unguessable secret so nobody can log in by password.
      account.password = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
      await account.save();
      console.log(`  [google-only] ${account.email} -> random unusable secret`);
      fixed += 1;
      continue;
    }

    if (PLACEHOLDER_PASSWORDS.has(stored)) {
      const newPassword = SEED_PASSWORDS[account.email];
      if (!newPassword) {
        console.log(`  [SKIPPED]     ${account.email} has a placeholder and no known password — set one manually`);
        leftAlone += 1;
        continue;
      }
      account.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await account.save();
      console.log(`  [placeholder] ${account.email} -> bcrypt(${newPassword})`);
      fixed += 1;
      continue;
    }

    // A genuine plaintext password. Leave it alone: the login path compares it
    // once and immediately upgrades the stored value to bcrypt.
    console.log(`  [legacy]      ${account.email} -> will re-hash on first successful login`);
    hashed += 1;
  }

  console.log(
    `\nDone. ${fixed} placeholder password(s) repaired, ${repaired} seed identity/identities restored, ` +
      `${hashed} legacy account(s) pending upgrade on login, ${leftAlone} already secure.`
  );
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
