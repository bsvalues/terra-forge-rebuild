export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
          risk_factors: Json
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
          ai_defense_strategy?: string | null
          ai_risk_summary?: string | null
          assigned_to?: string | null
          county_id: string
          created_at?: string
          defense_notes?: string | null
          defense_status?: string
          dossier_packet_id?: string | null
          id?: string
          neighborhood_code?: string | null
          new_value?: number
          owner_name?: string | null
          parcel_id: string
          parcel_number: string
          prior_value?: number
          risk_factors?: Json
          risk_score?: number
          risk_tier?: string
          scoring_run_id?: string | null
          situs_address?: string | null
          tax_year?: number
          updated_at?: string
          value_change?: number | null
          value_change_pct?: number | null
        }
        Update: {
          ai_defense_strategy?: string | null
          ai_risk_summary?: string | null
          assigned_to?: string | null
          county_id?: string
          created_at?: string
          defense_notes?: string | null
          defense_status?: string
          dossier_packet_id?: string | null
          id?: string
          neighborhood_code?: string | null
          new_value?: number
          owner_name?: string | null
          parcel_id?: string
          parcel_number?: string
          prior_value?: number
          risk_factors?: Json
          risk_score?: number
          risk_tier?: string
          scoring_run_id?: string | null
          situs_address?: string | null
          tax_year?: number
          updated_at?: string
          value_change?: number | null
          value_change_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_risk_scores_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_risk_scores_dossier_packet_id_fkey"
            columns: ["dossier_packet_id"]
            isOneToOne: false
            referencedRelation: "dossier_packets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_risk_scores_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          completed_at?: string | null
          county_id: string
          created_at?: string
          created_by?: string
          critical_change_threshold?: number
          critical_count?: number
          error_message?: string | null
          high_change_threshold?: number
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          parcels_flagged?: number
          started_at?: string | null
          status?: string
          total_parcels_scanned?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          county_id?: string
          created_at?: string
          created_by?: string
          critical_change_threshold?: number
          critical_count?: number
          error_message?: string | null
          high_change_threshold?: number
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          parcels_flagged?: number
          started_at?: string | null
          status?: string
          total_parcels_scanned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeal_risk_scoring_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          appeal_id: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          previous_status?: string | null
        }
        Update: {
          appeal_id?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeal_status_changes_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeal_audit_trail"
            referencedColumns: ["appeal_id"]
          },
          {
            foreignKeyName: "appeal_status_changes_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeal_status_changes_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: false
            referencedRelation: "appeals_sanitized"
            referencedColumns: ["id"]
          },
        ]
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
          appeal_date: string
          county_id?: string
          created_at?: string
          final_value?: number | null
          hearing_date?: string | null
          id?: string
          notes?: string | null
          original_value: number
          owner_email?: string | null
          parcel_id: string
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string
          study_period_id?: string | null
          tax_year?: number | null
          updated_at?: string
        }
        Update: {
          appeal_date?: string
          county_id?: string
          created_at?: string
          final_value?: number | null
          hearing_date?: string | null
          id?: string
          notes?: string | null
          original_value?: number
          owner_email?: string | null
          parcel_id?: string
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string
          study_period_id?: string | null
          tax_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_study_period_id_fkey"
            columns: ["study_period_id"]
            isOneToOne: false
            referencedRelation: "study_periods"
            referencedColumns: ["id"]
          },
        ]
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
          assessed_value: number
          created_at?: string
          id?: string
          is_outlier?: boolean | null
          parcel_id: string
          ratio?: number | null
          sale_id: string
          sale_price: number
          study_period_id: string
          value_tier?: string | null
        }
        Update: {
          assessed_value?: number
          created_at?: string
          id?: string
          is_outlier?: boolean | null
          parcel_id?: string
          ratio?: number | null
          sale_id?: string
          sale_price?: number
          study_period_id?: string
          value_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_ratios_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_ratios_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_ratios_study_period_id_fkey"
            columns: ["study_period_id"]
            isOneToOne: false
            referencedRelation: "study_periods"
            referencedColumns: ["id"]
          },
        ]
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
          assessment_date?: string | null
          assessment_reason?: string | null
          certified?: boolean | null
          certified_at?: string | null
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number
          land_value?: number
          notes?: string | null
          parcel_id: string
          tax_year: number
          total_value?: number | null
          updated_at?: string
        }
        Update: {
          assessment_date?: string | null
          assessment_reason?: string | null
          certified?: boolean | null
          certified_at?: string | null
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number
          land_value?: number
          notes?: string | null
          parcel_id?: string
          tax_year?: number
          total_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      avm_runs: {
        Row: {
          cod: number | null
          county_id: string
          created_at: string
          created_by: string
          feature_importance: Json | null
          id: string
          mae: number | null
          mape: number | null
          model_name: string
          model_type: string
          model_version: string
          prd: number | null
          predictions: Json | null
          r_squared: number | null
          rmse: number | null
          sample_size: number | null
          status: string
          training_config: Json | null
          training_time_ms: number | null
          updated_at: string
        }
        Insert: {
          cod?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          feature_importance?: Json | null
          id?: string
          mae?: number | null
          mape?: number | null
          model_name?: string
          model_type?: string
          model_version?: string
          prd?: number | null
          predictions?: Json | null
          r_squared?: number | null
          rmse?: number | null
          sample_size?: number | null
          status?: string
          training_config?: Json | null
          training_time_ms?: number | null
          updated_at?: string
        }
        Update: {
          cod?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          feature_importance?: Json | null
          id?: string
          mae?: number | null
          mape?: number | null
          model_name?: string
          model_type?: string
          model_version?: string
          prd?: number | null
          predictions?: Json | null
          r_squared?: number | null
          rmse?: number | null
          sample_size?: number | null
          status?: string
          training_config?: Json | null
          training_time_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avm_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_notice_jobs: {
        Row: {
          ai_drafted_count: number
          calibration_run_id: string | null
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          filters: Json
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
          ai_drafted_count?: number
          calibration_run_id?: string | null
          completed_at?: string | null
          county_id: string
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          neighborhood_code?: string | null
          notices_failed?: number
          notices_generated?: number
          property_class?: string | null
          status?: string
          total_parcels?: number
          updated_at?: string
        }
        Update: {
          ai_drafted_count?: number
          calibration_run_id?: string | null
          completed_at?: string | null
          county_id?: string
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          neighborhood_code?: string | null
          notices_failed?: number
          notices_generated?: number
          property_class?: string | null
          status?: string
          total_parcels?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_notice_jobs_calibration_run_id_fkey"
            columns: ["calibration_run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_notice_jobs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_runs: {
        Row: {
          coefficients: Json
          county_id: string
          created_at: string
          created_by: string
          diagnostics: Json
          id: string
          model_type: string
          neighborhood_code: string
          r_squared: number | null
          rmse: number | null
          sample_size: number | null
          status: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          coefficients?: Json
          county_id: string
          created_at?: string
          created_by?: string
          diagnostics?: Json
          id?: string
          model_type?: string
          neighborhood_code: string
          r_squared?: number | null
          rmse?: number | null
          sample_size?: number | null
          status?: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          coefficients?: Json
          county_id?: string
          created_at?: string
          created_by?: string
          diagnostics?: Json
          id?: string
          model_type?: string
          neighborhood_code?: string
          r_squared?: number | null
          rmse?: number | null
          sample_size?: number | null
          status?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "calibration_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_events: {
        Row: {
          blocker_snapshot: Json | null
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
          blocker_snapshot?: Json | null
          certified_at?: string
          certified_by?: string
          county_id: string
          event_type?: string
          id?: string
          neighborhood_code?: string | null
          notes?: string | null
          parcels_certified?: number
          parcels_created?: number
          readiness_score?: number | null
          tax_year?: number
          total_parcels?: number
        }
        Update: {
          blocker_snapshot?: Json | null
          certified_at?: string
          certified_by?: string
          county_id?: string
          event_type?: string
          id?: string
          neighborhood_code?: string | null
          notes?: string | null
          parcels_certified?: number
          parcels_created?: number
          readiness_score?: number | null
          tax_year?: number
          total_parcels?: number
        }
        Relationships: [
          {
            foreignKeyName: "certification_events_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      comp_grids: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          criteria: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          county_id: string
          created_at?: string
          created_by?: string
          criteria?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string
          criteria?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comp_grids_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          metadata: Json | null
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
          appeal_count?: number | null
          appeal_rate?: number | null
          avg_assessed_value?: number
          avg_improvement_value?: number
          avg_land_value?: number
          avg_sale_price?: number | null
          cod?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          exemption_count?: number | null
          id?: string
          median_assessed_value?: number
          median_ratio?: number | null
          metadata?: Json | null
          neighborhood_code?: string | null
          prd?: number | null
          property_class?: string | null
          qualified_sales?: number | null
          snapshot_label: string
          tax_year: number
          total_assessed_value?: number
          total_parcels?: number
          total_sales?: number | null
        }
        Update: {
          appeal_count?: number | null
          appeal_rate?: number | null
          avg_assessed_value?: number
          avg_improvement_value?: number
          avg_land_value?: number
          avg_sale_price?: number | null
          cod?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          exemption_count?: number | null
          id?: string
          median_assessed_value?: number
          median_ratio?: number | null
          metadata?: Json | null
          neighborhood_code?: string | null
          prd?: number | null
          property_class?: string | null
          qualified_sales?: number | null
          snapshot_label?: string
          tax_year?: number
          total_assessed_value?: number
          total_parcels?: number
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_snapshots_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          cod?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          id?: string
          mean_ratio?: number | null
          median_ratio?: number | null
          neighborhood_code: string
          parcels_matched?: number
          parcels_processed?: number
          schedule_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cod?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          id?: string
          mean_ratio?: number | null
          median_ratio?: number | null
          neighborhood_code?: string
          parcels_matched?: number
          parcels_processed?: number
          schedule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_approach_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_approach_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "cost_schedules"
            referencedColumns: ["id"]
          },
        ]
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
          age_from?: number
          age_to?: number
          condition_modifier?: number
          created_at?: string
          depreciation_pct?: number
          id?: string
          schedule_id: string
        }
        Update: {
          age_from?: number
          age_to?: number
          condition_modifier?: number
          created_at?: string
          depreciation_pct?: number
          id?: string
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_depreciation_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "cost_schedules"
            referencedColumns: ["id"]
          },
        ]
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
          base_cost_per_sqft: number
          county_id: string
          created_at?: string
          created_by?: string
          effective_year?: number
          id?: string
          property_class: string
          quality_grade?: string
          updated_at?: string
        }
        Update: {
          base_cost_per_sqft?: number
          county_id?: string
          created_at?: string
          created_by?: string
          effective_year?: number
          id?: string
          property_class?: string
          quality_grade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_schedules_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          config: Json | null
          created_at: string
          fips_code: string
          id: string
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          fips_code: string
          id?: string
          name: string
          state?: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          fips_code?: string
          id?: string
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          connection_config: Json | null
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
          connection_config?: Json | null
          county_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          record_count?: number | null
          source_type: string
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          connection_config?: Json | null
          county_id?: string
          created_at?: string
          description?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          record_count?: number | null
          source_type?: string
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          county_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parcel_id: string
          updated_at?: string
          uploaded_by?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          parcel_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_documents_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_documents_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          ai_generated?: boolean
          content: string
          county_id?: string
          created_at?: string
          created_by?: string
          id?: string
          model_used?: string | null
          narrative_type?: string
          parcel_id: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          content?: string
          county_id?: string
          created_at?: string
          created_by?: string
          id?: string
          model_used?: string | null
          narrative_type?: string
          parcel_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_narratives_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_narratives_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_packets: {
        Row: {
          assembled_by: string
          county_id: string
          created_at: string
          document_ids: string[]
          finalized_at: string | null
          finalized_by: string | null
          id: string
          metadata: Json | null
          narrative_ids: string[]
          packet_type: string
          parcel_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assembled_by?: string
          county_id?: string
          created_at?: string
          document_ids?: string[]
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          metadata?: Json | null
          narrative_ids?: string[]
          packet_type?: string
          parcel_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assembled_by?: string
          county_id?: string
          created_at?: string
          document_ids?: string[]
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          metadata?: Json | null
          narrative_ids?: string[]
          packet_type?: string
          parcel_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_packets_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_packets_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_diagnosis_runs: {
        Row: {
          completed_at: string | null
          county_id: string
          created_at: string
          error_message: string | null
          hard_blockers_found: number
          id: string
          lanes_analyzed: string[] | null
          model_used: string | null
          quality_snapshot: Json | null
          started_at: string
          status: string
          total_issues_found: number
          treatment_plan: Json | null
        }
        Insert: {
          completed_at?: string | null
          county_id: string
          created_at?: string
          error_message?: string | null
          hard_blockers_found?: number
          id?: string
          lanes_analyzed?: string[] | null
          model_used?: string | null
          quality_snapshot?: Json | null
          started_at?: string
          status?: string
          total_issues_found?: number
          treatment_plan?: Json | null
        }
        Update: {
          completed_at?: string | null
          county_id?: string
          created_at?: string
          error_message?: string | null
          hard_blockers_found?: number
          id?: string
          lanes_analyzed?: string[] | null
          model_used?: string | null
          quality_snapshot?: Json | null
          started_at?: string
          status?: string
          total_issues_found?: number
          treatment_plan?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dq_diagnosis_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_issue_registry: {
        Row: {
          affected_count: number
          affected_parcel_ids: string[] | null
          blocker_reason: string | null
          confidence_score: number | null
          county_id: string
          created_at: string
          diagnosis_run_id: string | null
          fix_tier: Database["public"]["Enums"]["dq_fix_tier"]
          id: string
          impact_score: number | null
          is_hard_blocker: boolean | null
          issue_description: string | null
          issue_title: string
          issue_type: string
          lane: Database["public"]["Enums"]["dq_lane"]
          metadata: Json | null
          priority_score: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          reversibility_score: number | null
          sample_parcel_ids: string[] | null
          severity: Database["public"]["Enums"]["dq_severity"]
          source_explanation: string | null
          source_trust_level: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_count?: number
          affected_parcel_ids?: string[] | null
          blocker_reason?: string | null
          confidence_score?: number | null
          county_id: string
          created_at?: string
          diagnosis_run_id?: string | null
          fix_tier?: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          impact_score?: number | null
          is_hard_blocker?: boolean | null
          issue_description?: string | null
          issue_title: string
          issue_type: string
          lane: Database["public"]["Enums"]["dq_lane"]
          metadata?: Json | null
          priority_score?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reversibility_score?: number | null
          sample_parcel_ids?: string[] | null
          severity?: Database["public"]["Enums"]["dq_severity"]
          source_explanation?: string | null
          source_trust_level?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affected_count?: number
          affected_parcel_ids?: string[] | null
          blocker_reason?: string | null
          confidence_score?: number | null
          county_id?: string
          created_at?: string
          diagnosis_run_id?: string | null
          fix_tier?: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          impact_score?: number | null
          is_hard_blocker?: boolean | null
          issue_description?: string | null
          issue_title?: string
          issue_type?: string
          lane?: Database["public"]["Enums"]["dq_lane"]
          metadata?: Json | null
          priority_score?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reversibility_score?: number | null
          sample_parcel_ids?: string[] | null
          severity?: Database["public"]["Enums"]["dq_severity"]
          source_explanation?: string | null
          source_trust_level?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_issue_registry_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          fix_tier: Database["public"]["Enums"]["dq_fix_tier"]
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
          applied_at?: string | null
          batch_id?: string | null
          confidence?: number | null
          county_id: string
          created_at?: string
          current_value?: string | null
          explanation?: string | null
          fix_method: string
          fix_tier: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          issue_id: string
          parcel_id?: string | null
          proposed_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_trust?: string | null
          status?: string
          target_column: string
          target_table?: string
        }
        Update: {
          applied_at?: string | null
          batch_id?: string | null
          confidence?: number | null
          county_id?: string
          created_at?: string
          current_value?: string | null
          explanation?: string | null
          fix_method?: string
          fix_tier?: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          issue_id?: string
          parcel_id?: string | null
          proposed_value?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_trust?: string | null
          status?: string
          target_column?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_proposed_fixes_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_proposed_fixes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "dq_issue_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_proposed_fixes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          fix_tier: Database["public"]["Enums"]["dq_fix_tier"]
          id: string
          lane: Database["public"]["Enums"]["dq_lane"]
          quality_score_after: number | null
          quality_score_before: number | null
          rejected_count: number
          rollback_manifest: Json | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          rolled_back_count: number
          status: string
          total_fixes: number
          trace_event_id: string | null
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          applied_count?: number
          batch_name: string
          county_id: string
          created_at?: string
          error_message?: string | null
          fix_tier: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          lane: Database["public"]["Enums"]["dq_lane"]
          quality_score_after?: number | null
          quality_score_before?: number | null
          rejected_count?: number
          rollback_manifest?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          rolled_back_count?: number
          status?: string
          total_fixes?: number
          trace_event_id?: string | null
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          applied_count?: number
          batch_name?: string
          county_id?: string
          created_at?: string
          error_message?: string | null
          fix_tier?: Database["public"]["Enums"]["dq_fix_tier"]
          id?: string
          lane?: Database["public"]["Enums"]["dq_lane"]
          quality_score_after?: number | null
          quality_score_before?: number | null
          rejected_count?: number
          rollback_manifest?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          rolled_back_count?: number
          status?: string
          total_fixes?: number
          trace_event_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_remediation_batches_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      dq_verification_snapshots: {
        Row: {
          batch_id: string | null
          county_id: string
          created_at: string
          diagnosis_run_id: string | null
          gate_results: Json
          id: string
          metrics: Json
          passed_all_gates: boolean | null
          quality_score: number | null
          snapshot_type: string
        }
        Insert: {
          batch_id?: string | null
          county_id: string
          created_at?: string
          diagnosis_run_id?: string | null
          gate_results?: Json
          id?: string
          metrics?: Json
          passed_all_gates?: boolean | null
          quality_score?: number | null
          snapshot_type?: string
        }
        Update: {
          batch_id?: string | null
          county_id?: string
          created_at?: string
          diagnosis_run_id?: string | null
          gate_results?: Json
          id?: string
          metrics?: Json
          passed_all_gates?: boolean | null
          quality_score?: number | null
          snapshot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dq_verification_snapshots_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "dq_remediation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_verification_snapshots_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dq_verification_snapshots_diagnosis_run_id_fkey"
            columns: ["diagnosis_run_id"]
            isOneToOne: false
            referencedRelation: "dq_diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
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
          applicant_name?: string | null
          application_date?: string
          approval_date?: string | null
          created_at?: string
          exemption_amount?: number | null
          exemption_percentage?: number | null
          exemption_type: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          parcel_id: string
          status?: string
          tax_year?: number
          updated_at?: string
        }
        Update: {
          applicant_name?: string | null
          application_date?: string
          approval_date?: string | null
          created_at?: string
          exemption_amount?: number | null
          exemption_percentage?: number | null
          exemption_type?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          parcel_id?: string
          status?: string
          tax_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exemptions_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      external_valuations: {
        Row: {
          created_at: string
          days_on_market: number | null
          estimated_value: number | null
          fetched_at: string
          id: string
          listing_price: number | null
          metadata: Json | null
          parcel_id: string
          source: string
          valuation_date: string
        }
        Insert: {
          created_at?: string
          days_on_market?: number | null
          estimated_value?: number | null
          fetched_at?: string
          id?: string
          listing_price?: number | null
          metadata?: Json | null
          parcel_id: string
          source: string
          valuation_date: string
        }
        Update: {
          created_at?: string
          days_on_market?: number | null
          estimated_value?: number | null
          fetched_at?: string
          id?: string
          listing_price?: number | null
          metadata?: Json | null
          parcel_id?: string
          source?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_valuations_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_data_sources: {
        Row: {
          connection_url: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          name: string
          source_type: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          connection_url?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          name: string
          source_type: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          connection_url?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          name?: string
          source_type?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gis_features: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          coordinates: Json
          county_id: string | null
          created_at: string
          geom: unknown
          geometry_type: string
          id: string
          layer_id: string
          parcel_id: string | null
          properties: Json | null
          source_object_id: string | null
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates: Json
          county_id?: string | null
          created_at?: string
          geom?: unknown
          geometry_type: string
          id?: string
          layer_id: string
          parcel_id?: string | null
          properties?: Json | null
          source_object_id?: string | null
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates?: Json
          county_id?: string | null
          created_at?: string
          geom?: unknown
          geometry_type?: string
          id?: string
          layer_id?: string
          parcel_id?: string | null
          properties?: Json | null
          source_object_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gis_features_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gis_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gis_features_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_ingest_job_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gis_ingest_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gis_ingest_jobs"
            referencedColumns: ["id"]
          },
        ]
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
          completed_at?: string | null
          county_id: string
          created_at?: string
          created_by?: string
          cursor_offset?: number
          cursor_type?: string
          dataset: string
          feature_server_url: string
          id?: string
          last_error?: string | null
          layer_id?: string | null
          page_size?: number
          pages_processed?: number
          parcel_id_field?: string
          started_at?: string | null
          status?: string
          total_fetched?: number
          total_matched?: number
          total_upserted?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          county_id?: string
          created_at?: string
          created_by?: string
          cursor_offset?: number
          cursor_type?: string
          dataset?: string
          feature_server_url?: string
          id?: string
          last_error?: string | null
          layer_id?: string | null
          page_size?: number
          pages_processed?: number
          parcel_id_field?: string
          started_at?: string | null
          status?: string
          total_fetched?: number
          total_matched?: number
          total_upserted?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gis_ingest_jobs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gis_ingest_jobs_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "gis_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      gis_layers: {
        Row: {
          bounds: Json | null
          created_at: string
          data_source_id: string | null
          feature_count: number | null
          file_format: string | null
          id: string
          layer_type: string
          name: string
          properties_schema: Json | null
          srid: number | null
          updated_at: string
        }
        Insert: {
          bounds?: Json | null
          created_at?: string
          data_source_id?: string | null
          feature_count?: number | null
          file_format?: string | null
          id?: string
          layer_type: string
          name: string
          properties_schema?: Json | null
          srid?: number | null
          updated_at?: string
        }
        Update: {
          bounds?: Json | null
          created_at?: string
          data_source_id?: string | null
          feature_count?: number | null
          file_format?: string | null
          id?: string
          layer_type?: string
          name?: string
          properties_schema?: Json | null
          srid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gis_layers_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "gis_data_sources"
            referencedColumns: ["id"]
          },
        ]
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
          cod?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          id?: string
          median_cap_rate?: number | null
          median_grm?: number | null
          median_ratio?: number | null
          neighborhood_code: string
          parcels_processed?: number
          parcels_with_income?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cod?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          id?: string
          median_cap_rate?: number | null
          median_grm?: number | null
          median_ratio?: number | null
          neighborhood_code?: string
          parcels_processed?: number
          parcels_with_income?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_approach_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          cap_rate?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          grm?: number | null
          gross_rental_income?: number
          id?: string
          income_year?: number
          net_operating_income?: number | null
          notes?: string | null
          operating_expenses?: number
          parcel_id: string
          property_type?: string
          updated_at?: string
          vacancy_rate?: number
        }
        Update: {
          cap_rate?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          grm?: number | null
          gross_rental_income?: number
          id?: string
          income_year?: number
          net_operating_income?: number | null
          notes?: string | null
          operating_expenses?: number
          parcel_id?: string
          property_type?: string
          updated_at?: string
          vacancy_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_properties_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_properties_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_jobs: {
        Row: {
          column_mapping: Json | null
          county_id: string
          created_at: string
          errors: Json | null
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
          validation_results: Json | null
        }
        Insert: {
          column_mapping?: Json | null
          county_id: string
          created_at?: string
          errors?: Json | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          rows_failed?: number | null
          rows_imported?: number | null
          sha256_hash?: string | null
          status?: string
          target_table: string
          updated_at?: string
          user_id: string
          validation_results?: Json | null
        }
        Update: {
          column_mapping?: Json | null
          county_id?: string
          created_at?: string
          errors?: Json | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          row_count?: number | null
          rows_failed?: number | null
          rows_imported?: number | null
          sha256_hash?: string | null
          status?: string
          target_table?: string
          updated_at?: string
          user_id?: string
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          county_id?: string
          created_at?: string
          created_by?: string
          dataset_type: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string
          dataset_type?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
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
          confidence_override?: string | null
          created_at?: string
          id?: string
          profile_id: string
          source_header: string
          target_field: string
          transform?: string | null
        }
        Update: {
          confidence_override?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          source_header?: string
          target_field?: string
          transform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingest_mapping_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "ingest_mapping_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          params: Json | null
          receipt_id: string | null
          strategy: string | null
        }
        Insert: {
          actor_id?: string
          affected_count?: number | null
          county_id: string
          created_at?: string
          event_type?: string
          id?: string
          mission_id: string
          params?: Json | null
          receipt_id?: string | null
          strategy?: string | null
        }
        Update: {
          actor_id?: string
          affected_count?: number | null
          county_id?: string
          created_at?: string
          event_type?: string
          id?: string
          mission_id?: string
          params?: Json | null
          receipt_id?: string | null
          strategy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_events_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      model_receipts: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          metadata: Json | null
          model_type: string
          model_version: string
          operator_id: string
          outputs: Json
          parcel_id: string | null
          study_period_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          metadata?: Json | null
          model_type?: string
          model_version: string
          operator_id: string
          outputs?: Json
          parcel_id?: string | null
          study_period_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          metadata?: Json | null
          model_type?: string
          model_version?: string
          operator_id?: string
          outputs?: Json
          parcel_id?: string | null
          study_period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_receipts_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_receipts_study_period_id_fkey"
            columns: ["study_period_id"]
            isOneToOne: false
            referencedRelation: "study_periods"
            referencedColumns: ["id"]
          },
        ]
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
          result_data: Json | null
          review_id: string
          stage: Database["public"]["Enums"]["nbhd_review_stage"]
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          result_data?: Json | null
          review_id: string
          stage: Database["public"]["Enums"]["nbhd_review_stage"]
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          result_data?: Json | null
          review_id?: string
          stage?: Database["public"]["Enums"]["nbhd_review_stage"]
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_review_tasks_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhood_reviews: {
        Row: {
          ai_recommendations: Json
          calibration_completed_at: string | null
          completed_at: string | null
          county_id: string
          created_at: string
          created_by: string
          current_stage: Database["public"]["Enums"]["nbhd_review_stage"]
          data_audit_completed_at: string | null
          equity_review_completed_at: string | null
          id: string
          metrics_snapshot: Json
          neighborhood_code: string
          notes: string | null
          review_name: string
          scoping_completed_at: string | null
          sign_off_completed_at: string | null
          spatial_analysis_completed_at: string | null
          stage_gate_results: Json
          started_at: string
          status: string
          target_deadline: string | null
          updated_at: string
        }
        Insert: {
          ai_recommendations?: Json
          calibration_completed_at?: string | null
          completed_at?: string | null
          county_id: string
          created_at?: string
          created_by?: string
          current_stage?: Database["public"]["Enums"]["nbhd_review_stage"]
          data_audit_completed_at?: string | null
          equity_review_completed_at?: string | null
          id?: string
          metrics_snapshot?: Json
          neighborhood_code: string
          notes?: string | null
          review_name: string
          scoping_completed_at?: string | null
          sign_off_completed_at?: string | null
          spatial_analysis_completed_at?: string | null
          stage_gate_results?: Json
          started_at?: string
          status?: string
          target_deadline?: string | null
          updated_at?: string
        }
        Update: {
          ai_recommendations?: Json
          calibration_completed_at?: string | null
          completed_at?: string | null
          county_id?: string
          created_at?: string
          created_by?: string
          current_stage?: Database["public"]["Enums"]["nbhd_review_stage"]
          data_audit_completed_at?: string | null
          equity_review_completed_at?: string | null
          id?: string
          metrics_snapshot?: Json
          neighborhood_code?: string
          notes?: string | null
          review_name?: string
          scoping_completed_at?: string | null
          sign_off_completed_at?: string | null
          spatial_analysis_completed_at?: string | null
          stage_gate_results?: Json
          started_at?: string
          status?: string
          target_deadline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "neighborhood_reviews_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      neighborhoods: {
        Row: {
          county_id: string
          created_at: string
          description: string | null
          geometry: Json | null
          hood_cd: string
          hood_name: string | null
          id: string
          metadata: Json | null
          model_type: string | null
          property_classes: string[] | null
          status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          county_id: string
          created_at?: string
          description?: string | null
          geometry?: Json | null
          hood_cd: string
          hood_name?: string | null
          id?: string
          metadata?: Json | null
          model_type?: string | null
          property_classes?: string[] | null
          status?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          county_id?: string
          created_at?: string
          description?: string | null
          geometry?: Json | null
          hood_cd?: string
          hood_name?: string | null
          id?: string
          metadata?: Json | null
          model_type?: string | null
          property_classes?: string[] | null
          status?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          metadata: Json | null
          notice_type: string
          parcel_id: string
          recipient_address: string | null
          recipient_name: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          ai_drafted?: boolean
          batch_job_id?: string | null
          body: string
          calibration_run_id?: string | null
          county_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          notice_type?: string
          parcel_id: string
          recipient_address?: string | null
          recipient_name?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          ai_drafted?: boolean
          batch_job_id?: string | null
          body?: string
          calibration_run_id?: string | null
          county_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          notice_type?: string
          parcel_id?: string
          recipient_address?: string | null
          recipient_name?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_batch_job_id_fkey"
            columns: ["batch_job_id"]
            isOneToOne: false
            referencedRelation: "batch_notice_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      pacs_schema_registry: {
        Row: {
          actual_columns: Json | null
          county_id: string
          created_at: string
          expected_columns: Json
          id: string
          last_validated_at: string | null
          missing_optional: string[] | null
          missing_required: string[] | null
          source_table: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_columns?: Json | null
          county_id: string
          created_at?: string
          expected_columns?: Json
          id?: string
          last_validated_at?: string | null
          missing_optional?: string[] | null
          missing_required?: string[] | null
          source_table: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_columns?: Json | null
          county_id?: string
          created_at?: string
          expected_columns?: Json
          id?: string
          last_validated_at?: string | null
          missing_optional?: string[] | null
          missing_required?: string[] | null
          source_table?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pacs_schema_registry_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      pacs_property_profiles: {
        Row: {
          id: string
          county_id: string
          prop_id: number
          prop_val_yr: number
          sup_num: number
          class_cd: string | null
          state_cd: string | null
          property_use_cd: string | null
          imprv_type_cd: string | null
          imprv_det_sub_class_cd: string | null
          num_imprv: number | null
          yr_blt: number | null
          actual_year_built: number | null
          eff_yr_blt: number | null
          actual_age: number | null
          living_area: number | null
          condition_cd: string | null
          percent_complete: number | null
          heat_ac_code: string | null
          class_cd_highvalue_imprv: string | null
          living_area_highvalue_imprv: number | null
          imprv_unit_price: number | null
          imprv_add_val: number | null
          appraised_val: number | null
          land_type_cd: string | null
          land_sqft: number | null
          land_acres: number | null
          land_total_acres: number | null
          land_useable_acres: number | null
          land_useable_sqft: number | null
          land_front_feet: number | null
          land_depth: number | null
          land_num_lots: number | null
          land_total_sqft: number | null
          land_unit_price: number | null
          main_land_unit_price: number | null
          main_land_total_adj: number | null
          land_appr_method: string | null
          ls_table: string | null
          size_adj_pct: number | null
          neighborhood: string | null
          region: string | null
          abs_subdv: string | null
          subset_cd: string | null
          map_id: string | null
          sub_market_cd: string | null
          zoning: string | null
          characteristic_zoning1: string | null
          characteristic_zoning2: string | null
          characteristic_view: string | null
          visibility_access_cd: string | null
          road_access: string | null
          utilities: string | null
          topography: string | null
          school_id: string | null
          city_id: string | null
          last_appraisal_dt: string | null
          mbl_hm_make: string | null
          mbl_hm_model: string | null
          mbl_hm_sn: string | null
          mbl_hm_hud_num: string | null
          mbl_hm_title_num: string | null
          last_pacs_sync: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          county_id: string
          prop_id: number
          prop_val_yr: number
          sup_num?: number
          class_cd?: string | null
          state_cd?: string | null
          property_use_cd?: string | null
          imprv_type_cd?: string | null
          imprv_det_sub_class_cd?: string | null
          num_imprv?: number | null
          yr_blt?: number | null
          actual_year_built?: number | null
          eff_yr_blt?: number | null
          actual_age?: number | null
          living_area?: number | null
          condition_cd?: string | null
          percent_complete?: number | null
          heat_ac_code?: string | null
          class_cd_highvalue_imprv?: string | null
          living_area_highvalue_imprv?: number | null
          imprv_unit_price?: number | null
          imprv_add_val?: number | null
          appraised_val?: number | null
          land_type_cd?: string | null
          land_sqft?: number | null
          land_acres?: number | null
          land_total_acres?: number | null
          land_useable_acres?: number | null
          land_useable_sqft?: number | null
          land_front_feet?: number | null
          land_depth?: number | null
          land_num_lots?: number | null
          land_total_sqft?: number | null
          land_unit_price?: number | null
          main_land_unit_price?: number | null
          main_land_total_adj?: number | null
          land_appr_method?: string | null
          ls_table?: string | null
          size_adj_pct?: number | null
          neighborhood?: string | null
          region?: string | null
          abs_subdv?: string | null
          subset_cd?: string | null
          map_id?: string | null
          sub_market_cd?: string | null
          zoning?: string | null
          characteristic_zoning1?: string | null
          characteristic_zoning2?: string | null
          characteristic_view?: string | null
          visibility_access_cd?: string | null
          road_access?: string | null
          utilities?: string | null
          topography?: string | null
          school_id?: string | null
          city_id?: string | null
          last_appraisal_dt?: string | null
          mbl_hm_make?: string | null
          mbl_hm_model?: string | null
          mbl_hm_sn?: string | null
          mbl_hm_hud_num?: string | null
          mbl_hm_title_num?: string | null
          last_pacs_sync?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          county_id?: string
          prop_id?: number
          prop_val_yr?: number
          sup_num?: number
          class_cd?: string | null
          state_cd?: string | null
          property_use_cd?: string | null
          imprv_type_cd?: string | null
          imprv_det_sub_class_cd?: string | null
          num_imprv?: number | null
          yr_blt?: number | null
          actual_year_built?: number | null
          eff_yr_blt?: number | null
          actual_age?: number | null
          living_area?: number | null
          condition_cd?: string | null
          percent_complete?: number | null
          heat_ac_code?: string | null
          class_cd_highvalue_imprv?: string | null
          living_area_highvalue_imprv?: number | null
          imprv_unit_price?: number | null
          imprv_add_val?: number | null
          appraised_val?: number | null
          land_type_cd?: string | null
          land_sqft?: number | null
          land_acres?: number | null
          land_total_acres?: number | null
          land_useable_acres?: number | null
          land_useable_sqft?: number | null
          land_front_feet?: number | null
          land_depth?: number | null
          land_num_lots?: number | null
          land_total_sqft?: number | null
          land_unit_price?: number | null
          main_land_unit_price?: number | null
          main_land_total_adj?: number | null
          land_appr_method?: string | null
          ls_table?: string | null
          size_adj_pct?: number | null
          neighborhood?: string | null
          region?: string | null
          abs_subdv?: string | null
          subset_cd?: string | null
          map_id?: string | null
          sub_market_cd?: string | null
          zoning?: string | null
          characteristic_zoning1?: string | null
          characteristic_zoning2?: string | null
          characteristic_view?: string | null
          visibility_access_cd?: string | null
          road_access?: string | null
          utilities?: string | null
          topography?: string | null
          school_id?: string | null
          city_id?: string | null
          last_appraisal_dt?: string | null
          mbl_hm_make?: string | null
          mbl_hm_model?: string | null
          mbl_hm_sn?: string | null
          mbl_hm_hud_num?: string | null
          mbl_hm_title_num?: string | null
          last_pacs_sync?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pacs_property_profiles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          county_id: string
          created_at?: string
          hood_cd: string
          id?: string
          parcel_id: string
          sup_num?: number | null
          year: number
        }
        Update: {
          county_id?: string
          created_at?: string
          hood_cd?: string
          id?: string
          parcel_id?: string
          sup_num?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcel_neighborhood_year_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_neighborhood_year_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          county_id?: string
          created_at?: string
          id?: string
          note?: string | null
          parcel_id: string
          priority?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          id?: string
          note?: string | null
          parcel_id?: string
          priority?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcel_watchlist_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          parcel_geom_wgs84: unknown
          parcel_number: string
          prop_id: number | null
          property_class: string | null
          situs_point_wgs84: unknown
          situs_source: string | null
          source_parcel_id: string | null
          state: string | null
          updated_at: string
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          assessed_value: number
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          city?: string | null
          coord_confidence?: number | null
          coord_detected_srid?: number | null
          coord_source?: string | null
          coord_updated_at?: string | null
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          last_verified_at?: string | null
          latitude?: number | null
          latitude_wgs84?: number | null
          longitude?: number | null
          longitude_wgs84?: number | null
          neighborhood_code?: string | null
          parcel_geom_wgs84?: unknown
          parcel_number: string
          prop_id?: number | null
          property_class?: string | null
          situs_point_wgs84?: unknown
          situs_source?: string | null
          source_parcel_id?: string | null
          state?: string | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          assessed_value?: number
          bathrooms?: number | null
          bedrooms?: number | null
          building_area?: number | null
          city?: string | null
          coord_confidence?: number | null
          coord_detected_srid?: number | null
          coord_source?: string | null
          coord_updated_at?: string | null
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          last_verified_at?: string | null
          latitude?: number | null
          latitude_wgs84?: number | null
          longitude?: number | null
          longitude_wgs84?: number | null
          neighborhood_code?: string | null
          parcel_geom_wgs84?: unknown
          parcel_number?: string
          prop_id?: number | null
          property_class?: string | null
          situs_point_wgs84?: unknown
          situs_source?: string | null
          source_parcel_id?: string | null
          state?: string | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcels_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
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
          application_date?: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          expiration_date?: string | null
          id?: string
          inspection_date?: string | null
          inspection_status?: string | null
          issue_date?: string | null
          notes?: string | null
          parcel_id: string
          permit_number: string
          permit_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_date?: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          expiration_date?: string | null
          id?: string
          inspection_date?: string | null
          inspection_status?: string | null
          issue_date?: string | null
          notes?: string | null
          parcel_id?: string
          permit_number?: string
          permit_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_events: {
        Row: {
          artifact_ref: string | null
          county_id: string
          created_at: string
          details: Json
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
          artifact_ref?: string | null
          county_id?: string
          created_at?: string
          details?: Json
          error_id?: string | null
          finished_at?: string | null
          id?: string
          ingest_job_id?: string | null
          rows_affected?: number | null
          stage: string
          started_at?: string
          status?: string
        }
        Update: {
          artifact_ref?: string | null
          county_id?: string
          created_at?: string
          details?: Json
          error_id?: string | null
          finished_at?: string | null
          id?: string
          ingest_job_id?: string | null
          rows_affected?: number | null
          stage?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_events_ingest_job_id_fkey"
            columns: ["ingest_job_id"]
            isOneToOne: false
            referencedRelation: "ingest_jobs"
            referencedColumns: ["id"]
          },
        ]
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
          avatar_url?: string | null
          county_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          county_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          county_id: string | null
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          parameters: Json
          report_name: string
          report_type: string
          result_summary: Json | null
          row_count: number | null
          status: string
          template_id: string | null
        }
        Insert: {
          county_id?: string | null
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          parameters?: Json
          report_name: string
          report_type?: string
          result_summary?: Json | null
          row_count?: number | null
          status?: string
          template_id?: string | null
        }
        Update: {
          county_id?: string | null
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          parameters?: Json
          report_name?: string
          report_type?: string
          result_summary?: Json | null
          row_count?: number | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
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
          template_config: Json
          updated_at: string
        }
        Insert: {
          county_id?: string | null
          created_at?: string
          created_by?: string
          dataset?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          report_type?: string
          template_config?: Json
          updated_at?: string
        }
        Update: {
          county_id?: string | null
          created_at?: string
          created_by?: string
          dataset?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          report_type?: string
          template_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          model_types: string[]
          neighborhoods: string[]
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
          completed_at?: string | null
          county_id: string
          created_at?: string
          cycle_name: string
          defensibility_score?: number | null
          id?: string
          launched_at?: string | null
          launched_by?: string
          model_types?: string[]
          neighborhoods?: string[]
          notes?: string | null
          parcels_calibrated?: number
          parcels_valued?: number
          quality_score?: number | null
          status?: string
          tax_year?: number
          total_parcels?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          county_id?: string
          created_at?: string
          cycle_name?: string
          defensibility_score?: number | null
          id?: string
          launched_at?: string | null
          launched_by?: string
          model_types?: string[]
          neighborhoods?: string[]
          notes?: string | null
          parcels_calibrated?: number
          parcels_valued?: number
          quality_score?: number | null
          status?: string
          tax_year?: number
          total_parcels?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revaluation_cycles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          created_at?: string
          id?: string
          notes?: string | null
          parcel_id: string
          position: number
          queue_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          parcel_id?: string
          position?: number
          queue_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_items_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_items_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "review_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queues: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          description: string | null
          filter_criteria: Json | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          county_id?: string
          created_at?: string
          created_by: string
          description?: string | null
          filter_criteria?: Json | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          filter_criteria?: Json | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_queues_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          deed_type?: string | null
          disqualification_reason?: string | null
          grantee?: string | null
          grantor?: string | null
          id?: string
          instrument_number?: string | null
          is_qualified?: boolean | null
          notes?: string | null
          parcel_id: string
          sale_date: string
          sale_price: number
          sale_type?: string | null
          source_document_id?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          deed_type?: string | null
          disqualification_reason?: string | null
          grantee?: string | null
          grantor?: string | null
          id?: string
          instrument_number?: string | null
          is_qualified?: boolean | null
          notes?: string | null
          parcel_id?: string
          sale_date?: string
          sale_price?: number
          sale_type?: string | null
          source_document_id?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          county_id: string
          created_at: string
          description: string | null
          filter_config: Json
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
          county_id?: string
          created_at?: string
          description?: string | null
          filter_config?: Json
          id?: string
          is_pinned?: boolean
          last_used_at?: string | null
          name: string
          result_count?: number | null
          target_dataset?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          description?: string | null
          filter_config?: Json
          id?: string
          is_pinned?: boolean
          last_used_at?: string | null
          name?: string
          result_count?: number | null
          target_dataset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_scrapes: {
        Row: {
          batch_size: number
          counties: Json
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
          batch_size?: number
          counties?: Json
          created_at?: string
          cron_expression?: string
          cron_job_id?: number | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          batch_size?: number
          counties?: Json
          created_at?: string
          cron_expression?: string
          cron_job_id?: number | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          updated_at?: string
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
          last_run_summary: Json | null
          name: string
          next_run_at: string | null
          run_count: number
          task_config: Json
          task_type: string
          updated_at: string
        }
        Insert: {
          county_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          last_run_summary?: Json | null
          name: string
          next_run_at?: string | null
          run_count?: number
          task_config?: Json
          task_type?: string
          updated_at?: string
        }
        Update: {
          county_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          last_run_summary?: Json | null
          name?: string
          next_run_at?: string | null
          run_count?: number
          task_config?: Json
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          completed_at: string | null
          counties: Json
          counties_completed: number
          counties_total: number
          created_at: string
          created_by: string | null
          current_county: string | null
          errors: Json
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
          completed_at?: string | null
          counties?: Json
          counties_completed?: number
          counties_total?: number
          created_at?: string
          created_by?: string | null
          current_county?: string | null
          errors?: Json
          estimated_completion?: string | null
          id?: string
          job_type?: string
          parcels_enriched?: number
          sales_added?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          counties?: Json
          counties_completed?: number
          counties_total?: number
          created_at?: string
          created_by?: string | null
          current_county?: string | null
          errors?: Json
          estimated_completion?: string | null
          id?: string
          job_type?: string
          parcels_enriched?: number
          sales_added?: number
          started_at?: string | null
          status?: string
          updated_at?: string
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
          parcel_ids: string[] | null
          prd: number | null
          r_squared: number | null
          sample_size: number | null
          segment_id: string
          status: string | null
        }
        Insert: {
          calibration_run_id?: string | null
          cod?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          id?: string
          median_ratio?: number | null
          parcel_ids?: string[] | null
          prd?: number | null
          r_squared?: number | null
          sample_size?: number | null
          segment_id: string
          status?: string | null
        }
        Update: {
          calibration_run_id?: string | null
          cod?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          id?: string
          median_ratio?: number | null
          parcel_ids?: string[] | null
          prd?: number | null
          r_squared?: number | null
          sample_size?: number | null
          segment_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segment_calibration_runs_calibration_run_id_fkey"
            columns: ["calibration_run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_calibration_runs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_calibration_runs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segment_definitions"
            referencedColumns: ["id"]
          },
        ]
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
          ranges: Json
          source: string | null
          updated_at: string
        }
        Insert: {
          cluster_id?: number | null
          county_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          factor: string
          id?: string
          importance?: number | null
          is_active?: boolean | null
          name: string
          ranges?: Json
          source?: string | null
          updated_at?: string
        }
        Update: {
          cluster_id?: number | null
          county_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          factor?: string
          id?: string
          importance?: number | null
          is_active?: boolean | null
          name?: string
          ranges?: Json
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_definitions_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          assessed_value?: number | null
          assessment_sk?: string
          county_id?: string
          improvement_value?: number | null
          land_value?: number | null
          lineage_hash?: string | null
          parcel_id_normalized: string
          pipeline_version?: string | null
          property_type_code?: string | null
          property_type_label?: string | null
          retrieved_at?: string
          snapshot_date?: string | null
          source_system: string
          tax_district_id?: string | null
          tax_year: number
          total_market_value?: number | null
        }
        Update: {
          assessed_value?: number | null
          assessment_sk?: string
          county_id?: string
          improvement_value?: number | null
          land_value?: number | null
          lineage_hash?: string | null
          parcel_id_normalized?: string
          pipeline_version?: string | null
          property_type_code?: string | null
          property_type_label?: string | null
          retrieved_at?: string
          snapshot_date?: string | null
          source_system?: string
          tax_district_id?: string | null
          tax_year?: number
          total_market_value?: number | null
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
          building_class?: string | null
          commercial_sk?: string
          county_id?: string
          effective_year_built?: number | null
          income_unit_count?: number | null
          notes?: string | null
          parcel_id_normalized: string
          percent_office?: number | null
          remodel_year?: number | null
          rentable_sqft?: number | null
          rental_class?: string | null
          retrieved_at?: string
          snapshot_date?: string | null
          source_system: string
          stories?: number | null
          total_floor_area_sqft?: number | null
          year_built?: number | null
          zoning?: string | null
        }
        Update: {
          building_class?: string | null
          commercial_sk?: string
          county_id?: string
          effective_year_built?: number | null
          income_unit_count?: number | null
          notes?: string | null
          parcel_id_normalized?: string
          percent_office?: number | null
          remodel_year?: number | null
          rentable_sqft?: number | null
          rental_class?: string | null
          retrieved_at?: string
          snapshot_date?: string | null
          source_system?: string
          stories?: number | null
          total_floor_area_sqft?: number | null
          year_built?: number | null
          zoning?: string | null
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
          county_id?: string
          evidence_sk?: string
          evidence_type?: string | null
          file_hash?: string | null
          parcel_id_normalized: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_ref?: string | null
          source_system: string
          source_url?: string | null
          storage_uri?: string | null
        }
        Update: {
          county_id?: string
          evidence_sk?: string
          evidence_type?: string | null
          file_hash?: string | null
          parcel_id_normalized?: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_ref?: string | null
          source_system?: string
          source_url?: string | null
          storage_uri?: string | null
        }
        Relationships: []
      }
      slco_parcel_geometry_snapshot: {
        Row: {
          area_acres: number | null
          area_sqft: number | null
          centroid_lat: number | null
          centroid_lng: number | null
          coordinates: Json | null
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
          area_acres?: number | null
          area_sqft?: number | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates?: Json | null
          county_id?: string
          geom_sk?: string
          geometry_version?: number
          lineage_hash?: string | null
          parcel_id_normalized: string
          pipeline_version?: string | null
          retrieved_at?: string
          source_system: string
          superseded_at?: string | null
        }
        Update: {
          area_acres?: number | null
          area_sqft?: number | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates?: Json | null
          county_id?: string
          geom_sk?: string
          geometry_version?: number
          lineage_hash?: string | null
          parcel_id_normalized?: string
          pipeline_version?: string | null
          retrieved_at?: string
          source_system?: string
          superseded_at?: string | null
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
          county_id?: string
          effective_date?: string | null
          id_hist_sk?: string
          parcel_id_normalized: string
          prior_parcel_id_normalized?: string | null
          relationship_type?: string | null
          retrieved_at?: string
          source_system: string
          successor_parcel_id_normalized?: string | null
        }
        Update: {
          county_id?: string
          effective_date?: string | null
          id_hist_sk?: string
          parcel_id_normalized?: string
          prior_parcel_id_normalized?: string | null
          relationship_type?: string | null
          retrieved_at?: string
          source_system?: string
          successor_parcel_id_normalized?: string | null
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
          acreage?: number | null
          active_flag?: boolean
          county_id?: string
          created_at?: string
          geom_source?: string | null
          ingested_at?: string | null
          land_use_code?: string | null
          lineage_hash?: string | null
          model_area_id?: string | null
          owner_name?: string | null
          parcel_id: string
          parcel_id_normalized: string
          parcel_sk?: string
          payload_checksum?: string | null
          pipeline_version?: string | null
          property_type_code?: string | null
          property_type_label?: string | null
          situs_address?: string | null
          situs_city?: string | null
          situs_zip?: string | null
          source_preferred?: string
          source_system?: string | null
          tax_district_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          acreage?: number | null
          active_flag?: boolean
          county_id?: string
          created_at?: string
          geom_source?: string | null
          ingested_at?: string | null
          land_use_code?: string | null
          lineage_hash?: string | null
          model_area_id?: string | null
          owner_name?: string | null
          parcel_id?: string
          parcel_id_normalized?: string
          parcel_sk?: string
          payload_checksum?: string | null
          pipeline_version?: string | null
          property_type_code?: string | null
          property_type_label?: string | null
          situs_address?: string | null
          situs_city?: string | null
          situs_zip?: string | null
          source_preferred?: string
          source_system?: string | null
          tax_district_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
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
          county_id?: string
          license_terms_note?: string | null
          parcel_id_normalized: string
          raw_payload_hash: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_dataset?: string | null
          source_record_id?: string | null
          source_row_sk?: string
          source_system: string
          source_url?: string | null
        }
        Update: {
          county_id?: string
          license_terms_note?: string | null
          parcel_id_normalized?: string
          raw_payload_hash?: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_dataset?: string | null
          source_record_id?: string | null
          source_row_sk?: string
          source_system?: string
          source_url?: string | null
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
          context_sk?: string
          county_id?: string
          joined_at?: string
          model_area_id?: string | null
          municipality?: string | null
          parcel_id_normalized: string
          source_system: string
          tax_district_id?: string | null
        }
        Update: {
          context_sk?: string
          county_id?: string
          joined_at?: string
          model_area_id?: string | null
          municipality?: string | null
          parcel_id_normalized?: string
          source_system?: string
          tax_district_id?: string | null
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
          county_id?: string
          improvement_value?: number | null
          land_value?: number | null
          market_value?: number | null
          parcel_id_normalized: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_system: string
          tax_year: number
          value_hist_sk?: string
        }
        Update: {
          county_id?: string
          improvement_value?: number | null
          land_value?: number | null
          market_value?: number | null
          parcel_id_normalized?: string
          retrieved_at?: string
          snapshot_date?: string | null
          source_system?: string
          tax_year?: number
          value_hist_sk?: string
        }
        Relationships: []
      }
      slco_pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          rows_rejected: number | null
          stage: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          rows_rejected?: number | null
          stage: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          rows_rejected?: number | null
          stage?: string
          started_at?: string | null
          status?: string
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
          county_id?: string
          document_sk?: string
          document_type?: string | null
          grantee?: string | null
          grantor?: string | null
          image_available?: boolean | null
          legal_description?: string | null
          parcel_id_normalized?: string | null
          recorder_doc_number: string
          recording_date?: string | null
          retrieved_at?: string
          source_system?: string
        }
        Update: {
          county_id?: string
          document_sk?: string
          document_type?: string | null
          grantee?: string | null
          grantor?: string | null
          image_available?: boolean | null
          legal_description?: string | null
          parcel_id_normalized?: string | null
          recorder_doc_number?: string
          recording_date?: string | null
          retrieved_at?: string
          source_system?: string
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
          value_after: Json | null
          value_before: Json | null
        }
        Insert: {
          correlation_id?: string | null
          county_id?: string
          created_at?: string | null
          created_by?: string | null
          delta_amount?: number | null
          delta_pct?: number | null
          event_type: string
          id?: string
          lineage_hash?: string | null
          parcel_id: string
          pipeline_stage?: string | null
          pipeline_version?: string | null
          reason?: string | null
          source_module: string
          source_system?: string | null
          trace_event_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
        }
        Update: {
          correlation_id?: string | null
          county_id?: string
          created_at?: string | null
          created_by?: string | null
          delta_amount?: number | null
          delta_pct?: number | null
          event_type?: string
          id?: string
          lineage_hash?: string | null
          parcel_id?: string
          pipeline_stage?: string | null
          pipeline_version?: string | null
          reason?: string | null
          source_module?: string
          source_system?: string | null
          trace_event_id?: string | null
          value_after?: Json | null
          value_before?: Json | null
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
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
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
          county_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
          target_cod?: number | null
          target_prd_high?: number | null
          target_prd_low?: number | null
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
          target_cod?: number | null
          target_prd_high?: number | null
          target_prd_low?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_periods_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          county_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_modified_at?: string | null
          last_row_count?: number
          last_seen_change_id?: string | null
          last_strategy?: string
          last_success_at?: string | null
          product_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_modified_at?: string | null
          last_row_count?: number
          last_seen_change_id?: string | null
          last_strategy?: string
          last_success_at?: string | null
          product_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_watermarks_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          event_data: Json
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
          actor_id?: string
          agent_id?: string | null
          artifact_id?: string | null
          artifact_type?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          county_id: string
          created_at?: string
          event_data?: Json
          event_hash?: string | null
          event_type: string
          id?: string
          parcel_id?: string | null
          prev_hash?: string | null
          redacted?: boolean
          redacted_at?: string | null
          sequence_number?: number | null
          source_module: string
        }
        Update: {
          actor_id?: string
          agent_id?: string | null
          artifact_id?: string | null
          artifact_type?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          county_id?: string
          created_at?: string
          event_data?: Json
          event_hash?: string | null
          event_type?: string
          id?: string
          parcel_id?: string | null
          prev_hash?: string | null
          redacted?: boolean
          redacted_at?: string | null
          sequence_number?: number | null
          source_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "trace_events_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trace_events_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
          county_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_fail_count?: number | null
          last_run_pass_count?: number | null
          name: string
          operator?: string
          severity?: string
          target_field: string
          threshold_value?: string | null
          updated_at?: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_fail_count?: number | null
          last_run_pass_count?: number | null
          name?: string
          operator?: string
          severity?: string
          target_field?: string
          threshold_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_rules_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
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
          adjustment_reason?: string | null
          adjustment_type?: string
          applied_at?: string
          applied_by?: string
          calibration_run_id?: string | null
          county_id: string
          id?: string
          new_value: number
          parcel_id: string
          previous_value: number
          rolled_back_at?: string | null
        }
        Update: {
          adjustment_reason?: string | null
          adjustment_type?: string
          applied_at?: string
          applied_by?: string
          calibration_run_id?: string | null
          county_id?: string
          id?: string
          new_value?: number
          parcel_id?: string
          previous_value?: number
          rolled_back_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "value_adjustments_calibration_run_id_fkey"
            columns: ["calibration_run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_adjustments_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "value_adjustments_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          cod?: number | null
          computed_at?: string
          county_id?: string
          high_tier_median?: number | null
          id?: string
          low_tier_median?: number | null
          mean_ratio?: number | null
          median_ratio?: number | null
          mid_tier_median?: number | null
          prb?: number | null
          prd?: number | null
          study_period_id: string
          total_sales?: number | null
        }
        Update: {
          cod?: number | null
          computed_at?: string
          county_id?: string
          high_tier_median?: number | null
          id?: string
          low_tier_median?: number | null
          mean_ratio?: number | null
          median_ratio?: number | null
          mid_tier_median?: number | null
          prb?: number | null
          prd?: number | null
          study_period_id?: string
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vei_metrics_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vei_metrics_study_period_id_fkey"
            columns: ["study_period_id"]
            isOneToOne: true
            referencedRelation: "study_periods"
            referencedColumns: ["id"]
          },
        ]
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
          payload: Json
          response_body: string | null
          status: string
          status_code: number | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          status?: string
          status_code?: number | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          county_id: string
          created_at: string
          created_by: string
          event_types: string[]
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          retry_count: number
          secret: string | null
          timeout_ms: number
          updated_at: string
          url: string
        }
        Insert: {
          county_id?: string
          created_at?: string
          created_by?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          retry_count?: number
          secret?: string | null
          timeout_ms?: number
          updated_at?: string
          url: string
        }
        Update: {
          county_id?: string
          created_at?: string
          created_by?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          retry_count?: number
          secret?: string | null
          timeout_ms?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          context: Json
          county_id: string
          created_at: string
          current_step: number
          id: string
          parcel_id: string | null
          started_at: string
          started_by: string
          status: string
          step_results: Json
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          context?: Json
          county_id: string
          created_at?: string
          current_step?: number
          id?: string
          parcel_id?: string | null
          started_at?: string
          started_by?: string
          status?: string
          step_results?: Json
          template_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          context?: Json
          county_id?: string
          created_at?: string
          current_step?: number
          id?: string
          parcel_id?: string | null
          started_at?: string
          started_by?: string
          status?: string
          step_results?: Json
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
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
          metadata: Json | null
          parcel_id: string | null
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
          workflow_type: string | null
        }
        Insert: {
          assigned_by?: string
          assigned_to?: string | null
          county_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          metadata?: Json | null
          parcel_id?: string | null
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          workflow_type?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          county_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          metadata?: Json | null
          parcel_id?: string | null
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          steps: Json
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          county_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          county_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      write_lane_violations: {
        Row: {
          actor_id: string | null
          attempted_module: string
          context: Json | null
          created_at: string | null
          expected_owner: string
          id: string
          target_domain: string
          violation_type: string
        }
        Insert: {
          actor_id?: string | null
          attempted_module: string
          context?: Json | null
          created_at?: string | null
          expected_owner: string
          id?: string
          target_domain: string
          violation_type?: string
        }
        Update: {
          actor_id?: string | null
          attempted_module?: string
          context?: Json | null
          created_at?: string | null
          expected_owner?: string
          id?: string
          target_domain?: string
          violation_type?: string
        }
        Relationships: []
      }
    }
    Views: {
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
        Relationships: [
          {
            foreignKeyName: "appeals_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
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
          appeal_date?: string | null
          county_id?: string | null
          created_at?: string | null
          final_value?: number | null
          hearing_date?: string | null
          id?: string | null
          notes?: string | null
          original_value?: number | null
          parcel_id?: string | null
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string | null
          study_period_id?: string | null
          tax_year?: number | null
          updated_at?: string | null
        }
        Update: {
          appeal_date?: string | null
          county_id?: string | null
          created_at?: string | null
          final_value?: number | null
          hearing_date?: string | null
          id?: string | null
          notes?: string | null
          original_value?: number | null
          parcel_id?: string | null
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string | null
          study_period_id?: string | null
          tax_year?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeals_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_study_period_id_fkey"
            columns: ["study_period_id"]
            isOneToOne: false
            referencedRelation: "study_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
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
        Relationships: []
      }
      vw_neighborhood_land_summary: {
        Row: {
          hood_cd: string | null
          parcel_count: number | null
          total_acres: number | null
          total_sqft: number | null
          total_land_val: number | null
          avg_land_val: number | null
          total_ag_val: number | null
          land_type_count: number | null
        }
        Relationships: []
      }
      vw_neighborhood_improvement_summary: {
        Row: {
          hood_cd: string | null
          improved_parcel_count: number | null
          total_improvements: number | null
          total_imprv_val: number | null
          avg_imprv_val: number | null
          avg_living_area: number | null
          avg_year_built: number | null
          imprv_type_count: number | null
        }
        Relationships: []
      }
      vw_neighborhood_sales_summary: {
        Row: {
          hood_cd: string | null
          sale_count: number | null
          avg_sale_price: number | null
          median_sale_price: number | null
          earliest_sale: string | null
          latest_sale: string | null
          avg_ratio: number | null
          median_ratio: number | null
          iaao_band_count: number | null
          iaao_band_pct: number | null
        }
        Relationships: []
      }
      vw_neighborhood_assessment_summary: {
        Row: {
          hood_cd: string | null
          roll_year: number | null
          parcel_count: number | null
          total_appraised: number | null
          avg_appraised: number | null
          total_taxable: number | null
          total_imprv_val: number | null
          total_land_val: number | null
          tax_area_count: number | null
        }
        Relationships: []
      }
      vw_sales_reconciliation: {
        Row: {
          parcel_id: string | null
          parcel_number: string | null
          prop_id: number | null
          tf_sale_id: string | null
          tf_sale_date: string | null
          tf_sale_price: number | null
          tf_sale_type: string | null
          tf_is_qualified: boolean | null
          tf_grantor: string | null
          tf_grantee: string | null
          pacs_sale_id: string | null
          pacs_sale_date: string | null
          pacs_sale_price: number | null
          pacs_sale_type: string | null
          pacs_ratio: number | null
          pacs_market_value: number | null
          pacs_hood_cd: string | null
          match_status: string | null
          price_delta: number | null
          date_delta_days: number | null
        }
        Relationships: []
      }
      vw_sales_reconciliation_summary: {
        Row: {
          match_status: string | null
          record_count: number | null
          avg_price_delta: number | null
          max_price_delta: number | null
          avg_date_delta_days: number | null
          exact_price_matches: number | null
          near_price_matches: number | null
          price_discrepancies: number | null
        }
        Relationships: []
      }
      vw_assessment_reconciliation: {
        Row: {
          parcel_id: string | null
          parcel_number: string | null
          prop_id: number | null
          tf_assessment_id: string | null
          tf_tax_year: number | null
          tf_land_value: number | null
          tf_improvement_value: number | null
          tf_total_value: number | null
          tf_certified: boolean | null
          pacs_roll_id: string | null
          pacs_roll_year: number | null
          pacs_land_value: number | null
          pacs_improvement_value: number | null
          pacs_total_appraised: number | null
          pacs_total_taxable: number | null
          pacs_situs: string | null
          pacs_use_code: string | null
          pacs_tax_area: string | null
          match_status: string | null
          total_value_delta: number | null
          land_value_delta: number | null
          improvement_value_delta: number | null
        }
        Relationships: []
      }
      vw_assessment_reconciliation_summary: {
        Row: {
          match_status: string | null
          record_count: number | null
          avg_total_delta: number | null
          max_total_delta: number | null
          avg_land_delta: number | null
          avg_improvement_delta: number | null
          exact_value_matches: number | null
          near_value_matches: number | null
          value_discrepancies: number | null
        }
        Relationships: []
      }
      vw_pacs_table_stats: {
        Row: {
          table_name: string | null
          row_count: number | null
          unique_props: number | null
          total_value: number | null
          avg_value: number | null
        }
        Relationships: []
      }
      vw_pacs_value_by_neighborhood: {
        Row: {
          neighborhood: string | null
          property_count: number | null
          total_appraised: number | null
          avg_appraised: number | null
          min_appraised: number | null
          max_appraised: number | null
          total_taxable: number | null
          use_code_count: number | null
        }
        Relationships: []
      }
      vw_pacs_sales_by_year: {
        Row: {
          sale_year: number | null
          sale_count: number | null
          total_volume: number | null
          avg_price: number | null
          max_price: number | null
          valid_price_count: number | null
          avg_ratio: number | null
        }
        Relationships: []
      }
      vw_pacs_bridge_coverage: {
        Row: {
          total_parcels: number | null
          linked_parcels: number | null
          pacs_owner_props: number | null
          pacs_assessed_props: number | null
          pacs_sales_props: number | null
          pacs_profile_props: number | null
          link_coverage_pct: number | null
        }
        Relationships: []
      }
      vw_assessment_yoy: {
        Row: {
          assessment_id: string | null
          parcel_id: string | null
          parcel_number: string | null
          address: string | null
          neighborhood_code: string | null
          county_id: string | null
          tax_year: number | null
          prev_tax_year: number | null
          total_value: number | null
          land_value: number | null
          improvement_value: number | null
          certified: boolean | null
          prev_total_value: number | null
          prev_land_value: number | null
          prev_improvement_value: number | null
          total_delta: number | null
          land_delta: number | null
          improvement_delta: number | null
          total_pct_change: number | null
          land_pct_change: number | null
          improvement_pct_change: number | null
        }
        Relationships: []
      }
      vw_assessment_yoy_summary: {
        Row: {
          tax_year: number | null
          prev_tax_year: number | null
          county_id: string | null
          parcel_count: number | null
          yoy_parcel_count: number | null
          avg_total_delta: number | null
          sum_total_delta: number | null
          avg_pct_change: number | null
          increased_count: number | null
          decreased_count: number | null
          unchanged_count: number | null
          max_pct_increase: number | null
          max_pct_decrease: number | null
          total_roll_value: number | null
          avg_value: number | null
        }
        Relationships: []
      }
      vw_assessment_top_movers: {
        Row: {
          parcel_id: string | null
          parcel_number: string | null
          address: string | null
          neighborhood_code: string | null
          county_id: string | null
          tax_year: number | null
          prev_tax_year: number | null
          total_value: number | null
          prev_total_value: number | null
          total_delta: number | null
          total_pct_change: number | null
          land_delta: number | null
          improvement_delta: number | null
          abs_delta: number | null
        }
        Relationships: []
      }
      vw_sales_ratio_county_summary: {
        Row: {
          county_id: string | null
          sale_year: number
          total_sales: number | null
          qualified_sales: number | null
          median_ratio: number | null
          mean_ratio: number | null
          stddev_ratio: number | null
          min_ratio: number | null
          max_ratio: number | null
          cod: number | null
          prd: number | null
          total_sale_volume: number | null
          total_assessed: number | null
          within_10pct_pct: number | null
        }
        Relationships: []
      }
      vw_sales_ratio_by_neighborhood: {
        Row: {
          county_id: string | null
          sale_year: number | null
          neighborhood_code: string | null
          sale_count: number | null
          qualified_count: number | null
          median_ratio: number | null
          mean_ratio: number | null
          stddev_ratio: number | null
          min_ratio: number | null
          max_ratio: number | null
          cod: number | null
          prd: number | null
          within_10pct_pct: number | null
          cod_iaao_grade: string | null
          prd_iaao_grade: string | null
          median_iaao_grade: string | null
        }
        Relationships: []
      }
      vw_sales_ratio_detail: {
        Row: {
          sale_id: string
          parcel_id: string | null
          parcel_number: string | null
          address: string | null
          neighborhood_code: string | null
          county_id: string | null
          sale_date: string | null
          sale_year: number | null
          sale_price: number | null
          deed_type: string | null
          is_qualified: boolean | null
          assessment_id: string | null
          tax_year: number | null
          assessed_value: number | null
          land_value: number | null
          improvement_value: number | null
          certified: boolean | null
          ratio: number | null
          value_delta: number | null
          pct_over_under: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      apply_mission_fix: {
        Args: {
          p_dry_run?: boolean
          p_mission_id: string
          p_params?: Json
          p_strategy: string
        }
        Returns: Json
      }
      assign_parcels_from_polygon_layer: {
        Args: {
          p_county_id: string
          p_layer_id: string
          p_layer_property_key: string
          p_limit?: number
          p_target_column: string
        }
        Returns: Json
      }
      backfill_neighborhood_by_proximity: {
        Args: { p_county_id: string; p_limit?: number }
        Returns: Json
      }
      backfill_parcel_wgs84_from_raw: {
        Args: { p_county_id: string; p_limit?: number }
        Returns: Json
      }
      bulk_spatial_heal: {
        Args: { p_county_id: string; p_updates: Json }
        Returns: Json
      }
      bulk_update_parcel_centroids: {
        Args: { p_county_id: string; p_data: Json }
        Returns: number
      }
      bulk_update_parcel_lir: {
        Args: { p_county_id: string; p_data: Json }
        Returns: number
      }
      bulk_update_parcel_zip_city: {
        Args: { p_county_id: string; p_data: Json }
        Returns: number
      }
      complete_revaluation_cycle: {
        Args: { p_cycle_id: string }
        Returns: Json
      }
      compute_dq_scores: { Args: { p_county_id: string }; Returns: Json }
      compute_ratio_distribution: {
        Args: {
          p_neighborhood_code?: string
          p_outlier_method?: string
          p_sales_end_date?: string
          p_sales_start_date?: string
          p_tax_year?: number
        }
        Returns: {
          parcel_count: number
          percentage: number
          range_label: string
          range_max: number
          range_min: number
        }[]
      }
      compute_ratio_statistics:
        | {
            Args: {
              p_neighborhood_code?: string
              p_sales_end_date?: string
              p_sales_start_date?: string
              p_tax_year?: number
            }
            Returns: {
              cod: number
              high_tier_median: number
              low_tier_median: number
              mean_ratio: number
              median_ratio: number
              mid_tier_median: number
              prb: number
              prd: number
              sample_size: number
              tier_slope: number
            }[]
          }
        | {
            Args: {
              p_neighborhood_code?: string
              p_outlier_method?: string
              p_sales_end_date?: string
              p_sales_start_date?: string
              p_tax_year?: number
            }
            Returns: {
              cod: number
              high_tier_median: number
              low_tier_median: number
              mean_ratio: number
              median_ratio: number
              mid_tier_median: number
              prb: number
              prd: number
              sample_size: number
              tier_slope: number
            }[]
          }
      compute_readiness_score: { Args: { p_county_id?: string }; Returns: Json }
      count_duplicate_addresses: {
        Args: { p_county_id: string }
        Returns: {
          count: number
        }[]
      }
      count_duplicate_parcel_numbers: {
        Args: { p_county_id: string }
        Returns: {
          count: number
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      discover_unregistered_neighborhoods: { Args: never; Returns: Json }
      dq_parcel_counts: { Args: { p_county_id: string }; Returns: Json }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      evaluate_readiness_gates: { Args: { p_county_id: string }; Returns: Json }
      generate_comparison_snapshot: {
        Args: {
          p_county_id: string
          p_label?: string
          p_neighborhood_code?: string
          p_property_class?: string
          p_tax_year: number
        }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_appeal_owner_email: { Args: { p_appeal_id: string }; Returns: string }
      get_appeal_risk_summary: { Args: { p_county_id?: string }; Returns: Json }
      get_county_timeline: {
        Args: {
          p_from?: string
          p_limit?: number
          p_link_key?: string
          p_link_value?: string
          p_offset?: number
          p_search?: string
          p_to?: string
          p_types?: string[]
          p_window_center?: string
          p_window_minutes?: number
        }
        Returns: Json
      }
      get_county_vitals: { Args: { p_county_id?: string }; Returns: Json }
      get_geometry_health_report:
        | { Args: never; Returns: Json }
        | { Args: { p_county_id: string }; Returns: Json }
      get_geometry_health_report_for_county: {
        Args: { p_county_id: string }
        Returns: Json
      }
      get_mission_counts: { Args: never; Returns: Json }
      get_mission_preview: {
        Args: { p_limit?: number; p_mission_id: string; p_offset?: number }
        Returns: Json
      }
      get_neighborhood_data_quality: {
        Args: never
        Returns: {
          has_assessed_value: number
          has_building_area: number
          has_coordinates: number
          has_year_built: number
          neighborhood_code: string
          overall_pct: number
          total_parcels: number
        }[]
      }
      get_neighborhood_equity_overlays: {
        Args: { p_study_period_id?: string }
        Returns: {
          avg_ratio: number
          center_lat: number
          center_lng: number
          cod: number
          max_lat: number
          max_lng: number
          median_ratio: number
          min_lat: number
          min_lng: number
          neighborhood_code: string
          parcel_count: number
          prd: number
        }[]
      }
      get_neighborhood_review_context: {
        Args: { p_review_id: string }
        Returns: Json
      }
      get_neighborhood_stats: {
        Args: { p_year?: number }
        Returns: {
          avg_assessed_value: number
          avg_improvement_value: number
          avg_land_value: number
          hood_cd: string
          hood_name: string
          max_assessed_value: number
          min_assessed_value: number
          parcel_count: number
          total_assessed_value: number
        }[]
      }
      get_parcel_data_quality_stats: {
        Args: never
        Returns: {
          has_assessed_value: number
          has_bathrooms: number
          has_bedrooms: number
          has_building_area: number
          has_coordinates: number
          has_land_area: number
          has_neighborhood: number
          has_year_built: number
          total_parcels: number
        }[]
      }
      get_parcel_polygon_link_stats: {
        Args: { p_county_id: string }
        Returns: Json
      }
      get_pipeline_status: { Args: { p_county_id?: string }; Returns: Json }
      get_revaluation_notice_candidates: {
        Args: { p_cycle_id: string; p_min_change_pct?: number }
        Returns: Json
      }
      get_revaluation_progress: { Args: { p_cycle_id: string }; Returns: Json }
      get_revaluation_report: { Args: { p_cycle_id: string }; Returns: Json }
      get_user_county_id: { Args: never; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      launch_revaluation_cycle: {
        Args: {
          p_cycle_name?: string
          p_neighborhoods?: string[]
          p_tax_year?: number
        }
        Returns: Json
      }
      link_parcels_to_polygons_by_location: {
        Args: { p_county_id: string; p_layer_id: string; p_limit?: number }
        Returns: Json
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      redact_trace_event: { Args: { p_event_id: string }; Returns: boolean }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_parcel_polygon: {
        Args: {
          p_county_id: string
          p_geojson_geometry: Json
          p_layer_id: string
          p_parcel_number: string
          p_properties?: Json
          p_source_object_id?: string
        }
        Returns: Json
      }
      upsert_parcel_polygons_bulk: {
        Args: { p_county_id: string; p_layer_id: string; p_rows: Json }
        Returns: Json
      }
      verify_trace_chain: {
        Args: { p_county_id: string; p_limit?: number }
        Returns: {
          chain_valid: boolean
          first_broken_id: string
          first_broken_sequence: number
          total_checked: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
      dq_fix_tier: "auto_apply" | "review_confirm" | "human_resolve"
      dq_lane:
        | "spatial_healing"
        | "address_normalization"
        | "orphan_duplicate"
        | "cross_source_reconciliation"
        | "characteristic_inference"
        | "value_anomaly"
      dq_severity: "critical" | "high" | "medium" | "low"
      nbhd_review_stage:
        | "scoping"
        | "data_audit"
        | "spatial_analysis"
        | "calibration"
        | "equity_review"
        | "sign_off"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "analyst", "viewer"],
      dq_fix_tier: ["auto_apply", "review_confirm", "human_resolve"],
      dq_lane: [
        "spatial_healing",
        "address_normalization",
        "orphan_duplicate",
        "cross_source_reconciliation",
        "characteristic_inference",
        "value_anomaly",
      ],
      dq_severity: ["critical", "high", "medium", "low"],
      nbhd_review_stage: [
        "scoping",
        "data_audit",
        "spatial_analysis",
        "calibration",
        "equity_review",
        "sign_off",
      ],
    },
  },
} as const
