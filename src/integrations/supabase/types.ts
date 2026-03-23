export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appeal_audit_trail: {
        Row: {
          adj_applied_at: string | null
          adj_new_value: number | null
          adj_previous_value: number | null
          adj_reason: string | null
          adjustment_id: string | null
          adjustment_type: string | null
          appeal_date: string | null
          appeal_id: string | null
          appeal_notes: string | null
          appeal_status: string | null
          change_reason: string | null
          county_id: string | null
          final_value: number | null
          hearing_date: string | null
          new_status: string | null
          original_value: number | null
          parcel_id: string | null
          previous_status: string | null
          requested_value: number | null
          resolution_date: string | null
          resolution_type: string | null
          status_change_id: string | null
          status_changed_at: string | null
          tax_year: number | null
        }
        Insert: {
          adj_applied_at?: string | null | undefined
          adj_new_value?: number | null | undefined
          adj_previous_value?: number | null | undefined
          adj_reason?: string | null | undefined
          adjustment_id?: string | null | undefined
          adjustment_type?: string | null | undefined
          appeal_date?: string | null | undefined
          appeal_id?: string | null | undefined
          appeal_notes?: string | null | undefined
          appeal_status?: string | null | undefined
          change_reason?: string | null | undefined
          county_id?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          new_status?: string | null | undefined
          original_value?: number | null | undefined
          parcel_id?: string | null | undefined
          previous_status?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status_change_id?: string | null | undefined
          status_changed_at?: string | null | undefined
          tax_year?: number | null | undefined
        }
        Update: {
          adj_applied_at?: string | null | undefined
          adj_new_value?: number | null | undefined
          adj_previous_value?: number | null | undefined
          adj_reason?: string | null | undefined
          adjustment_id?: string | null | undefined
          adjustment_type?: string | null | undefined
          appeal_date?: string | null | undefined
          appeal_id?: string | null | undefined
          appeal_notes?: string | null | undefined
          appeal_status?: string | null | undefined
          change_reason?: string | null | undefined
          county_id?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          new_status?: string | null | undefined
          original_value?: number | null | undefined
          parcel_id?: string | null | undefined
          previous_status?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status_change_id?: string | null | undefined
          status_changed_at?: string | null | undefined
          tax_year?: number | null | undefined
        }
        Relationships: []
      }
      appeal_risk_scores: {
        Row: {
          ai_defense_strategy: string | null
          ai_risk_summary: string | null
          assigned_to: string | null
          county_id: string
          created_at: string
          defense_notes: string | null
          defense_status: string
          dossier_packet_id: string | null
          id: string
          neighborhood_code: string | null
          new_value: number
          owner_name: string | null
          parcel_id: string
          parcel_number: string
          prior_value: number
          risk_factors: string
          risk_score: number
          risk_tier: string
          scoring_run_id: string | null
          situs_address: string | null
          tax_year: number
          updated_at: string
          value_change: number | null
          value_change_pct: number | null
        }
        Insert: {
          ai_defense_strategy?: string | null | undefined
          ai_risk_summary?: string | null | undefined
          assigned_to?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          defense_notes?: string | null | undefined
          defense_status?: string | null | undefined
          dossier_packet_id?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          new_value?: number | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_number?: string | null | undefined
          prior_value?: number | null | undefined
          risk_factors?: string | null | undefined
          risk_score?: number | null | undefined
          risk_tier?: string | null | undefined
          scoring_run_id?: string | null | undefined
          situs_address?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
          value_change?: number | null | undefined
          value_change_pct?: number | null | undefined
        }
        Update: {
          ai_defense_strategy?: string | null | undefined
          ai_risk_summary?: string | null | undefined
          assigned_to?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          defense_notes?: string | null | undefined
          defense_status?: string | null | undefined
          dossier_packet_id?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          new_value?: number | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_number?: string | null | undefined
          prior_value?: number | null | undefined
          risk_factors?: string | null | undefined
          risk_score?: number | null | undefined
          risk_tier?: string | null | undefined
          scoring_run_id?: string | null | undefined
          situs_address?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
          value_change?: number | null | undefined
          value_change_pct?: number | null | undefined
        }
        Relationships: []
      }
      appeal_risk_scoring_runs: {
        Row: {
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          critical_change_threshold: number
          critical_count: number
          error_message: string | null
          high_change_threshold: number
          high_count: number
          id: string
          low_count: number
          medium_count: number
          parcels_flagged: number
          started_at: string | null
          status: string
          total_parcels_scanned: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          critical_change_threshold?: number | null | undefined
          critical_count?: number | null | undefined
          error_message?: string | null | undefined
          high_change_threshold?: number | null | undefined
          high_count?: number | null | undefined
          id?: string | null | undefined
          low_count?: number | null | undefined
          medium_count?: number | null | undefined
          parcels_flagged?: number | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_parcels_scanned?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          critical_change_threshold?: number | null | undefined
          critical_count?: number | null | undefined
          error_message?: string | null | undefined
          high_change_threshold?: number | null | undefined
          high_count?: number | null | undefined
          id?: string | null | undefined
          low_count?: number | null | undefined
          medium_count?: number | null | undefined
          parcels_flagged?: number | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_parcels_scanned?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      appeal_status_changes: {
        Row: {
          appeal_id: string
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          previous_status: string | null
        }
        Insert: {
          appeal_id?: string | null | undefined
          change_reason?: string | null | undefined
          changed_by?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          new_status?: string | null | undefined
          previous_status?: string | null | undefined
        }
        Update: {
          appeal_id?: string | null | undefined
          change_reason?: string | null | undefined
          changed_by?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          new_status?: string | null | undefined
          previous_status?: string | null | undefined
        }
        Relationships: []
      }
      appeals: {
        Row: {
          appeal_date: string
          county_id: string
          created_at: string
          final_value: number | null
          hearing_date: string | null
          id: string
          notes: string | null
          original_value: number
          owner_email: string | null
          parcel_id: string
          requested_value: number | null
          resolution_date: string | null
          resolution_type: string | null
          status: string
          study_period_id: string | null
          tax_year: number | null
          updated_at: string
        }
        Insert: {
          appeal_date?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          original_value?: number | null | undefined
          owner_email?: string | null | undefined
          parcel_id?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status?: string | null | undefined
          study_period_id?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          appeal_date?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          original_value?: number | null | undefined
          owner_email?: string | null | undefined
          parcel_id?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status?: string | null | undefined
          study_period_id?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      appeals_sanitized: {
        Row: {
          appeal_date: string | null
          county_id: string | null
          created_at: string | null
          final_value: number | null
          hearing_date: string | null
          id: string | null
          notes: string | null
          original_value: number | null
          parcel_id: string | null
          requested_value: number | null
          resolution_date: string | null
          resolution_type: string | null
          status: string | null
          study_period_id: string | null
          tax_year: number | null
          updated_at: string | null
        }
        Insert: {
          appeal_date?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          original_value?: number | null | undefined
          parcel_id?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status?: string | null | undefined
          study_period_id?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          appeal_date?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          final_value?: number | null | undefined
          hearing_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          original_value?: number | null | undefined
          parcel_id?: string | null | undefined
          requested_value?: number | null | undefined
          resolution_date?: string | null | undefined
          resolution_type?: string | null | undefined
          status?: string | null | undefined
          study_period_id?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      assessment_ratios: {
        Row: {
          assessed_value: number
          created_at: string
          id: string
          is_outlier: boolean | null
          parcel_id: string
          ratio: number | null
          sale_id: string
          sale_price: number
          study_period_id: string
          value_tier: string | null
        }
        Insert: {
          assessed_value?: number | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          is_outlier?: boolean | null | undefined
          parcel_id?: string | null | undefined
          ratio?: number | null | undefined
          sale_id?: string | null | undefined
          sale_price?: number | null | undefined
          study_period_id?: string | null | undefined
          value_tier?: string | null | undefined
        }
        Update: {
          assessed_value?: number | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          is_outlier?: boolean | null | undefined
          parcel_id?: string | null | undefined
          ratio?: number | null | undefined
          sale_id?: string | null | undefined
          sale_price?: number | null | undefined
          study_period_id?: string | null | undefined
          value_tier?: string | null | undefined
        }
        Relationships: []
      }
      assessments: {
        Row: {
          assessment_date: string | null
          assessment_reason: string | null
          certified: boolean | null
          certified_at: string | null
          county_id: string
          created_at: string
          data_source_id: string | null
          id: string
          improvement_value: number
          land_value: number
          notes: string | null
          parcel_id: string
          tax_year: number
          total_value: number | null
          updated_at: string
        }
        Insert: {
          assessment_date?: string | null | undefined
          assessment_reason?: string | null | undefined
          certified?: boolean | null | undefined
          certified_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_value?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          assessment_date?: string | null | undefined
          assessment_reason?: string | null | undefined
          certified?: boolean | null | undefined
          certified_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_value?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      avm_runs: {
        Row: {
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          feature_importance: string | null
          id: string
          mae: number | null
          mape: number | null
          model_name: string
          model_type: string
          model_version: string
          prd: number | null
          predictions: string | null
          r_squared: number | null
          rmse: number | null
          sample_size: number | null
          status: string
          training_config: string | null
          training_time_ms: number | null
          updated_at: string
        }
        Insert: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          feature_importance?: string | null | undefined
          id?: string | null | undefined
          mae?: number | null | undefined
          mape?: number | null | undefined
          model_name?: string | null | undefined
          model_type?: string | null | undefined
          model_version?: string | null | undefined
          prd?: number | null | undefined
          predictions?: string | null | undefined
          r_squared?: number | null | undefined
          rmse?: number | null | undefined
          sample_size?: number | null | undefined
          status?: string | null | undefined
          training_config?: string | null | undefined
          training_time_ms?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          feature_importance?: string | null | undefined
          id?: string | null | undefined
          mae?: number | null | undefined
          mape?: number | null | undefined
          model_name?: string | null | undefined
          model_type?: string | null | undefined
          model_version?: string | null | undefined
          prd?: number | null | undefined
          predictions?: string | null | undefined
          r_squared?: number | null | undefined
          rmse?: number | null | undefined
          sample_size?: number | null | undefined
          status?: string | null | undefined
          training_config?: string | null | undefined
          training_time_ms?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      batch_notice_jobs: {
        Row: {
          ai_drafted_count: number
          calibration_run_id: string | null
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          filters: string
          id: string
          neighborhood_code: string | null
          notices_failed: number
          notices_generated: number
          property_class: string | null
          status: string
          total_parcels: number
          updated_at: string
        }
        Insert: {
          ai_drafted_count?: number | null | undefined
          calibration_run_id?: string | null | undefined
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          filters?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notices_failed?: number | null | undefined
          notices_generated?: number | null | undefined
          property_class?: string | null | undefined
          status?: string | null | undefined
          total_parcels?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          ai_drafted_count?: number | null | undefined
          calibration_run_id?: string | null | undefined
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          filters?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notices_failed?: number | null | undefined
          notices_generated?: number | null | undefined
          property_class?: string | null | undefined
          status?: string | null | undefined
          total_parcels?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      calibration_runs: {
        Row: {
          coefficients: string
          county_id: string
          created_at: string
          created_by: string
          diagnostics: string
          id: string
          model_type: string
          neighborhood_code: string
          r_squared: number | null
          rmse: number | null
          sample_size: number | null
          status: string
          updated_at: string
          variables: Json
        }
        Insert: {
          coefficients?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          diagnostics?: string | null | undefined
          id?: string | null | undefined
          model_type?: string | null | undefined
          neighborhood_code?: string | null | undefined
          r_squared?: number | null | undefined
          rmse?: number | null | undefined
          sample_size?: number | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
          variables?: Json | null | undefined
        }
        Update: {
          coefficients?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          diagnostics?: string | null | undefined
          id?: string | null | undefined
          model_type?: string | null | undefined
          neighborhood_code?: string | null | undefined
          r_squared?: number | null | undefined
          rmse?: number | null | undefined
          sample_size?: number | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
          variables?: Json | null | undefined
        }
        Relationships: []
      }
      certification_events: {
        Row: {
          blocker_snapshot: string | null
          certified_at: string
          certified_by: string
          county_id: string
          event_type: string
          id: string
          neighborhood_code: string | null
          notes: string | null
          parcels_certified: number
          parcels_created: number
          readiness_score: number | null
          tax_year: number
          total_parcels: number
        }
        Insert: {
          blocker_snapshot?: string | null | undefined
          certified_at?: string | null | undefined
          certified_by?: string | null | undefined
          county_id?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notes?: string | null | undefined
          parcels_certified?: number | null | undefined
          parcels_created?: number | null | undefined
          readiness_score?: number | null | undefined
          tax_year?: number | null | undefined
          total_parcels?: number | null | undefined
        }
        Update: {
          blocker_snapshot?: string | null | undefined
          certified_at?: string | null | undefined
          certified_by?: string | null | undefined
          county_id?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notes?: string | null | undefined
          parcels_certified?: number | null | undefined
          parcels_created?: number | null | undefined
          readiness_score?: number | null | undefined
          tax_year?: number | null | undefined
          total_parcels?: number | null | undefined
        }
        Relationships: []
      }
      comp_grids: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          criteria: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          criteria?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          criteria?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      comparison_snapshots: {
        Row: {
          appeal_count: number | null
          appeal_rate: number | null
          avg_assessed_value: number
          avg_improvement_value: number
          avg_land_value: number
          avg_sale_price: number | null
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          exemption_count: number | null
          id: string
          median_assessed_value: number
          median_ratio: number | null
          metadata: string | null
          neighborhood_code: string | null
          prd: number | null
          property_class: string | null
          qualified_sales: number | null
          snapshot_label: string
          tax_year: number
          total_assessed_value: number
          total_parcels: number
          total_sales: number | null
        }
        Insert: {
          appeal_count?: number | null | undefined
          appeal_rate?: number | null | undefined
          avg_assessed_value?: number | null | undefined
          avg_improvement_value?: number | null | undefined
          avg_land_value?: number | null | undefined
          avg_sale_price?: number | null | undefined
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          exemption_count?: number | null | undefined
          id?: string | null | undefined
          median_assessed_value?: number | null | undefined
          median_ratio?: number | null | undefined
          metadata?: string | null | undefined
          neighborhood_code?: string | null | undefined
          prd?: number | null | undefined
          property_class?: string | null | undefined
          qualified_sales?: number | null | undefined
          snapshot_label?: string | null | undefined
          tax_year?: number | null | undefined
          total_assessed_value?: number | null | undefined
          total_parcels?: number | null | undefined
          total_sales?: number | null | undefined
        }
        Update: {
          appeal_count?: number | null | undefined
          appeal_rate?: number | null | undefined
          avg_assessed_value?: number | null | undefined
          avg_improvement_value?: number | null | undefined
          avg_land_value?: number | null | undefined
          avg_sale_price?: number | null | undefined
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          exemption_count?: number | null | undefined
          id?: string | null | undefined
          median_assessed_value?: number | null | undefined
          median_ratio?: number | null | undefined
          metadata?: string | null | undefined
          neighborhood_code?: string | null | undefined
          prd?: number | null | undefined
          property_class?: string | null | undefined
          qualified_sales?: number | null | undefined
          snapshot_label?: string | null | undefined
          tax_year?: number | null | undefined
          total_assessed_value?: number | null | undefined
          total_parcels?: number | null | undefined
          total_sales?: number | null | undefined
        }
        Relationships: []
      }
      cost_approach_runs: {
        Row: {
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          id: string
          mean_ratio: number | null
          median_ratio: number | null
          neighborhood_code: string
          parcels_matched: number
          parcels_processed: number
          schedule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          mean_ratio?: number | null | undefined
          median_ratio?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcels_matched?: number | null | undefined
          parcels_processed?: number | null | undefined
          schedule_id?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          mean_ratio?: number | null | undefined
          median_ratio?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcels_matched?: number | null | undefined
          parcels_processed?: number | null | undefined
          schedule_id?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      cost_depreciation: {
        Row: {
          age_from: number
          age_to: number
          condition_modifier: number
          created_at: string
          depreciation_pct: number
          id: string
          schedule_id: string
        }
        Insert: {
          age_from?: number | null | undefined
          age_to?: number | null | undefined
          condition_modifier?: number | null | undefined
          created_at?: string | null | undefined
          depreciation_pct?: number | null | undefined
          id?: string | null | undefined
          schedule_id?: string | null | undefined
        }
        Update: {
          age_from?: number | null | undefined
          age_to?: number | null | undefined
          condition_modifier?: number | null | undefined
          created_at?: string | null | undefined
          depreciation_pct?: number | null | undefined
          id?: string | null | undefined
          schedule_id?: string | null | undefined
        }
        Relationships: []
      }
      cost_schedules: {
        Row: {
          base_cost_per_sqft: number
          county_id: string
          created_at: string
          created_by: string
          effective_year: number
          id: string
          property_class: string
          quality_grade: string
          updated_at: string
        }
        Insert: {
          base_cost_per_sqft?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          effective_year?: number | null | undefined
          id?: string | null | undefined
          property_class?: string | null | undefined
          quality_grade?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          base_cost_per_sqft?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          effective_year?: number | null | undefined
          id?: string | null | undefined
          property_class?: string | null | undefined
          quality_grade?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      counties: {
        Row: {
          config: string | null
          created_at: string
          fips_code: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          config?: string | null | undefined
          created_at?: string | null | undefined
          fips_code?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          state?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          config?: string | null | undefined
          created_at?: string | null | undefined
          fips_code?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          state?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          connection_config: string | null
          county_id: string
          created_at: string
          description: string | null
          id: string
          last_sync_at: string | null
          name: string
          record_count: number | null
          source_type: string
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          connection_config?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          last_sync_at?: string | null | undefined
          name?: string | null | undefined
          record_count?: number | null | undefined
          source_type?: string | null | undefined
          sync_status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          connection_config?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          last_sync_at?: string | null | undefined
          name?: string | null | undefined
          record_count?: number | null | undefined
          source_type?: string | null | undefined
          sync_status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      dossier_documents: {
        Row: {
          county_id: string
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          parcel_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          document_type?: string | null | undefined
          file_name?: string | null | undefined
          file_path?: string | null | undefined
          file_size_bytes?: number | null | undefined
          id?: string | null | undefined
          mime_type?: string | null | undefined
          parcel_id?: string | null | undefined
          updated_at?: string | null | undefined
          uploaded_by?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          document_type?: string | null | undefined
          file_name?: string | null | undefined
          file_path?: string | null | undefined
          file_size_bytes?: number | null | undefined
          id?: string | null | undefined
          mime_type?: string | null | undefined
          parcel_id?: string | null | undefined
          updated_at?: string | null | undefined
          uploaded_by?: string | null | undefined
        }
        Relationships: []
      }
      dossier_narratives: {
        Row: {
          ai_generated: boolean
          content: string
          county_id: string
          created_at: string
          created_by: string
          id: string
          model_used: string | null
          narrative_type: string
          parcel_id: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null | undefined
          content?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          model_used?: string | null | undefined
          narrative_type?: string | null | undefined
          parcel_id?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          ai_generated?: boolean | null | undefined
          content?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          model_used?: string | null | undefined
          narrative_type?: string | null | undefined
          parcel_id?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      dossier_packets: {
        Row: {
          assembled_by: string
          county_id: string
          created_at: string
          document_ids: Json
          finalized_at: string | null
          finalized_by: string | null
          id: string
          metadata: string | null
          narrative_ids: Json
          packet_type: string
          parcel_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assembled_by?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          document_ids?: Json | null | undefined
          finalized_at?: string | null | undefined
          finalized_by?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          narrative_ids?: Json | null | undefined
          packet_type?: string | null | undefined
          parcel_id?: string | null | undefined
          status?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          assembled_by?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          document_ids?: Json | null | undefined
          finalized_at?: string | null | undefined
          finalized_by?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          narrative_ids?: Json | null | undefined
          packet_type?: string | null | undefined
          parcel_id?: string | null | undefined
          status?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      dq_diagnosis_runs: {
        Row: {
          completed_at: string | null
          county_id: string
          created_at: string
          error_message: string | null
          hard_blockers_found: number
          id: string
          lanes_analyzed: Json | null
          model_used: string | null
          quality_snapshot: string | null
          started_at: string
          status: string
          total_issues_found: number
          treatment_plan: string | null
        }
        Insert: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          hard_blockers_found?: number | null | undefined
          id?: string | null | undefined
          lanes_analyzed?: Json | null | undefined
          model_used?: string | null | undefined
          quality_snapshot?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_issues_found?: number | null | undefined
          treatment_plan?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          hard_blockers_found?: number | null | undefined
          id?: string | null | undefined
          lanes_analyzed?: Json | null | undefined
          model_used?: string | null | undefined
          quality_snapshot?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_issues_found?: number | null | undefined
          treatment_plan?: string | null | undefined
        }
        Relationships: []
      }
      dq_issue_registry: {
        Row: {
          affected_count: number
          affected_parcel_ids: Json | null
          blocker_reason: string | null
          confidence_score: number | null
          county_id: string
          created_at: string
          diagnosis_run_id: string | null
          fix_tier: "auto_apply" | "review_confirm" | "human_resolve"
          id: string
          impact_score: number | null
          is_hard_blocker: boolean | null
          issue_description: string | null
          issue_title: string
          issue_type: string
          lane: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly"
          metadata: string | null
          priority_score: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          reversibility_score: number | null
          sample_parcel_ids: Json | null
          severity: "critical" | "high" | "medium" | "low"
          source_explanation: string | null
          source_trust_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_count?: number | null | undefined
          affected_parcel_ids?: Json | null | undefined
          blocker_reason?: string | null | undefined
          confidence_score?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          diagnosis_run_id?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          impact_score?: number | null | undefined
          is_hard_blocker?: boolean | null | undefined
          issue_description?: string | null | undefined
          issue_title?: string | null | undefined
          issue_type?: string | null | undefined
          lane?: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly" | null | undefined
          metadata?: string | null | undefined
          priority_score?: number | null | undefined
          resolution_notes?: string | null | undefined
          resolved_at?: string | null | undefined
          resolved_by?: string | null | undefined
          reversibility_score?: number | null | undefined
          sample_parcel_ids?: Json | null | undefined
          severity?: "critical" | "high" | "medium" | "low" | null | undefined
          source_explanation?: string | null | undefined
          source_trust_level?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          affected_count?: number | null | undefined
          affected_parcel_ids?: Json | null | undefined
          blocker_reason?: string | null | undefined
          confidence_score?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          diagnosis_run_id?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          impact_score?: number | null | undefined
          is_hard_blocker?: boolean | null | undefined
          issue_description?: string | null | undefined
          issue_title?: string | null | undefined
          issue_type?: string | null | undefined
          lane?: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly" | null | undefined
          metadata?: string | null | undefined
          priority_score?: number | null | undefined
          resolution_notes?: string | null | undefined
          resolved_at?: string | null | undefined
          resolved_by?: string | null | undefined
          reversibility_score?: number | null | undefined
          sample_parcel_ids?: Json | null | undefined
          severity?: "critical" | "high" | "medium" | "low" | null | undefined
          source_explanation?: string | null | undefined
          source_trust_level?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      dq_proposed_fixes: {
        Row: {
          applied_at: string | null
          batch_id: string | null
          confidence: number | null
          county_id: string
          created_at: string
          current_value: string | null
          explanation: string | null
          fix_method: string
          fix_tier: "auto_apply" | "review_confirm" | "human_resolve"
          id: string
          issue_id: string
          parcel_id: string | null
          proposed_value: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_trust: string | null
          status: string
          target_column: string
          target_table: string
        }
        Insert: {
          applied_at?: string | null | undefined
          batch_id?: string | null | undefined
          confidence?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          current_value?: string | null | undefined
          explanation?: string | null | undefined
          fix_method?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          issue_id?: string | null | undefined
          parcel_id?: string | null | undefined
          proposed_value?: string | null | undefined
          reviewed_at?: string | null | undefined
          reviewed_by?: string | null | undefined
          source_trust?: string | null | undefined
          status?: string | null | undefined
          target_column?: string | null | undefined
          target_table?: string | null | undefined
        }
        Update: {
          applied_at?: string | null | undefined
          batch_id?: string | null | undefined
          confidence?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          current_value?: string | null | undefined
          explanation?: string | null | undefined
          fix_method?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          issue_id?: string | null | undefined
          parcel_id?: string | null | undefined
          proposed_value?: string | null | undefined
          reviewed_at?: string | null | undefined
          reviewed_by?: string | null | undefined
          source_trust?: string | null | undefined
          status?: string | null | undefined
          target_column?: string | null | undefined
          target_table?: string | null | undefined
        }
        Relationships: []
      }
      dq_remediation_batches: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          applied_count: number
          batch_name: string
          county_id: string
          created_at: string
          error_message: string | null
          fix_tier: "auto_apply" | "review_confirm" | "human_resolve"
          id: string
          lane: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly"
          quality_score_after: number | null
          quality_score_before: number | null
          rejected_count: number
          rollback_manifest: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          rolled_back_count: number
          status: string
          total_fixes: number
          trace_event_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null | undefined
          applied_by?: string | null | undefined
          applied_count?: number | null | undefined
          batch_name?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          lane?: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly" | null | undefined
          quality_score_after?: number | null | undefined
          quality_score_before?: number | null | undefined
          rejected_count?: number | null | undefined
          rollback_manifest?: string | null | undefined
          rolled_back_at?: string | null | undefined
          rolled_back_by?: string | null | undefined
          rolled_back_count?: number | null | undefined
          status?: string | null | undefined
          total_fixes?: number | null | undefined
          trace_event_id?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          applied_at?: string | null | undefined
          applied_by?: string | null | undefined
          applied_count?: number | null | undefined
          batch_name?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          fix_tier?: "auto_apply" | "review_confirm" | "human_resolve" | null | undefined
          id?: string | null | undefined
          lane?: "spatial_healing" | "address_normalization" | "orphan_duplicate" | "cross_source_reconciliation" | "characteristic_inference" | "value_anomaly" | null | undefined
          quality_score_after?: number | null | undefined
          quality_score_before?: number | null | undefined
          rejected_count?: number | null | undefined
          rollback_manifest?: string | null | undefined
          rolled_back_at?: string | null | undefined
          rolled_back_by?: string | null | undefined
          rolled_back_count?: number | null | undefined
          status?: string | null | undefined
          total_fixes?: number | null | undefined
          trace_event_id?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      dq_verification_snapshots: {
        Row: {
          batch_id: string | null
          county_id: string
          created_at: string
          diagnosis_run_id: string | null
          gate_results: string
          id: string
          metrics: string
          passed_all_gates: boolean | null
          quality_score: number | null
          snapshot_type: string
        }
        Insert: {
          batch_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          diagnosis_run_id?: string | null | undefined
          gate_results?: string | null | undefined
          id?: string | null | undefined
          metrics?: string | null | undefined
          passed_all_gates?: boolean | null | undefined
          quality_score?: number | null | undefined
          snapshot_type?: string | null | undefined
        }
        Update: {
          batch_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          diagnosis_run_id?: string | null | undefined
          gate_results?: string | null | undefined
          id?: string | null | undefined
          metrics?: string | null | undefined
          passed_all_gates?: boolean | null | undefined
          quality_score?: number | null | undefined
          snapshot_type?: string | null | undefined
        }
        Relationships: []
      }
      exemptions: {
        Row: {
          applicant_name: string | null
          application_date: string
          approval_date: string | null
          created_at: string
          exemption_amount: number | null
          exemption_percentage: number | null
          exemption_type: string
          expiration_date: string | null
          id: string
          notes: string | null
          parcel_id: string
          status: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          applicant_name?: string | null | undefined
          application_date?: string | null | undefined
          approval_date?: string | null | undefined
          created_at?: string | null | undefined
          exemption_amount?: number | null | undefined
          exemption_percentage?: number | null | undefined
          exemption_type?: string | null | undefined
          expiration_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          status?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          applicant_name?: string | null | undefined
          application_date?: string | null | undefined
          approval_date?: string | null | undefined
          created_at?: string | null | undefined
          exemption_amount?: number | null | undefined
          exemption_percentage?: number | null | undefined
          exemption_type?: string | null | undefined
          expiration_date?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          status?: string | null | undefined
          tax_year?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      external_valuations: {
        Row: {
          created_at: string
          days_on_market: number | null
          estimated_value: number | null
          fetched_at: string
          id: string
          listing_price: number | null
          metadata: string | null
          parcel_id: string
          source: string
          valuation_date: string
        }
        Insert: {
          created_at?: string | null | undefined
          days_on_market?: number | null | undefined
          estimated_value?: number | null | undefined
          fetched_at?: string | null | undefined
          id?: string | null | undefined
          listing_price?: number | null | undefined
          metadata?: string | null | undefined
          parcel_id?: string | null | undefined
          source?: string | null | undefined
          valuation_date?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          days_on_market?: number | null | undefined
          estimated_value?: number | null | undefined
          fetched_at?: string | null | undefined
          id?: string | null | undefined
          listing_price?: number | null | undefined
          metadata?: string | null | undefined
          parcel_id?: string | null | undefined
          source?: string | null | undefined
          valuation_date?: string | null | undefined
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: string | null
          f_table_catalog: string | null
          f_table_name: string | null
          f_table_schema: string | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null | undefined
          f_geography_column?: string | null | undefined
          f_table_catalog?: string | null | undefined
          f_table_name?: string | null | undefined
          f_table_schema?: string | null | undefined
          srid?: number | null | undefined
          type?: string | null | undefined
        }
        Update: {
          coord_dimension?: number | null | undefined
          f_geography_column?: string | null | undefined
          f_table_catalog?: string | null | undefined
          f_table_name?: string | null | undefined
          f_table_schema?: string | null | undefined
          srid?: number | null | undefined
          type?: string | null | undefined
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: string | null
          f_table_catalog: string | null
          f_table_name: string | null
          f_table_schema: string | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null | undefined
          f_geometry_column?: string | null | undefined
          f_table_catalog?: string | null | undefined
          f_table_name?: string | null | undefined
          f_table_schema?: string | null | undefined
          srid?: number | null | undefined
          type?: string | null | undefined
        }
        Update: {
          coord_dimension?: number | null | undefined
          f_geometry_column?: string | null | undefined
          f_table_catalog?: string | null | undefined
          f_table_name?: string | null | undefined
          f_table_schema?: string | null | undefined
          srid?: number | null | undefined
          type?: string | null | undefined
        }
        Relationships: []
      }
      gis_data_sources: {
        Row: {
          connection_url: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: string | null
          name: string
          source_type: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          connection_url?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          last_sync_at?: string | null | undefined
          metadata?: string | null | undefined
          name?: string | null | undefined
          source_type?: string | null | undefined
          sync_error?: string | null | undefined
          sync_status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          connection_url?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          last_sync_at?: string | null | undefined
          metadata?: string | null | undefined
          name?: string | null | undefined
          source_type?: string | null | undefined
          sync_error?: string | null | undefined
          sync_status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      gis_features: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          coordinates: string
          county_id: string | null
          created_at: string
          geom: string | null
          geometry_type: string
          id: string
          layer_id: string
          parcel_id: string | null
          properties: string | null
          source_object_id: string | null
        }
        Insert: {
          centroid_lat?: number | null | undefined
          centroid_lng?: number | null | undefined
          coordinates?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          geom?: string | null | undefined
          geometry_type?: string | null | undefined
          id?: string | null | undefined
          layer_id?: string | null | undefined
          parcel_id?: string | null | undefined
          properties?: string | null | undefined
          source_object_id?: string | null | undefined
        }
        Update: {
          centroid_lat?: number | null | undefined
          centroid_lng?: number | null | undefined
          coordinates?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          geom?: string | null | undefined
          geometry_type?: string | null | undefined
          id?: string | null | undefined
          layer_id?: string | null | undefined
          parcel_id?: string | null | undefined
          properties?: string | null | undefined
          source_object_id?: string | null | undefined
        }
        Relationships: []
      }
      gis_ingest_job_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          payload: string
        }
        Insert: {
          created_at?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          job_id?: string | null | undefined
          payload?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          job_id?: string | null | undefined
          payload?: string | null | undefined
        }
        Relationships: []
      }
      gis_ingest_jobs: {
        Row: {
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          cursor_offset: number
          cursor_type: string
          dataset: string
          feature_server_url: string
          id: string
          last_error: string | null
          layer_id: string | null
          page_size: number
          pages_processed: number
          parcel_id_field: string
          started_at: string | null
          status: string
          total_fetched: number
          total_matched: number
          total_upserted: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          cursor_offset?: number | null | undefined
          cursor_type?: string | null | undefined
          dataset?: string | null | undefined
          feature_server_url?: string | null | undefined
          id?: string | null | undefined
          last_error?: string | null | undefined
          layer_id?: string | null | undefined
          page_size?: number | null | undefined
          pages_processed?: number | null | undefined
          parcel_id_field?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_fetched?: number | null | undefined
          total_matched?: number | null | undefined
          total_upserted?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          cursor_offset?: number | null | undefined
          cursor_type?: string | null | undefined
          dataset?: string | null | undefined
          feature_server_url?: string | null | undefined
          id?: string | null | undefined
          last_error?: string | null | undefined
          layer_id?: string | null | undefined
          page_size?: number | null | undefined
          pages_processed?: number | null | undefined
          parcel_id_field?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          total_fetched?: number | null | undefined
          total_matched?: number | null | undefined
          total_upserted?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      gis_layers: {
        Row: {
          bounds: string | null
          created_at: string
          data_source_id: string | null
          feature_count: number | null
          file_format: string | null
          id: string
          layer_type: string
          name: string
          properties_schema: string | null
          srid: number | null
          updated_at: string
        }
        Insert: {
          bounds?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          feature_count?: number | null | undefined
          file_format?: string | null | undefined
          id?: string | null | undefined
          layer_type?: string | null | undefined
          name?: string | null | undefined
          properties_schema?: string | null | undefined
          srid?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          bounds?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          feature_count?: number | null | undefined
          file_format?: string | null | undefined
          id?: string | null | undefined
          layer_type?: string | null | undefined
          name?: string | null | undefined
          properties_schema?: string | null | undefined
          srid?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      income_approach_runs: {
        Row: {
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          id: string
          median_cap_rate: number | null
          median_grm: number | null
          median_ratio: number | null
          neighborhood_code: string
          parcels_processed: number
          parcels_with_income: number
          status: string
          updated_at: string
        }
        Insert: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          median_cap_rate?: number | null | undefined
          median_grm?: number | null | undefined
          median_ratio?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcels_processed?: number | null | undefined
          parcels_with_income?: number | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          median_cap_rate?: number | null | undefined
          median_grm?: number | null | undefined
          median_ratio?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcels_processed?: number | null | undefined
          parcels_with_income?: number | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      income_properties: {
        Row: {
          cap_rate: number | null
          county_id: string
          created_at: string
          created_by: string
          grm: number | null
          gross_rental_income: number
          id: string
          income_year: number
          net_operating_income: number | null
          notes: string | null
          operating_expenses: number
          parcel_id: string
          property_type: string
          updated_at: string
          vacancy_rate: number
        }
        Insert: {
          cap_rate?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          grm?: number | null | undefined
          gross_rental_income?: number | null | undefined
          id?: string | null | undefined
          income_year?: number | null | undefined
          net_operating_income?: number | null | undefined
          notes?: string | null | undefined
          operating_expenses?: number | null | undefined
          parcel_id?: string | null | undefined
          property_type?: string | null | undefined
          updated_at?: string | null | undefined
          vacancy_rate?: number | null | undefined
        }
        Update: {
          cap_rate?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          grm?: number | null | undefined
          gross_rental_income?: number | null | undefined
          id?: string | null | undefined
          income_year?: number | null | undefined
          net_operating_income?: number | null | undefined
          notes?: string | null | undefined
          operating_expenses?: number | null | undefined
          parcel_id?: string | null | undefined
          property_type?: string | null | undefined
          updated_at?: string | null | undefined
          vacancy_rate?: number | null | undefined
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          column_mapping: string | null
          county_id: string
          created_at: string
          errors: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          row_count: number | null
          rows_failed: number | null
          rows_imported: number | null
          sha256_hash: string | null
          status: string
          target_table: string
          updated_at: string
          user_id: string
          validation_results: string | null
        }
        Insert: {
          column_mapping?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          errors?: string | null | undefined
          file_name?: string | null | undefined
          file_path?: string | null | undefined
          file_size_bytes?: number | null | undefined
          id?: string | null | undefined
          row_count?: number | null | undefined
          rows_failed?: number | null | undefined
          rows_imported?: number | null | undefined
          sha256_hash?: string | null | undefined
          status?: string | null | undefined
          target_table?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
          validation_results?: string | null | undefined
        }
        Update: {
          column_mapping?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          errors?: string | null | undefined
          file_name?: string | null | undefined
          file_path?: string | null | undefined
          file_size_bytes?: number | null | undefined
          id?: string | null | undefined
          row_count?: number | null | undefined
          rows_failed?: number | null | undefined
          rows_imported?: number | null | undefined
          sha256_hash?: string | null | undefined
          status?: string | null | undefined
          target_table?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
          validation_results?: string | null | undefined
        }
        Relationships: []
      }
      ingest_mapping_profiles: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          dataset_type: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          dataset_type?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_default?: boolean | null | undefined
          name?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          dataset_type?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_default?: boolean | null | undefined
          name?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      ingest_mapping_rules: {
        Row: {
          confidence_override: string | null
          created_at: string
          id: string
          profile_id: string
          source_header: string
          target_field: string
          transform: string | null
        }
        Insert: {
          confidence_override?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          profile_id?: string | null | undefined
          source_header?: string | null | undefined
          target_field?: string | null | undefined
          transform?: string | null | undefined
        }
        Update: {
          confidence_override?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          profile_id?: string | null | undefined
          source_header?: string | null | undefined
          target_field?: string | null | undefined
          transform?: string | null | undefined
        }
        Relationships: []
      }
      mart_slco_dossier_index: {
        Row: {
          county_id: string | null
          document_type: string | null
          evidence_type: string | null
          file_hash: string | null
          grantee: string | null
          grantor: string | null
          owner_name: string | null
          parcel_id_normalized: string | null
          recorder_doc_number: string | null
          recording_date: string | null
          situs_address: string | null
          snapshot_date: string | null
          source_system: string | null
          source_url: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          document_type?: string | null | undefined
          evidence_type?: string | null | undefined
          file_hash?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          recorder_doc_number?: string | null | undefined
          recording_date?: string | null | undefined
          situs_address?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          document_type?: string | null | undefined
          evidence_type?: string | null | undefined
          file_hash?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          recorder_doc_number?: string | null | undefined
          recording_date?: string | null | undefined
          situs_address?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
        }
        Relationships: []
      }
      mart_slco_forge_cost_context: {
        Row: {
          building_class: string | null
          county_id: string | null
          effective_year_built: number | null
          improvement_value: number | null
          land_value: number | null
          parcel_id_normalized: string | null
          property_type_code: string | null
          rentable_sqft: number | null
          stories: number | null
          total_floor_area_sqft: number | null
          total_market_value: number | null
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          building_class?: string | null | undefined
          county_id?: string | null | undefined
          effective_year_built?: number | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          parcel_id_normalized?: string | null | undefined
          property_type_code?: string | null | undefined
          rentable_sqft?: number | null | undefined
          stories?: number | null | undefined
          total_floor_area_sqft?: number | null | undefined
          total_market_value?: number | null | undefined
          year_built?: number | null | undefined
          zoning?: string | null | undefined
        }
        Update: {
          building_class?: string | null | undefined
          county_id?: string | null | undefined
          effective_year_built?: number | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          parcel_id_normalized?: string | null | undefined
          property_type_code?: string | null | undefined
          rentable_sqft?: number | null | undefined
          stories?: number | null | undefined
          total_floor_area_sqft?: number | null | undefined
          total_market_value?: number | null | undefined
          year_built?: number | null | undefined
          zoning?: string | null | undefined
        }
        Relationships: []
      }
      mart_slco_workbench_summary: {
        Row: {
          acreage: number | null
          assessed_value: number | null
          assessment_improvement_value: number | null
          assessment_land_value: number | null
          county_id: string | null
          model_area_id: string | null
          municipality: string | null
          owner_name: string | null
          parcel_id: string | null
          parcel_id_normalized: string | null
          property_type_code: string | null
          property_type_label: string | null
          situs_address: string | null
          situs_city: string | null
          situs_zip: string | null
          tax_district_id: string | null
          tax_year: number | null
          total_market_value: number | null
        }
        Insert: {
          acreage?: number | null | undefined
          assessed_value?: number | null | undefined
          assessment_improvement_value?: number | null | undefined
          assessment_land_value?: number | null | undefined
          county_id?: string | null | undefined
          model_area_id?: string | null | undefined
          municipality?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          situs_address?: string | null | undefined
          situs_city?: string | null | undefined
          situs_zip?: string | null | undefined
          tax_district_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_market_value?: number | null | undefined
        }
        Update: {
          acreage?: number | null | undefined
          assessed_value?: number | null | undefined
          assessment_improvement_value?: number | null | undefined
          assessment_land_value?: number | null | undefined
          county_id?: string | null | undefined
          model_area_id?: string | null | undefined
          municipality?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          situs_address?: string | null | undefined
          situs_city?: string | null | undefined
          situs_zip?: string | null | undefined
          tax_district_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_market_value?: number | null | undefined
        }
        Relationships: []
      }
      mission_events: {
        Row: {
          actor_id: string
          affected_count: number | null
          county_id: string
          created_at: string
          event_type: string
          id: string
          mission_id: string
          params: string | null
          receipt_id: string | null
          strategy: string | null
        }
        Insert: {
          actor_id?: string | null | undefined
          affected_count?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          mission_id?: string | null | undefined
          params?: string | null | undefined
          receipt_id?: string | null | undefined
          strategy?: string | null | undefined
        }
        Update: {
          actor_id?: string | null | undefined
          affected_count?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          mission_id?: string | null | undefined
          params?: string | null | undefined
          receipt_id?: string | null | undefined
          strategy?: string | null | undefined
        }
        Relationships: []
      }
      model_receipts: {
        Row: {
          created_at: string
          id: string
          inputs: string
          metadata: string | null
          model_type: string
          model_version: string
          operator_id: string
          outputs: string
          parcel_id: string | null
          study_period_id: string | null
        }
        Insert: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          inputs?: string | null | undefined
          metadata?: string | null | undefined
          model_type?: string | null | undefined
          model_version?: string | null | undefined
          operator_id?: string | null | undefined
          outputs?: string | null | undefined
          parcel_id?: string | null | undefined
          study_period_id?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          inputs?: string | null | undefined
          metadata?: string | null | undefined
          model_type?: string | null | undefined
          model_version?: string | null | undefined
          operator_id?: string | null | undefined
          outputs?: string | null | undefined
          parcel_id?: string | null | undefined
          study_period_id?: string | null | undefined
        }
        Relationships: []
      }
      neighborhood_review_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          result_data: string | null
          review_id: string
          stage: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off"
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null | undefined
          completed_at?: string | null | undefined
          completed_by?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          due_date?: string | null | undefined
          id?: string | null | undefined
          priority?: string | null | undefined
          result_data?: string | null | undefined
          review_id?: string | null | undefined
          stage?: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off" | null | undefined
          status?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          assigned_to?: string | null | undefined
          completed_at?: string | null | undefined
          completed_by?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          due_date?: string | null | undefined
          id?: string | null | undefined
          priority?: string | null | undefined
          result_data?: string | null | undefined
          review_id?: string | null | undefined
          stage?: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off" | null | undefined
          status?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      neighborhood_reviews: {
        Row: {
          ai_recommendations: string
          calibration_completed_at: string | null
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          current_stage: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off"
          data_audit_completed_at: string | null
          equity_review_completed_at: string | null
          id: string
          metrics_snapshot: string
          neighborhood_code: string
          notes: string | null
          review_name: string
          scoping_completed_at: string | null
          sign_off_completed_at: string | null
          spatial_analysis_completed_at: string | null
          stage_gate_results: string
          started_at: string
          status: string
          target_deadline: string | null
          updated_at: string
        }
        Insert: {
          ai_recommendations?: string | null | undefined
          calibration_completed_at?: string | null | undefined
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          current_stage?: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off" | null | undefined
          data_audit_completed_at?: string | null | undefined
          equity_review_completed_at?: string | null | undefined
          id?: string | null | undefined
          metrics_snapshot?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notes?: string | null | undefined
          review_name?: string | null | undefined
          scoping_completed_at?: string | null | undefined
          sign_off_completed_at?: string | null | undefined
          spatial_analysis_completed_at?: string | null | undefined
          stage_gate_results?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          target_deadline?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          ai_recommendations?: string | null | undefined
          calibration_completed_at?: string | null | undefined
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          current_stage?: "scoping" | "data_audit" | "spatial_analysis" | "calibration" | "equity_review" | "sign_off" | null | undefined
          data_audit_completed_at?: string | null | undefined
          equity_review_completed_at?: string | null | undefined
          id?: string | null | undefined
          metrics_snapshot?: string | null | undefined
          neighborhood_code?: string | null | undefined
          notes?: string | null | undefined
          review_name?: string | null | undefined
          scoping_completed_at?: string | null | undefined
          sign_off_completed_at?: string | null | undefined
          spatial_analysis_completed_at?: string | null | undefined
          stage_gate_results?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          target_deadline?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          county_id: string
          created_at: string
          description: string | null
          geometry: string | null
          hood_cd: string
          hood_name: string | null
          id: string
          metadata: string | null
          model_type: string | null
          property_classes: Json | null
          status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          geometry?: string | null | undefined
          hood_cd?: string | null | undefined
          hood_name?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          model_type?: string | null | undefined
          property_classes?: Json | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
          year?: number | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          geometry?: string | null | undefined
          hood_cd?: string | null | undefined
          hood_name?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          model_type?: string | null | undefined
          property_classes?: Json | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
          year?: number | null | undefined
        }
        Relationships: []
      }
      notices: {
        Row: {
          ai_drafted: boolean
          batch_job_id: string | null
          body: string
          calibration_run_id: string | null
          county_id: string
          created_at: string
          generated_by: string | null
          id: string
          metadata: string | null
          notice_type: string
          parcel_id: string
          recipient_address: string | null
          recipient_name: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          ai_drafted?: boolean | null | undefined
          batch_job_id?: string | null | undefined
          body?: string | null | undefined
          calibration_run_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          generated_by?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          notice_type?: string | null | undefined
          parcel_id?: string | null | undefined
          recipient_address?: string | null | undefined
          recipient_name?: string | null | undefined
          status?: string | null | undefined
          subject?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          ai_drafted?: boolean | null | undefined
          batch_job_id?: string | null | undefined
          body?: string | null | undefined
          calibration_run_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          generated_by?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          notice_type?: string | null | undefined
          parcel_id?: string | null | undefined
          recipient_address?: string | null | undefined
          recipient_name?: string | null | undefined
          status?: string | null | undefined
          subject?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      pacs_schema_registry: {
        Row: {
          actual_columns: string | null
          county_id: string
          created_at: string
          expected_columns: string
          id: string
          last_validated_at: string | null
          missing_optional: Json | null
          missing_required: Json | null
          source_table: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_columns?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          expected_columns?: string | null | undefined
          id?: string | null | undefined
          last_validated_at?: string | null | undefined
          missing_optional?: Json | null | undefined
          missing_required?: Json | null | undefined
          source_table?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          actual_columns?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          expected_columns?: string | null | undefined
          id?: string | null | undefined
          last_validated_at?: string | null | undefined
          missing_optional?: Json | null | undefined
          missing_required?: Json | null | undefined
          source_table?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      parcel_neighborhood_year: {
        Row: {
          county_id: string
          created_at: string
          hood_cd: string
          id: string
          parcel_id: string
          sup_num: number | null
          year: number
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          hood_cd?: string | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          sup_num?: number | null | undefined
          year?: number | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          hood_cd?: string | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          sup_num?: number | null | undefined
          year?: number | null | undefined
        }
        Relationships: []
      }
      parcel_watchlist: {
        Row: {
          county_id: string
          created_at: string
          id: string
          note: string | null
          parcel_id: string
          priority: string
          updated_at: string
          user_id: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          note?: string | null | undefined
          parcel_id?: string | null | undefined
          priority?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          id?: string | null | undefined
          note?: string | null | undefined
          parcel_id?: string | null | undefined
          priority?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Relationships: []
      }
      parcels: {
        Row: {
          address: string
          assessed_value: number
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          city: string | null
          coord_confidence: number | null
          coord_detected_srid: number | null
          coord_source: string | null
          coord_updated_at: string | null
          county_id: string
          created_at: string
          data_source_id: string | null
          id: string
          improvement_value: number | null
          land_area: number | null
          land_value: number | null
          last_verified_at: string | null
          latitude: number | null
          latitude_wgs84: number | null
          longitude: number | null
          longitude_wgs84: number | null
          neighborhood_code: string | null
          parcel_geom_wgs84: string | null
          parcel_number: string
          property_class: string | null
          situs_point_wgs84: string | null
          situs_source: string | null
          source_parcel_id: string | null
          state: string | null
          updated_at: string
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null | undefined
          assessed_value?: number | null | undefined
          bathrooms?: number | null | undefined
          bedrooms?: number | null | undefined
          building_area?: number | null | undefined
          city?: string | null | undefined
          coord_confidence?: number | null | undefined
          coord_detected_srid?: number | null | undefined
          coord_source?: string | null | undefined
          coord_updated_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_area?: number | null | undefined
          land_value?: number | null | undefined
          last_verified_at?: string | null | undefined
          latitude?: number | null | undefined
          latitude_wgs84?: number | null | undefined
          longitude?: number | null | undefined
          longitude_wgs84?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcel_geom_wgs84?: string | null | undefined
          parcel_number?: string | null | undefined
          property_class?: string | null | undefined
          situs_point_wgs84?: string | null | undefined
          situs_source?: string | null | undefined
          source_parcel_id?: string | null | undefined
          state?: string | null | undefined
          updated_at?: string | null | undefined
          year_built?: number | null | undefined
          zip_code?: string | null | undefined
        }
        Update: {
          address?: string | null | undefined
          assessed_value?: number | null | undefined
          bathrooms?: number | null | undefined
          bedrooms?: number | null | undefined
          building_area?: number | null | undefined
          city?: string | null | undefined
          coord_confidence?: number | null | undefined
          coord_detected_srid?: number | null | undefined
          coord_source?: string | null | undefined
          coord_updated_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_area?: number | null | undefined
          land_value?: number | null | undefined
          last_verified_at?: string | null | undefined
          latitude?: number | null | undefined
          latitude_wgs84?: number | null | undefined
          longitude?: number | null | undefined
          longitude_wgs84?: number | null | undefined
          neighborhood_code?: string | null | undefined
          parcel_geom_wgs84?: string | null | undefined
          parcel_number?: string | null | undefined
          property_class?: string | null | undefined
          situs_point_wgs84?: string | null | undefined
          situs_source?: string | null | undefined
          source_parcel_id?: string | null | undefined
          state?: string | null | undefined
          updated_at?: string | null | undefined
          year_built?: number | null | undefined
          zip_code?: string | null | undefined
        }
        Relationships: []
      }
      permits: {
        Row: {
          application_date: string
          created_at: string
          description: string | null
          estimated_value: number | null
          expiration_date: string | null
          id: string
          inspection_date: string | null
          inspection_status: string | null
          issue_date: string | null
          notes: string | null
          parcel_id: string
          permit_number: string
          permit_type: string
          status: string
          updated_at: string
        }
        Insert: {
          application_date?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          estimated_value?: number | null | undefined
          expiration_date?: string | null | undefined
          id?: string | null | undefined
          inspection_date?: string | null | undefined
          inspection_status?: string | null | undefined
          issue_date?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          permit_number?: string | null | undefined
          permit_type?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          application_date?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          estimated_value?: number | null | undefined
          expiration_date?: string | null | undefined
          id?: string | null | undefined
          inspection_date?: string | null | undefined
          inspection_status?: string | null | undefined
          issue_date?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          permit_number?: string | null | undefined
          permit_type?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      pipeline_events: {
        Row: {
          artifact_ref: string | null
          county_id: string
          created_at: string
          details: string
          error_id: string | null
          finished_at: string | null
          id: string
          ingest_job_id: string | null
          rows_affected: number | null
          stage: string
          started_at: string
          status: string
        }
        Insert: {
          artifact_ref?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          details?: string | null | undefined
          error_id?: string | null | undefined
          finished_at?: string | null | undefined
          id?: string | null | undefined
          ingest_job_id?: string | null | undefined
          rows_affected?: number | null | undefined
          stage?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
        }
        Update: {
          artifact_ref?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          details?: string | null | undefined
          error_id?: string | null | undefined
          finished_at?: string | null | undefined
          id?: string | null | undefined
          ingest_job_id?: string | null | undefined
          rows_affected?: number | null | undefined
          stage?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          county_id: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          display_name?: string | null | undefined
          id?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Update: {
          avatar_url?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          display_name?: string | null | undefined
          id?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Relationships: []
      }
      report_runs: {
        Row: {
          county_id: string | null
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          parameters: string
          report_name: string
          report_type: string
          result_summary: string | null
          row_count: number | null
          status: string
          template_id: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          executed_at?: string | null | undefined
          executed_by?: string | null | undefined
          id?: string | null | undefined
          parameters?: string | null | undefined
          report_name?: string | null | undefined
          report_type?: string | null | undefined
          result_summary?: string | null | undefined
          row_count?: number | null | undefined
          status?: string | null | undefined
          template_id?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          executed_at?: string | null | undefined
          executed_by?: string | null | undefined
          id?: string | null | undefined
          parameters?: string | null | undefined
          report_name?: string | null | undefined
          report_type?: string | null | undefined
          result_summary?: string | null | undefined
          row_count?: number | null | undefined
          status?: string | null | undefined
          template_id?: string | null | undefined
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          county_id: string | null
          created_at: string
          created_by: string
          dataset: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          report_type: string
          template_config: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          dataset?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_system?: boolean | null | undefined
          name?: string | null | undefined
          report_type?: string | null | undefined
          template_config?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          dataset?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_system?: boolean | null | undefined
          name?: string | null | undefined
          report_type?: string | null | undefined
          template_config?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      revaluation_cycles: {
        Row: {
          completed_at: string | null
          county_id: string
          created_at: string
          cycle_name: string
          defensibility_score: number | null
          id: string
          launched_at: string | null
          launched_by: string
          model_types: Json
          neighborhoods: Json
          notes: string | null
          parcels_calibrated: number
          parcels_valued: number
          quality_score: number | null
          status: string
          tax_year: number
          total_parcels: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          cycle_name?: string | null | undefined
          defensibility_score?: number | null | undefined
          id?: string | null | undefined
          launched_at?: string | null | undefined
          launched_by?: string | null | undefined
          model_types?: Json | null | undefined
          neighborhoods?: Json | null | undefined
          notes?: string | null | undefined
          parcels_calibrated?: number | null | undefined
          parcels_valued?: number | null | undefined
          quality_score?: number | null | undefined
          status?: string | null | undefined
          tax_year?: number | null | undefined
          total_parcels?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          cycle_name?: string | null | undefined
          defensibility_score?: number | null | undefined
          id?: string | null | undefined
          launched_at?: string | null | undefined
          launched_by?: string | null | undefined
          model_types?: Json | null | undefined
          neighborhoods?: Json | null | undefined
          notes?: string | null | undefined
          parcels_calibrated?: number | null | undefined
          parcels_valued?: number | null | undefined
          quality_score?: number | null | undefined
          status?: string | null | undefined
          tax_year?: number | null | undefined
          total_parcels?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      review_queue_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          parcel_id: string
          position: number
          queue_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          position?: number | null | undefined
          queue_id?: string | null | undefined
          reviewed_at?: string | null | undefined
          reviewed_by?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          position?: number | null | undefined
          queue_id?: string | null | undefined
          reviewed_at?: string | null | undefined
          reviewed_by?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      review_queues: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          description: string | null
          filter_criteria: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          filter_criteria?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          filter_criteria?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      sales: {
        Row: {
          county_id: string
          created_at: string
          data_source_id: string | null
          deed_type: string | null
          disqualification_reason: string | null
          grantee: string | null
          grantor: string | null
          id: string
          instrument_number: string | null
          is_qualified: boolean | null
          notes: string | null
          parcel_id: string
          sale_date: string
          sale_price: number
          sale_type: string | null
          source_document_id: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          deed_type?: string | null | undefined
          disqualification_reason?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          id?: string | null | undefined
          instrument_number?: string | null | undefined
          is_qualified?: boolean | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          sale_date?: string | null | undefined
          sale_price?: number | null | undefined
          sale_type?: string | null | undefined
          source_document_id?: string | null | undefined
          updated_at?: string | null | undefined
          verification_status?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          data_source_id?: string | null | undefined
          deed_type?: string | null | undefined
          disqualification_reason?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          id?: string | null | undefined
          instrument_number?: string | null | undefined
          is_qualified?: boolean | null | undefined
          notes?: string | null | undefined
          parcel_id?: string | null | undefined
          sale_date?: string | null | undefined
          sale_price?: number | null | undefined
          sale_type?: string | null | undefined
          source_document_id?: string | null | undefined
          updated_at?: string | null | undefined
          verification_status?: string | null | undefined
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          county_id: string
          created_at: string
          description: string | null
          filter_config: string
          id: string
          is_pinned: boolean
          last_used_at: string | null
          name: string
          result_count: number | null
          target_dataset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          filter_config?: string | null | undefined
          id?: string | null | undefined
          is_pinned?: boolean | null | undefined
          last_used_at?: string | null | undefined
          name?: string | null | undefined
          result_count?: number | null | undefined
          target_dataset?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          filter_config?: string | null | undefined
          id?: string | null | undefined
          is_pinned?: boolean | null | undefined
          last_used_at?: string | null | undefined
          name?: string | null | undefined
          result_count?: number | null | undefined
          target_dataset?: string | null | undefined
          updated_at?: string | null | undefined
          user_id?: string | null | undefined
        }
        Relationships: []
      }
      scheduled_scrapes: {
        Row: {
          batch_size: number
          counties: string
          created_at: string
          cron_expression: string
          cron_job_id: number | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          batch_size?: number | null | undefined
          counties?: string | null | undefined
          created_at?: string | null | undefined
          cron_expression?: string | null | undefined
          cron_job_id?: number | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          name?: string | null | undefined
          next_run_at?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          batch_size?: number | null | undefined
          counties?: string | null | undefined
          created_at?: string | null | undefined
          cron_expression?: string | null | undefined
          cron_job_id?: number | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          name?: string | null | undefined
          next_run_at?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      scheduled_tasks: {
        Row: {
          county_id: string | null
          created_at: string
          created_by: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          last_run_summary: string | null
          name: string
          next_run_at: string | null
          run_count: number
          task_config: string
          task_type: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          frequency?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          last_run_status?: string | null | undefined
          last_run_summary?: string | null | undefined
          name?: string | null | undefined
          next_run_at?: string | null | undefined
          run_count?: number | null | undefined
          task_config?: string | null | undefined
          task_type?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          frequency?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          last_run_status?: string | null | undefined
          last_run_summary?: string | null | undefined
          name?: string | null | undefined
          next_run_at?: string | null | undefined
          run_count?: number | null | undefined
          task_config?: string | null | undefined
          task_type?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          completed_at: string | null
          counties: string
          counties_completed: number
          counties_total: number
          created_at: string
          created_by: string | null
          current_county: string | null
          errors: string
          estimated_completion: string | null
          id: string
          job_type: string
          parcels_enriched: number
          sales_added: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null | undefined
          counties?: string | null | undefined
          counties_completed?: number | null | undefined
          counties_total?: number | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          current_county?: string | null | undefined
          errors?: string | null | undefined
          estimated_completion?: string | null | undefined
          id?: string | null | undefined
          job_type?: string | null | undefined
          parcels_enriched?: number | null | undefined
          sales_added?: number | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          counties?: string | null | undefined
          counties_completed?: number | null | undefined
          counties_total?: number | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          current_county?: string | null | undefined
          errors?: string | null | undefined
          estimated_completion?: string | null | undefined
          id?: string | null | undefined
          job_type?: string | null | undefined
          parcels_enriched?: number | null | undefined
          sales_added?: number | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      segment_calibration_runs: {
        Row: {
          calibration_run_id: string | null
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          id: string
          median_ratio: number | null
          parcel_ids: Json | null
          prd: number | null
          r_squared: number | null
          sample_size: number | null
          segment_id: string
          status: string | null
        }
        Insert: {
          calibration_run_id?: string | null | undefined
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          median_ratio?: number | null | undefined
          parcel_ids?: Json | null | undefined
          prd?: number | null | undefined
          r_squared?: number | null | undefined
          sample_size?: number | null | undefined
          segment_id?: string | null | undefined
          status?: string | null | undefined
        }
        Update: {
          calibration_run_id?: string | null | undefined
          cod?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          id?: string | null | undefined
          median_ratio?: number | null | undefined
          parcel_ids?: Json | null | undefined
          prd?: number | null | undefined
          r_squared?: number | null | undefined
          sample_size?: number | null | undefined
          segment_id?: string | null | undefined
          status?: string | null | undefined
        }
        Relationships: []
      }
      segment_definitions: {
        Row: {
          cluster_id: number | null
          county_id: string
          created_at: string
          created_by: string
          description: string | null
          factor: string
          id: string
          importance: number | null
          is_active: boolean | null
          name: string
          ranges: string
          source: string | null
          updated_at: string
        }
        Insert: {
          cluster_id?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          factor?: string | null | undefined
          id?: string | null | undefined
          importance?: number | null | undefined
          is_active?: boolean | null | undefined
          name?: string | null | undefined
          ranges?: string | null | undefined
          source?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          cluster_id?: number | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          factor?: string | null | undefined
          id?: string | null | undefined
          importance?: number | null | undefined
          is_active?: boolean | null | undefined
          name?: string | null | undefined
          ranges?: string | null | undefined
          source?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      slco_lineage_summary: {
        Row: {
          created_at: string | null
          delta_amount: number | null
          delta_pct: number | null
          event_type: string | null
          lineage_hash: string | null
          parcel_id: string | null
          parcel_id_normalized: string | null
          pipeline_stage: string | null
          pipeline_version: string | null
          reason: string | null
          situs_address: string | null
          source_module: string | null
          source_system: string | null
        }
        Insert: {
          created_at?: string | null | undefined
          delta_amount?: number | null | undefined
          delta_pct?: number | null | undefined
          event_type?: string | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_stage?: string | null | undefined
          pipeline_version?: string | null | undefined
          reason?: string | null | undefined
          situs_address?: string | null | undefined
          source_module?: string | null | undefined
          source_system?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          delta_amount?: number | null | undefined
          delta_pct?: number | null | undefined
          event_type?: string | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_stage?: string | null | undefined
          pipeline_version?: string | null | undefined
          reason?: string | null | undefined
          situs_address?: string | null | undefined
          source_module?: string | null | undefined
          source_system?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_assessment_summary: {
        Row: {
          assessed_value: number | null
          assessment_sk: string
          county_id: string
          improvement_value: number | null
          land_value: number | null
          lineage_hash: string | null
          parcel_id_normalized: string
          pipeline_version: string | null
          property_type_code: string | null
          property_type_label: string | null
          retrieved_at: string
          snapshot_date: string | null
          source_system: string
          tax_district_id: string | null
          tax_year: number
          total_market_value: number | null
        }
        Insert: {
          assessed_value?: number | null | undefined
          assessment_sk?: string | null | undefined
          county_id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_version?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_market_value?: number | null | undefined
        }
        Update: {
          assessed_value?: number | null | undefined
          assessment_sk?: string | null | undefined
          county_id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_version?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
          tax_year?: number | null | undefined
          total_market_value?: number | null | undefined
        }
        Relationships: []
      }
      slco_parcel_commercial_characteristics: {
        Row: {
          building_class: string | null
          commercial_sk: string
          county_id: string
          effective_year_built: number | null
          income_unit_count: number | null
          notes: string | null
          parcel_id_normalized: string
          percent_office: number | null
          remodel_year: number | null
          rentable_sqft: number | null
          rental_class: string | null
          retrieved_at: string
          snapshot_date: string | null
          source_system: string
          stories: number | null
          total_floor_area_sqft: number | null
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          building_class?: string | null | undefined
          commercial_sk?: string | null | undefined
          county_id?: string | null | undefined
          effective_year_built?: number | null | undefined
          income_unit_count?: number | null | undefined
          notes?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          percent_office?: number | null | undefined
          remodel_year?: number | null | undefined
          rentable_sqft?: number | null | undefined
          rental_class?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          stories?: number | null | undefined
          total_floor_area_sqft?: number | null | undefined
          year_built?: number | null | undefined
          zoning?: string | null | undefined
        }
        Update: {
          building_class?: string | null | undefined
          commercial_sk?: string | null | undefined
          county_id?: string | null | undefined
          effective_year_built?: number | null | undefined
          income_unit_count?: number | null | undefined
          notes?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          percent_office?: number | null | undefined
          remodel_year?: number | null | undefined
          rentable_sqft?: number | null | undefined
          rental_class?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          stories?: number | null | undefined
          total_floor_area_sqft?: number | null | undefined
          year_built?: number | null | undefined
          zoning?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_evidence_registry: {
        Row: {
          county_id: string
          evidence_sk: string
          evidence_type: string | null
          file_hash: string | null
          parcel_id_normalized: string
          retrieved_at: string
          snapshot_date: string | null
          source_ref: string | null
          source_system: string
          source_url: string | null
          storage_uri: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          evidence_sk?: string | null | undefined
          evidence_type?: string | null | undefined
          file_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_ref?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
          storage_uri?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          evidence_sk?: string | null | undefined
          evidence_type?: string | null | undefined
          file_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_ref?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
          storage_uri?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_geometry_snapshot: {
        Row: {
          area_acres: number | null
          area_sqft: number | null
          centroid_lat: number | null
          centroid_lng: number | null
          coordinates: string | null
          county_id: string
          geom_sk: string
          geometry_version: number
          lineage_hash: string | null
          parcel_id_normalized: string
          pipeline_version: string | null
          retrieved_at: string
          source_system: string
          superseded_at: string | null
        }
        Insert: {
          area_acres?: number | null | undefined
          area_sqft?: number | null | undefined
          centroid_lat?: number | null | undefined
          centroid_lng?: number | null | undefined
          coordinates?: string | null | undefined
          county_id?: string | null | undefined
          geom_sk?: string | null | undefined
          geometry_version?: number | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_version?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
          superseded_at?: string | null | undefined
        }
        Update: {
          area_acres?: number | null | undefined
          area_sqft?: number | null | undefined
          centroid_lat?: number | null | undefined
          centroid_lng?: number | null | undefined
          coordinates?: string | null | undefined
          county_id?: string | null | undefined
          geom_sk?: string | null | undefined
          geometry_version?: number | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          pipeline_version?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
          superseded_at?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_identifier_history: {
        Row: {
          county_id: string
          effective_date: string | null
          id_hist_sk: string
          parcel_id_normalized: string
          prior_parcel_id_normalized: string | null
          relationship_type: string | null
          retrieved_at: string
          source_system: string
          successor_parcel_id_normalized: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          effective_date?: string | null | undefined
          id_hist_sk?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          prior_parcel_id_normalized?: string | null | undefined
          relationship_type?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
          successor_parcel_id_normalized?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          effective_date?: string | null | undefined
          id_hist_sk?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          prior_parcel_id_normalized?: string | null | undefined
          relationship_type?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
          successor_parcel_id_normalized?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_master: {
        Row: {
          acreage: number | null
          active_flag: boolean
          county_id: string
          created_at: string
          geom_source: string | null
          ingested_at: string | null
          land_use_code: string | null
          lineage_hash: string | null
          model_area_id: string | null
          owner_name: string | null
          parcel_id: string
          parcel_id_normalized: string
          parcel_sk: string
          payload_checksum: string | null
          pipeline_version: string | null
          property_type_code: string | null
          property_type_label: string | null
          situs_address: string | null
          situs_city: string | null
          situs_zip: string | null
          source_preferred: string
          source_system: string | null
          tax_district_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          acreage?: number | null | undefined
          active_flag?: boolean | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          geom_source?: string | null | undefined
          ingested_at?: string | null | undefined
          land_use_code?: string | null | undefined
          lineage_hash?: string | null | undefined
          model_area_id?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          parcel_sk?: string | null | undefined
          payload_checksum?: string | null | undefined
          pipeline_version?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          situs_address?: string | null | undefined
          situs_city?: string | null | undefined
          situs_zip?: string | null | undefined
          source_preferred?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
          updated_at?: string | null | undefined
          valid_from?: string | null | undefined
          valid_to?: string | null | undefined
        }
        Update: {
          acreage?: number | null | undefined
          active_flag?: boolean | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          geom_source?: string | null | undefined
          ingested_at?: string | null | undefined
          land_use_code?: string | null | undefined
          lineage_hash?: string | null | undefined
          model_area_id?: string | null | undefined
          owner_name?: string | null | undefined
          parcel_id?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          parcel_sk?: string | null | undefined
          payload_checksum?: string | null | undefined
          pipeline_version?: string | null | undefined
          property_type_code?: string | null | undefined
          property_type_label?: string | null | undefined
          situs_address?: string | null | undefined
          situs_city?: string | null | undefined
          situs_zip?: string | null | undefined
          source_preferred?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
          updated_at?: string | null | undefined
          valid_from?: string | null | undefined
          valid_to?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_source_registry: {
        Row: {
          county_id: string
          license_terms_note: string | null
          parcel_id_normalized: string
          raw_payload_hash: string
          retrieved_at: string
          snapshot_date: string | null
          source_dataset: string | null
          source_record_id: string | null
          source_row_sk: string
          source_system: string
          source_url: string | null
        }
        Insert: {
          county_id?: string | null | undefined
          license_terms_note?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          raw_payload_hash?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_dataset?: string | null | undefined
          source_record_id?: string | null | undefined
          source_row_sk?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          license_terms_note?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          raw_payload_hash?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_dataset?: string | null | undefined
          source_record_id?: string | null | undefined
          source_row_sk?: string | null | undefined
          source_system?: string | null | undefined
          source_url?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_spatial_context: {
        Row: {
          context_sk: string
          county_id: string
          joined_at: string
          model_area_id: string | null
          municipality: string | null
          parcel_id_normalized: string
          source_system: string
          tax_district_id: string | null
        }
        Insert: {
          context_sk?: string | null | undefined
          county_id?: string | null | undefined
          joined_at?: string | null | undefined
          model_area_id?: string | null | undefined
          municipality?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
        }
        Update: {
          context_sk?: string | null | undefined
          county_id?: string | null | undefined
          joined_at?: string | null | undefined
          model_area_id?: string | null | undefined
          municipality?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          source_system?: string | null | undefined
          tax_district_id?: string | null | undefined
        }
        Relationships: []
      }
      slco_parcel_value_history: {
        Row: {
          county_id: string
          improvement_value: number | null
          land_value: number | null
          market_value: number | null
          parcel_id_normalized: string
          retrieved_at: string
          snapshot_date: string | null
          source_system: string
          tax_year: number
          value_hist_sk: string
        }
        Insert: {
          county_id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          market_value?: number | null | undefined
          parcel_id_normalized?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          tax_year?: number | null | undefined
          value_hist_sk?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          improvement_value?: number | null | undefined
          land_value?: number | null | undefined
          market_value?: number | null | undefined
          parcel_id_normalized?: string | null | undefined
          retrieved_at?: string | null | undefined
          snapshot_date?: string | null | undefined
          source_system?: string | null | undefined
          tax_year?: number | null | undefined
          value_hist_sk?: string | null | undefined
        }
        Relationships: []
      }
      slco_pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: string | null
          rows_in: number | null
          rows_out: number | null
          rows_rejected: number | null
          stage: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          rows_in?: number | null | undefined
          rows_out?: number | null | undefined
          rows_rejected?: number | null | undefined
          stage?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
        }
        Update: {
          completed_at?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          rows_in?: number | null | undefined
          rows_out?: number | null | undefined
          rows_rejected?: number | null | undefined
          stage?: string | null | undefined
          started_at?: string | null | undefined
          status?: string | null | undefined
        }
        Relationships: []
      }
      slco_recorder_document_index: {
        Row: {
          county_id: string
          document_sk: string
          document_type: string | null
          grantee: string | null
          grantor: string | null
          image_available: boolean | null
          legal_description: string | null
          parcel_id_normalized: string | null
          recorder_doc_number: string
          recording_date: string | null
          retrieved_at: string
          source_system: string
        }
        Insert: {
          county_id?: string | null | undefined
          document_sk?: string | null | undefined
          document_type?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          image_available?: boolean | null | undefined
          legal_description?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          recorder_doc_number?: string | null | undefined
          recording_date?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          document_sk?: string | null | undefined
          document_type?: string | null | undefined
          grantee?: string | null | undefined
          grantor?: string | null | undefined
          image_available?: boolean | null | undefined
          legal_description?: string | null | undefined
          parcel_id_normalized?: string | null | undefined
          recorder_doc_number?: string | null | undefined
          recording_date?: string | null | undefined
          retrieved_at?: string | null | undefined
          source_system?: string | null | undefined
        }
        Relationships: []
      }
      slco_value_lineage: {
        Row: {
          correlation_id: string | null
          county_id: string
          created_at: string | null
          created_by: string | null
          delta_amount: number | null
          delta_pct: number | null
          event_type: string
          id: string
          lineage_hash: string | null
          parcel_id: string
          pipeline_stage: string | null
          pipeline_version: string | null
          reason: string | null
          source_module: string
          source_system: string | null
          trace_event_id: string | null
          value_after: string | null
          value_before: string | null
        }
        Insert: {
          correlation_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          delta_amount?: number | null | undefined
          delta_pct?: number | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id?: string | null | undefined
          pipeline_stage?: string | null | undefined
          pipeline_version?: string | null | undefined
          reason?: string | null | undefined
          source_module?: string | null | undefined
          source_system?: string | null | undefined
          trace_event_id?: string | null | undefined
          value_after?: string | null | undefined
          value_before?: string | null | undefined
        }
        Update: {
          correlation_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          delta_amount?: number | null | undefined
          delta_pct?: number | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          lineage_hash?: string | null | undefined
          parcel_id?: string | null | undefined
          pipeline_stage?: string | null | undefined
          pipeline_version?: string | null | undefined
          reason?: string | null | undefined
          source_module?: string | null | undefined
          source_system?: string | null | undefined
          trace_event_id?: string | null | undefined
          value_after?: string | null | undefined
          value_before?: string | null | undefined
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null | undefined
          auth_srid?: number | null | undefined
          proj4text?: string | null | undefined
          srid?: number | null | undefined
          srtext?: string | null | undefined
        }
        Update: {
          auth_name?: string | null | undefined
          auth_srid?: number | null | undefined
          proj4text?: string | null | undefined
          srid?: number | null | undefined
          srtext?: string | null | undefined
        }
        Relationships: []
      }
      study_periods: {
        Row: {
          county_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
          target_cod: number | null
          target_prd_high: number | null
          target_prd_low: number | null
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          end_date?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          start_date?: string | null | undefined
          status?: string | null | undefined
          target_cod?: number | null | undefined
          target_prd_high?: number | null | undefined
          target_prd_low?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          end_date?: string | null | undefined
          id?: string | null | undefined
          name?: string | null | undefined
          start_date?: string | null | undefined
          status?: string | null | undefined
          target_cod?: number | null | undefined
          target_prd_high?: number | null | undefined
          target_prd_low?: number | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      sync_watermarks: {
        Row: {
          county_id: string
          created_at: string
          error_message: string | null
          id: string
          last_modified_at: string | null
          last_row_count: number
          last_seen_change_id: string | null
          last_strategy: string
          last_success_at: string | null
          product_id: string
          status: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          id?: string | null | undefined
          last_modified_at?: string | null | undefined
          last_row_count?: number | null | undefined
          last_seen_change_id?: string | null | undefined
          last_strategy?: string | null | undefined
          last_success_at?: string | null | undefined
          product_id?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          error_message?: string | null | undefined
          id?: string | null | undefined
          last_modified_at?: string | null | undefined
          last_row_count?: number | null | undefined
          last_seen_change_id?: string | null | undefined
          last_strategy?: string | null | undefined
          last_success_at?: string | null | undefined
          product_id?: string | null | undefined
          status?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      trace_events: {
        Row: {
          actor_id: string
          agent_id: string | null
          artifact_id: string | null
          artifact_type: string | null
          causation_id: string | null
          correlation_id: string | null
          county_id: string
          created_at: string
          event_data: string
          event_hash: string | null
          event_type: string
          id: string
          parcel_id: string | null
          prev_hash: string | null
          redacted: boolean
          redacted_at: string | null
          sequence_number: number | null
          source_module: string
        }
        Insert: {
          actor_id?: string | null | undefined
          agent_id?: string | null | undefined
          artifact_id?: string | null | undefined
          artifact_type?: string | null | undefined
          causation_id?: string | null | undefined
          correlation_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          event_data?: string | null | undefined
          event_hash?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          prev_hash?: string | null | undefined
          redacted?: boolean | null | undefined
          redacted_at?: string | null | undefined
          sequence_number?: number | null | undefined
          source_module?: string | null | undefined
        }
        Update: {
          actor_id?: string | null | undefined
          agent_id?: string | null | undefined
          artifact_id?: string | null | undefined
          artifact_type?: string | null | undefined
          causation_id?: string | null | undefined
          correlation_id?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          event_data?: string | null | undefined
          event_hash?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          prev_hash?: string | null | undefined
          redacted?: boolean | null | undefined
          redacted_at?: string | null | undefined
          sequence_number?: number | null | undefined
          source_module?: string | null | undefined
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: "admin" | "analyst" | "viewer"
          user_id: string
        }
        Insert: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          role?: "admin" | "analyst" | "viewer" | null | undefined
          user_id?: string | null | undefined
        }
        Update: {
          created_at?: string | null | undefined
          id?: string | null | undefined
          role?: "admin" | "analyst" | "viewer" | null | undefined
          user_id?: string | null | undefined
        }
        Relationships: []
      }
      validation_rules: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_fail_count: number | null
          last_run_pass_count: number | null
          name: string
          operator: string
          severity: string
          target_field: string
          threshold_value: string | null
          updated_at: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          last_run_fail_count?: number | null | undefined
          last_run_pass_count?: number | null | undefined
          name?: string | null | undefined
          operator?: string | null | undefined
          severity?: string | null | undefined
          target_field?: string | null | undefined
          threshold_value?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          last_run_at?: string | null | undefined
          last_run_fail_count?: number | null | undefined
          last_run_pass_count?: number | null | undefined
          name?: string | null | undefined
          operator?: string | null | undefined
          severity?: string | null | undefined
          target_field?: string | null | undefined
          threshold_value?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      value_adjustments: {
        Row: {
          adjustment_reason: string | null
          adjustment_type: string
          applied_at: string
          applied_by: string
          calibration_run_id: string | null
          county_id: string
          id: string
          new_value: number
          parcel_id: string
          previous_value: number
          rolled_back_at: string | null
        }
        Insert: {
          adjustment_reason?: string | null | undefined
          adjustment_type?: string | null | undefined
          applied_at?: string | null | undefined
          applied_by?: string | null | undefined
          calibration_run_id?: string | null | undefined
          county_id?: string | null | undefined
          id?: string | null | undefined
          new_value?: number | null | undefined
          parcel_id?: string | null | undefined
          previous_value?: number | null | undefined
          rolled_back_at?: string | null | undefined
        }
        Update: {
          adjustment_reason?: string | null | undefined
          adjustment_type?: string | null | undefined
          applied_at?: string | null | undefined
          applied_by?: string | null | undefined
          calibration_run_id?: string | null | undefined
          county_id?: string | null | undefined
          id?: string | null | undefined
          new_value?: number | null | undefined
          parcel_id?: string | null | undefined
          previous_value?: number | null | undefined
          rolled_back_at?: string | null | undefined
        }
        Relationships: []
      }
      vei_metrics: {
        Row: {
          cod: number | null
          computed_at: string
          county_id: string
          high_tier_median: number | null
          id: string
          low_tier_median: number | null
          mean_ratio: number | null
          median_ratio: number | null
          mid_tier_median: number | null
          prb: number | null
          prd: number | null
          study_period_id: string
          total_sales: number | null
        }
        Insert: {
          cod?: number | null | undefined
          computed_at?: string | null | undefined
          county_id?: string | null | undefined
          high_tier_median?: number | null | undefined
          id?: string | null | undefined
          low_tier_median?: number | null | undefined
          mean_ratio?: number | null | undefined
          median_ratio?: number | null | undefined
          mid_tier_median?: number | null | undefined
          prb?: number | null | undefined
          prd?: number | null | undefined
          study_period_id?: string | null | undefined
          total_sales?: number | null | undefined
        }
        Update: {
          cod?: number | null | undefined
          computed_at?: string | null | undefined
          county_id?: string | null | undefined
          high_tier_median?: number | null | undefined
          id?: string | null | undefined
          low_tier_median?: number | null | undefined
          mean_ratio?: number | null | undefined
          median_ratio?: number | null | undefined
          mid_tier_median?: number | null | undefined
          prb?: number | null | undefined
          prd?: number | null | undefined
          study_period_id?: string | null | undefined
          total_sales?: number | null | undefined
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          error_message: string | null
          event_type: string
          id: string
          payload: string
          response_body: string | null
          status: string
          status_code: number | null
        }
        Insert: {
          attempt_number?: number | null | undefined
          created_at?: string | null | undefined
          delivered_at?: string | null | undefined
          endpoint_id?: string | null | undefined
          error_message?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          payload?: string | null | undefined
          response_body?: string | null | undefined
          status?: string | null | undefined
          status_code?: number | null | undefined
        }
        Update: {
          attempt_number?: number | null | undefined
          created_at?: string | null | undefined
          delivered_at?: string | null | undefined
          endpoint_id?: string | null | undefined
          error_message?: string | null | undefined
          event_type?: string | null | undefined
          id?: string | null | undefined
          payload?: string | null | undefined
          response_body?: string | null | undefined
          status?: string | null | undefined
          status_code?: number | null | undefined
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          event_types: Json
          id: string
          is_active: boolean
          metadata: string | null
          name: string
          retry_count: number
          secret: string | null
          timeout_ms: number
          updated_at: string
          url: string
        }
        Insert: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          event_types?: Json | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          metadata?: string | null | undefined
          name?: string | null | undefined
          retry_count?: number | null | undefined
          secret?: string | null | undefined
          timeout_ms?: number | null | undefined
          updated_at?: string | null | undefined
          url?: string | null | undefined
        }
        Update: {
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          event_types?: Json | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          metadata?: string | null | undefined
          name?: string | null | undefined
          retry_count?: number | null | undefined
          secret?: string | null | undefined
          timeout_ms?: number | null | undefined
          updated_at?: string | null | undefined
          url?: string | null | undefined
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          context: string
          county_id: string
          created_at: string
          current_step: number
          id: string
          parcel_id: string | null
          started_at: string
          started_by: string
          status: string
          step_results: string
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null | undefined
          completed_at?: string | null | undefined
          context?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          current_step?: number | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          started_at?: string | null | undefined
          started_by?: string | null | undefined
          status?: string | null | undefined
          step_results?: string | null | undefined
          template_id?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          assigned_to?: string | null | undefined
          completed_at?: string | null | undefined
          context?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          current_step?: number | null | undefined
          id?: string | null | undefined
          parcel_id?: string | null | undefined
          started_at?: string | null | undefined
          started_by?: string | null | undefined
          status?: string | null | undefined
          step_results?: string | null | undefined
          template_id?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      workflow_tasks: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          county_id: string
          created_at: string
          description: string | null
          due_date: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string
          metadata: string | null
          parcel_id: string | null
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
          workflow_type: string | null
        }
        Insert: {
          assigned_by?: string | null | undefined
          assigned_to?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          due_date?: string | null | undefined
          escalated_at?: string | null | undefined
          escalated_to?: string | null | undefined
          escalation_reason?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          parcel_id?: string | null | undefined
          priority?: string | null | undefined
          status?: string | null | undefined
          task_type?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
          workflow_type?: string | null | undefined
        }
        Update: {
          assigned_by?: string | null | undefined
          assigned_to?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          description?: string | null | undefined
          due_date?: string | null | undefined
          escalated_at?: string | null | undefined
          escalated_to?: string | null | undefined
          escalation_reason?: string | null | undefined
          id?: string | null | undefined
          metadata?: string | null | undefined
          parcel_id?: string | null | undefined
          priority?: string | null | undefined
          status?: string | null | undefined
          task_type?: string | null | undefined
          title?: string | null | undefined
          updated_at?: string | null | undefined
          workflow_type?: string | null | undefined
        }
        Relationships: []
      }
      workflow_templates: {
        Row: {
          category: string
          county_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          steps: string
          trigger_config: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          name?: string | null | undefined
          steps?: string | null | undefined
          trigger_config?: string | null | undefined
          trigger_type?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Update: {
          category?: string | null | undefined
          county_id?: string | null | undefined
          created_at?: string | null | undefined
          created_by?: string | null | undefined
          description?: string | null | undefined
          id?: string | null | undefined
          is_active?: boolean | null | undefined
          name?: string | null | undefined
          steps?: string | null | undefined
          trigger_config?: string | null | undefined
          trigger_type?: string | null | undefined
          updated_at?: string | null | undefined
        }
        Relationships: []
      }
      write_lane_violations: {
        Row: {
          actor_id: string | null
          attempted_module: string
          context: string | null
          created_at: string | null
          expected_owner: string
          id: string
          target_domain: string
          violation_type: string
        }
        Insert: {
          actor_id?: string | null | undefined
          attempted_module?: string | null | undefined
          context?: string | null | undefined
          created_at?: string | null | undefined
          expected_owner?: string | null | undefined
          id?: string | null | undefined
          target_domain?: string | null | undefined
          violation_type?: string | null | undefined
        }
        Update: {
          actor_id?: string | null | undefined
          attempted_module?: string | null | undefined
          context?: string | null | undefined
          created_at?: string | null | undefined
          expected_owner?: string | null | undefined
          id?: string | null | undefined
          target_domain?: string | null | undefined
          violation_type?: string | null | undefined
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][PublicEnumNameOrOptions]
  : never
