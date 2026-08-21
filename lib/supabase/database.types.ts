export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Generated-compatible snapshot of the vertical-MVP migration. Regenerate it
// from the dedicated Veya project after that migration is applied.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          public_name: string;
          country: string | null;
          region: string | null;
          languages: string[];
          introduction: string | null;
          travel_interests: string[];
          preferred_environments: string[];
          travel_styles: string[];
          travel_goals: string | null;
          social_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          public_name: string;
          country?: string | null;
          region?: string | null;
          languages?: string[];
          introduction?: string | null;
          travel_interests?: string[];
          preferred_environments?: string[];
          travel_styles?: string[];
          travel_goals?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          public_name?: string;
          country?: string | null;
          region?: string | null;
          languages?: string[];
          introduction?: string | null;
          travel_interests?: string[];
          preferred_environments?: string[];
          travel_styles?: string[];
          travel_goals?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_items: {
        Row: {
          id: string;
          owner_id: string | null;
          kind: Database["public"]["Enums"]["content_kind"];
          status: Database["public"]["Enums"]["content_status"];
          slug: string;
          title_i18n: Json;
          summary_i18n: Json;
          location_name: string;
          latitude: number;
          longitude: number;
          travel_styles: string[];
          image_urls: string[];
          payload: Json;
          featured: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          kind: Database["public"]["Enums"]["content_kind"];
          status?: Database["public"]["Enums"]["content_status"];
          slug: string;
          title_i18n: Json;
          summary_i18n?: Json;
          location_name: string;
          latitude: number;
          longitude: number;
          travel_styles?: string[];
          image_urls?: string[];
          payload?: Json;
          featured?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          kind?: Database["public"]["Enums"]["content_kind"];
          status?: Database["public"]["Enums"]["content_status"];
          slug?: string;
          title_i18n?: Json;
          summary_i18n?: Json;
          location_name?: string;
          latitude?: number;
          longitude?: number;
          travel_styles?: string[];
          image_urls?: string[];
          payload?: Json;
          featured?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          content_item_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_item_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_item_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_items_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "content_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interest_requests: {
        Row: {
          id: string;
          user_id: string;
          content_item_id: string;
          idempotency_key: string;
          status: Database["public"]["Enums"]["interest_request_status"];
          contact_name: string;
          contact_email: string;
          message: string;
          consent_version: string;
          consented_at: string;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_item_id: string;
          idempotency_key: string;
          status?: Database["public"]["Enums"]["interest_request_status"];
          contact_name: string;
          contact_email: string;
          message: string;
          consent_version: string;
          consented_at?: string;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["interest_request_status"];
          admin_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interest_requests_content_item_id_fkey";
            columns: ["content_item_id"];
            isOneToOne: false;
            referencedRelation: "content_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interest_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_interest_request: {
        Args: {
          p_kind: Database["public"]["Enums"]["content_kind"];
          p_slug: string;
          p_message: string;
          p_submission_key: string;
          p_consent: boolean;
        };
        Returns: Array<{ request_id: string; was_duplicate: boolean }>;
      };
    };
    Enums: {
      content_kind: "place" | "journey" | "opportunity" | "creator";
      content_status: "draft" | "published" | "archived";
      interest_request_status: "new" | "contacted" | "closed";
    };
    CompositeTypes: Record<string, never>;
  };
};
