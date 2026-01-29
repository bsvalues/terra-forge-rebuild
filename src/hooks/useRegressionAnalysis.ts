import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for regression analysis
export interface CoefficientRow {
  variable: string;
  coefficient: number;
  stdError: number;
  tStatistic: number;
  pValue: number;
  vif: number;
  significant: boolean;
}

export interface ANOVARow {
  source: string;
  df: number;
  sumSq: number;
  meanSq: number;
  fValue: number | null;
  pValue: number | null;
  etaSq: number | null;
}

export interface ModelDiagnostics {
  linearityPassed: boolean;
  linearityPValue: number;
  normalityPassed: boolean;
  normalityPValue: number;
  homoscedasticityPassed: boolean;
  homoscedasticityPValue: number;
  independencePassed: boolean;
  durbinWatson: number;
  multicollinearityPassed: boolean;
  maxVIF: number;
}

export interface DiagnosticPoint {
  x: number;
  y: number;
  label?: string;
  isOutlier?: boolean;
}

export interface RegressionResult {
  coefficients: CoefficientRow[];
  anova: ANOVARow[];
  neighborhoodEffects: NeighborhoodEffect[]; // New: geographic equity analysis
  modelStats: {
    rSquared: number;
    rSquaredAdj: number;
    fStatistic: number;
    fPValue: number;
    rmse: number;
    mae: number;
    aic: number;
    n: number;
    k: number;
    dfResidual: number;
  };
  diagnostics: ModelDiagnostics;
  diagnosticPlots: {
    residualsVsFitted: DiagnosticPoint[];
    qqPlot: DiagnosticPoint[];
    scaleLocation: DiagnosticPoint[];
    cooksDistance: { index: number; value: number; isInfluential: boolean }[];
  };
  equation: string;
  computedAt: string;
}

// New interface for neighborhood effects
export interface NeighborhoodEffect {
  code: string;
  coefficient: number;
  stdError: number;
  tStatistic: number;
  pValue: number;
  significant: boolean;
  count: number;
  interpretation: string;
}

// Shared state for regression results (feeds to Segment Discovery)
let cachedRegressionResult: RegressionResult | null = null;

export function getCachedRegressionResult(): RegressionResult | null {
  return cachedRegressionResult;
}

export function useRegressionAnalysis(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["regression-analysis", studyPeriodId],
    queryFn: async (): Promise<RegressionResult> => {
      if (!studyPeriodId) throw new Error("No study period selected");

      // Fetch assessment data with parcel characteristics
      const { data: assessments, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          sale_price,
          assessed_value,
          parcels!inner (
            id,
            building_area,
            land_area,
            year_built,
            bedrooms,
            bathrooms,
            neighborhood_code,
            property_class
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      if (!assessments || assessments.length < 30) {
        throw new Error("Insufficient data for regression analysis (minimum 30 records needed)");
      }

      // Perform regression analysis
      const result = computeMultipleRegression(assessments);
      
      // Cache result for Segment Discovery
      cachedRegressionResult = result;
      
      return result;
    },
    enabled: !!studyPeriodId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRunRegressionAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studyPeriodId: string) => {
      const { data: assessments, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          sale_price,
          assessed_value,
          parcels!inner (
            id,
            building_area,
            land_area,
            year_built,
            bedrooms,
            bathrooms,
            neighborhood_code,
            property_class
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      if (!assessments || assessments.length < 30) {
        throw new Error("Insufficient data for regression analysis");
      }

      const result = computeMultipleRegression(assessments);
      cachedRegressionResult = result;
      
      return result;
    },
    onSuccess: (_, studyPeriodId) => {
      queryClient.invalidateQueries({ queryKey: ["regression-analysis", studyPeriodId] });
      queryClient.invalidateQueries({ queryKey: ["factor-analysis"] });
      toast.success("Regression analysis complete", {
        description: "Coefficients computed and fed to Segment Discovery",
      });
    },
    onError: (error) => {
      toast.error("Analysis failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

// Core regression computation
function computeMultipleRegression(data: any[]): RegressionResult {
  // Prepare design matrix
  const n = data.length;
  const currentYear = new Date().getFullYear();
  
  // Extract dependent variable (assessment ratio)
  const y = data.map(d => d.ratio as number);
  
  // Extract continuous predictors (standardized for numerical stability)
  const buildingAreas = data.map(d => d.parcels?.building_area || 0);
  const landAreas = data.map(d => d.parcels?.land_area || 0);
  const ages = data.map(d => d.parcels?.year_built ? currentYear - d.parcels.year_built : 0);
  const bedrooms = data.map(d => d.parcels?.bedrooms || 0);
  const bathrooms = data.map(d => d.parcels?.bathrooms || 0);

  // Extract neighborhood codes for categorical variable
  const neighborhoods = data.map(d => d.parcels?.neighborhood_code || "Unknown");
  const uniqueNeighborhoods = [...new Set(neighborhoods)].filter(n => n !== "Unknown").sort();
  
  // Count observations per neighborhood
  const neighborhoodCounts: Record<string, number> = {};
  neighborhoods.forEach(n => {
    neighborhoodCounts[n] = (neighborhoodCounts[n] || 0) + 1;
  });
  
  // Filter neighborhoods with sufficient observations (at least 5)
  const validNeighborhoods = uniqueNeighborhoods.filter(n => (neighborhoodCounts[n] || 0) >= 5);
  
  // Limit to top 10 neighborhoods by count to avoid overfitting
  const topNeighborhoods = validNeighborhoods
    .sort((a, b) => (neighborhoodCounts[b] || 0) - (neighborhoodCounts[a] || 0))
    .slice(0, 10);
  
  // Reference neighborhood is the one with most observations (absorbed into intercept)
  const referenceNeighborhood = topNeighborhoods[0] || "Unknown";
  const dummyNeighborhoods = topNeighborhoods.slice(1);

  // Standardize continuous predictors
  const stdBuildingArea = standardize(buildingAreas);
  const stdLandArea = standardize(landAreas);
  const stdAge = standardize(ages);
  const stdBedrooms = standardize(bedrooms);
  const stdBathrooms = standardize(bathrooms);

  // Build design matrix with continuous and categorical variables
  // [1, building_area, land_area, age, bedrooms, bathrooms, nbhd_1, nbhd_2, ...]
  const X: number[][] = data.map((d, i) => {
    const row = [
      1, // Intercept
      stdBuildingArea.values[i],
      stdLandArea.values[i],
      stdAge.values[i],
      stdBedrooms.values[i],
      stdBathrooms.values[i],
    ];
    
    // Add dummy variables for neighborhoods (reference category omitted)
    const parcelNeighborhood = d.parcels?.neighborhood_code || "Unknown";
    dummyNeighborhoods.forEach(nbhd => {
      row.push(parcelNeighborhood === nbhd ? 1 : 0);
    });
    
    return row;
  });

  // Variable names including neighborhood dummies
  const continuousVarNames = ["(Intercept)", "Building_Area", "Land_Area", "Age", "Bedrooms", "Bathrooms"];
  const neighborhoodVarNames = dummyNeighborhoods.map(n => `Nbhd_${n}`);
  const variableNames = [...continuousVarNames, ...neighborhoodVarNames];
  
  const numContinuous = continuousVarNames.length - 1; // Exclude intercept
  const numNeighborhoods = dummyNeighborhoods.length;
  const k = numContinuous + numNeighborhoods; // Total predictors

  // Solve normal equations: β = (X'X)^(-1) X'y
  const XtX = matrixMultiply(transpose(X), X);
  const XtXInv = invertMatrix(XtX);
  const Xty = matrixVectorMultiply(transpose(X), y);
  const beta = matrixVectorMultiply(XtXInv, Xty);

  // Calculate predictions and residuals
  const yHat = X.map(row => dotProduct(row, beta));
  const residuals = y.map((yi, i) => yi - yHat[i]);
  const yMean = mean(y);

  // Sum of squares
  const sst = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const sse = residuals.reduce((acc, r) => acc + r * r, 0);
  const ssr = sst - sse;

  // Model statistics
  const rSquared = 1 - sse / sst;
  const rSquaredAdj = 1 - ((1 - rSquared) * (n - 1)) / (n - k - 1);
  const mse = sse / (n - k - 1);
  const rmse = Math.sqrt(mse);
  const mae = mean(residuals.map(Math.abs));

  // F-statistic
  const msr = ssr / k;
  const fStatistic = msr / mse;
  const fPValue = approximateFPValue(fStatistic, k, n - k - 1);

  // Calculate standard errors and t-statistics for coefficients
  const stds = [stdBuildingArea, stdLandArea, stdAge, stdBedrooms, stdBathrooms];
  
  const coefficients: CoefficientRow[] = continuousVarNames.map((name, i) => {
    const se = Math.sqrt(Math.max(0, mse * XtXInv[i][i]));
    const t = se > 0 ? beta[i] / se : 0;
    const pValue = approximateTwoPValue(Math.abs(t), n - k - 1);
    
    // Unstandardize coefficient for interpretability
    let unstdCoef = beta[i];
    if (i > 0 && i <= stds.length) {
      unstdCoef = beta[i] / stds[i - 1].std;
    }

    return {
      variable: name,
      coefficient: unstdCoef,
      stdError: se,
      tStatistic: t,
      pValue,
      vif: i === 0 ? 1.0 : calculateVIF(X, i),
      significant: pValue < 0.05,
    };
  });

  // Add neighborhood as a single categorical coefficient (overall effect)
  if (numNeighborhoods > 0) {
    // Calculate neighborhood F-test (joint significance)
    const nbhdStartIdx = continuousVarNames.length;
    const nbhdBetas = beta.slice(nbhdStartIdx);
    const avgNbhdEffect = mean(nbhdBetas.map(Math.abs));
    const nbhdFStat = computeNeighborhoodFStat(X, y, beta, nbhdStartIdx, numNeighborhoods, mse);
    const nbhdPValue = approximateFPValue(nbhdFStat, numNeighborhoods, n - k - 1);
    
    coefficients.push({
      variable: "Neighborhood",
      coefficient: avgNbhdEffect,
      stdError: 0,
      tStatistic: nbhdFStat,
      pValue: nbhdPValue,
      vif: 1.0,
      significant: nbhdPValue < 0.05,
    });
  }

  // Extract neighborhood-specific effects
  const neighborhoodEffects: NeighborhoodEffect[] = [];
  
  // Add reference neighborhood (coefficient = 0 by definition)
  neighborhoodEffects.push({
    code: referenceNeighborhood,
    coefficient: 0,
    stdError: 0,
    tStatistic: 0,
    pValue: 1,
    significant: false,
    count: neighborhoodCounts[referenceNeighborhood] || 0,
    interpretation: "Reference category — baseline for comparison",
  });
  
  // Add other neighborhoods with their coefficients
  dummyNeighborhoods.forEach((nbhd, i) => {
    const idx = continuousVarNames.length + i;
    const se = Math.sqrt(Math.max(0, mse * XtXInv[idx][idx]));
    const coef = beta[idx];
    const t = se > 0 ? coef / se : 0;
    const pValue = approximateTwoPValue(Math.abs(t), n - k - 1);
    const significant = pValue < 0.05;
    
    let interpretation = "";
    if (!significant) {
      interpretation = `No significant difference from ${referenceNeighborhood}`;
    } else if (coef > 0.05) {
      interpretation = `Over-assessed by ${(coef * 100).toFixed(1)}% vs ${referenceNeighborhood} — potential regressivity`;
    } else if (coef < -0.05) {
      interpretation = `Under-assessed by ${(Math.abs(coef) * 100).toFixed(1)}% vs ${referenceNeighborhood} — potential progressivity`;
    } else if (coef > 0) {
      interpretation = `Slightly higher ratios (+${(coef * 100).toFixed(1)}%) vs ${referenceNeighborhood}`;
    } else {
      interpretation = `Slightly lower ratios (${(coef * 100).toFixed(1)}%) vs ${referenceNeighborhood}`;
    }
    
    neighborhoodEffects.push({
      code: nbhd,
      coefficient: coef,
      stdError: se,
      tStatistic: t,
      pValue,
      significant,
      count: neighborhoodCounts[nbhd] || 0,
      interpretation,
    });
  });
  
  // Sort by absolute coefficient (largest effects first)
  neighborhoodEffects.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));

  // ANOVA table - continuous variables
  const anova: ANOVARow[] = [
    ...continuousVarNames.slice(1).map((name, i) => {
      const ssVar = computePartialSS(X, y, i + 1, beta, yMean);
      const msVar = ssVar;
      const fVar = msVar / mse;
      const etaSq = ssVar / sst;
      
      return {
        source: name,
        df: 1,
        sumSq: ssVar,
        meanSq: msVar,
        fValue: fVar,
        pValue: approximateFPValue(fVar, 1, n - k - 1),
        etaSq,
      };
    }),
  ];
  
  // Add neighborhood as a single ANOVA row (joint effect)
  if (numNeighborhoods > 0) {
    const nbhdSS = computeNeighborhoodSS(X, y, beta, continuousVarNames.length, numNeighborhoods, yMean);
    const nbhdMS = nbhdSS / numNeighborhoods;
    const nbhdF = nbhdMS / mse;
    const nbhdEtaSq = nbhdSS / sst;
    
    anova.push({
      source: "Neighborhood",
      df: numNeighborhoods,
      sumSq: nbhdSS,
      meanSq: nbhdMS,
      fValue: nbhdF,
      pValue: approximateFPValue(nbhdF, numNeighborhoods, n - k - 1),
      etaSq: nbhdEtaSq,
    });
  }
  
  // Add residuals
  anova.push({
    source: "Residuals",
    df: n - k - 1,
    sumSq: sse,
    meanSq: mse,
    fValue: null,
    pValue: null,
    etaSq: null,
  });

  // Diagnostic tests
  const diagnostics = computeDiagnostics(residuals, yHat, X, coefficients);

  // Diagnostic plots
  const diagnosticPlots = computeDiagnosticPlots(residuals, yHat, X, beta, mse);

  // Build equation string
  const equation = buildEquationString(coefficients, stds, referenceNeighborhood);

  // Calculate AIC
  const aic = n * Math.log(sse / n) + 2 * (k + 1);

  return {
    coefficients,
    anova,
    neighborhoodEffects,
    modelStats: {
      rSquared,
      rSquaredAdj,
      fStatistic,
      fPValue,
      rmse,
      mae,
      aic,
      n,
      k,
      dfResidual: n - k - 1,
    },
    diagnostics,
    diagnosticPlots,
    equation,
    computedAt: new Date().toISOString(),
  };
}

// Compute F-statistic for neighborhood variables jointly
function computeNeighborhoodFStat(
  X: number[][],
  y: number[],
  beta: number[],
  startIdx: number,
  numVars: number,
  mse: number
): number {
  // Sum of squares attributable to neighborhood variables
  let ssNbhd = 0;
  for (let i = 0; i < X.length; i++) {
    let nbhdContrib = 0;
    for (let j = 0; j < numVars; j++) {
      nbhdContrib += beta[startIdx + j] * X[i][startIdx + j];
    }
    ssNbhd += nbhdContrib * nbhdContrib;
  }
  
  const msNbhd = ssNbhd / numVars;
  return msNbhd / mse;
}

// Compute sum of squares for neighborhood variables
function computeNeighborhoodSS(
  X: number[][],
  y: number[],
  beta: number[],
  startIdx: number,
  numVars: number,
  yMean: number
): number {
  let ss = 0;
  for (let i = 0; i < X.length; i++) {
    let nbhdContrib = 0;
    for (let j = 0; j < numVars; j++) {
      nbhdContrib += beta[startIdx + j] * X[i][startIdx + j];
    }
    ss += nbhdContrib * nbhdContrib;
  }
  return ss;
}

// Helper functions
function standardize(values: number[]): { values: number[]; mean: number; std: number } {
  const m = mean(values);
  const s = std(values);
  return {
    values: values.map(v => s > 0 ? (v - m) / s : 0),
    mean: m,
    std: s || 1,
  };
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((acc, ai, i) => acc + ai * b[i], 0);
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      result[i][j] = 0;
      for (let k = 0; k < A[0].length; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => dotProduct(row, vector));
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => {
    const identity = Array(n).fill(0);
    identity[i] = 1;
    return [...row, ...identity];
  });

  // Gaussian elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Scale pivot row
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) {
      // Near-singular matrix, add small regularization
      augmented[i][i] = 1e-10;
    }
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot || 1e-10;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  return augmented.map(row => row.slice(n));
}

function calculateVIF(X: number[][], varIndex: number): number {
  // Simplified VIF calculation
  const n = X.length;
  const otherVars = X[0].map((_, j) => j !== varIndex && j !== 0);
  
  const y = X.map(row => row[varIndex]);
  const Xsub = X.map(row => [1, ...row.filter((_, j) => otherVars[j])]);
  
  if (Xsub[0].length < 2) return 1;

  const yMean = mean(y);
  const XtX = matrixMultiply(transpose(Xsub), Xsub);
  
  try {
    const XtXInv = invertMatrix(XtX);
    const Xty = matrixVectorMultiply(transpose(Xsub), y);
    const beta = matrixVectorMultiply(XtXInv, Xty);
    const yHat = Xsub.map(row => dotProduct(row, beta));
    const residuals = y.map((yi, i) => yi - yHat[i]);
    
    const sst = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const sse = residuals.reduce((acc, r) => acc + r * r, 0);
    const rSq = 1 - sse / sst;
    
    return 1 / (1 - Math.min(rSq, 0.99));
  } catch {
    return 1;
  }
}

function computePartialSS(X: number[][], y: number[], varIndex: number, beta: number[], yMean: number): number {
  // Type III sum of squares for variable
  const n = X.length;
  const contribution = X.map(row => beta[varIndex] * row[varIndex]);
  return contribution.reduce((acc, c) => acc + c * c, 0);
}

function computeDiagnostics(
  residuals: number[],
  fitted: number[],
  X: number[][],
  coefficients: CoefficientRow[]
): ModelDiagnostics {
  const n = residuals.length;
  
  // Normality test (Shapiro-Wilk approximation via skewness/kurtosis)
  const resMean = mean(residuals);
  const resStd = std(residuals);
  const standardizedRes = residuals.map(r => (r - resMean) / resStd);
  
  const skewness = mean(standardizedRes.map(r => Math.pow(r, 3)));
  const kurtosis = mean(standardizedRes.map(r => Math.pow(r, 4))) - 3;
  
  const normalityPValue = Math.exp(-Math.abs(skewness) - Math.abs(kurtosis) * 0.5);
  const normalityPassed = normalityPValue > 0.05;

  // Linearity (correlation of residuals with fitted)
  const fittedMean = mean(fitted);
  let corrNum = 0, corrDenomRes = 0, corrDenomFit = 0;
  for (let i = 0; i < n; i++) {
    const resDiff = residuals[i] - resMean;
    const fitDiff = fitted[i] - fittedMean;
    corrNum += resDiff * fitDiff;
    corrDenomRes += resDiff * resDiff;
    corrDenomFit += fitDiff * fitDiff;
  }
  const correlation = Math.abs(corrNum / Math.sqrt(corrDenomRes * corrDenomFit));
  const linearityPValue = 1 - correlation;
  const linearityPassed = linearityPValue > 0.05;

  // Homoscedasticity (Breusch-Pagan approximation)
  const squaredRes = residuals.map(r => r * r);
  const sqResMean = mean(squaredRes);
  let bpCorr = 0, bpDenomSq = 0;
  for (let i = 0; i < n; i++) {
    const sqDiff = squaredRes[i] - sqResMean;
    const fitDiff = fitted[i] - fittedMean;
    bpCorr += sqDiff * fitDiff;
    bpDenomSq += sqDiff * sqDiff;
  }
  const heteroCorr = Math.abs(bpCorr / Math.sqrt(bpDenomSq * corrDenomFit));
  const homoscedasticityPValue = 1 - heteroCorr;
  const homoscedasticityPassed = homoscedasticityPValue > 0.05;

  // Independence (Durbin-Watson)
  let dwNum = 0;
  for (let i = 1; i < n; i++) {
    dwNum += Math.pow(residuals[i] - residuals[i - 1], 2);
  }
  const dwDenom = residuals.reduce((acc, r) => acc + r * r, 0);
  const durbinWatson = dwNum / dwDenom;
  const independencePassed = durbinWatson > 1.5 && durbinWatson < 2.5;

  // Multicollinearity (max VIF)
  const maxVIF = Math.max(...coefficients.slice(1).map(c => c.vif));
  const multicollinearityPassed = maxVIF < 5;

  return {
    linearityPassed,
    linearityPValue,
    normalityPassed,
    normalityPValue,
    homoscedasticityPassed,
    homoscedasticityPValue,
    independencePassed,
    durbinWatson,
    multicollinearityPassed,
    maxVIF,
  };
}

function computeDiagnosticPlots(
  residuals: number[],
  fitted: number[],
  X: number[][],
  beta: number[],
  mse: number
): RegressionResult["diagnosticPlots"] {
  const n = residuals.length;
  const resStd = std(residuals);
  const standardizedRes = residuals.map(r => r / resStd);

  // Sample points for plots (max 200 for performance)
  const sampleSize = Math.min(n, 200);
  const step = Math.max(1, Math.floor(n / sampleSize));
  const indices = Array.from({ length: n }, (_, i) => i).filter((_, i) => i % step === 0);

  // Residuals vs Fitted
  const residualsVsFitted: DiagnosticPoint[] = indices.map(i => ({
    x: fitted[i],
    y: residuals[i],
    isOutlier: Math.abs(standardizedRes[i]) > 2,
  }));

  // Q-Q Plot
  const sortedStdRes = [...standardizedRes].sort((a, b) => a - b);
  const qqPlot: DiagnosticPoint[] = sortedStdRes
    .filter((_, i) => i % step === 0)
    .map((r, i, arr) => {
      const p = (i + 0.5) / arr.length;
      const theoretical = normalQuantile(p);
      return { x: theoretical, y: r, isOutlier: Math.abs(r) > 2 };
    });

  // Scale-Location
  const sqrtAbsRes = standardizedRes.map(r => Math.sqrt(Math.abs(r)));
  const scaleLocation: DiagnosticPoint[] = indices.map(i => ({
    x: fitted[i],
    y: sqrtAbsRes[i],
    isOutlier: sqrtAbsRes[i] > 1.5,
  }));

  // Cook's Distance
  const leverage = computeLeverage(X);
  const cooksDistance = residuals.map((r, i) => {
    const h = leverage[i];
    const stdRes = r / (Math.sqrt(mse) * Math.sqrt(1 - h));
    return {
      index: i,
      value: (stdRes * stdRes * h) / ((X[0].length) * (1 - h)),
      isInfluential: false,
    };
  });
  
  // Mark influential points
  cooksDistance.forEach(d => {
    d.isInfluential = d.value > 4 / n;
  });

  // Sample Cook's distance
  const sampledCooks = cooksDistance.filter((_, i) => i % step === 0);

  return {
    residualsVsFitted,
    qqPlot,
    scaleLocation,
    cooksDistance: sampledCooks,
  };
}

function computeLeverage(X: number[][]): number[] {
  const XtX = matrixMultiply(transpose(X), X);
  try {
    const XtXInv = invertMatrix(XtX);
    return X.map(row => {
      const XtXInvRow = matrixVectorMultiply(XtXInv, row);
      return dotProduct(row, XtXInvRow);
    });
  } catch {
    return X.map(() => 1 / X.length);
  }
}

function normalQuantile(p: number): number {
  // Approximation of inverse normal CDF
  if (p <= 0) return -4;
  if (p >= 1) return 4;
  if (p === 0.5) return 0;
  
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1
  ];
  
  const q = p < 0.5 ? p : 1 - p;
  const r = Math.sqrt(-2 * Math.log(q));
  
  let result = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  
  return p < 0.5 ? -result : result;
}

function approximateTwoPValue(t: number, df: number): number {
  if (df <= 0 || t === 0) return 1;
  if (t > 4) return 0.0001;
  if (t > 3.5) return 0.001;
  if (t > 2.5) return 0.01;
  if (t > 2.0) return 0.05;
  if (t > 1.7) return 0.1;
  return 0.5;
}

function approximateFPValue(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0 || f <= 0) return 1;
  if (f > 100) return 0.0001;
  if (f > 50) return 0.001;
  if (f > 10) return 0.01;
  if (f > 5) return 0.05;
  if (f > 3) return 0.1;
  return 0.5;
}

function buildEquationString(
  coefficients: CoefficientRow[],
  stds: { mean: number; std: number }[],
  referenceNeighborhood?: string
): string {
  const intercept = coefficients[0];
  let eq = `ŷ = ${intercept.coefficient.toFixed(4)}`;
  
  coefficients.slice(1).forEach((c) => {
    if (c.variable === "Neighborhood") {
      // Show neighborhood as categorical with reference
      eq += ` + Σβ(Neighborhood)`;
      if (referenceNeighborhood) {
        eq += ` [ref: ${referenceNeighborhood}]`;
      }
    } else {
      const sign = c.coefficient >= 0 ? " + " : " - ";
      const varName = c.variable.replace("_", "");
      eq += `${sign}${Math.abs(c.coefficient).toFixed(6)}(${varName})`;
    }
  });
  
  return eq;
}
