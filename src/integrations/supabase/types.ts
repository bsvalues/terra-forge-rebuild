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
          credentials_encrypted: string | null
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
          credentials_encrypted?: string | null
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
          credentials_encrypted?: string | null
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
      parcels: {
        Row: {
          address: string
          assessed_value: number
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          city: string | null
          county_id: string
          created_at: string
          data_source_id: string | null
          id: string
          improvement_value: number | null
          land_area: number | null
          land_value: number | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          neighborhood_code: string | null
          parcel_number: string
          property_class: string | null
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
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_code?: string | null
          parcel_number: string
          property_class?: string | null
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
          county_id?: string
          created_at?: string
          data_source_id?: string | null
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_code?: string | null
          parcel_number?: string
          property_class?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_user_county_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "analyst" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
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
