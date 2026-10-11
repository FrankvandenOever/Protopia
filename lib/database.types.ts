// Generated from the Supabase project (public schema). Regenerate after schema changes:
//   npx supabase gen types typescript --project-id dhkwefjuximycghhoapk > lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      pledges: {
        Row: { amount: number | null; created_at: string; description: string | null; id: string; kind: string; project_id: string; user_id: string };
        Insert: { amount?: number | null; created_at?: string; description?: string | null; id?: string; kind: string; project_id: string; user_id: string };
        Update: { amount?: number | null; created_at?: string; description?: string | null; id?: string; kind?: string; project_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: "pledges_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "pledges_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: { created_at: string; display_name: string | null; id: string };
        Insert: { created_at?: string; display_name?: string | null; id: string };
        Update: { created_at?: string; display_name?: string | null; id?: string };
        Relationships: [];
      };
      project_labour: {
        Row: { hours: number; id: string; project_id: string; role: string };
        Insert: { hours: number; id?: string; project_id: string; role: string };
        Update: { hours?: number; id?: string; project_id?: string; role?: string };
        Relationships: [
          { foreignKeyName: "project_labour_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      project_resources: {
        Row: { id: string; item: string; project_id: string; quantity: number; unit: string };
        Insert: { id?: string; item: string; project_id: string; quantity: number; unit?: string };
        Update: { id?: string; item?: string; project_id?: string; quantity?: number; unit?: string };
        Relationships: [
          { foreignKeyName: "project_resources_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      project_specs: {
        Row: { id: string; label: string; project_id: string; sort: number; value: string };
        Insert: { id?: string; label: string; project_id: string; sort?: number; value: string };
        Update: { id?: string; label?: string; project_id?: string; sort?: number; value?: string };
        Relationships: [
          { foreignKeyName: "project_specs_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      projects: {
        Row: ProjectRow;
        Insert: {
          after_path: string; before_path: string; budget_eur?: number | null; category?: string; context?: string | null; created_at?: string;
          creator_id: string; id?: string; location: unknown; place_name?: string | null; status?: string; title: string; vision_prompt: string; vote_count?: number;
        };
        Update: {
          after_path?: string; before_path?: string; budget_eur?: number | null; category?: string; context?: string | null; created_at?: string;
          creator_id?: string; id?: string; location?: unknown; place_name?: string | null; status?: string; title?: string; vision_prompt?: string; vote_count?: number;
        };
        Relationships: [
          { foreignKeyName: "projects_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      visualizations: {
        Row: { cost_usd: number | null; created_at: string; creator_id: string; id: string; model: string; output_path: string | null; photo_path: string; project_id: string | null; prompt: string };
        Insert: { cost_usd?: number | null; created_at?: string; creator_id: string; id?: string; model: string; output_path?: string | null; photo_path: string; project_id?: string | null; prompt: string };
        Update: { cost_usd?: number | null; created_at?: string; creator_id?: string; id?: string; model?: string; output_path?: string | null; photo_path?: string; project_id?: string | null; prompt?: string };
        Relationships: [
          { foreignKeyName: "visualizations_creator_id_fkey"; columns: ["creator_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "visualizations_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      votes: {
        Row: { created_at: string; project_id: string; user_id: string };
        Insert: { created_at?: string; project_id: string; user_id: string };
        Update: { created_at?: string; project_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: "votes_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "votes_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      projects_in_bbox: {
        Args: { east: number; max_rows?: number; north: number; south: number; west: number };
        Returns: ProjectRow[];
        SetofOptions: { from: "*"; to: "projects"; isOneToOne: false; isSetofReturn: true };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ProjectRow = {
  after_path: string; before_path: string; budget_eur: number | null; category: string; context: string | null; created_at: string;
  creator_id: string; id: string; lat: number | null; lng: number | null; location: unknown; place_name: string | null; status: string;
  title: string; vision_prompt: string; vote_count: number;
};
