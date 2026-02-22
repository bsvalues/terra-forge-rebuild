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
          created_at: string
          geometry_type: string
          id: string
          layer_id: string
          parcel_id: string | null
          properties: Json | null
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates: Json
          created_at?: string
          geometry_type: string
          id?: string
          layer_id: string
          parcel_id?: string | null
          properties?: Json | null
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          coordinates?: Json
          created_at?: string
          geometry_type?: string
          id?: string
          layer_id?: string
          parcel_id?: string | null
          properties?: Json | null
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
      neighborhoods: {
        Row: {
          county_id: string
          created_at: string
          geometry: Json | null
          hood_cd: string
          hood_name: string | null
          id: string
          metadata: Json | null
          updated_at: string
          year: number
        }
        Insert: {
          county_id: string
          created_at?: string
          geometry?: Json | null
          hood_cd: string
          hood_name?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string
          year: number
        }
        Update: {
          county_id?: string
          created_at?: string
          geometry?: Json | null
          hood_cd?: string
          hood_name?: string | null
          id?: string
          metadata?: Json | null
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
          parcel_number: string
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
          parcel_number: string
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
          parcel_number?: string
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
          artifact_id: string | null
          artifact_type: string | null
          causation_id: string | null
          correlation_id: string | null
          county_id: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          parcel_id: string | null
          source_module: string
        }
        Insert: {
          actor_id?: string
          artifact_id?: string | null
          artifact_type?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          county_id: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          parcel_id?: string | null
          source_module: string
        }
        Update: {
          actor_id?: string
          artifact_id?: string | null
          artifact_type?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          county_id?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          parcel_id?: string | null
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
    }
    Views: {
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
      backfill_parcel_wgs84_from_raw: {
        Args: { p_county_id: string; p_limit?: number }
        Returns: Json
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
      disablelongtransactions: { Args: never; Returns: string }
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
      get_county_timeline:
        | {
            Args: {
              p_from?: string
              p_limit?: number
              p_offset?: number
              p_search?: string
              p_to?: string
              p_types?: string[]
            }
            Returns: Json
          }
        | {
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
      get_county_vitals: { Args: never; Returns: Json }
      get_geometry_health_report:
        | { Args: never; Returns: Json }
        | { Args: { p_county_id: string }; Returns: Json }
      get_mission_counts: { Args: never; Returns: Json }
      get_mission_preview: {
        Args: { p_limit?: number; p_mission_id: string; p_offset?: number }
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
      get_pipeline_status: { Args: { p_county_id?: string }; Returns: Json }
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
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
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
    },
  },
} as const
