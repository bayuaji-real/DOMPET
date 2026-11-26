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
          other_fixed_monthly: number | null;
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
          other_fixed_monthly?: number | null;
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
          other_fixed_monthly?: number | null;
          default_wallet_id?: string | null;
          pin_hash?: string | null;
          pin_enabled?: boolean;
          hide_balance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      planner_events: {
        Row: { id: string; user_id: string; title: string; event_type: "lamaran" | "nikah" | "lainnya"; event_date: string | null; total_budget: number; partner_a: string | null; partner_b: string | null; goal_id: string | null; invite_code?: string | null; created_at?: string };
        Insert: { id?: string; user_id?: string; title: string; event_type?: "lamaran" | "nikah" | "lainnya"; event_date?: string | null; total_budget?: number; partner_a?: string | null; partner_b?: string | null; goal_id?: string | null };
        Update: { title?: string; event_type?: "lamaran" | "nikah" | "lainnya"; event_date?: string | null; total_budget?: number; partner_a?: string | null; partner_b?: string | null; goal_id?: string | null };
        Relationships: [];
      };
      planner_items: {
        Row: { id: string; user_id: string; event_id: string; kind: "vendor" | "seserahan" | "lainnya"; name: string; planned_cost: number; side: "pria" | "wanita" | "umum"; status: "belum" | "proses" | "selesai" | "tinjau" | "booking" | "lunas"; needed_date: string | null; contact: string | null; note: string | null; created_at?: string };
        Insert: { id?: string; user_id?: string; event_id: string; kind: "vendor" | "seserahan" | "lainnya"; name: string; planned_cost?: number; side?: "pria" | "wanita" | "umum"; status?: "belum" | "proses" | "selesai" | "tinjau" | "booking" | "lunas"; needed_date?: string | null; contact?: string | null; note?: string | null };
        Update: { name?: string; planned_cost?: number; side?: "pria" | "wanita" | "umum"; status?: "belum" | "proses" | "selesai" | "tinjau" | "booking" | "lunas"; needed_date?: string | null; contact?: string | null; note?: string | null };
        Relationships: [];
      };
      planner_payments: {
        Row: { id: string; user_id: string; event_id: string; item_id: string | null; amount: number; paid_at: string; note: string | null; created_at?: string };
        Insert: { id?: string; user_id?: string; event_id: string; item_id?: string | null; amount: number; paid_at?: string; note?: string | null };
        Update: { amount?: number; paid_at?: string; note?: string | null };
        Relationships: [];
      };
      planner_guests: {
        Row: { id: string; user_id: string; event_id: string; name: string; category: string | null; side: "pria" | "wanita" | "umum"; address: string | null; pax: number; attendance: "belum" | "hadir" | "tidak"; created_at?: string };
        Insert: { id?: string; user_id?: string; event_id: string; name: string; category?: string | null; side?: "pria" | "wanita" | "umum"; address?: string | null; pax?: number; attendance?: "belum" | "hadir" | "tidak" };
        Update: { name?: string; category?: string | null; side?: "pria" | "wanita" | "umum"; address?: string | null; pax?: number; attendance?: "belum" | "hadir" | "tidak" };
        Relationships: [];
      };
      planner_todos: {
        Row: { id: string; user_id: string; event_id: string; kind: "dokumen" | "jadwal"; title: string; side: "pria" | "wanita" | "umum"; due_date: string | null; note: string | null; done: boolean; created_at?: string };
        Insert: { id?: string; user_id?: string; event_id: string; kind: "dokumen" | "jadwal"; title: string; side?: "pria" | "wanita" | "umum"; due_date?: string | null; note?: string | null; done?: boolean };
        Update: { title?: string; side?: "pria" | "wanita" | "umum"; due_date?: string | null; note?: string | null; done?: boolean };
        Relationships: [];
      };
      spend_limits: {
        Row: { id: string; user_id: string; name: string; period: "harian" | "mingguan" | "bulanan"; amount: number; category_ids: string[]; warn_pct: number; is_active: boolean; created_at?: string };
        Insert: { id?: string; user_id?: string; name: string; period: "harian" | "mingguan" | "bulanan"; amount: number; category_ids?: string[]; warn_pct?: number; is_active?: boolean };
        Update: { name?: string; period?: "harian" | "mingguan" | "bulanan"; amount?: number; category_ids?: string[]; warn_pct?: number; is_active?: boolean };
        Relationships: [];
      };
      debts: {
        Row: { id: string; user_id: string; name: string; balance: number; annual_rate: number; min_payment: number; due_day: number | null; created_at?: string };
        Insert: { id?: string; user_id?: string; name: string; balance: number; annual_rate?: number; min_payment?: number; due_day?: number | null; created_at?: string };
        Update: { name?: string; balance?: number; annual_rate?: number; min_payment?: number; due_day?: number | null };
        Relationships: [];
      };
      holdings: {
        Row: { id: string; user_id: string; name: string; kind: "reksa_dana" | "saham" | "emas" | "lainnya"; units: number; avg_price: number; last_price: number | null; last_price_at: string | null; created_at?: string };
        Insert: { id?: string; user_id?: string; name: string; kind: "reksa_dana" | "saham" | "emas" | "lainnya"; units: number; avg_price: number; last_price?: number | null; last_price_at?: string | null; created_at?: string };
        Update: { name?: string; kind?: "reksa_dana" | "saham" | "emas" | "lainnya"; units?: number; avg_price?: number; last_price?: number | null; last_price_at?: string | null };
        Relationships: [];
      };
      market_benchmarks: {
        Row: { code: string; name: string; value: number; unit: "persen" | "poin" | "rupiah"; as_of: string; source_name: string; source_url: string; note: string | null; updated_at?: string };
        Insert: never; Update: never; Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; user_agent: string | null; created_at?: string };
        Insert: { user_id?: string; endpoint: string; p256dh: string; auth: string; user_agent?: string | null };
        Update: { endpoint?: string; p256dh?: string; auth?: string }; Relationships: [];
      };
      purchase_goals: {
        Row: { id: string; user_id: string; name: string; price: number; down_payment: number; saved: number; mode: "tunai" | "cicilan"; months: number | null; rate_pct: number | null; target_date: string | null; note: string | null; status: "aktif" | "terbeli" | "batal"; created_at?: string };
        Insert: { name: string; price: number; down_payment?: number; saved?: number; mode?: "tunai" | "cicilan"; months?: number | null; rate_pct?: number | null; target_date?: string | null; note?: string | null; status?: "aktif" | "terbeli" | "batal" };
        Update: { name?: string; price?: number; down_payment?: number; saved?: number; mode?: "tunai" | "cicilan"; months?: number | null; rate_pct?: number | null; target_date?: string | null; note?: string | null; status?: "aktif" | "terbeli" | "batal" };
        Relationships: [];
      };
      market_snapshots: {
        Row: { id: string; name: string; category: "pasar_uang" | "pendapatan_tetap" | "campuran" | "saham"; risk: "rendah" | "sedang" | "tinggi"; ret_1m: number | null; ret_ytd: number | null; ret_1y: number | null; aum: number | null; as_of: string; source_url: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      shared_groups: {
        Row: { id: string; name: string; owner_id: string; invite_code: string; created_at?: string };
        Insert: never; Update: { name?: string }; Relationships: [];
      };
      shared_members: {
        Row: { group_id: string; user_id: string; display_name: string; joined_at?: string };
        Insert: never; Update: never; Relationships: [];
      };
      shared_expenses: {
        Row: { id: string; group_id: string; paid_by: string; amount: number; note: string; split_among: string[]; date: string; created_by: string; created_at?: string };
        Insert: { group_id: string; paid_by: string; amount: number; note: string; split_among: string[]; date?: string };
        Update: never; Relationships: [];
      };
      shared_payments: {
        Row: { id: string; group_id: string; from_user: string; to_user: string; amount: number; date: string; created_by: string; created_at?: string };
        Insert: { group_id: string; from_user: string; to_user: string; amount: number; date?: string };
        Update: never; Relationships: [];
      };
      payment_prices: {
        Row: { months: number; amount: number };
        Insert: never; Update: never; Relationships: [];
      };
      subscription_requests: {
        Row: { id: string; user_id: string; plan: "premium" | "pro"; note: string | null; status: string; created_at?: string };
        Insert: { plan: "premium" | "pro"; note?: string | null };
        Update: never; Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          feature: "tabungan" | "konsultasi" | "struk" | "suara" | "insight" | "rencana" | "impor" | "memori";
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_idr: number;
          status?: "success" | "failed";
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          feature: "tabungan" | "konsultasi" | "struk" | "suara" | "insight" | "rencana" | "impor" | "memori";
          model: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_idr?: number;
          status?: "success" | "failed";
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      help_reports: {
        Row: {
          id: string;
          user_id: string;
          kind: "bug" | "usul";
          title: string;
          body: string;
          page: string | null;
          image_path: string | null;
          status: "baru" | "dibaca" | "dikerjakan" | "selesai";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          kind: "bug" | "usul";
          title: string;
          body: string;
          page?: string | null;
          image_path?: string | null;
          status?: "baru";
          created_at?: string;
        };
        Update: { status?: "baru" | "dibaca" | "dikerjakan" | "selesai" };
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
      get_my_entitlement: { Args: Record<string, never>; Returns: Json };
      planner_create_invite: { Args: { p_event: string }; Returns: string };
      planner_join: { Args: { p_code: string }; Returns: string };
      planner_reset_invite: { Args: { p_event: string }; Returns: undefined };
      admin_dashboard_summary: { Args: { p_from?: string | null; p_to?: string | null }; Returns: Json };
      admin_list_prices: { Args: Record<string, never>; Returns: { months: number; amount: number }[] };
      admin_set_price: { Args: { p_months: number; p_amount: number }; Returns: undefined };
      admin_get_ai_controls: { Args: Record<string, never>; Returns: Json };
      admin_set_ai_controls: { Args: { p_controls: Json; p_usd_idr_rate?: number | null }; Returns: undefined };
      get_ai_runtime_guard: { Args: Record<string, never>; Returns: Json };
      my_admin_role: { Args: Record<string, never>; Returns: string | null };
      admin_list_users: { Args: Record<string, never>; Returns: { user_id: string; email: string; created_at: string; last_sign_in_at: string | null; admin_role: string | null; plan: string; source: string; plan_expires_at: string | null; trial_ends_at: string | null; ai_used: number }[] };
      admin_set_plan: { Args: { p_user: string; p_plan: string; p_days?: number | null; p_reason?: string | null }; Returns: undefined };
      admin_set_role: { Args: { p_user: string; p_role: string }; Returns: undefined };
      admin_list_requests: { Args: Record<string, never>; Returns: { id: string; user_id: string; email: string; plan: string; note: string | null; status: string; created_at: string }[] };
      admin_resolve_request: { Args: { p_id: string; p_status: string; p_days?: number }; Returns: undefined };
      admin_upsert_market: { Args: { p_id: string | null; p_name: string; p_category: string; p_risk: string; p_ret_1m: number | null; p_ret_ytd: number | null; p_ret_1y: number | null; p_aum: number | null; p_as_of: string; p_source_url: string }; Returns: string };
      admin_delete_market: { Args: { p_id: string }; Returns: undefined };
      admin_list_audit: { Args: Record<string, never>; Returns: { id: number; actor_email: string | null; action: string; target_email: string | null; detail: string | null; created_at: string }[] };
      admin_set_api_budget: { Args: { p_budget: number; p_since: string; p_warn?: number }; Returns: undefined };
      admin_api_usage: { Args: Record<string, never>; Returns: Json };
      admin_upsert_benchmark: { Args: { p_code: string; p_name: string; p_value: number; p_unit: string; p_as_of: string; p_source_name: string; p_source_url: string; p_note: string | null }; Returns: undefined };
      admin_delete_benchmark: { Args: { p_code: string }; Returns: undefined };
      admin_mfa_status: { Args: Record<string, never>; Returns: Json };
      admin_set_require_mfa: { Args: { p_on: boolean }; Returns: undefined };
      admin_list_payments: { Args: Record<string, never>; Returns: { id: string; user_id: string; email: string; months: number; amount: number; status: string; created_at: string; expires_at: string; proof_path: string | null; proof_ref: string | null; proof_paid_at: string | null; temp_pro_until: string | null; attempts: number; last_note: string | null; confirmed_at: string | null }[] };
      admin_confirm_payment: { Args: { p_id: string }; Returns: undefined };
      admin_reject_payment: { Args: { p_id: string; p_reason?: string | null }; Returns: undefined };
      create_payment_request: { Args: { p_months: number }; Returns: Json };
      get_my_payment_request: { Args: Record<string, never>; Returns: Json };
      start_trial: { Args: { p_plan: string }; Returns: Json };
      create_shared_group: { Args: { p_name: string; p_display: string }; Returns: Json };
      join_shared_group: { Args: { p_code: string; p_display: string }; Returns: string };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
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
