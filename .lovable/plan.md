

## Problem

Seven distinct issues are causing the broken experience:

1. **Home defaults to `SLCODemoLanding`** (line 325 of AppLayout.tsx) — shows pipeline/onboarding engineering UI instead of assessor home
2. **IA_MAP exposes 23 Home views** including `ids`, `sync`, `slco-pipeline`, `slco-demo`, `data-doctor`, `data-ops`, `webhooks` — all engineering plumbing visible in ModuleViewBar
3. **Unscoped hooks** — `usePipelineStatus`, `useNeighborhoodStats`, `useRevaluationCycles`, `useOnboardingStatus` (parcels + study_periods), `useBatchNoticeJobs`, `useQualityParcels` all query globally without county filter
4. **Radix SelectItem crash** — empty string `value=""` in `BatchNoticeDashboard.tsx` and `ParcelFilters.tsx` causes runtime errors
5. **No admin gating** on DataOps, IDS, Sync views
6. **ModuleViewBar renders everything** from IA_MAP with no role filtering
7. **GeoEquity is clean** — already fixed with 4 tabs + SyncStatusBadge ✓

## Plan — Parallel Execution Tracks

```text
TRACK A (Data Scoping)          TRACK B (UI Cleanup)           TRACK C (Runtime Fixes)
─────────────────────           ─────────────────────          ──────────────────────
A1: usePipelineStatus           B1: AppLayout default          C1: BatchNoticeDashboard
    + county_id param               SuiteHub not SLCODemo          SelectItem value=""
A2: useNeighborhoodStats        B2: IA_MAP.ts strip admin      C2: ParcelFilters.tsx
    + county_id param               views from Home list           SelectItem value=""
A3: useRevaluationCycles        B3: ModuleViewBar add
    + .eq("county_id")              admin filter logic
A4: useOnboardingStatus
    + .eq("county_id")
A5: useQualityParcels
    + .eq("county_id")
A6: useBatchNoticeJobs
    + .eq("county_id")
```

### Track A — County-Scope All Remaining Hooks

Each hook gets `useActiveCountyId()` and filters by it. Query is `enabled: !!countyId`.

| Hook | Fix |
|------|-----|
| `usePipelineStatus` | Pass `p_county_id` to RPC (or filter `pipeline_events` table by county_id) |
| `useNeighborhoodStats` | Add `p_county_id` param to RPC call |
| `useRevaluationCycles` | Add `.eq("county_id", countyId)` |
| `useOnboardingStatus` | Add `.eq("county_id", countyId)` to parcels and study_periods counts |
| `useQualityParcels` | Add `.eq("county_id", countyId)` |
| `useBatchNoticeJobs` | Add `.eq("county_id", countyId)` (batch_notice_jobs has county_id column) |

### Track B — Strip Engineering UI from Assessor Shell

**B1: AppLayout.tsx line 324-325** — Change default Home case from `SLCODemoLanding` to `SuiteHub`:
```tsx
default:
  return <SuiteHub onNavigate={handleNavigate} />;
```

**B2: IA_MAP.ts** — Remove these views from the Home module's `views` array: `ids`, `sync`, `slco-pipeline`, `slco-demo`, `data-doctor`, `webhooks`, `data-ops`. Keep their legacy redirects so deep-links don't break, but they won't appear in the tab bar.

**B3: ModuleViewBar** — Add an `adminOnly` flag to `ViewDefinition`. Views marked `adminOnly` are hidden unless user has admin role. (Optional — removing from IA_MAP views array in B2 is sufficient for now.)

### Track C — Fix Runtime Crashes

Replace all `<SelectItem value="">` with `<SelectItem value="__all__">` in:
- `src/components/dais/BatchNoticeDashboard.tsx` (line 143)
- `src/components/geoequity/ParcelFilters.tsx` (lines 106, 126, 146)

Update corresponding `onValueChange` handlers to treat `"__all__"` as "no filter".

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/usePipelineStatus.ts` | Add county scoping |
| `src/hooks/useNeighborhoodStats.ts` | Add county_id param |
| `src/hooks/useRevaluationCycles.ts` | Add county filter |
| `src/hooks/useOnboardingStatus.ts` | Scope parcels + study_periods queries |
| `src/hooks/useQualityPillarData.ts` | Scope parcels query |
| `src/hooks/useBatchNotices.ts` | Scope batch_notice_jobs query |
| `src/components/layout/AppLayout.tsx` | Default Home → SuiteHub |
| `src/config/IA_MAP.ts` | Remove engineering views from Home |
| `src/components/dais/BatchNoticeDashboard.tsx` | Fix empty SelectItem |
| `src/components/geoequity/ParcelFilters.tsx` | Fix empty SelectItem |

No data is deleted. No components are removed from the codebase. Engineering views remain accessible via direct navigation for admins.

