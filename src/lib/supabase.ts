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
          resubscribe_count: number;
          last_resubscribed_at: string | null;
          last_unsubscribed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          frequency: "2x" | "3x" | "5x";
          tz?: string;
          is_active?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
          resubscribe_count?: number;
          last_resubscribed_at?: string | null;
          last_unsubscribed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          frequency?: "2x" | "3x" | "5x";
          tz?: string;
          is_active?: boolean;
          unsubscribe_token?: string;
          created_at?: string;
          resubscribe_count?: number;
          last_resubscribed_at?: string | null;
          last_unsubscribed_at?: string | null;
        };
      };
      problems: {
        Row: {
          id: string;
          source: "boj" | "programmers" | "leetcode";
          title: string;
          url: string;
          difficulty: "easy" | "medium" | "hard";
          tags: string[];
          active: boolean;
          week?: number;
          problem_list_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source: "boj" | "programmers" | "leetcode";
          title: string;
          url: string;
          difficulty: "easy" | "medium" | "hard";
          tags?: string[];
          active?: boolean;
          week?: number;
          problem_list_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source?: "boj" | "programmers" | "leetcode";
          title?: string;
          url?: string;
          difficulty?: "easy" | "medium" | "hard";
          tags?: string[];
          active?: boolean;
          week?: number;
          problem_list_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          subscriber_id: string;
          send_date: string;
          problem_id: string;
          status: "queued" | "sent" | "failed";
          subscription_id: string | null;
          problem_list_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          send_date: string;
          problem_id: string;
          status?: "queued" | "sent" | "failed";
          subscription_id?: string | null;
          problem_list_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          send_date?: string;
          problem_id?: string;
          status?: "queued" | "sent" | "failed";
          subscription_id?: string | null;
          problem_list_id?: string | null;
          created_at?: string;
        };
      };
      subscriber_progress: {
        Row: {
          id: string;
          subscriber_id: string;
          current_problem_index: number;
          total_problems_sent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          current_problem_index?: number;
          total_problems_sent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          current_problem_index?: number;
          total_problems_sent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      problem_lists: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          subscriber_id: string;
          problem_list_id: string;
          frequency: "2x" | "3x" | "5x";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscriber_id: string;
          problem_list_id: string;
          frequency: "2x" | "3x" | "5x";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscriber_id?: string;
          problem_list_id?: string;
          frequency?: "2x" | "3x" | "5x";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_progress: {
        Row: {
          id: string;
          subscription_id: string;
          current_problem_index: number;
          total_problems_sent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          current_problem_index?: number;
          total_problems_sent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          current_problem_index?: number;
          total_problems_sent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
