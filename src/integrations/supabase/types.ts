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
      appeals: {
        Row: {
          appeal_date: string
          created_at: string
          final_value: number | null
          hearing_date: string | null
          id: string
          notes: string | null
          original_value: number
          parcel_id: string
          requested_value: number | null
          resolution_date: string | null
          resolution_type: string | null
          status: string
          study_period_id: string | null
          updated_at: string
        }
        Insert: {
          appeal_date: string
          created_at?: string
          final_value?: number | null
          hearing_date?: string | null
          id?: string
          notes?: string | null
          original_value: number
          parcel_id: string
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string
          study_period_id?: string | null
          updated_at?: string
        }
        Update: {
          appeal_date?: string
          created_at?: string
          final_value?: number | null
          hearing_date?: string | null
          id?: string
          notes?: string | null
          original_value?: number
          parcel_id?: string
          requested_value?: number | null
          resolution_date?: string | null
          resolution_type?: string | null
          status?: string
          study_period_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
      parcels: {
        Row: {
          address: string
          assessed_value: number
          bathrooms: number | null
          bedrooms: number | null
          building_area: number | null
          city: string | null
          created_at: string
          id: string
          improvement_value: number | null
          land_area: number | null
          land_value: number | null
          latitude: number | null
          longitude: number | null
          neighborhood_code: string | null
          parcel_number: string
          property_class: string | null
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
          created_at?: string
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_code?: string | null
          parcel_number: string
          property_class?: string | null
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
          created_at?: string
          id?: string
          improvement_value?: number | null
          land_area?: number | null
          land_value?: number | null
          latitude?: number | null
          longitude?: number | null
          neighborhood_code?: string | null
          parcel_number?: string
          property_class?: string | null
          state?: string | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          deed_type: string | null
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          deed_type?: string | null
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
          updated_at?: string
        }
        Update: {
          created_at?: string
          deed_type?: string | null
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
          updated_at?: string
        }
        Relationships: [
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
        Relationships: []
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
