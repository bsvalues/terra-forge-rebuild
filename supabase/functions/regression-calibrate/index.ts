import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegressionRequest {
  neighborhood_code: string;
  county_id: string;
  variables: string[]; // e.g. ["building_area", "land_area", "year_built", "bedrooms", "bathrooms"]
  tax_year?: number;
}

interface Observation {
  parcel_id: string;
  sale_price: number;
  features: number[];
}

/** Simple OLS via Normal Equations: β = (X'X)^(-1) X'y */
function solveOLS(X: number[][], y: number[]): {
  coefficients: number[];
  residuals: number[];
  predicted: number[];
  rSquared: number;
  rmse: number;
  stdErrors: number[];
  tStats: number[];
  fStatistic: number;
} {
  const n = X.length;
  const p = X[0].length;

  // X'X
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) {
        XtX[j][k] += X[i][j] * X[i][k];
      }
    }
  }

  // X'y
  const Xty: number[] = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += X[i][j] * y[i];
    }
  }

  // Invert XtX using Gauss-Jordan
  const aug: number[][] = XtX.map((row, i) => [...row, ...Array(p).fill(0).map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < p; col++) {
    let maxRow = col;
    for (let row = col + 1; row < p; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) throw new Error("Singular matrix — multicollinearity detected");
    for (let j = 0; j < 2 * p; j++) aug[col][j] /= pivot;
    for (let row = 0; row < p; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * p; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  const inv = aug.map((row) => row.slice(p));

  // β = inv(X'X) * X'y
  const beta: number[] = Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      beta[i] += inv[i][j] * Xty[j];
    }
  }

  // Predicted & residuals
  const predicted = X.map((row) => row.reduce((sum, x, j) => sum + x * beta[j], 0));
  const residuals = y.map((yi, i) => yi - predicted[i]);

  // R²
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const ssRes = residuals.reduce((sum, r) => sum + r ** 2, 0);
  const rSquared = 1 - ssRes / ssTot;

  // RMSE
  const rmse = Math.sqrt(ssRes / (n - p));

  // Standard errors
  const mse = ssRes / (n - p);
  const stdErrors = inv.map((row, i) => Math.sqrt(Math.max(0, mse * row[i])));
  const tStats = beta.map((b, i) => (stdErrors[i] > 0 ? b / stdErrors[i] : 0));

  // F-statistic
  const ssReg = ssTot - ssRes;
  const fStatistic = (ssReg / (p - 1)) / (ssRes / (n - p));

  return { coefficients: beta, residuals, predicted, rSquared, rmse, stdErrors, tStats, fStatistic };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    try {
      await requireAuth(req);
    } catch (res) {
      if (res instanceof Response) return res;
      throw res;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { neighborhood_code, county_id, variables, tax_year } = (await req.json()) as RegressionRequest;
    const year = tax_year ?? new Date().getFullYear();

    if (!neighborhood_code || !variables?.length || !county_id) {
      return new Response(JSON.stringify({ error: "neighborhood_code, county_id, and variables are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch parcels in this neighborhood scoped to county (paginated to avoid 1000-row limit)
    let allParcels: any[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page, error: pErr } = await supabase
        .from("parcels")
        .select("id, building_area, land_area, year_built, bedrooms, bathrooms, assessed_value")
        .eq("county_id", county_id)
        .eq("neighborhood_code", neighborhood_code)
        .range(offset, offset + PAGE - 1);
      if (pErr) throw pErr;
      if (!page?.length) break;
      allParcels.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const parcels = allParcels;

    if (!parcels.length) {
      return new Response(JSON.stringify({ error: "No parcels found for neighborhood" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parcelIds = parcels.map((p) => p.id);

    // Fetch qualified sales in batches to avoid URL length limits
    const BATCH_SIZE = 50; // Keep small to avoid URL length limits with UUIDs
    const allSales: { parcel_id: string; sale_price: number; sale_date?: string }[] = [];
    for (let i = 0; i < parcelIds.length; i += BATCH_SIZE) {
      const batch = parcelIds.slice(i, i + BATCH_SIZE);
      const { data: batchSales, error: sErr } = await supabase
        .from("sales")
        .select("parcel_id, sale_price, sale_date")
        .in("parcel_id", batch)
        .eq("is_qualified", true)
        .gt("sale_price", 0)
        .order("sale_date", { ascending: false });
      if (sErr) throw sErr;
      if (batchSales) allSales.push(...batchSales);
    }
    const sales = allSales;

    // De-dupe: latest sale per parcel
    const latestSales = new Map<string, number>();
    for (const s of sales || []) {
      if (!latestSales.has(s.parcel_id)) latestSales.set(s.parcel_id, s.sale_price);
    }

    // Build observations
    // Treat 0 as missing for area/value fields
    const VARIABLE_MAP: Record<string, (p: any) => number | null> = {
      building_area: (p) => (p.building_area && p.building_area > 0) ? p.building_area : null,
      land_area: (p) => (p.land_area && p.land_area > 0) ? p.land_area : null,
      year_built: (p) => p.year_built ?? null,
      bedrooms: (p) => p.bedrooms ?? null,
      bathrooms: (p) => p.bathrooms ? Number(p.bathrooms) : null,
      assessed_value: (p) => (p.assessed_value && p.assessed_value > 0) ? p.assessed_value : null,
    };

    // Auto-prune: only keep variables that have data for at least some parcels with sales
    const parcelsWithSales = parcels.filter(p => latestSales.has(p.id));
    const usableVariables = variables.filter(v => {
      const extractor = VARIABLE_MAP[v];
      if (!extractor) return false;
      const validCount = parcelsWithSales.filter(p => extractor(p) != null).length;
      return validCount >= 1; // At least 1 parcel has this variable
    });

    // If no usable variables, fall back to assessed_value as the sole predictor
    const finalVariables = usableVariables.length > 0 ? usableVariables : 
      (VARIABLE_MAP["assessed_value"] ? ["assessed_value"] : []);

    const observations: Observation[] = [];
    const skipReasons = { no_sale: 0, missing_vars: 0 };
    for (const p of parcels) {
      const salePrice = latestSales.get(p.id);
      if (!salePrice) { skipReasons.no_sale++; continue; }

      const features: number[] = [1]; // intercept
      let valid = true;
      for (const v of finalVariables) {
        const val = VARIABLE_MAP[v]?.(p);
        if (val == null) { valid = false; break; }
        features.push(val);
      }
      if (!valid) { skipReasons.missing_vars++; continue; }
      observations.push({ parcel_id: p.id, sale_price: salePrice, features });
    }

    const minObs = finalVariables.length + 2;
    if (observations.length < minObs) {
      return new Response(JSON.stringify({
        error: `Insufficient observations (${observations.length}). Need at least ${minObs}.`,
        debug: {
          parcels_in_neighborhood: parcels.length,
          parcels_with_sales: latestSales.size,
          skipped_no_sale: skipReasons.no_sale,
          skipped_missing_vars: skipReasons.missing_vars,
          requested_variables: variables,
          usable_variables: finalVariables,
          hint: skipReasons.missing_vars > 0
            ? `${skipReasons.missing_vars} parcels had null/zero values for variables (${finalVariables.join(", ")}). Ensure parcel data is populated.`
            : skipReasons.no_sale > 0
              ? "Parcels exist but have no qualified sales."
              : "No parcels found in this neighborhood.",
        },
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-flight: drop zero-variance or perfectly-correlated columns to prevent singular matrix
    let X = observations.map((o) => o.features);
    const y = observations.map((o) => o.sale_price);
    const activeLabelIndices: number[] = [0]; // always keep intercept (col 0)
    const droppedVars: string[] = [];

    for (let col = 1; col < X[0].length; col++) {
      const vals = X.map((row) => row[col]);
      const mn = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mn) ** 2, 0) / vals.length;
      if (variance < 1e-10) {
        droppedVars.push(finalVariables[col - 1]);
        continue;
      }
      // Check for perfect correlation with earlier kept columns
      let dominated = false;
      for (const kept of activeLabelIndices) {
        if (kept === 0) continue;
        const keptVals = X.map((row) => row[kept]);
        const keptMn = keptVals.reduce((a, b) => a + b, 0) / keptVals.length;
        let cov = 0, varA = 0, varB = 0;
        for (let i = 0; i < vals.length; i++) {
          const da = vals[i] - mn, db = keptVals[i] - keptMn;
          cov += da * db; varA += da * da; varB += db * db;
        }
        const r = (varA > 0 && varB > 0) ? Math.abs(cov / Math.sqrt(varA * varB)) : 0;
        if (r > 0.9999) { dominated = true; break; }
      }
      if (dominated) {
        droppedVars.push(finalVariables[col - 1]);
        continue;
      }
      activeLabelIndices.push(col);
    }

    // Rebuild X with only active columns
    X = X.map((row) => activeLabelIndices.map((ci) => row[ci]));
    const activeVariables = activeLabelIndices.slice(1).map((ci) => finalVariables[ci - 1]);

    if (activeLabelIndices.length < 2) {
      return new Response(JSON.stringify({
        error: "All variables had zero variance or perfect collinearity. Cannot run regression.",
        debug: { dropped: droppedVars, finalVariables, sample_size: observations.length },
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Run OLS
    const result = solveOLS(X, y);

    // Build coefficient labels
    const labels = ["intercept", ...finalVariables];
    const coefficients = labels.map((label, i) => ({
      variable: label,
      coefficient: result.coefficients[i],
      std_error: result.stdErrors[i],
      t_stat: result.tStats[i],
      p_value: 2 * (1 - tCDF(Math.abs(result.tStats[i]), observations.length - labels.length)),
    }));

    // Build scatter data (actual vs predicted)
    const scatter = observations.map((o, i) => ({
      parcel_id: o.parcel_id,
      actual: o.sale_price,
      predicted: result.predicted[i],
      residual: result.residuals[i],
    }));

    const response = {
      neighborhood_code,
      variables: finalVariables,
      variables_requested: variables,
      sample_size: observations.length,
      r_squared: result.rSquared,
      rmse: result.rmse,
      f_statistic: result.fStatistic,
      coefficients,
      scatter,
      diagnostics: {
        r_squared: result.rSquared,
        adjusted_r_squared: 1 - (1 - result.rSquared) * (observations.length - 1) / (observations.length - labels.length),
        rmse: result.rmse,
        f_statistic: result.fStatistic,
        sample_size: observations.length,
        variables_count: variables.length,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("regression-calibrate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Approximate t-distribution CDF using normal approximation for large df */
function tCDF(t: number, df: number): number {
  // Use normal approximation for df > 30
  if (df > 30) {
    return normalCDF(t);
  }
  // Simple approximation via incomplete beta
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function incompleteBeta(a: number, b: number, x: number): number {
  // Simple continued fraction approximation
  if (x < 0 || x > 1) return 0;
  if (x === 0 || x === 1) return x;
  const lnBeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const prefix = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  // Use series for simplicity
  let sum = 1, term = 1;
  for (let n = 1; n < 200; n++) {
    term *= (n - b) * x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return prefix * sum;
}

function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
