# Branch Seat Allocation System

## Overview

Branches are billed per-seat (NPR 500/branch/month). This document describes
the full lifecycle of branch activation, downgrade, upgrade, and renewal.

---

## Branch Status Model

| Status              | isActive | Operational | Counts toward quota |
|---------------------|----------|-------------|---------------------|
| `active`            | true     | Yes         | Yes                 |
| `inactive`          | false    | No (read-only)| No              |
| `pending_selection` | false    | No (read-only)| No              |

> **Data is never deleted.** Inactive and pending branches retain all their
> appointments, patients, billing, and staff data.

---

## Auto-Activation Rule

Whenever `applyQuota` is called:

- If `total branches ≤ plan quota` → ALL branches automatically become `active`
- If `active branches ≤ plan quota` → activate remaining inactive up to quota
- If `active branches > plan quota` → requires user selection (downgrade path)

Examples:
- 3 branches, quota 3 → all 3 active ✓
- 3 branches, quota 5 → all 3 active ✓
- 5 branches, quota 10 → all 5 active ✓
- 7 branches, quota 5 → selection required

---

## Upgrade Behaviour

1. `applyQuota(clinicId, newQuota)` is called
2. Any pending `DowngradeSelection` record is cleared
3. Branches with `pending_selection` status revert to `inactive`
4. All `inactive` branches are auto-activated up to new quota
5. `requiresSelection: false` is returned → no user interaction needed

---

## Downgrade Behaviour

1. `applyQuota(clinicId, newQuota)` is called with smaller quota
2. Branches 0..quota-1 (by created_at ASC) keep `active` status
3. Branches quota..N get status `pending_selection` (not randomly locked!)
4. A `DowngradeSelection` record is created with:
   - `newQuota`, `previousQuota`
   - `gracePeriodEndsAt` (now + `DOWNGRADE_GRACE_PERIOD_DAYS`, configurable)
5. Frontend receives `requiresDowngradeSelection: true`
6. Branch selection modal is shown — user picks which branches to keep
7. User calls `POST /branches/confirm-downgrade-selection` with `keepIds`
8. Selected → `active`, unselected → `inactive`
9. `DowngradeSelection.status` → `completed`

---

## Grace Period

Configured via `DOWNGRADE_GRACE_PERIOD_DAYS` in `branch.service.ts` (default: 7).

- Set to `0` to disable — selection is required immediately
- If grace period expires before user chooses, `autoSelectOnGraceExpiry()` runs:
  - Selects by **most-recent activity** first
  - Ties broken by **oldest created_at** first
  - `DowngradeSelection.status` → `auto`

---

## Renewal Logic

`renewSubscription()`:
1. Checks for pending `DowngradeSelection`
2. If found → throws `RENEWAL_BLOCKED_PENDING_SELECTION` (HTTP 400)
3. Frontend must direct user to complete branch selection first
4. Once cleared → renewal proceeds normally with `upgradePlan()`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /branches | List all branches |
| GET    | /branches/quota-status | Full quota + downgrade state |
| POST   | /branches | Create branch |
| POST   | /branches/confirm-downgrade-selection | Confirm branch selection |
| PATCH  | /branches/:id | Update branch (isActive toggle handled) |
| DELETE | /branches/:id | Delete branch |

---

## Database Tables

### branches (new columns)
- `status` ENUM('active','inactive','pending_selection') NOT NULL DEFAULT 'active'
- `last_activity_at` TIMESTAMPTZ NULL

### downgrade_selections (new table)
- `id` UUID PK
- `clinic_id` VARCHAR UNIQUE FK → clinics
- `new_quota` INT
- `previous_quota` INT
- `grace_period_ends_at` TIMESTAMPTZ NULL
- `effective_at` TIMESTAMPTZ
- `status` ENUM('pending','completed','auto')
- `selected_branch_ids` JSONB NULL
- `confirmed_at` TIMESTAMPTZ NULL

---

## Configuration

```typescript
// branch.service.ts
export const DOWNGRADE_GRACE_PERIOD_DAYS = 7; // Set to 0 to disable
```
