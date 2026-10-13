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
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          label: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          label?: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          label?: string
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
          id: string
          legal_name: string
          logo_path: string | null
          name: string
          slug: string
          store_description: string
          store_enabled: boolean
          store_title: string
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
          id?: string
          legal_name?: string
          logo_path?: string | null
          name: string
          slug: string
          store_description?: string
          store_enabled?: boolean
          store_title?: string
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
          id?: string
          legal_name?: string
          logo_path?: string | null
          name?: string
          slug?: string
          store_description?: string
          store_enabled?: boolean
          store_title?: string
          welcome_message?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { token: string }; Returns: string }
      create_workspace: {
        Args: { member_name: string; workspace_name: string }
        Returns: string
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
      storefront: { Args: { store_slug: string }; Returns: Json }
    }
    Enums: {
      app_builder_role: "user" | "assistant"
      contact_status: "not_invited" | "invited" | "active"
      contract_status: "awaiting_signature" | "signed" | "declined"
      custom_field_type: "text" | "number" | "date" | "url" | "email" | "phone"
      form_request_status: "pending" | "completed"
      invoice_status: "draft" | "open" | "paid" | "void"
      member_role: "owner" | "admin" | "member"
      order_status: "pending" | "paid" | "expired"
      subscription_status: "active" | "canceled"
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
      contact_status: ["not_invited", "invited", "active"],
      contract_status: ["awaiting_signature", "signed", "declined"],
      custom_field_type: ["text", "number", "date", "url", "email", "phone"],
      form_request_status: ["pending", "completed"],
      invoice_status: ["draft", "open", "paid", "void"],
      member_role: ["owner", "admin", "member"],
      order_status: ["pending", "paid", "expired"],
      subscription_status: ["active", "canceled"],
    },
  },
} as const
