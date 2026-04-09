export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          calendar_connection_id: string | null
          calendar_event_id: string | null
          calendar_provider: string | null
          client_email: string
          client_name: string
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          response_id: string | null
          start_time: string
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_connection_id?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          client_email: string
          client_name: string
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          response_id?: string | null
          start_time: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_connection_id?: string | null
          calendar_event_id?: string | null
          calendar_provider?: string | null
          client_email?: string
          client_name?: string
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          response_id?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lawyer_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: Json
          cover_image_url: string | null
          created_at: string
          estimated_reading_time: number | null
          excerpt: string | null
          html_body: string | null
          id: string
          is_published: boolean
          preview_token: string | null
          published_at: string | null
          seo_metadata: Json | null
          slug: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          estimated_reading_time?: number | null
          excerpt?: string | null
          html_body?: string | null
          id?: string
          is_published?: boolean
          preview_token?: string | null
          published_at?: string | null
          seo_metadata?: Json | null
          slug: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          estimated_reading_time?: number | null
          excerpt?: string | null
          html_body?: string | null
          id?: string
          is_published?: boolean
          preview_token?: string | null
          published_at?: string | null
          seo_metadata?: Json | null
          slug?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          account_identifier: string | null
          calendar_url: string | null
          created_at: string
          credentials_encrypted: string
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          last_verified_at: string | null
          provider: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_identifier?: string | null
          calendar_url?: string | null
          created_at?: string
          credentials_encrypted: string
          display_name: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_verified_at?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_identifier?: string | null
          calendar_url?: string | null
          created_at?: string
          credentials_encrypted?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          last_verified_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_settings: {
        Row: {
          buffer_minutes: number
          created_at: string | null
          id: string
          slot_duration_minutes: number
          updated_at: string | null
          user_id: string
          work_end_hour: number
          work_start_hour: number
        }
        Insert: {
          buffer_minutes?: number
          created_at?: string | null
          id?: string
          slot_duration_minutes?: number
          updated_at?: string | null
          user_id: string
          work_end_hour?: number
          work_start_hour?: number
        }
        Update: {
          buffer_minutes?: number
          created_at?: string | null
          id?: string
          slot_duration_minutes?: number
          updated_at?: string | null
          user_id?: string
          work_end_hour?: number
          work_start_hour?: number
        }
        Relationships: [
          {
            foreignKeyName: "calendar_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      docforge_activations: {
        Row: {
          activated_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          license_id: string
          machine_id: string
          machine_name: string | null
        }
        Insert: {
          activated_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          license_id: string
          machine_id: string
          machine_name?: string | null
        }
        Update: {
          activated_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          license_id?: string
          machine_id?: string
          machine_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docforge_activations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "docforge_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      docforge_licenses: {
        Row: {
          client_name: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          grace_days: number
          id: string
          is_active: boolean | null
          key: string
          max_seats: number
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          grace_days?: number
          id?: string
          is_active?: boolean | null
          key: string
          max_seats?: number
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          grace_days?: number
          id?: string
          is_active?: boolean | null
          key?: string
          max_seats?: number
        }
        Relationships: []
      }
      email_configs: {
        Row: {
          api_key: string
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          is_active: boolean
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks: Json
          created_at: string
          html_body: string | null
          id: string
          is_active: boolean
          name: string | null
          subject: string
          template_variables: Json | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          subject?: string
          template_variables?: Json | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          html_body?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          subject?: string
          template_variables?: Json | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          is_published: boolean
          seo_metadata: Json | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          seo_metadata?: Json | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          seo_metadata?: Json | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string
          folder_id: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          s3_key: string | null
          size_bytes: number | null
          tenant_id: string
          thumbnail_url: string | null
          type: string
          updated_at: string
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          s3_key?: string | null
          size_bytes?: number | null
          tenant_id: string
          thumbnail_url?: string | null
          type: string
          updated_at?: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          s3_key?: string | null
          size_bytes?: number | null
          tenant_id?: string
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          blocks: Json
          created_at: string
          html_body: string | null
          id: string
          is_published: boolean
          page_type: string
          seo_metadata: Json | null
          slug: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          html_body?: string | null
          id?: string
          is_published?: boolean
          page_type?: string
          seo_metadata?: Json | null
          slug: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          html_body?: string | null
          id?: string
          is_published?: boolean
          page_type?: string
          seo_metadata?: Json | null
          slug?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          ai_qualification: Json | null
          answers: Json
          created_at: string | null
          id: string
          internal_notes: string | null
          status: string | null
          status_changed_at: string | null
          survey_link_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ai_qualification?: Json | null
          answers: Json
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          status?: string | null
          status_changed_at?: string | null
          survey_link_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ai_qualification?: Json | null
          answers?: Json
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          status?: string | null
          status_changed_at?: string | null
          survey_link_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_survey_link_id_fkey"
            columns: ["survey_link_id"]
            isOneToOne: false
            referencedRelation: "survey_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_marketplace_connections: {
        Row: {
          access_token_encrypted: string
          account_id: string | null
          account_name: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          marketplace: string
          refresh_token_encrypted: string | null
          scopes: string[] | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          marketplace: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          marketplace?: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_marketplace_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_marketplace_imports: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          error_log: Json | null
          id: string
          imported_items: number
          marketplace: string
          skipped_items: number
          started_at: string | null
          status: string
          tenant_id: string
          total_items: number | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_log?: Json | null
          id?: string
          imported_items?: number
          marketplace: string
          skipped_items?: number
          started_at?: string | null
          status?: string
          tenant_id: string
          total_items?: number | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_log?: Json | null
          id?: string
          imported_items?: number
          marketplace?: string
          skipped_items?: number
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_marketplace_imports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "shop_marketplace_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_marketplace_imports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "shop_marketplace_connections_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_marketplace_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_marketplace_listings: {
        Row: {
          connection_id: string
          created_at: string
          expires_at: string | null
          external_listing_id: string | null
          external_url: string | null
          id: string
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          marketplace: string
          marketplace_category_id: string | null
          marketplace_location: Json | null
          marketplace_params: Json | null
          product_id: string
          published_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          expires_at?: string | null
          external_listing_id?: string | null
          external_url?: string | null
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          marketplace: string
          marketplace_category_id?: string | null
          marketplace_location?: Json | null
          marketplace_params?: Json | null
          product_id: string
          published_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          expires_at?: string | null
          external_listing_id?: string | null
          external_url?: string | null
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          marketplace?: string
          marketplace_category_id?: string | null
          marketplace_location?: Json | null
          marketplace_params?: Json | null
          product_id?: string
          published_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_marketplace_listings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "shop_marketplace_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_marketplace_listings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "shop_marketplace_connections_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_marketplace_listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_marketplace_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: Json | null
          digital_file_name: string | null
          digital_file_size: number | null
          digital_file_url: string | null
          display_layout: string
          external_url: string | null
          html_body: string | null
          id: string
          images: Json | null
          is_featured: boolean
          is_published: boolean
          listing_type: Database["public"]["Enums"]["listing_type"]
          price: number | null
          published_at: string | null
          seo_metadata: Json | null
          short_description: string | null
          slug: string
          sort_order: number
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: Json | null
          digital_file_name?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          display_layout?: string
          external_url?: string | null
          html_body?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          is_published?: boolean
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          published_at?: string | null
          seo_metadata?: Json | null
          short_description?: string | null
          slug: string
          sort_order?: number
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: Json | null
          digital_file_name?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          display_layout?: string
          external_url?: string | null
          html_body?: string | null
          id?: string
          images?: Json | null
          is_featured?: boolean
          is_published?: boolean
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price?: number | null
          published_at?: string | null
          seo_metadata?: Json | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          default_keywords: string[] | null
          default_og_image_url: string | null
          google_site_verification: string | null
          id: string
          logo_url: string | null
          organization_name: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_twitter: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_keywords?: string[] | null
          default_og_image_url?: string | null
          google_site_verification?: string | null
          id?: string
          logo_url?: string | null
          organization_name?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_keywords?: string[] | null
          default_og_image_url?: string | null
          google_site_verification?: string | null
          id?: string
          logo_url?: string | null
          organization_name?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_twitter?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_links: {
        Row: {
          calendar_connection_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_submissions: number | null
          notification_email: string
          submission_count: number | null
          survey_id: string
          token: string
        }
        Insert: {
          calendar_connection_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_submissions?: number | null
          notification_email: string
          submission_count?: number | null
          survey_id: string
          token: string
        }
        Update: {
          calendar_connection_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_submissions?: number | null
          notification_email?: string
          submission_count?: number | null
          survey_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_links_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_links_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_links_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          questions: Json
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          questions?: Json
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          questions?: Json
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          domain: string
          domain_type: string
          id: string
          is_primary: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          domain: string | null
          email: string
          enabled_features: Json
          id: string
          name: string
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain?: string | null
          email: string
          enabled_features?: Json
          id?: string
          name: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string | null
          email?: string
          enabled_features?: Json
          id?: string
          name?: string
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "tenant_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          role: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          role?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          role?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          condition_branch: string | null
          created_at: string
          id: string
          sort_order: number
          source_step_id: string
          target_step_id: string
          workflow_id: string
        }
        Insert: {
          condition_branch?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          source_step_id: string
          target_step_id: string
          workflow_id: string
        }
        Update: {
          condition_branch?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          source_step_id?: string
          target_step_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_step_id_fkey"
            columns: ["source_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_step_id_fkey"
            columns: ["target_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          tenant_id: string
          trigger_payload: Json
          triggering_execution_id: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          tenant_id: string
          trigger_payload?: Json
          triggering_execution_id?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          trigger_payload?: Json
          triggering_execution_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_triggering_execution_id_fkey"
            columns: ["triggering_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          input_payload: Json | null
          output_payload: Json | null
          resume_at: string | null
          started_at: string | null
          status: string
          step_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          input_payload?: Json | null
          output_payload?: Json | null
          resume_at?: string | null
          started_at?: string | null
          status?: string
          step_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          input_payload?: Json | null
          output_payload?: Json | null
          resume_at?: string | null
          started_at?: string | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_step_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          created_at: string
          id: string
          position_x: number
          position_y: number
          step_config: Json
          step_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_x?: number
          position_y?: number
          step_config?: Json
          step_type: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_x?: number
          position_y?: number
          step_config?: Json
          step_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      calendar_connections_decrypted: {
        Row: {
          account_identifier: string | null
          calendar_url: string | null
          created_at: string | null
          credentials: Json | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          last_verified_at: string | null
          provider: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_identifier?: string | null
          calendar_url?: string | null
          created_at?: string | null
          credentials?: never
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_verified_at?: string | null
          provider?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_identifier?: string | null
          calendar_url?: string | null
          created_at?: string | null
          credentials?: never
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_verified_at?: string | null
          provider?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_marketplace_connections_decrypted: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          last_synced_at: string | null
          marketplace: string | null
          refresh_token: string | null
          scopes: string[] | null
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: never
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          marketplace?: string | null
          refresh_token?: never
          scopes?: string[] | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: never
          account_id?: string | null
          account_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          last_synced_at?: string | null
          marketplace?: string | null
          refresh_token?: never
          scopes?: string[] | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_marketplace_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_due_delay_steps: {
        Args: { p_limit?: number }
        Returns: {
          execution_id: string
          id: string
        }[]
      }
      current_user_role: { Args: never; Returns: string }
      current_user_tenant_id: { Args: never; Returns: string }
      get_encryption_key: { Args: never; Returns: string }
      increment_submission_count: {
        Args: { link_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      update_calendar_credentials: {
        Args: { p_connection_id: string; p_credentials_json: string }
        Returns: undefined
      }
      update_marketplace_tokens: {
        Args: {
          p_access_token: string
          p_connection_id: string
          p_refresh_token: string
          p_token_expires_at: string
        }
        Returns: undefined
      }
      upsert_calendar_connection: {
        Args: {
          p_account_identifier?: string
          p_calendar_url?: string
          p_credentials_json?: string
          p_display_name?: string
          p_is_default?: boolean
          p_provider?: string
          p_tenant_id: string
          p_user_id?: string
        }
        Returns: string
      }
      upsert_marketplace_connection: {
        Args: {
          p_access_token: string
          p_account_id?: string
          p_account_name?: string
          p_display_name?: string
          p_marketplace: string
          p_refresh_token?: string
          p_scopes?: string[]
          p_tenant_id: string
          p_token_expires_at?: string
        }
        Returns: string
      }
      verify_docforge_license: {
        Args: { p_license_key: string; p_machine_id: string }
        Returns: Json
      }
    }
    Enums: {
      listing_type: "external_link" | "digital_download"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search:
        | {
            Args: {
              bucketname: string
              levels?: number
              limits?: number
              offsets?: number
              prefix: string
            }
            Returns: {
              created_at: string
              id: string
              last_accessed_at: string
              metadata: Json
              name: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              bucketname: string
              levels?: number
              limits?: number
              offsets?: number
              prefix: string
              search?: string
              sortcolumn?: string
              sortorder?: string
            }
            Returns: {
              created_at: string
              id: string
              last_accessed_at: string
              metadata: Json
              name: string
              updated_at: string
            }[]
          }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      listing_type: ["external_link", "digital_download"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

