# 🔒 Persistent Storage Guide

## How Your Card Ownership Data is Saved Forever

Your Yu-Gi-Oh deck tracker uses a **multi-layered protection system** to ensure your card ownership data is **NEVER lost** across devices and sessions.

---

## 📊 Three-Layer Protection System

### Layer 1: Supabase Cloud Database (Source of Truth)
- **Primary storage**: All your card ownership lives in a PostgreSQL database
- **Table**: `user_deck_progress` - one row per deck
- **Stored data**:
  - `owned_cards`: Which cards you own and quantities (e.g., `{"3 Blue-Eyes": 2}`)
  - `removed_cards`: Cards you removed from decks
  - `custom_cards`: Cards you added to decks
- **Protection**: Row Level Security (RLS) - only YOU can access your data
- **Permanence**: ✅ **Stored forever** unless you delete your account

### Layer 2: LocalStorage (Fast Cache)
- **Purpose**: Instant loading without network requests
- **Auto-sync**: Every change triggers Supabase sync within 100ms
- **On page load**: Pulls latest data from Supabase
- **When you switch devices**: Supabase overwrites localStorage with cloud data

### Layer 3: Manual Backups (Safety Net)
- **New feature**: Click "💾 Backup" button to export ALL data as JSON
- **Format**: Human-readable JSON file with timestamp
- **Restore**: Import backup file to merge with current data
- **Use case**: Extra protection before major changes

---

## 🔄 How Sync Works Across Devices

### Scenario: Using Multiple Devices

**Device A (Phone):**
1. Mark "Blue-Eyes White Dragon" as owned (2/3 copies)
2. Saves to localStorage immediately ✅
3. Syncs to Supabase within 100ms ✅

**Device B (Computer):**
1. Open the deck tracker
2. Automatically pulls from Supabase ✅
3. See "Blue-Eyes White Dragon" marked as owned (2/3) ✅

**Result:** Both devices show the same data!

---

## 🛡️ Protection Against Data Loss

### Smart Merge Logic (NEW!)
When pulling from Supabase, the system now **merges** data instead of blindly overwriting:

```javascript
// If cloud says you own 2 copies, but local says 3...
Cloud: Blue-Eyes = 2
Local: Blue-Eyes = 3

Result: Keeps 3 (never reduces ownership!)
```

**What this means:**
- ✅ Card ownership is **never reduced**
- ✅ Custom cards are **never deleted**
- ✅ Removed cards lists are **merged (union)**
- ✅ Even if Supabase has stale data, local changes are preserved

### Keepalive Sync
When you close a page/tab, the system uses **keepalive fetch** to ensure the final sync completes:

```javascript
// Page closing triggers:
beforeunload → Immediate sync with keepalive flag
visibilitychange → Sync when tab hidden
pagehide → iOS Safari fallback
```

This ensures changes are saved **even if you close the page immediately** after making changes!

---

## 🎯 What's Stored Separately (No Conflicts)

| Data Type | Storage Location | Why Separate |
|-----------|------------------|--------------|
| **Deck ownership** (cards you own per deck) | `user_deck_progress` table | Per-deck granularity |
| **Global inventory** (all cards you own) | `user_profiles.card_inventory` | Shared across all decks |
| **Deck metadata** (tags, notes, storage) | localStorage + `user_deck_progress` | Deck-specific info |

**Important:** Updating your **global inventory** does NOT affect **deck ownership**. They're completely separate!

---

## ✅ How to Verify Data is Saved

### 1. Check Supabase Direct
1. Log in to your account
2. Open browser console (F12)
3. Type: `window.deckSync.getSyncStatus()`
4. Look for `lastSyncTime` - should be recent

### 2. Test Cross-Device
1. Mark a card as owned on Device A
2. Open same deck on Device B
3. You should see the card marked ✅

### 3. Export a Backup
1. Click "💾 Backup" button
2. Download JSON file
3. Open it - you'll see all your ownership data!

---

## 🚨 Emergency Recovery

### If Data Seems Lost:
1. **Click "☁️ Refresh from Cloud"** on deck page
2. **Log out and log back in** (forces fresh pull)
3. **Import backup** if you exported one earlier

### If Inventory Update Clears Deck Ownership:
This **cannot happen** because:
- Inventory is stored in `user_profiles.card_inventory`
- Deck ownership is stored in `user_deck_progress` (different table)
- They never overwrite each other!

---

## 💡 Best Practices

### ✅ Do This:
- ✅ Log in so data syncs to Supabase
- ✅ Export manual backups before major changes
- ✅ Wait 1-2 seconds after marking cards before closing page
- ✅ Check "☁️ Refresh from Cloud" if data looks stale

### ❌ Avoid This:
- ❌ Using browser incognito mode (clears localStorage)
- ❌ Clearing browser data without backing up
- ❌ Using multiple accounts (data is per-user)

---

## 🔧 Technical Details

### Database Schema
```sql
CREATE TABLE user_deck_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    deck_id INTEGER NOT NULL,
    owned_cards JSONB DEFAULT '{}'::jsonb,
    removed_cards JSONB DEFAULT '[]'::jsonb,
    custom_cards JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, deck_id)
);
```

### Sync Timeline
```
[User marks card]
    ↓ 0ms
[Save to localStorage]
    ↓ 100ms (debounced)
[Sync to Supabase via upsert]
    ↓ 200-500ms
[✅ Data safely in cloud]
```

### Conflict Resolution
```
When pulling from Supabase:
1. Load cloud data
2. Load local data
3. For each card:
   - If cloud qty > local qty → use cloud
   - If local qty > cloud qty → use local (NEVER reduce)
4. For arrays (removed/custom):
   - Merge both (union)
5. Save merged result to localStorage
```

---

## 📞 Summary

**Your card ownership data is protected by:**

1. ✅ **Supabase cloud database** (primary storage)
2. ✅ **Auto-sync on every change** (100ms debounce)
3. ✅ **Keepalive sync on page close**
4. ✅ **Smart merge logic** (never reduces ownership)
5. ✅ **Manual backup/restore** (safety net)
6. ✅ **Cross-device sync** (works on phone, tablet, computer)

**You can switch devices freely** - Supabase is the source of truth!

**localStorage is just a cache** - even if it gets cleared, data is safe in Supabase.

---

## 🎉 You're Protected!

Your card ownership data is now as secure as any modern cloud app (like Google Drive, Dropbox, etc.).

Just make sure you're **logged in** so Supabase sync works!
