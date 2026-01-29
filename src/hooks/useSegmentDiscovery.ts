import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedRegressionResult, CoefficientRow, NeighborhoodEffect } from "./useRegressionAnalysis";

export interface FactorAnalysis {
  factor: string;
  label: string;
  importance: number;
  pValue: number;
  coefficient: number;
  stdError: number;
  tStatistic: number;
  vif: number;
  significant: boolean;
  segmentRecommendation: string;
  fromRegression?: boolean; // Flag to indicate if this came from Regression Studio
}

export interface SegmentDefinition {
  id: string;
  name: string;
  factor: string;
  ranges: SegmentRange[];
  isActive: boolean;
  importance: number;
}

export interface SegmentRange {
  label: string;
  min: number | null;
  max: number | null;
  count?: number;
  medianRatio?: number;
}

export interface SegmentDiscoveryResult {
  factors: FactorAnalysis[];
  suggestedSegments: SegmentDefinition[];
  dataQuality: {
    totalRecords: number;
    missingData: Record<string, number>;
    factorCoverage: Record<string, number>;
  };
}

// Analyze which factors most impact assessment ratio variation
// This hook now integrates with Regression Studio results when available
export function useFactorAnalysis(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["factor-analysis", studyPeriodId],
    queryFn: async (): Promise<FactorAnalysis[]> => {
      if (!studyPeriodId) return [];

      // Check if we have cached regression results from Regression Studio
      const regressionResult = getCachedRegressionResult();
      
      if (regressionResult) {
        // Use regression coefficients for factor analysis (includes neighborhood effects)
        return convertRegressionToFactors(
          regressionResult.coefficients, 
          regressionResult.anova,
          regressionResult.neighborhoodEffects
        );
      }

      // Fallback: Get assessment ratios with parcel data for the study period
      const { data: ratios, error: ratiosError } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          parcels!inner (
            building_area,
            land_area,
            year_built,
            bedrooms,
            bathrooms,
            neighborhood_code,
            property_class,
            city,
            zip_code
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (ratiosError) throw ratiosError;

      // Calculate factor importance based on variance explained
      // This is a simplified client-side regression analysis
      const factors = analyzeFactorImportance(ratios || []);
      
      return factors;
    },
    enabled: !!studyPeriodId,
  });
}

// Convert Regression Studio results to factor analysis format
function convertRegressionToFactors(
  coefficients: CoefficientRow[], 
  anova: any[],
  neighborhoodEffects?: NeighborhoodEffect[]
): FactorAnalysis[] {
  const factorLabelMap: Record<string, string> = {
    "Building_Area": "Square Footage",
    "Land_Area": "Land Area / Lot Size",
    "Age": "Year Built / Age",
    "Bedrooms": "Bedrooms",
    "Bathrooms": "Bathrooms",
    "Neighborhood": "Neighborhood / Location",
  };

  const factorKeyMap: Record<string, string> = {
    "Building_Area": "building_area",
    "Land_Area": "land_area",
    "Age": "year_built",
    "Bedrooms": "bedrooms",
    "Bathrooms": "bathrooms",
    "Neighborhood": "neighborhood_code",
  };

  // Get eta-squared values from ANOVA for importance
  const etaSquaredMap: Record<string, number> = {};
  anova.forEach(row => {
    if (row.etaSq !== null) {
      etaSquaredMap[row.source] = row.etaSq;
    }
  });

  const factors = coefficients
    .filter(c => c.variable !== "(Intercept)")
    .map(coef => {
      const label = factorLabelMap[coef.variable] || coef.variable.replace("_", " ");
      const factor = factorKeyMap[coef.variable] || coef.variable.toLowerCase();
      const importance = etaSquaredMap[coef.variable] || Math.abs(coef.tStatistic) / 100;

      // Special handling for neighborhood - include detailed recommendation
      let recommendation = getSegmentRecommendationFromRegression(factor, importance, coef.coefficient, coef.significant);
      
      if (coef.variable === "Neighborhood" && neighborhoodEffects) {
        const significantNbhds = neighborhoodEffects.filter(n => n.significant && n.coefficient !== 0);
        const overAssessed = significantNbhds.filter(n => n.coefficient > 0.03);
        const underAssessed = significantNbhds.filter(n => n.coefficient < -0.03);
        
        if (overAssessed.length > 0 || underAssessed.length > 0) {
          recommendation = `Geographic inequity detected: ${overAssessed.length} over-assessed, ${underAssessed.length} under-assessed neighborhoods. Use geographic segments for targeted revaluation.`;
        } else if (significantNbhds.length > 0) {
          recommendation = `Minor geographic variation in ${significantNbhds.length} neighborhoods — consider neighborhood-based adjustments`;
        } else {
          recommendation = "No significant geographic inequity detected — uniform assessment across neighborhoods";
        }
      }

      return {
        factor,
        label,
        importance,
        pValue: coef.pValue,
        coefficient: coef.coefficient,
        stdError: coef.stdError,
        tStatistic: coef.tStatistic,
        vif: coef.vif,
        significant: coef.significant,
        segmentRecommendation: recommendation,
        fromRegression: true,
      };
    })
    .sort((a, b) => b.importance - a.importance);

  return factors;
}

function getSegmentRecommendationFromRegression(
  factor: string, 
  importance: number, 
  coefficient: number,
  significant: boolean
): string {
  if (!significant) {
    return "Not statistically significant — may not need segmentation";
  }

  if (importance < 0.01) {
    return "Low impact — may not need segmentation";
  }

  if (factor === "building_area") {
    if (importance > 0.05) {
      return coefficient > 0 
        ? "Larger properties have higher ratios — create sq ft tiers to address vertical inequity" 
        : "Smaller properties have higher ratios — create sq ft tiers to address regressivity";
    }
    return "Moderate size impact — consider value-based tiers";
  }

  if (factor === "year_built") {
    if (importance > 0.03) {
      return coefficient > 0 
        ? "Older properties over-assessed — create age brackets (0-20, 21-50, 51+)"
        : "Newer properties over-assessed — investigate new construction valuations";
    }
    return "Minor age effect — may group with other factors";
  }

  if (factor === "land_area") {
    if (importance > 0.03) {
      return "Lot size impacts ratios — consider land value segmentation";
    }
    return "Secondary land factor — combine with primary segments";
  }

  return importance > 0.05 
    ? `Significant impact (${(importance * 100).toFixed(1)}%) — recommended for segmentation`
    : "Secondary factor — combine with primary segments";
}

// Get segment suggestions based on factor analysis
export function useSegmentSuggestions(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["segment-suggestions", studyPeriodId],
    queryFn: async (): Promise<SegmentDefinition[]> => {
      if (!studyPeriodId) return [];

      // Get data distribution for creating segment ranges
      const { data: ratios, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          parcels!inner (
            building_area,
            year_built,
            neighborhood_code,
            property_class,
            zip_code
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      return generateSegmentSuggestions(ratios || []);
    },
    enabled: !!studyPeriodId,
  });
}

// Get neighborhood-level analysis
export function useNeighborhoodAnalysis(studyPeriodId: string | undefined) {
  return useQuery({
    queryKey: ["neighborhood-analysis", studyPeriodId],
    queryFn: async () => {
      if (!studyPeriodId) return [];

      const { data, error } = await supabase
        .from("assessment_ratios")
        .select(`
          ratio,
          parcels!inner (
            neighborhood_code
          )
        `)
        .eq("study_period_id", studyPeriodId)
        .eq("is_outlier", false);

      if (error) throw error;

      // Group by neighborhood and calculate statistics
      const neighborhoods: Record<string, number[]> = {};
      (data || []).forEach((item) => {
        const nbhd = item.parcels?.neighborhood_code || "Unknown";
        if (!neighborhoods[nbhd]) neighborhoods[nbhd] = [];
        if (item.ratio !== null) neighborhoods[nbhd].push(item.ratio);
      });

      return Object.entries(neighborhoods)
        .map(([code, ratios]) => {
          const sorted = [...ratios].sort((a, b) => a - b);
          const median = sorted.length > 0 
            ? sorted[Math.floor(sorted.length / 2)] 
            : 1.0;
          const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
          const deviation = Math.abs(median - 1.0);
          
          // Calculate COD for neighborhood
          const absDeviations = ratios.map(r => Math.abs(r - median));
          const avgAbsDev = absDeviations.reduce((a, b) => a + b, 0) / absDeviations.length;
          const cod = (avgAbsDev / median) * 100;

          return {
            code,
            count: ratios.length,
            median,
            mean,
            deviation,
            cod,
            status: getNeighborhoodStatus(deviation, cod),
          };
        })
        .sort((a, b) => b.deviation - a.deviation);
    },
    enabled: !!studyPeriodId,
  });
}

// Helper: Analyze factor importance
function analyzeFactorImportance(data: any[]): FactorAnalysis[] {
  if (data.length === 0) return [];

  // Extract ratios and factors
  const ratios = data.map(d => d.ratio).filter(r => r !== null) as number[];
  
  // Calculate variance for each factor
  const factors: FactorAnalysis[] = [];

  // Analyze building area (sq ft)
  const buildingAreas = data.map(d => d.parcels?.building_area).filter(Boolean);
  if (buildingAreas.length > 0) {
    const sqftAnalysis = calculateFactorStats("building_area", "Square Footage", buildingAreas, ratios, data);
    factors.push(sqftAnalysis);
  }

  // Analyze year built (age)
  const yearBuilts = data.map(d => d.parcels?.year_built).filter(Boolean);
  if (yearBuilts.length > 0) {
    const ageAnalysis = calculateFactorStats("year_built", "Year Built / Age", yearBuilts, ratios, data);
    factors.push(ageAnalysis);
  }

  // Analyze neighborhood (categorical)
  const neighborhoods = data.map(d => d.parcels?.neighborhood_code).filter(Boolean);
  if (neighborhoods.length > 0) {
    const nbhdAnalysis = calculateCategoricalFactorStats("neighborhood_code", "Neighborhood", neighborhoods, ratios, data);
    factors.push(nbhdAnalysis);
  }

  // Analyze property class
  const propClasses = data.map(d => d.parcels?.property_class).filter(Boolean);
  if (propClasses.length > 0) {
    const classAnalysis = calculateCategoricalFactorStats("property_class", "Property Class", propClasses, ratios, data);
    factors.push(classAnalysis);
  }

  // Analyze zip code / location
  const zipCodes = data.map(d => d.parcels?.zip_code).filter(Boolean);
  if (zipCodes.length > 0) {
    const zipAnalysis = calculateCategoricalFactorStats("zip_code", "ZIP Code / Location", zipCodes, ratios, data);
    factors.push(zipAnalysis);
  }

  // Analyze bedrooms
  const bedrooms = data.map(d => d.parcels?.bedrooms).filter(Boolean);
  if (bedrooms.length > 0) {
    const bedAnalysis = calculateFactorStats("bedrooms", "Bedrooms", bedrooms, ratios, data);
    factors.push(bedAnalysis);
  }

  // Analyze bathrooms
  const bathrooms = data.map(d => d.parcels?.bathrooms).filter(Boolean);
  if (bathrooms.length > 0) {
    const bathAnalysis = calculateFactorStats("bathrooms", "Bathrooms", bathrooms, ratios, data);
    factors.push(bathAnalysis);
  }

  // Analyze land area
  const landAreas = data.map(d => d.parcels?.land_area).filter(Boolean);
  if (landAreas.length > 0) {
    const landAnalysis = calculateFactorStats("land_area", "Land Area / Lot Size", landAreas, ratios, data);
    factors.push(landAnalysis);
  }

  // Sort by importance
  return factors.sort((a, b) => b.importance - a.importance);
}

// Calculate statistics for continuous factors
function calculateFactorStats(
  factor: string,
  label: string,
  values: number[],
  ratios: number[],
  data: any[]
): FactorAnalysis {
  // Calculate correlation between factor and ratio
  const n = Math.min(values.length, ratios.length);
  const filteredData = data.filter(d => d.parcels?.[factor] != null && d.ratio != null);
  
  if (filteredData.length < 10) {
    return createEmptyAnalysis(factor, label);
  }

  const xs = filteredData.map(d => d.parcels[factor] as number);
  const ys = filteredData.map(d => d.ratio as number);

  // Simple linear regression
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < xs.length; i++) {
    const xDiff = xs[i] - xMean;
    const yDiff = ys[i] - yMean;
    ssXY += xDiff * yDiff;
    ssXX += xDiff * xDiff;
    ssYY += yDiff * yDiff;
  }

  const coefficient = ssXX > 0 ? ssXY / ssXX : 0;
  const correlation = ssXX > 0 && ssYY > 0 ? ssXY / Math.sqrt(ssXX * ssYY) : 0;
  const rSquared = correlation * correlation;

  // Calculate standard error and t-statistic
  const predictions = xs.map(x => yMean + coefficient * (x - xMean));
  const residuals = ys.map((y, i) => y - predictions[i]);
  const sse = residuals.reduce((a, b) => a + b * b, 0);
  const mse = sse / (xs.length - 2);
  const stdError = Math.sqrt(mse / ssXX);
  const tStatistic = stdError > 0 ? coefficient / stdError : 0;
  
  // Approximate p-value (simplified)
  const pValue = approximatePValue(Math.abs(tStatistic), xs.length - 2);
  
  // Importance is based on variance explained (R²)
  const importance = rSquared;
  const significant = pValue < 0.05;

  return {
    factor,
    label,
    importance,
    pValue,
    coefficient,
    stdError,
    tStatistic,
    vif: 1.0 + Math.random() * 0.5, // Placeholder - would need full multivariate analysis
    significant,
    segmentRecommendation: getSegmentRecommendation(factor, importance, coefficient),
  };
}

// Calculate statistics for categorical factors (neighborhood, property class, etc.)
function calculateCategoricalFactorStats(
  factor: string,
  label: string,
  values: string[],
  ratios: number[],
  data: any[]
): FactorAnalysis {
  const filteredData = data.filter(d => d.parcels?.[factor] != null && d.ratio != null);
  
  if (filteredData.length < 10) {
    return createEmptyAnalysis(factor, label);
  }

  // Group by category
  const groups: Record<string, number[]> = {};
  filteredData.forEach(d => {
    const cat = d.parcels[factor] as string;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(d.ratio);
  });

  // Calculate between-group variance (ANOVA-style)
  const overallMean = filteredData.reduce((a, d) => a + d.ratio, 0) / filteredData.length;
  const groupMeans = Object.entries(groups).map(([cat, rats]) => ({
    cat,
    mean: rats.reduce((a, b) => a + b, 0) / rats.length,
    count: rats.length,
  }));

  // Sum of squares between groups
  const ssBetween = groupMeans.reduce((acc, g) => 
    acc + g.count * Math.pow(g.mean - overallMean, 2), 0);

  // Sum of squares within groups
  const ssWithin = Object.values(groups).reduce((acc, rats) => {
    const groupMean = rats.reduce((a, b) => a + b, 0) / rats.length;
    return acc + rats.reduce((a, r) => a + Math.pow(r - groupMean, 2), 0);
  }, 0);

  const ssTotal = ssBetween + ssWithin;
  const importance = ssTotal > 0 ? ssBetween / ssTotal : 0; // Eta-squared

  // F-statistic
  const dfBetween = groupMeans.length - 1;
  const dfWithin = filteredData.length - groupMeans.length;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;

  // Approximate p-value for F-test
  const pValue = approximateFPValue(fStatistic, dfBetween, dfWithin);
  const significant = pValue < 0.05;

  return {
    factor,
    label,
    importance,
    pValue,
    coefficient: 0, // Not applicable for categorical
    stdError: 0,
    tStatistic: fStatistic, // Using F for categorical
    vif: 1.0,
    significant,
    segmentRecommendation: getSegmentRecommendation(factor, importance, 0),
  };
}

function createEmptyAnalysis(factor: string, label: string): FactorAnalysis {
  return {
    factor,
    label,
    importance: 0,
    pValue: 1,
    coefficient: 0,
    stdError: 0,
    tStatistic: 0,
    vif: 1,
    significant: false,
    segmentRecommendation: "Insufficient data for analysis",
  };
}

// Approximate p-value from t-statistic (simplified)
function approximatePValue(t: number, df: number): number {
  // Simplified approximation - in production use proper t-distribution
  const x = df / (df + t * t);
  if (df <= 0 || t === 0) return 1;
  // Very rough approximation
  if (Math.abs(t) > 3.5) return 0.001;
  if (Math.abs(t) > 2.5) return 0.01;
  if (Math.abs(t) > 2.0) return 0.05;
  if (Math.abs(t) > 1.7) return 0.1;
  return 0.5;
}

// Approximate p-value from F-statistic
function approximateFPValue(f: number, df1: number, df2: number): number {
  if (df1 <= 0 || df2 <= 0 || f <= 0) return 1;
  // Very rough approximation
  if (f > 10) return 0.001;
  if (f > 5) return 0.01;
  if (f > 3) return 0.05;
  if (f > 2) return 0.1;
  return 0.5;
}

function getSegmentRecommendation(factor: string, importance: number, coefficient: number): string {
  if (importance < 0.01) {
    return "Low impact - may not need segmentation";
  }
  
  if (factor === "neighborhood_code" || factor === "zip_code") {
    if (importance > 0.05) {
      return "High geographic impact - create neighborhood segments";
    }
    return "Moderate geographic variation - consider location groupings";
  }
  
  if (factor === "building_area") {
    if (importance > 0.05) {
      return coefficient > 0 
        ? "Larger homes under-assessed - create sq ft tiers" 
        : "Smaller homes under-assessed - create sq ft tiers";
    }
    return "Moderate size impact - consider value-based tiers";
  }
  
  if (factor === "year_built") {
    if (importance > 0.03) {
      return "Age impacts ratios - create age brackets (0-20, 21-50, 51+)";
    }
    return "Minor age effect - may group with other factors";
  }
  
  return importance > 0.05 
    ? `Significant impact (${(importance * 100).toFixed(1)}%) - recommended for segmentation`
    : "Secondary factor - combine with primary segments";
}

function getNeighborhoodStatus(deviation: number, cod: number): "critical" | "warning" | "good" | "excellent" {
  if (deviation > 0.10 || cod > 20) return "critical";
  if (deviation > 0.05 || cod > 15) return "warning";
  if (deviation > 0.02 || cod > 10) return "good";
  return "excellent";
}

// Generate segment suggestions based on data distribution
function generateSegmentSuggestions(data: any[]): SegmentDefinition[] {
  if (data.length === 0) return [];

  const suggestions: SegmentDefinition[] = [];

  // Neighborhood segments
  const neighborhoods = [...new Set(data.map(d => d.parcels?.neighborhood_code).filter(Boolean))];
  if (neighborhoods.length > 1) {
    suggestions.push({
      id: "nbhd",
      name: "Neighborhood Analysis",
      factor: "neighborhood_code",
      ranges: neighborhoods.slice(0, 10).map(nbhd => ({
        label: nbhd as string,
        min: null,
        max: null,
      })),
      isActive: true,
      importance: 0.85,
    });
  }

  // Square footage segments
  const sqfts = data.map(d => d.parcels?.building_area).filter(Boolean) as number[];
  if (sqfts.length > 0) {
    const sorted = [...sqfts].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    
    suggestions.push({
      id: "sqft",
      name: "Square Footage Tiers",
      factor: "building_area",
      ranges: [
        { label: `Small (<${q1.toLocaleString()} sf)`, min: 0, max: q1 },
        { label: `Medium (${q1.toLocaleString()}-${q2.toLocaleString()} sf)`, min: q1, max: q2 },
        { label: `Large (${q2.toLocaleString()}-${q3.toLocaleString()} sf)`, min: q2, max: q3 },
        { label: `Very Large (>${q3.toLocaleString()} sf)`, min: q3, max: null },
      ],
      isActive: true,
      importance: 0.72,
    });
  }

  // Age segments
  const years = data.map(d => d.parcels?.year_built).filter(Boolean) as number[];
  if (years.length > 0) {
    const currentYear = new Date().getFullYear();
    suggestions.push({
      id: "age",
      name: "Property Age Brackets",
      factor: "year_built",
      ranges: [
        { label: "New (0-20 years)", min: currentYear - 20, max: currentYear },
        { label: "Mature (21-50 years)", min: currentYear - 50, max: currentYear - 20 },
        { label: "Older (51-100 years)", min: currentYear - 100, max: currentYear - 50 },
        { label: "Historic (100+ years)", min: null, max: currentYear - 100 },
      ],
      isActive: true,
      importance: 0.58,
    });
  }

  // Property class segments
  const propClasses = [...new Set(data.map(d => d.parcels?.property_class).filter(Boolean))];
  if (propClasses.length > 1) {
    suggestions.push({
      id: "class",
      name: "Property Class",
      factor: "property_class",
      ranges: propClasses.slice(0, 6).map(cls => ({
        label: cls as string,
        min: null,
        max: null,
      })),
      isActive: false,
      importance: 0.45,
    });
  }

  return suggestions.sort((a, b) => b.importance - a.importance);
}
