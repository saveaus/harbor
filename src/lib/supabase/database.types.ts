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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_installs: {
        Row: {
          app_key: string
          installed_at: string
          workspace_id: string
        }
        Insert: {
          app_key: string
          installed_at?: string
          workspace_id: string
        }
        Update: {
          app_key?: string
          installed_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_installs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          changes: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          label: string
          subject_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          changes?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          label?: string
          subject_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          changes?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          label?: string
          subject_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action: string
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          message: string
          name: string
          run_count: number
          trigger: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          message?: string
          name: string
          run_count?: number
          trigger: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          message?: string
          name?: string
          run_count?: number
          trigger?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billable_tasks: {
        Row: {
          assignee_id: string | null
          billable_id: string | null
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          due_on: string | null
          id: string
          item_id: string | null
          minutes: number
          notes: string
          status: Database["public"]["Enums"]["billable_task_status"]
          title: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          billable_id?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          item_id?: string | null
          minutes?: number
          notes?: string
          status?: Database["public"]["Enums"]["billable_task_status"]
          title: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          billable_id?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          item_id?: string | null
          minutes?: number
          notes?: string
          status?: Database["public"]["Enums"]["billable_task_status"]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billable_tasks_billable_id_fkey"
            columns: ["billable_id"]
            isOneToOne: false
            referencedRelation: "billables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_tasks_workspace_id_assignee_id_fkey"
            columns: ["workspace_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billable_tasks_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "billable_tasks_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billable_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_tasks_workspace_id_item_id_fkey"
            columns: ["workspace_id", "item_id"]
            isOneToOne: false
            referencedRelation: "price_book_items"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      billables: {
        Row: {
          amount_cents: number | null
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          claim_id: string | null
          claim_type: Database["public"]["Enums"]["claim_type"] | null
          contact_id: string
          created_at: string
          description: string
          gst_code: Database["public"]["Enums"]["gst_code"]
          id: string
          invoice_id: string | null
          item_id: string | null
          kind: Database["public"]["Enums"]["billable_kind"]
          quantity: number
          service_date: string
          shift_id: string | null
          status: Database["public"]["Enums"]["billable_status"]
          support_number: string
          timesheet_entry_id: string | null
          unit: Database["public"]["Enums"]["billing_unit"]
          unit_price_cents: number
          void_reason: string
          workspace_id: string
        }
        Insert: {
          amount_cents?: number | null
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          claim_id?: string | null
          claim_type?: Database["public"]["Enums"]["claim_type"] | null
          contact_id: string
          created_at?: string
          description: string
          gst_code?: Database["public"]["Enums"]["gst_code"]
          id?: string
          invoice_id?: string | null
          item_id?: string | null
          kind: Database["public"]["Enums"]["billable_kind"]
          quantity: number
          service_date: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["billable_status"]
          support_number?: string
          timesheet_entry_id?: string | null
          unit: Database["public"]["Enums"]["billing_unit"]
          unit_price_cents: number
          void_reason?: string
          workspace_id: string
        }
        Update: {
          amount_cents?: number | null
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          claim_id?: string | null
          claim_type?: Database["public"]["Enums"]["claim_type"] | null
          contact_id?: string
          created_at?: string
          description?: string
          gst_code?: Database["public"]["Enums"]["gst_code"]
          id?: string
          invoice_id?: string | null
          item_id?: string | null
          kind?: Database["public"]["Enums"]["billable_kind"]
          quantity?: number
          service_date?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["billable_status"]
          support_number?: string
          timesheet_entry_id?: string | null
          unit?: Database["public"]["Enums"]["billing_unit"]
          unit_price_cents?: number
          void_reason?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billables_timesheet_entry_id_fkey"
            columns: ["timesheet_entry_id"]
            isOneToOne: false
            referencedRelation: "timesheet_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billables_workspace_id_claim_id_fkey"
            columns: ["workspace_id", "claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billables_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "billables_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billables_workspace_id_invoice_id_fkey"
            columns: ["workspace_id", "invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billables_workspace_id_item_id_fkey"
            columns: ["workspace_id", "item_id"]
            isOneToOne: false
            referencedRelation: "price_book_items"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "billables_workspace_id_shift_id_fkey"
            columns: ["workspace_id", "shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          amount_cents: number
          category: string
          contact_id: string
          created_at: string
          ends_on: string | null
          id: string
          label: string
          starts_on: string | null
          temporary: boolean
          workspace_id: string
        }
        Insert: {
          amount_cents: number
          category?: string
          contact_id: string
          created_at?: string
          ends_on?: string | null
          id?: string
          label?: string
          starts_on?: string | null
          temporary?: boolean
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          category?: string
          contact_id?: string
          created_at?: string
          ends_on?: string | null
          id?: string
          label?: string
          starts_on?: string | null
          temporary?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "budget_lines_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "budget_lines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          contact_id: string
          created_at: string
          created_on: string
          file_name: string
          id: string
          renews_on: string
          storage_path: string | null
          summary: string
          title: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_on: string
          file_name?: string
          id?: string
          renews_on: string
          storage_path?: string | null
          summary?: string
          title: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_on?: string
          file_name?: string
          id?: string
          renews_on?: string
          storage_path?: string | null
          summary?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "care_plans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          kind: string
          last_activity_at: string
          last_activity_summary: string
          title: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind: string
          last_activity_at?: string
          last_activity_summary?: string
          title: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_activity_at?: string
          last_activity_summary?: string
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "channels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_exclusions: {
        Row: {
          billable_id: string
          claim_id: string
          workspace_id: string
        }
        Insert: {
          billable_id: string
          claim_id: string
          workspace_id: string
        }
        Update: {
          billable_id?: string
          claim_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_exclusions_billable_id_fkey"
            columns: ["billable_id"]
            isOneToOne: false
            referencedRelation: "billables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_exclusions_workspace_id_claim_id_fkey"
            columns: ["workspace_id", "claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "claim_exclusions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          created_at: string
          created_by: string | null
          export_count: number
          export_error: string
          exported_at: string | null
          id: string
          number: number
          payment_status: Database["public"]["Enums"]["claim_payment_status"]
          period_end: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          export_count?: number
          export_error?: string
          exported_at?: string | null
          id?: string
          number?: number
          payment_status?: Database["public"]["Enums"]["claim_payment_status"]
          period_end: string
          period_start: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          export_count?: number
          export_error?: string
          exported_at?: string | null
          id?: string
          number?: number
          payment_status?: Database["public"]["Enums"]["claim_payment_status"]
          period_end?: string
          period_start?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          address: string
          clinic: string
          contact_id: string
          created_at: string
          email: string
          id: string
          is_primary: boolean
          kind: Database["public"]["Enums"]["client_contact_kind"]
          name: string
          phone: string
          professional_type:
            | Database["public"]["Enums"]["professional_type"]
            | null
          relationship: string
          show_in_app: boolean
          specialty: string
          workspace_id: string
        }
        Insert: {
          address?: string
          clinic?: string
          contact_id: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          kind: Database["public"]["Enums"]["client_contact_kind"]
          name: string
          phone?: string
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          relationship?: string
          show_in_app?: boolean
          specialty?: string
          workspace_id: string
        }
        Update: {
          address?: string
          clinic?: string
          contact_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["client_contact_kind"]
          name?: string
          phone?: string
          professional_type?:
            | Database["public"]["Enums"]["professional_type"]
            | null
          relationship?: string
          show_in_app?: boolean
          specialty?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          assessed_on: string | null
          assessment_type: Database["public"]["Enums"]["assessment_type"] | null
          contact_id: string
          created_at: string
          file_name: string
          folder: Database["public"]["Enums"]["document_folder"]
          id: string
          show_in_app: boolean
          signed_on: string | null
          size_bytes: number
          storage_path: string
          title: string
          valid_from: string | null
          valid_to: string | null
          workspace_id: string
        }
        Insert: {
          assessed_on?: string | null
          assessment_type?:
            | Database["public"]["Enums"]["assessment_type"]
            | null
          contact_id: string
          created_at?: string
          file_name: string
          folder: Database["public"]["Enums"]["document_folder"]
          id?: string
          show_in_app?: boolean
          signed_on?: string | null
          size_bytes?: number
          storage_path: string
          title: string
          valid_from?: string | null
          valid_to?: string | null
          workspace_id: string
        }
        Update: {
          assessed_on?: string | null
          assessment_type?:
            | Database["public"]["Enums"]["assessment_type"]
            | null
          contact_id?: string
          created_at?: string
          file_name?: string
          folder?: Database["public"]["Enums"]["document_folder"]
          id?: string
          show_in_app?: boolean
          signed_on?: string | null
          size_bytes?: number
          storage_path?: string
          title?: string
          valid_from?: string | null
          valid_to?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_finance: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_bsb: string
          contact_id: string
          in_trust_for: string
          plan_manager_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          contact_id: string
          in_trust_for?: string
          plan_manager_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          contact_id?: string
          in_trust_for?: string
          plan_manager_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_finance_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_finance_plan_manager_fkey"
            columns: ["workspace_id", "plan_manager_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "client_finance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goals: {
        Row: {
          contact_id: string
          created_at: string
          description: string
          id: string
          status: Database["public"]["Enums"]["goal_status"]
          target_on: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_on?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          description?: string
          id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          target_on?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_goals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_group_members: {
        Row: {
          contact_id: string
          group_id: string
          item_id: string | null
          share_percent: number
          workspace_id: string
        }
        Insert: {
          contact_id: string
          group_id: string
          item_id?: string | null
          share_percent?: number
          workspace_id: string
        }
        Update: {
          contact_id?: string
          group_id?: string
          item_id?: string | null
          share_percent?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_group_members_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "client_group_members_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "client_group_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_workspace_id_group_id_fkey"
            columns: ["workspace_id", "group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "client_group_members_workspace_id_item_id_fkey"
            columns: ["workspace_id", "item_id"]
            isOneToOne: false
            referencedRelation: "price_book_items"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      client_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_list_members: {
        Row: {
          contact_id: string
          created_at: string
          list_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          list_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          list_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "client_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_list_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_observations: {
        Row: {
          contact_id: string
          created_at: string
          details: string
          id: string
          kind: Database["public"]["Enums"]["observation_kind"]
          occurred_on: string
          reported_by: string | null
          reporter_name: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["observation_severity"]
          title: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          details?: string
          id?: string
          kind: Database["public"]["Enums"]["observation_kind"]
          occurred_on?: string
          reported_by?: string | null
          reporter_name?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["observation_severity"]
          title: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          details?: string
          id?: string
          kind?: Database["public"]["Enums"]["observation_kind"]
          occurred_on?: string
          reported_by?: string | null
          reporter_name?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["observation_severity"]
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_observations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_observations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_observations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          address: string
          aged_care_id: string
          allergies: string
          bank_account_name: string
          bank_account_number: string
          bank_bsb: string
          client_number: number
          contact_id: string
          date_of_birth: string | null
          funding: Database["public"]["Enums"]["funding_type"] | null
          gender: Database["public"]["Enums"]["person_gender"] | null
          hcp_level: number | null
          id: string
          key_worker_id: string | null
          languages: string
          medical_conditions: string
          medications: string
          ndis_number: string
          phone: string
          plan_end: string | null
          plan_management: Database["public"]["Enums"]["plan_management"] | null
          plan_start: string | null
          required_credentials: Database["public"]["Enums"]["credential_kind"][]
          start_date: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string
          aged_care_id?: string
          allergies?: string
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          client_number?: number
          contact_id: string
          date_of_birth?: string | null
          funding?: Database["public"]["Enums"]["funding_type"] | null
          gender?: Database["public"]["Enums"]["person_gender"] | null
          hcp_level?: number | null
          id?: string
          key_worker_id?: string | null
          languages?: string
          medical_conditions?: string
          medications?: string
          ndis_number?: string
          phone?: string
          plan_end?: string | null
          plan_management?:
            | Database["public"]["Enums"]["plan_management"]
            | null
          plan_start?: string | null
          required_credentials?: Database["public"]["Enums"]["credential_kind"][]
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string
          aged_care_id?: string
          allergies?: string
          bank_account_name?: string
          bank_account_number?: string
          bank_bsb?: string
          client_number?: number
          contact_id?: string
          date_of_birth?: string | null
          funding?: Database["public"]["Enums"]["funding_type"] | null
          gender?: Database["public"]["Enums"]["person_gender"] | null
          hcp_level?: number | null
          id?: string
          key_worker_id?: string | null
          languages?: string
          medical_conditions?: string
          medications?: string
          ndis_number?: string
          phone?: string
          plan_end?: string | null
          plan_management?:
            | Database["public"]["Enums"]["plan_management"]
            | null
          plan_start?: string | null
          required_credentials?: Database["public"]["Enums"]["credential_kind"][]
          start_date?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_key_worker_id_fkey"
            columns: ["key_worker_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_staff_preferences: {
        Row: {
          contact_id: string
          created_at: string
          preference: Database["public"]["Enums"]["staff_preference"]
          staff_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          preference: Database["public"]["Enums"]["staff_preference"]
          staff_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          preference?: Database["public"]["Enums"]["staff_preference"]
          staff_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_staff_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "client_staff_preferences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_preferences_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          website: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          website?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          website?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          body: string
          category: string
          created_at: string
          expires_on: string | null
          id: string
          issued_on: string | null
          owner_id: string | null
          reference: string
          review_on: string | null
          status: Database["public"]["Enums"]["company_document_status"]
          summary: string
          template_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: string
          category: string
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          owner_id?: string | null
          reference?: string
          review_on?: string | null
          status?: Database["public"]["Enums"]["company_document_status"]
          summary?: string
          template_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          owner_id?: string | null
          reference?: string
          review_on?: string | null
          status?: Database["public"]["Enums"]["company_document_status"]
          summary?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "policy_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          status: Database["public"]["Enums"]["contact_status"]
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          first_name?: string
          id?: string
          last_name?: string
          status?: Database["public"]["Enums"]["contact_status"]
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          status?: Database["public"]["Enums"]["contact_status"]
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body: string
          contact_id: string
          id: string
          name: string
          sent_at: string
          signed_at: string | null
          signed_name: string | null
          status: Database["public"]["Enums"]["contract_status"]
          template_id: string | null
          workspace_id: string
        }
        Insert: {
          body: string
          contact_id: string
          id?: string
          name: string
          sent_at?: string
          signed_at?: string | null
          signed_name?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: string
          contact_id?: string
          id?: string
          name?: string
          sent_at?: string
          signed_at?: string | null
          signed_name?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          template_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_app_data: {
        Row: {
          app_id: string
          key: string
          updated_at: string
          value: Json
          workspace_id: string
        }
        Insert: {
          app_id: string
          key: string
          updated_at?: string
          value: Json
          workspace_id: string
        }
        Update: {
          app_id?: string
          key?: string
          updated_at?: string
          value?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_app_data_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "custom_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_app_data_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_app_messages: {
        Row: {
          app_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_builder_role"]
          workspace_id: string
        }
        Insert: {
          app_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_builder_role"]
          workspace_id: string
        }
        Update: {
          app_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_builder_role"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_app_messages_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "custom_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_app_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_apps: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          permissions: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          permissions?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          permissions?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_apps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["custom_field_type"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["custom_field_type"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["custom_field_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      file_items: {
        Row: {
          channel_id: string
          content_type: string | null
          created_at: string
          created_by_name: string
          id: string
          kind: string
          name: string
          parent_id: string | null
          size_bytes: number | null
          storage_path: string | null
          url: string | null
          workspace_id: string
        }
        Insert: {
          channel_id: string
          content_type?: string | null
          created_at?: string
          created_by_name?: string
          id?: string
          kind: string
          name: string
          parent_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          url?: string | null
          workspace_id: string
        }
        Update: {
          channel_id?: string
          content_type?: string | null
          created_at?: string
          created_by_name?: string
          id?: string
          kind?: string
          name?: string
          parent_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_items_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "file_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          abn: string
          break_after_minutes: number
          broken_one_cents: number
          broken_two_cents: number
          check_in_radius_m: number
          max_daily_minutes: number
          max_weekly_minutes: number
          min_break_minutes: number
          min_rest_minutes: number
          ndis_registration_number: string
          price_guide_imported_at: string | null
          short_notice_hours: number
          sleepover_cents: number
          sleepover_free_minutes: number
          travel_item_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          abn?: string
          break_after_minutes?: number
          broken_one_cents?: number
          broken_two_cents?: number
          check_in_radius_m?: number
          max_daily_minutes?: number
          max_weekly_minutes?: number
          min_break_minutes?: number
          min_rest_minutes?: number
          ndis_registration_number?: string
          price_guide_imported_at?: string | null
          short_notice_hours?: number
          sleepover_cents?: number
          sleepover_free_minutes?: number
          travel_item_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          abn?: string
          break_after_minutes?: number
          broken_one_cents?: number
          broken_two_cents?: number
          check_in_radius_m?: number
          max_daily_minutes?: number
          max_weekly_minutes?: number
          min_break_minutes?: number
          min_rest_minutes?: number
          ndis_registration_number?: string
          price_guide_imported_at?: string | null
          short_notice_hours?: number
          sleepover_cents?: number
          sleepover_free_minutes?: number
          travel_item_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_settings_workspace_id_travel_item_id_fkey"
            columns: ["workspace_id", "travel_item_id"]
            isOneToOne: false
            referencedRelation: "price_book_items"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      form_requests: {
        Row: {
          answers: Json | null
          completed_at: string | null
          contact_id: string
          form_id: string
          id: string
          sent_at: string
          status: Database["public"]["Enums"]["form_request_status"]
          workspace_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          contact_id: string
          form_id: string
          id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["form_request_status"]
          workspace_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          contact_id?: string
          form_id?: string
          id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["form_request_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "form_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string
          fields: Json
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          fields?: Json
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string
          fields?: Json
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          body: string
          id: string
          published: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_notes: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          incident_id: string
          workspace_id: string
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          incident_id: string
          workspace_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          incident_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_notes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_status_events: {
        Row: {
          actor_name: string
          id: string
          incident_id: string
          started_at: string
          status: Database["public"]["Enums"]["incident_status"]
          workspace_id: string
        }
        Insert: {
          actor_name?: string
          id?: string
          incident_id: string
          started_at?: string
          status: Database["public"]["Enums"]["incident_status"]
          workspace_id: string
        }
        Update: {
          actor_name?: string
          id?: string
          incident_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["incident_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_status_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_status_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to_id: string | null
          category: string
          contact_id: string | null
          created_at: string
          description: string
          id: string
          location: string
          number: number
          occurred_at: string
          priority: Database["public"]["Enums"]["incident_priority"]
          reported_at: string
          reported_by_id: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to_id?: string | null
          category: string
          contact_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string
          number?: number
          occurred_at: string
          priority?: Database["public"]["Enums"]["incident_priority"]
          reported_at?: string
          reported_by_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to_id?: string | null
          category?: string
          contact_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string
          number?: number
          occurred_at?: string
          priority?: Database["public"]["Enums"]["incident_priority"]
          reported_at?: string
          reported_by_id?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          kind: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          token_hash: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          kind: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          token_hash: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          kind?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          token_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          product_id: string | null
          quantity: number
          unit_amount_cents: number
          workspace_id: string
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          product_id?: string | null
          quantity: number
          unit_amount_cents: number
          workspace_id: string
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          product_id?: string | null
          quantity?: number
          unit_amount_cents?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          collection: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          memo: string
          number: number
          paid_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id: string | null
          workspace_id: string
        }
        Insert: {
          collection?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          memo?: string
          number?: number
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          workspace_id: string
        }
        Update: {
          collection?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          memo?: string
          number?: number
          paid_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_name: string
          author_user_id: string | null
          body: string
          channel_id: string
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          author_name: string
          author_user_id?: string | null
          body: string
          channel_id: string
          created_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          author_name?: string
          author_user_id?: string | null
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          href: string
          id: string
          read_at: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          read_at?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          href?: string
          id?: string
          read_at?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          contact_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          id: string
          paid_at: string | null
          payment_link_id: string | null
          product_id: string | null
          product_name: string
          source: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_cents: number
          contact_id?: string | null
          created_at?: string
          currency: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          payment_link_id?: string | null
          product_id?: string | null
          product_name: string
          source: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          contact_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          paid_at?: string | null
          payment_link_id?: string | null
          product_id?: string | null
          product_name?: string
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_rates: {
        Row: {
          hourly_cents: number
          km_cents: number
          staff_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          hourly_cents?: number
          km_cents?: number
          staff_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          hourly_cents?: number
          km_cents?: number
          staff_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_rates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_rates_workspace_id_staff_id_fkey"
            columns: ["workspace_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      payment_links: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          product_id: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          product_id: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          charges_enabled: boolean
          country: string
          details_submitted: boolean
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          charges_enabled?: boolean
          country: string
          details_submitted?: boolean
          payouts_enabled?: boolean
          stripe_account_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          charges_enabled?: boolean
          country?: string
          details_submitted?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_exports: {
        Row: {
          export_count: number
          exported_at: string | null
          id: string
          locked_at: string
          locked_by: string | null
          period_end: string
          period_start: string
          staff_id: string | null
          workspace_id: string
        }
        Insert: {
          export_count?: number
          exported_at?: string | null
          id?: string
          locked_at?: string
          locked_by?: string | null
          period_end: string
          period_start: string
          staff_id?: string | null
          workspace_id: string
        }
        Update: {
          export_count?: number
          exported_at?: string | null
          id?: string
          locked_at?: string
          locked_by?: string | null
          period_end?: string
          period_start?: string
          staff_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_exports_workspace_id_staff_id_fkey"
            columns: ["workspace_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      policy_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["policy_kind"]
          published: boolean
          slug: string
          sort_order: number
          summary: string
          title: string
          version: string
        }
        Insert: {
          body?: string
          category: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["policy_kind"]
          published?: boolean
          slug: string
          sort_order?: number
          summary?: string
          title: string
          version?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["policy_kind"]
          published?: boolean
          slug?: string
          sort_order?: number
          summary?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      price_book_items: {
        Row: {
          archived: boolean
          created_at: string
          gst_code: Database["public"]["Enums"]["gst_code"]
          id: string
          name: string
          rate_cents: number
          support_number: string
          unit: Database["public"]["Enums"]["billing_unit"]
          workspace_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          gst_code?: Database["public"]["Enums"]["gst_code"]
          id?: string
          name: string
          rate_cents: number
          support_number?: string
          unit?: Database["public"]["Enums"]["billing_unit"]
          workspace_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          gst_code?: Database["public"]["Enums"]["gst_code"]
          id?: string
          name?: string
          rate_cents?: number
          support_number?: string
          unit?: Database["public"]["Enums"]["billing_unit"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_book_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          amount_cents: number
          archived: boolean
          billing_interval: string
          created_at: string
          currency: string
          description: string
          id: string
          in_store: boolean
          name: string
          workspace_id: string
        }
        Insert: {
          amount_cents: number
          archived?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          in_store?: boolean
          name: string
          workspace_id: string
        }
        Update: {
          amount_cents?: number
          archived?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          in_store?: boolean
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      record_details: {
        Row: {
          company_id: string | null
          contact_id: string | null
          field_values: Json
          id: string
          notes: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          field_values?: Json
          id?: string
          notes?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          field_values?: Json
          id?: string
          notes?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_details_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_details_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "record_details_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_details_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      record_notes: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          contact_id: string | null
          created_at: string
          id: string
          shift_id: string | null
          staff_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          staff_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          staff_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "record_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_notes_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_notes_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          report_key: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          report_key: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          report_key?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          object: string
          query: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          object: string
          query: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          object?: string
          query?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_alerts: {
        Row: {
          body: string
          created_at: string
          emailed_at: string | null
          href: string
          id: string
          kind: string
          shift_id: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          emailed_at?: string | null
          href?: string
          id?: string
          kind: string
          shift_id?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          emailed_at?: string | null
          href?: string
          id?: string
          kind?: string
          shift_id?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_alerts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_clients: {
        Row: {
          contact_id: string
          item_id: string | null
          item_rate_cents: number | null
          share_percent: number
          shift_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          item_id?: string | null
          item_rate_cents?: number | null
          share_percent?: number
          shift_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          item_id?: string | null
          item_rate_cents?: number | null
          share_percent?: number
          shift_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_clients_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "shift_clients_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "shift_clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_clients_workspace_id_item_id_fkey"
            columns: ["workspace_id", "item_id"]
            isOneToOne: false
            referencedRelation: "price_book_items"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "shift_clients_workspace_id_shift_id_fkey"
            columns: ["workspace_id", "shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      shift_staff: {
        Row: {
          shift_id: string
          staff_id: string
          workspace_id: string
        }
        Insert: {
          shift_id: string
          staff_id: string
          workspace_id: string
        }
        Update: {
          shift_id?: string
          staff_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_staff_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_staff_workspace_id_shift_id_fkey"
            columns: ["workspace_id", "shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "shift_staff_workspace_id_staff_id_fkey"
            columns: ["workspace_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      shifts: {
        Row: {
          address: string
          break_minutes: number
          broken: boolean
          cancellation_reason:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at: string | null
          client_charged: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string
          pool_alerted_at: string | null
          pool_since: string | null
          rostered_minutes: number | null
          series_id: string | null
          site_id: string | null
          sleepover: boolean
          staff_paid: boolean
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          support_note: string
          title: string
          travel_between: boolean
          travel_km: number
          workspace_id: string
        }
        Insert: {
          address?: string
          break_minutes?: number
          broken?: boolean
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at?: string | null
          client_charged?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string
          pool_alerted_at?: string | null
          pool_since?: string | null
          rostered_minutes?: number | null
          series_id?: string | null
          site_id?: string | null
          sleepover?: boolean
          staff_paid?: boolean
          starts_at: string
          status?: Database["public"]["Enums"]["shift_status"]
          support_note?: string
          title?: string
          travel_between?: boolean
          travel_km?: number
          workspace_id: string
        }
        Update: {
          address?: string
          break_minutes?: number
          broken?: boolean
          cancellation_reason?:
            | Database["public"]["Enums"]["cancellation_reason"]
            | null
          cancelled_at?: string | null
          client_charged?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string
          pool_alerted_at?: string | null
          pool_since?: string | null
          rostered_minutes?: number | null
          series_id?: string | null
          site_id?: string | null
          sleepover?: boolean
          staff_paid?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["shift_status"]
          support_note?: string
          title?: string
          travel_between?: boolean
          travel_km?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_site_fkey"
            columns: ["workspace_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "shifts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_clients: {
        Row: {
          contact_id: string
          site_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          site_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          site_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_clients_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "site_clients_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "site_clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_clients_workspace_id_site_id_fkey"
            columns: ["workspace_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      site_staff: {
        Row: {
          role: Database["public"]["Enums"]["site_staff_role"]
          site_id: string
          staff_id: string
          workspace_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["site_staff_role"]
          site_id: string
          staff_id: string
          workspace_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["site_staff_role"]
          site_id?: string
          staff_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_staff_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_staff_workspace_id_site_id_fkey"
            columns: ["workspace_id", "site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "site_staff_workspace_id_staff_id_fkey"
            columns: ["workspace_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string
          capacity: number | null
          created_at: string
          id: string
          inspection_due: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string
          status: Database["public"]["Enums"]["site_status"]
          workspace_id: string
        }
        Insert: {
          address?: string
          capacity?: number | null
          created_at?: string
          id?: string
          inspection_due?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string
          status?: Database["public"]["Enums"]["site_status"]
          workspace_id: string
        }
        Update: {
          address?: string
          capacity?: number | null
          created_at?: string
          id?: string
          inspection_due?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string
          status?: Database["public"]["Enums"]["site_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sleepover_hours: {
        Row: {
          approved: boolean
          billable_id: string | null
          created_at: string
          description: string
          ends_at: string
          id: string
          shift_id: string
          starts_at: string
          workspace_id: string
        }
        Insert: {
          approved?: boolean
          billable_id?: string | null
          created_at?: string
          description?: string
          ends_at: string
          id?: string
          shift_id: string
          starts_at: string
          workspace_id: string
        }
        Update: {
          approved?: boolean
          billable_id?: string | null
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          shift_id?: string
          starts_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleepover_hours_billable_id_fkey"
            columns: ["billable_id"]
            isOneToOne: false
            referencedRelation: "billables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sleepover_hours_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          abn: string
          address: string
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_address: string
          emergency_alt_phone: string
          emergency_email: string
          emergency_name: string
          emergency_phone: string
          emergency_relationship: string
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          first_name: string
          gender: Database["public"]["Enums"]["person_gender"] | null
          id: string
          last_name: string
          nationality: string
          phone: string
          position: string
          preferred_name: string
          required_credentials: Database["public"]["Enums"]["credential_kind"][]
          staff_number: number
          start_date: string | null
          status: Database["public"]["Enums"]["staff_status"]
          trading_name: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          abn?: string
          address?: string
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_address?: string
          emergency_alt_phone?: string
          emergency_email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relationship?: string
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string
          gender?: Database["public"]["Enums"]["person_gender"] | null
          id?: string
          last_name?: string
          nationality?: string
          phone?: string
          position?: string
          preferred_name?: string
          required_credentials?: Database["public"]["Enums"]["credential_kind"][]
          staff_number?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          trading_name?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          abn?: string
          address?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_address?: string
          emergency_alt_phone?: string
          emergency_email?: string
          emergency_name?: string
          emergency_phone?: string
          emergency_relationship?: string
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string
          gender?: Database["public"]["Enums"]["person_gender"] | null
          id?: string
          last_name?: string
          nationality?: string
          phone?: string
          position?: string
          preferred_name?: string
          required_credentials?: Database["public"]["Enums"]["credential_kind"][]
          staff_number?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["staff_status"]
          trading_name?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          ends_at: string
          staff_id: string
          starts_at: string
          weekday: number
          workspace_id: string
        }
        Insert: {
          ends_at: string
          staff_id: string
          starts_at: string
          weekday: number
          workspace_id: string
        }
        Update: {
          ends_at?: string
          staff_id?: string
          starts_at?: string
          weekday?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_availability_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_credentials: {
        Row: {
          created_at: string
          expires_on: string | null
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["credential_kind"]
          reference: string
          review: Database["public"]["Enums"]["document_review"]
          staff_id: string
          storage_path: string | null
          valid_from: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          file_name?: string
          id?: string
          kind: Database["public"]["Enums"]["credential_kind"]
          reference?: string
          review?: Database["public"]["Enums"]["document_review"]
          staff_id: string
          storage_path?: string | null
          valid_from?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["credential_kind"]
          reference?: string
          review?: Database["public"]["Enums"]["document_review"]
          staff_id?: string
          storage_path?: string | null
          valid_from?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_credentials_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_finance: {
        Row: {
          additional_cost_centres: string
          bank_account_number: string
          bank_bsb: string
          contract_type: string
          employee_code: string
          employing_entity: string
          fte_hours: number | null
          job_title: string
          location: string
          max_daily_hours: number | null
          primary_cost_centre: string
          staff_id: string
          super_fund: string
          super_member_number: string
          tax_file_number: string
          updated_at: string
          weekly_hours: number | null
          workspace_id: string
        }
        Insert: {
          additional_cost_centres?: string
          bank_account_number?: string
          bank_bsb?: string
          contract_type?: string
          employee_code?: string
          employing_entity?: string
          fte_hours?: number | null
          job_title?: string
          location?: string
          max_daily_hours?: number | null
          primary_cost_centre?: string
          staff_id: string
          super_fund?: string
          super_member_number?: string
          tax_file_number?: string
          updated_at?: string
          weekly_hours?: number | null
          workspace_id: string
        }
        Update: {
          additional_cost_centres?: string
          bank_account_number?: string
          bank_bsb?: string
          contract_type?: string
          employee_code?: string
          employing_entity?: string
          fte_hours?: number | null
          job_title?: string
          location?: string
          max_daily_hours?: number | null
          primary_cost_centre?: string
          staff_id?: string
          super_fund?: string
          super_member_number?: string
          tax_file_number?: string
          updated_at?: string
          weekly_hours?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_finance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_finance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leave: {
        Row: {
          created_at: string
          decided_at: string | null
          ends_on: string
          id: string
          kind: Database["public"]["Enums"]["leave_kind"]
          reason: string
          staff_id: string
          starts_on: string
          status: Database["public"]["Enums"]["leave_status"]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          ends_on: string
          id?: string
          kind: Database["public"]["Enums"]["leave_kind"]
          reason?: string
          staff_id: string
          starts_on: string
          status?: Database["public"]["Enums"]["leave_status"]
          workspace_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          ends_on?: string
          id?: string
          kind?: Database["public"]["Enums"]["leave_kind"]
          reason?: string
          staff_id?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["leave_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          company_id: string | null
          contact_id: string | null
          id: string
          product_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          workspace_id: string
        }
        Insert: {
          canceled_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          id?: string
          product_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          workspace_id: string
        }
        Update: {
          canceled_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          id?: string
          product_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          company_id: string | null
          contact_id: string | null
          created_at: string
          description: string
          entry_date: string
          hourly_rate_cents: number
          id: string
          invoice_id: string | null
          member_name: string
          minutes: number
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          billable?: boolean
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          description: string
          entry_date?: string
          hourly_rate_cents?: number
          id?: string
          invoice_id?: string | null
          member_name?: string
          minutes: number
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          billable?: boolean
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string
          entry_date?: string
          hourly_rate_cents?: number
          id?: string
          invoice_id?: string | null
          member_name?: string
          minutes?: number
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "time_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number
          check_in_accuracy_m: number | null
          check_in_distance_m: number | null
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_reason: string
          check_out_distance_m: number | null
          check_out_latitude: number | null
          check_out_longitude: number | null
          checked_in_at: string | null
          checked_out_at: string | null
          contact_id: string | null
          created_at: string
          ends_at: string
          id: string
          km: number
          late_alerted_at: string | null
          notes: string
          payroll_export_id: string | null
          shift_id: string | null
          staff_id: string
          starts_at: string
          status: Database["public"]["Enums"]["timesheet_status"]
          synced: boolean
          work_date: string
          worked_minutes: number | null
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number
          check_in_accuracy_m?: number | null
          check_in_distance_m?: number | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_reason?: string
          check_out_distance_m?: number | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          contact_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          km?: number
          late_alerted_at?: string | null
          notes?: string
          payroll_export_id?: string | null
          shift_id?: string | null
          staff_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          synced?: boolean
          work_date: string
          worked_minutes?: number | null
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number
          check_in_accuracy_m?: number | null
          check_in_distance_m?: number | null
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_reason?: string
          check_out_distance_m?: number | null
          check_out_latitude?: number | null
          check_out_longitude?: number | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          contact_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          km?: number
          late_alerted_at?: string | null
          notes?: string
          payroll_export_id?: string | null
          shift_id?: string | null
          staff_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          synced?: boolean
          work_date?: string
          worked_minutes?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "client_payers"
            referencedColumns: ["workspace_id", "contact_id"]
          },
          {
            foreignKeyName: "timesheet_entries_workspace_id_contact_id_fkey"
            columns: ["workspace_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "timesheet_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_workspace_id_payroll_export_id_fkey"
            columns: ["workspace_id", "payroll_export_id"]
            isOneToOne: false
            referencedRelation: "payroll_exports"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "timesheet_entries_workspace_id_shift_id_fkey"
            columns: ["workspace_id", "shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "timesheet_entries_workspace_id_staff_id_fkey"
            columns: ["workspace_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      timesheet_unlocks: {
        Row: {
          actor_id: string | null
          actor_name: string
          created_at: string
          entry_count: number
          id: string
          payroll_export_id: string
          reason: string
          staff_id: string | null
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entry_count: number
          id?: string
          payroll_export_id: string
          reason: string
          staff_id?: string | null
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entry_count?: number
          id?: string
          payroll_export_id?: string
          reason?: string
          staff_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_unlocks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_unlocks_workspace_id_payroll_export_id_fkey"
            columns: ["workspace_id", "payroll_export_id"]
            isOneToOne: false
            referencedRelation: "payroll_exports"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      travel_claims: {
        Row: {
          billable_id: string | null
          charge_client: boolean
          contact_id: string | null
          created_at: string
          description: string
          destination: string
          distance_km: number
          id: string
          kind: Database["public"]["Enums"]["travel_claim_kind"]
          shift_id: string | null
          staff_id: string
          status: Database["public"]["Enums"]["travel_claim_status"]
          timesheet_entry_id: string | null
          travel_date: string
          workspace_id: string
        }
        Insert: {
          billable_id?: string | null
          charge_client?: boolean
          contact_id?: string | null
          created_at?: string
          description?: string
          destination?: string
          distance_km: number
          id?: string
          kind?: Database["public"]["Enums"]["travel_claim_kind"]
          shift_id?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["travel_claim_status"]
          timesheet_entry_id?: string | null
          travel_date: string
          workspace_id: string
        }
        Update: {
          billable_id?: string | null
          charge_client?: boolean
          contact_id?: string | null
          created_at?: string
          description?: string
          destination?: string
          distance_km?: number
          id?: string
          kind?: Database["public"]["Enums"]["travel_claim_kind"]
          shift_id?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["travel_claim_status"]
          timesheet_entry_id?: string | null
          travel_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_claims_billable_id_fkey"
            columns: ["billable_id"]
            isOneToOne: false
            referencedRelation: "billables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_claims_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_claims_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_claims_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_registration_groups: {
        Row: {
          created_at: string
          group_code: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          group_code: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          group_code?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_registration_groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          display_name: string
          email: string
          email_documents: boolean
          email_messages: boolean
          email_payments: boolean
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          email_documents?: boolean
          email_messages?: boolean
          email_payments?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          email_documents?: boolean
          email_messages?: boolean
          email_payments?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          assistant_enabled: boolean
          assistant_instructions: string
          brand_color: string
          companies_enabled: boolean
          contact_email_contracts: boolean
          contact_email_forms: boolean
          contact_email_invoices: boolean
          contact_email_messages: boolean
          contact_link_sign_in: boolean
          country: string
          created_at: string
          currency: string
          custom_domain: string | null
          custom_domain_added_at: string | null
          getting_started_dismissed: boolean
          id: string
          legal_name: string
          logo_path: string | null
          name: string
          portal_banner_path: string | null
          portal_home_body: string
          portal_home_show_apps: boolean
          portal_home_show_tasks: boolean
          portal_home_title: string
          portal_sidebar_color: string
          slug: string
          store_description: string
          store_enabled: boolean
          store_title: string
          timezone: string
          welcome_message: string
        }
        Insert: {
          assistant_enabled?: boolean
          assistant_instructions?: string
          brand_color?: string
          companies_enabled?: boolean
          contact_email_contracts?: boolean
          contact_email_forms?: boolean
          contact_email_invoices?: boolean
          contact_email_messages?: boolean
          contact_link_sign_in?: boolean
          country?: string
          created_at?: string
          currency?: string
          custom_domain?: string | null
          custom_domain_added_at?: string | null
          getting_started_dismissed?: boolean
          id?: string
          legal_name?: string
          logo_path?: string | null
          name: string
          portal_banner_path?: string | null
          portal_home_body?: string
          portal_home_show_apps?: boolean
          portal_home_show_tasks?: boolean
          portal_home_title?: string
          portal_sidebar_color?: string
          slug: string
          store_description?: string
          store_enabled?: boolean
          store_title?: string
          timezone?: string
          welcome_message?: string
        }
        Update: {
          assistant_enabled?: boolean
          assistant_instructions?: string
          brand_color?: string
          companies_enabled?: boolean
          contact_email_contracts?: boolean
          contact_email_forms?: boolean
          contact_email_invoices?: boolean
          contact_email_messages?: boolean
          contact_link_sign_in?: boolean
          country?: string
          created_at?: string
          currency?: string
          custom_domain?: string | null
          custom_domain_added_at?: string | null
          getting_started_dismissed?: boolean
          id?: string
          legal_name?: string
          logo_path?: string | null
          name?: string
          portal_banner_path?: string | null
          portal_home_body?: string
          portal_home_show_apps?: boolean
          portal_home_show_tasks?: boolean
          portal_home_title?: string
          portal_sidebar_color?: string
          slug?: string
          store_description?: string
          store_enabled?: boolean
          store_title?: string
          timezone?: string
          welcome_message?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_payers: {
        Row: {
          contact_id: string | null
          ndis_number: string | null
          payer: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: { Args: { token: string }; Returns: string }
      assign_shift_staff: {
        Args: { target: string; worker: string }
        Returns: undefined
      }
      cancel_shift: {
        Args: {
          charge_client: boolean
          pay_staff: boolean
          reason: Database["public"]["Enums"]["cancellation_reason"]
          target: string
        }
        Returns: undefined
      }
      check_in_shift: {
        Args: {
          accuracy: number
          entry: string
          lat: number
          lng: number
          reason: string
        }
        Returns: number
      }
      check_out_shift: {
        Args: { entry: string; lat: number; lng: number; note: string }
        Returns: number
      }
      import_price_guide: { Args: { items: Json; ws: string }; Returns: number }
      list_shift_publish_reasons: {
        Args: { ids: string[]; ws: string }
        Returns: {
          reason: string
          shift_id: string
        }[]
      }
      save_shift_support_note: {
        Args: { note: string; target: string }
        Returns: undefined
      }
      complete_billable_task: {
        Args: { billable: boolean; target: string }
        Returns: string
      }
      complete_shift: { Args: { target: string }; Returns: undefined }
      convert_pending_billables: { Args: { ids: string[] }; Returns: number }
      create_claim: {
        Args: { period_from: string; period_to: string; ws: string }
        Returns: string
      }
      create_workspace: {
        Args: { member_name: string; workspace_name: string }
        Returns: string
      }
      delete_shift: { Args: { target: string }; Returns: undefined }
      duplicate_shift: { Args: { target: string }; Returns: string }
      extend_shift: {
        Args: { ends: string; target: string }
        Returns: undefined
      }
      invite_preview: {
        Args: { token: string }
        Returns: {
          brand_color: string
          email: string
          kind: string
          link_sign_in: boolean
          logo_path: string
          state: string
          workspace_name: string
        }[]
      }
      invoice_billables: {
        Args: {
          contact_ids: string[]
          due: string
          range_from: string
          range_to: string
          ws: string
        }
        Returns: {
          created_invoice: string
          invoiced_contact: string
        }[]
      }
      lock_timesheets: {
        Args: {
          period_from: string
          period_to: string
          worker: string
          ws: string
        }
        Returns: string
      }
      mark_claim_exported: { Args: { target: string }; Returns: undefined }
      move_shift: {
        Args: {
          reassign: boolean
          starts: string
          target: string
          worker: string
        }
        Returns: undefined
      }
      payment_link: { Args: { link_id: string }; Returns: Json }
      portal_add_file: {
        Args: {
          item_kind: string
          item_name: string
          item_size?: number
          item_type?: string
          object_path?: string
          parent?: string
          target_channel: string
        }
        Returns: string
      }
      portal_send_message: {
        Args: { message_body: string; target_channel: string }
        Returns: string
      }
      portal_sign_contract: {
        Args: { signer_name: string; target_contract: string }
        Returns: undefined
      }
      portal_submit_form: {
        Args: { submitted: Json; target_request: string }
        Returns: undefined
      }
      publish_shifts: {
        Args: { range_end: string; range_start: string; ws: string }
        Returns: number
      }
      reconcile_shift_billables: { Args: { ws: string }; Returns: number }
      reopen_billable_task: { Args: { target: string }; Returns: undefined }
      reopen_shift: { Args: { target: string }; Returns: undefined }
      restore_shift: { Args: { target: string }; Returns: undefined }
      save_client_group: {
        Args: { clients: Json; group_name: string; ws: string }
        Returns: string
      }
      save_shift: {
        Args: {
          break_mins: number
          clients: Json
          ends: string
          is_broken?: boolean
          is_sleepover?: boolean
          lat?: number
          lng?: number
          repeat_every?: string
          repeat_until?: string
          shift_address: string
          shift_notes: string
          shift_site?: string
          staff_ids: string[]
          starts: string
          target: string
          ws: string
        }
        Returns: string
      }
      save_sleepover_hours: {
        Args: { ends: string; notes: string; starts: string; target: string }
        Returns: string
      }
      save_travel_claim: {
        Args: {
          charge: boolean
          claim_kind: Database["public"]["Enums"]["travel_claim_kind"]
          client: string | null
          dest: string
          km: number
          notes: string
          shift: string | null
          travel_on: string
          worker: string
          ws: string
        }
        Returns: string
      }
      set_claim_entries: {
        Args: { billable_ids: string[]; include: boolean; target: string }
        Returns: undefined
      }
      set_shift_published: {
        Args: { publish: boolean; target: string }
        Returns: undefined
      }
      storefront: { Args: { store_slug: string }; Returns: Json }
      sync_claim: { Args: { target: string }; Returns: number }
      take_shift: { Args: { target: string }; Returns: undefined }
      unlock_timesheets: {
        Args: { export_id: string; unlock_reason: string; worker: string }
        Returns: number
      }
      update_timesheet_entry: {
        Args: {
          break_mins: number
          ends: string
          entry_notes: string
          starts: string
          target: string
          travel_km: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_builder_role: "user" | "assistant"
      assessment_type:
        | "home"
        | "risk"
        | "mobility"
        | "falls"
        | "clinical"
        | "general"
      billable_kind:
        | "service"
        | "travel"
        | "cancellation"
        | "expense"
        | "manual"
        | "task"
      billable_status:
        | "pending"
        | "unbilled"
        | "invoiced"
        | "claimed"
        | "exported"
        | "paid"
        | "void"
      billable_task_status: "outstanding" | "done" | "non_billable"
      billing_unit: "hour" | "each" | "km"
      cancellation_reason: "NSDH" | "NSDF" | "NSDT" | "NSDO"
      claim_payment_status: "unpaid" | "paid"
      claim_type: "CANC" | "REPW" | "TRAN" | "NF2F" | "THLT" | "IRSS"
      client_contact_kind:
        | "contact"
        | "health_professional"
        | "roster_recipient"
      client_status:
        | "pending"
        | "active"
        | "on_leave"
        | "hospital_leave"
        | "respite_leave"
        | "inactive"
        | "terminated"
        | "deceased"
        | "archived"
      company_document_status: "draft" | "current" | "archived"
      contact_status: "not_invited" | "invited" | "active"
      contract_status: "awaiting_signature" | "signed" | "declined"
      credential_kind:
        | "identification"
        | "ndis_worker_screening"
        | "working_with_children"
        | "police_check"
        | "first_aid"
        | "cpr"
        | "drivers_licence"
        | "car_insurance"
        | "vehicle_registration"
        | "qualification"
        | "employment_contract"
        | "other"
      custom_field_type: "text" | "number" | "date" | "url" | "email" | "phone"
      document_folder: "general" | "assessment" | "secure"
      document_review: "pending" | "approved" | "declined"
      employment_type: "full_time" | "part_time" | "casual" | "contractor"
      form_request_status: "pending" | "completed"
      funding_type: "ndis" | "home_care_package" | "support_at_home" | "private"
      goal_status: "not_started" | "in_progress" | "achieved"
      gst_code: "P1" | "P2" | "P5"
      invoice_status: "draft" | "open" | "paid" | "void"
      incident_priority: "low" | "medium" | "high" | "urgent"
      incident_severity: "minor" | "moderate" | "major" | "critical"
      incident_status:
        | "triage"
        | "open"
        | "resolving"
        | "on_hold"
        | "resolved"
        | "not_an_incident"
        | "archived"
      leave_kind: "annual" | "personal" | "sick"
      leave_status: "pending" | "accepted" | "rejected"
      member_role: "owner" | "admin" | "member"
      observation_kind: "caution" | "incident"
      observation_severity: "low" | "medium" | "high" | "critical"
      order_status: "pending" | "paid" | "expired"
      person_gender:
        | "male"
        | "female"
        | "non_binary"
        | "other"
        | "prefer_not_to_say"
      plan_management: "ndia_managed" | "plan_managed" | "self_managed"
      policy_kind: "policy" | "procedure"
      professional_type:
        | "general_practitioner"
        | "specialist"
        | "case_manager"
        | "therapist"
      shift_status: "unpublished" | "published" | "completed" | "cancelled"
      site_staff_role: "support" | "admin"
      site_status: "active" | "inactive"
      staff_preference: "preferred" | "excluded"
      staff_status: "onboarding" | "active" | "inactive"
      subscription_status: "active" | "canceled"
      timesheet_status: "draft" | "approved" | "locked"
      travel_claim_kind: "between" | "to_from" | "community"
      travel_claim_status: "draft" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_builder_role: ["user", "assistant"],
      assessment_type: [
        "home",
        "risk",
        "mobility",
        "falls",
        "clinical",
        "general",
      ],
      billable_kind: [
        "service",
        "travel",
        "cancellation",
        "expense",
        "manual",
        "task",
      ],
      billable_status: [
        "pending",
        "unbilled",
        "invoiced",
        "claimed",
        "exported",
        "paid",
        "void",
      ],
      billable_task_status: ["outstanding", "done", "non_billable"],
      billing_unit: ["hour", "each", "km"],
      cancellation_reason: ["NSDH", "NSDF", "NSDT", "NSDO"],
      claim_payment_status: ["unpaid", "paid"],
      claim_type: ["CANC", "REPW", "TRAN", "NF2F", "THLT", "IRSS"],
      client_contact_kind: [
        "contact",
        "health_professional",
        "roster_recipient",
      ],
      client_status: [
        "pending",
        "active",
        "on_leave",
        "hospital_leave",
        "respite_leave",
        "inactive",
        "terminated",
        "deceased",
        "archived",
      ],
      company_document_status: ["draft", "current", "archived"],
      contact_status: ["not_invited", "invited", "active"],
      contract_status: ["awaiting_signature", "signed", "declined"],
      credential_kind: [
        "identification",
        "ndis_worker_screening",
        "working_with_children",
        "police_check",
        "first_aid",
        "cpr",
        "drivers_licence",
        "car_insurance",
        "vehicle_registration",
        "qualification",
        "employment_contract",
        "other",
      ],
      custom_field_type: ["text", "number", "date", "url", "email", "phone"],
      document_folder: ["general", "assessment", "secure"],
      document_review: ["pending", "approved", "declined"],
      employment_type: ["full_time", "part_time", "casual", "contractor"],
      form_request_status: ["pending", "completed"],
      funding_type: ["ndis", "home_care_package", "support_at_home", "private"],
      goal_status: ["not_started", "in_progress", "achieved"],
      gst_code: ["P1", "P2", "P5"],
      invoice_status: ["draft", "open", "paid", "void"],
      incident_priority: ["low", "medium", "high", "urgent"],
      incident_severity: ["minor", "moderate", "major", "critical"],
      incident_status: [
        "triage",
        "open",
        "resolving",
        "on_hold",
        "resolved",
        "not_an_incident",
        "archived",
      ],
      leave_kind: ["annual", "personal", "sick"],
      leave_status: ["pending", "accepted", "rejected"],
      member_role: ["owner", "admin", "member"],
      observation_kind: ["caution", "incident"],
      observation_severity: ["low", "medium", "high", "critical"],
      order_status: ["pending", "paid", "expired"],
      person_gender: [
        "male",
        "female",
        "non_binary",
        "other",
        "prefer_not_to_say",
      ],
      plan_management: ["ndia_managed", "plan_managed", "self_managed"],
      policy_kind: ["policy", "procedure"],
      professional_type: [
        "general_practitioner",
        "specialist",
        "case_manager",
        "therapist",
      ],
      shift_status: ["unpublished", "published", "completed", "cancelled"],
      site_staff_role: ["support", "admin"],
      site_status: ["active", "inactive"],
      staff_preference: ["preferred", "excluded"],
      staff_status: ["onboarding", "active", "inactive"],
      subscription_status: ["active", "canceled"],
      timesheet_status: ["draft", "approved", "locked"],
    },
  },
} as const
