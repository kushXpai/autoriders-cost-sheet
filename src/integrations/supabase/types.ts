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
      admin_charges: {
        Row: {
          charge_percent: number
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          charge_percent: number
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          charge_percent?: number
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      cost_sheets: {
        Row: {
          admin_charge_amount: number
          admin_charge_percent: number
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          driver_allowance: number
          driver_salary: number
          emi_amount: number
          ex_showroom_price: number
          fuel_cost: number
          grand_total: number
          id: string
          insurance_amount: number
          running_kms: number
          status: string | null
          subtotal_a: number
          subtotal_b: number
          tenure_months: number
          total_driver_cost: number
          updated_at: string | null
          vehicle_id: string | null
          vehicle_model: string
        }
        Insert: {
          admin_charge_amount: number
          admin_charge_percent: number
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          driver_allowance: number
          driver_salary: number
          emi_amount: number
          ex_showroom_price: number
          fuel_cost: number
          grand_total: number
          id?: string
          insurance_amount: number
          running_kms: number
          status?: string | null
          subtotal_a: number
          subtotal_b: number
          tenure_months: number
          total_driver_cost: number
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_model: string
        }
        Update: {
          admin_charge_amount?: number
          admin_charge_percent?: number
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          driver_allowance?: number
          driver_salary?: number
          emi_amount?: number
          ex_showroom_price?: number
          fuel_cost?: number
          grand_total?: number
          id?: string
          insurance_amount?: number
          running_kms?: number
          status?: string | null
          subtotal_a?: number
          subtotal_b?: number
          tenure_months?: number
          total_driver_cost?: number
          updated_at?: string | null
          vehicle_id?: string | null
          vehicle_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_sheets_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          fuel_type: string
          id: string
          rate: number
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          fuel_type: string
          id?: string
          rate: number
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          fuel_type?: string
          id?: string
          rate?: number
        }
        Relationships: []
      }
      insurance_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          rate: number
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          rate: number
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          rate?: number
        }
        Relationships: []
      }
      interest_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          rate: number
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          rate: number
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          ex_showroom_price: number
          fuel_type: string
          id: string
          mileage: number
          model: string
        }
        Insert: {
          created_at?: string | null
          ex_showroom_price: number
          fuel_type: string
          id?: string
          mileage: number
          model: string
        }
        Update: {
          created_at?: string | null
          ex_showroom_price?: number
          fuel_type?: string
          id?: string
          mileage?: number
          model?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "superadmin" | "admin" | "staff"
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
      app_role: ["superadmin", "admin", "staff"],
    },
  },
} as const
