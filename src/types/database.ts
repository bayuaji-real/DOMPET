export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WalletType = "bank" | "ewallet" | "cash" | "investasi" | "tabungan";
export type CategoryType = "income" | "expense";
export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "goal_deposit"
  | "goal_withdraw";
export type TransactionSource =
  | "manual"
  | "voice"
  | "receipt"
  | "recurring"
  | "payday";
export type GoalStatus = "aktif" | "tercapai" | "dibatalkan";
export type RecurringRule = "monthly" | "biweekly";

export interface Database {
  public: {
    Tables: {
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: WalletType;
          initial_balance: number;
          color: string | null;
          icon: string | null;
          is_archived: boolean;
          is_default: boolean;
          goal_id: string | null;
          sort_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          type: WalletType;
          initial_balance?: number;
          color?: string | null;
          icon?: string | null;
          is_archived?: boolean;
          is_default?: boolean;
          goal_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: WalletType;
          initial_balance?: number;
          color?: string | null;
          icon?: string | null;
          is_archived?: boolean;
          is_default?: boolean;
          goal_id?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: CategoryType;
          icon: string | null;
          color: string | null;
          is_default: boolean;
          sort_order: number;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          type: CategoryType;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: CategoryType;
          icon?: string | null;
          color?: string | null;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          initial_amount: number;
          deadline: string | null;
          storage_place: string | null;
          storage_wallet_id: string | null;
          planned_per_payday: number | null;
          priority: number;
          status: GoalStatus;
          is_emergency_fund: boolean;
          notes: string | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          target_amount: number;
          initial_amount?: number;
          deadline?: string | null;
          storage_place?: string | null;
          storage_wallet_id?: string | null;
          planned_per_payday?: number | null;
          priority?: number;
          status?: GoalStatus;
          is_emergency_fund?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          initial_amount?: number;
          deadline?: string | null;
          storage_place?: string | null;
          storage_wallet_id?: string | null;
          planned_per_payday?: number | null;
          priority?: number;
          status?: GoalStatus;
          is_emergency_fund?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          wallet_id: string;
          to_wallet_id: string | null;
          category_id: string | null;
          goal_id: string | null;
          date: string;
          note: string | null;
          merchant: string | null;
          source: TransactionSource;
          receipt_path: string | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: TransactionType;
          amount: number;
          wallet_id: string;
          to_wallet_id?: string | null;
          category_id?: string | null;
          goal_id?: string | null;
          date?: string;
          note?: string | null;
          merchant?: string | null;
          source?: TransactionSource;
          receipt_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          wallet_id?: string;
          to_wallet_id?: string | null;
          category_id?: string | null;
          goal_id?: string | null;
          date?: string;
          note?: string | null;
          merchant?: string | null;
          source?: TransactionSource;
          receipt_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          month: string;
          limit_amount: number;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category_id: string;
          month: string;
          limit_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          month?: string;
          limit_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          wallet_id: string;
          category_id: string | null;
          note: string | null;
          rule: RecurringRule;
          day_of_month: number;
          next_date: string;
          is_active: boolean;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: TransactionType;
          amount: number;
          wallet_id: string;
          category_id?: string | null;
          note?: string | null;
          rule?: RecurringRule;
          day_of_month: number;
          next_date: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          wallet_id?: string;
          category_id?: string | null;
          note?: string | null;
          rule?: RecurringRule;
          day_of_month?: number;
          next_date?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      payday_schedule: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          expected_amount: number;
          actual_amount: number | null;
          note: string | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date: string;
          expected_amount: number;
          actual_amount?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          expected_amount?: number;
          actual_amount?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          living_cost_per_payday: number;
          default_wallet_id: string | null;
          pin_hash: string | null;
          pin_enabled: boolean;
          hide_balance: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          user_id: string;
          living_cost_per_payday?: number;
          default_wallet_id?: string | null;
          pin_hash?: string | null;
          pin_enabled?: boolean;
          hide_balance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          living_cost_per_payday?: number;
          default_wallet_id?: string | null;
          pin_hash?: string | null;
          pin_enabled?: boolean;
          hide_balance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          feature: "tabungan" | "konsultasi";
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_idr: number;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          feature: "tabungan" | "konsultasi";
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_idr?: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          content: Json;
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          period_start: string;
          period_end: string;
          content: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          content?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      wallet_balances: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: WalletType;
          initial_balance: number;
          color: string | null;
          icon: string | null;
          is_archived: boolean;
          sort_order: number;
          balance: number;
          is_default: boolean;
          goal_id: string | null;
        };
        Relationships: [];
      };
      goal_progress: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          initial_amount: number;
          deadline: string | null;
          storage_place: string | null;
          storage_wallet_id: string | null;
          planned_per_payday: number | null;
          priority: number;
          status: GoalStatus;
          is_emergency_fund: boolean;
          notes: string | null;
          saved: number;
          remaining: number;
          percent: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      ensure_default_wallet: { Args: Record<string, never>; Returns: string };
      delete_wallet: {
        Args: { p_wallet_id: string; p_move_to: string };
        Returns: Json;
      };
      delete_savings_goal: {
        Args: { p_goal_id: string; p_move_to: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}

// Convenient export aliases
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type WalletBalance = Database["public"]["Views"]["wallet_balances"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
export type GoalProgress = Database["public"]["Views"]["goal_progress"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type PaydaySchedule = Database["public"]["Tables"]["payday_schedule"]["Row"];
export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type RecurringTransaction =
  Database["public"]["Tables"]["recurring_transactions"]["Row"];
