// Generated from bintangclass-db (Supabase MCP generate_typescript_types), trimmed to the Database type.
// Regenerate after schema changes: `supabase gen types typescript --project-id ytafljclzofjnivahsdt`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      activity_log: {
        Row: { action: string; actor: string | null; at: string; centre_id: string; changes: Json | null; id: number; row_id: string | null; table_name: string }
        Insert: { action: string; actor?: string | null; at?: string; centre_id: string; changes?: Json | null; row_id?: string | null; table_name: string }
        Update: { action?: string; actor?: string | null; at?: string; centre_id?: string; changes?: Json | null; row_id?: string | null; table_name?: string }
        Relationships: Rel[]
      }
      attendance: {
        Row: { centre_id: string; class_id: string | null; created_at: string; day: string; id: string; marked_by: string | null; present: boolean; student_id: string }
        Insert: { centre_id: string; class_id?: string | null; created_at?: string; day: string; id?: string; marked_by?: string | null; present: boolean; student_id: string }
        Update: { centre_id?: string; class_id?: string | null; created_at?: string; day?: string; id?: string; marked_by?: string | null; present?: boolean; student_id?: string }
        Relationships: [
          { foreignKeyName: 'attendance_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'students'; referencedColumns: ['id'] },
          { foreignKeyName: 'attendance_class_id_fkey'; columns: ['class_id']; isOneToOne: false; referencedRelation: 'classes'; referencedColumns: ['id'] },
        ]
      }
      centres: {
        Row: { city: string | null; created_at: string; created_by: string | null; id: string; name: string; phone: string | null; plan: string; slug: string; status: string }
        Insert: { city?: string | null; created_at?: string; created_by?: string | null; id?: string; name: string; phone?: string | null; plan?: string; slug: string; status?: string }
        Update: { city?: string | null; created_at?: string; created_by?: string | null; id?: string; name?: string; phone?: string | null; plan?: string; slug?: string; status?: string }
        Relationships: []
      }
      classes: {
        Row: { centre_id: string; created_at: string; id: string; name: string; schedule: string | null; teacher_id: string | null }
        Insert: { centre_id: string; created_at?: string; id?: string; name: string; schedule?: string | null; teacher_id?: string | null }
        Update: { centre_id?: string; created_at?: string; id?: string; name?: string; schedule?: string | null; teacher_id?: string | null }
        Relationships: [
          { foreignKeyName: 'classes_centre_id_fkey'; columns: ['centre_id']; isOneToOne: false; referencedRelation: 'centres'; referencedColumns: ['id'] },
        ]
      }
      crm_accounts: {
        Row: { centre_id: string | null; city: string | null; contact_email: string | null; contact_name: string | null; contact_phone: string | null; created_at: string; id: string; name: string; next_follow_up: string | null; source: string | null; stage: string; updated_at: string }
        Insert: { centre_id?: string | null; city?: string | null; contact_email?: string | null; contact_name?: string | null; contact_phone?: string | null; name: string; next_follow_up?: string | null; source?: string | null; stage?: string }
        Update: { centre_id?: string | null; city?: string | null; contact_email?: string | null; contact_name?: string | null; contact_phone?: string | null; name?: string; next_follow_up?: string | null; source?: string | null; stage?: string }
        Relationships: [
          { foreignKeyName: 'crm_accounts_centre_id_fkey'; columns: ['centre_id']; isOneToOne: true; referencedRelation: 'centres'; referencedColumns: ['id'] },
        ]
      }
      crm_notes: {
        Row: { account_id: string; body: string; created_at: string; created_by: string | null; id: string; kind: string }
        Insert: { account_id: string; body: string; created_by?: string | null; kind?: string }
        Update: { account_id?: string; body?: string; created_by?: string | null; kind?: string }
        Relationships: Rel[]
      }
      guardians: {
        Row: { centre_id: string; student_id: string; user_id: string }
        Insert: { centre_id: string; student_id: string; user_id: string }
        Update: { centre_id?: string; student_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: 'guardians_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'students'; referencedColumns: ['id'] },
        ]
      }
      homework: {
        Row: { centre_id: string; class_id: string; created_at: string; created_by: string | null; due_on: string | null; id: string; title: string }
        Insert: { centre_id: string; class_id: string; created_by?: string | null; due_on?: string | null; title: string }
        Update: { due_on?: string | null; title?: string }
        Relationships: [
          { foreignKeyName: 'homework_class_id_fkey'; columns: ['class_id']; isOneToOne: false; referencedRelation: 'classes'; referencedColumns: ['id'] },
        ]
      }
      invites: {
        Row: { accepted_at: string | null; accepted_by: string | null; centre_id: string; created_at: string; created_by: string | null; email: string; expires_at: string; id: string; role: string; student_id: string | null; token: string }
        Insert: { centre_id: string; email: string; role: string; student_id?: string | null }
        Update: { email?: string; role?: string; student_id?: string | null; expires_at?: string }
        Relationships: [
          { foreignKeyName: 'invites_student_fk'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'students'; referencedColumns: ['id'] },
        ]
      }
      memberships: {
        Row: { billing_contact: boolean; centre_id: string; created_at: string; display_name: string | null; id: string; main_contact: boolean; role: string; user_id: string }
        Insert: { billing_contact?: boolean; centre_id: string; display_name?: string | null; main_contact?: boolean; role: string; user_id: string }
        Update: { billing_contact?: boolean; display_name?: string | null; main_contact?: boolean; role?: string }
        Relationships: [
          { foreignKeyName: 'memberships_centre_id_fkey'; columns: ['centre_id']; isOneToOne: false; referencedRelation: 'centres'; referencedColumns: ['id'] },
        ]
      }
      platform_admins: {
        Row: { created_at: string; user_id: string }
        Insert: { user_id: string }
        Update: { user_id?: string }
        Relationships: []
      }
      progress: {
        Row: { book: string; by_user: string | null; centre_id: string; created_at: string; id: string; note: string | null; page: number; student_id: string }
        Insert: { book: string; by_user?: string | null; centre_id: string; note?: string | null; page: number; student_id: string }
        Update: { book?: string; note?: string | null; page?: number }
        Relationships: [
          { foreignKeyName: 'progress_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'students'; referencedColumns: ['id'] },
        ]
      }
      submissions: {
        Row: { audio_path: string; centre_id: string; created_at: string; duration_s: number | null; feedback: string | null; homework_id: string | null; id: string; reviewed_at: string | null; reviewed_by: string | null; stars: number | null; student_id: string; submitted_by: string | null; verdict: string | null }
        Insert: { audio_path: string; centre_id: string; duration_s?: number | null; homework_id?: string | null; student_id: string; submitted_by?: string | null }
        Update: { feedback?: string | null; stars?: number | null; verdict?: string | null }
        Relationships: [
          { foreignKeyName: 'submissions_student_id_fkey'; columns: ['student_id']; isOneToOne: false; referencedRelation: 'students'; referencedColumns: ['id'] },
          { foreignKeyName: 'submissions_homework_id_fkey'; columns: ['homework_id']; isOneToOne: false; referencedRelation: 'homework'; referencedColumns: ['id'] },
        ]
      }
      students: {
        Row: { book: string; centre_id: string; class_id: string | null; created_at: string; full_name: string; id: string; joined_on: string; monthly_fee: number | null; page: number; status: string }
        Insert: { book?: string; centre_id: string; class_id?: string | null; full_name: string; joined_on?: string; monthly_fee?: number | null; page?: number; status?: string }
        Update: { book?: string; class_id?: string | null; full_name?: string; joined_on?: string; monthly_fee?: number | null; page?: number; status?: string }
        Relationships: [
          { foreignKeyName: 'students_class_id_fkey'; columns: ['class_id']; isOneToOne: false; referencedRelation: 'classes'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      accept_invite: { Args: { p_display_name?: string; p_token: string }; Returns: string }
      create_centre: { Args: { p_city?: string; p_display_name?: string; p_name: string; p_phone?: string; p_slug: string }; Returns: string }
      invite_info: { Args: { p_token: string }; Returns: { centre_name: string; email: string; role: string }[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
