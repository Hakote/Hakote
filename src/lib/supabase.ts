import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type Database = {
  public: {
    Tables: {
      subscribers: {
        Row: {
          id: string;
          email: string;
          frequency: "2x" | "3x" | "5x";
          tz: string;
          is_active: boolean;
          unsubscribe_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          frequency: "2x" | "3x" | "5x";
          tz?: string;
          is_active?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          frequency?: "2x" | "3x" | "5x";
          tz?: string;
          is_active?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
        };
      };
      problems: {
        Row: {
          id: string;
          source: "boj" | "leetcode";
          title: string;
          url: string;
          difficulty: "easy" | "medium" | "hard";
          tags: string[];
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: "boj" | "leetcode";
          title: string;
          url: string;
          difficulty: "easy" | "medium" | "hard";
          tags?: string[];
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: "boj" | "leetcode";
          title?: string;
          url?: string;
          difficulty?: "easy" | "medium" | "hard";
          tags?: string[];
          active?: boolean;
          created_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          subscriber_id: string;
          send_date: string;
          problem_id: string;
          status: "queued" | "sent" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          send_date: string;
          problem_id: string;
          status?: "queued" | "sent" | "failed";
          created_at?: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          send_date?: string;
          problem_id?: string;
          status?: "queued" | "sent" | "failed";
          created_at?: string;
        };
      };
    };
  };
};
