export type ExpenseCategory =
  | "alquiler"
  | "servicios"
  | "impuestos"
  | "comida"
  | "tarjeta_credito"
  | "educacion"
  | "imprevistos";

export type ExpenseType = "fixed" | "variable";

export type AssetType =
  | "crypto"
  | "stock_us"
  | "cedear"
  | "stock_ar"
  | "bond_ar"
  | "on"
  | "time_deposit"
  | "usd_cash";

export type TxType = "buy" | "sell" | "deposit" | "withdraw";

export type IncomeCategory =
  | "sueldo"
  | "freelance"
  | "alquiler_cobrado"
  | "dividendos"
  | "venta"
  | "bono"
  | "otros";

export type IncomeDistribution = {
  fixed_pct: number;
  variable_pct: number;
  invest_pct: number;
  save_pct: number;
};

export type GoalType =
  | "savings"
  | "purchase"
  | "expense_cap"
  | "income_target"
  | "savings_rate"
  | "debt_payoff"
  | "passive_income_target";

export type GoalStatus = "active" | "completed" | "paused" | "archived";

export type QuestType = "main" | "side";

export type Theme = "deep-gray" | "oled";

export type Density = "compact" | "relaxed";

export type AccentColor = "amber" | "emerald" | "blue" | "rose" | "violet";

export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          category: ExpenseCategory;
          type: ExpenseType;
          date: string; // YYYY-MM-DD
          note: string | null;
          card_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          category: ExpenseCategory;
          type?: ExpenseType;
          date?: string;
          note?: string | null;
          card_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          category?: ExpenseCategory;
          type?: ExpenseType;
          date?: string;
          note?: string | null;
          card_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          asset_type: AssetType;
          ticker: string | null;
          tx_type: TxType;
          quantity: number;
          price_usd: number | null;
          fx_rate: number | null;
          fees_usd: number;
          broker: string | null;
          date: string; // YYYY-MM-DD
          note: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_type: AssetType;
          ticker?: string | null;
          tx_type: TxType;
          quantity: number;
          price_usd?: number | null;
          fx_rate?: number | null;
          fees_usd?: number;
          broker?: string | null;
          date?: string;
          note?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_type?: AssetType;
          ticker?: string | null;
          tx_type?: TxType;
          quantity?: number;
          price_usd?: number | null;
          fx_rate?: number | null;
          fees_usd?: number;
          broker?: string | null;
          date?: string;
          note?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      initial_positions: {
        Row: {
          id: string;
          user_id: string;
          asset_type: AssetType;
          ticker: string | null;
          quantity: number;
          avg_cost_usd: number;
          as_of_date: string;
          note: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_type: AssetType;
          ticker?: string | null;
          quantity: number;
          avg_cost_usd: number;
          as_of_date?: string;
          note?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_type?: AssetType;
          ticker?: string | null;
          quantity?: number;
          avg_cost_usd?: number;
          as_of_date?: string;
          note?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      incomes: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: "ARS" | "USD";
          fx_rate: number | null;
          amount_ars: number;
          category: IncomeCategory;
          source: string | null;
          date: string; // YYYY-MM-DD
          note: string | null;
          distribution: IncomeDistribution | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: "ARS" | "USD";
          fx_rate?: number | null;
          category: IncomeCategory;
          source?: string | null;
          date?: string;
          note?: string | null;
          distribution?: IncomeDistribution | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: "ARS" | "USD";
          fx_rate?: number | null;
          category?: IncomeCategory;
          source?: string | null;
          date?: string;
          note?: string | null;
          distribution?: IncomeDistribution | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          goal_type: GoalType;
          quest_type: QuestType;
          target_amount: number;
          currency: "USD" | "ARS" | null;
          current_amount: number;
          source_type: string | null;
          source_ref: string | null;
          linked_asset_keys: string[];
          deadline: string | null; // YYYY-MM-DD
          started_at: string; // YYYY-MM-DD
          status: GoalStatus;
          priority: number;
          color: string | null;
          icon: string | null;
          note: string | null;
          metadata: Record<string, unknown>;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          goal_type: GoalType;
          quest_type?: QuestType;
          target_amount: number;
          currency?: "USD" | "ARS" | null;
          current_amount?: number;
          source_type?: string | null;
          source_ref?: string | null;
          linked_asset_keys?: string[];
          deadline?: string | null;
          started_at?: string;
          status?: GoalStatus;
          priority?: number;
          color?: string | null;
          icon?: string | null;
          note?: string | null;
          metadata?: Record<string, unknown>;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          goal_type?: GoalType;
          quest_type?: QuestType;
          target_amount?: number;
          currency?: "USD" | "ARS" | null;
          current_amount?: number;
          source_type?: string | null;
          source_ref?: string | null;
          linked_asset_keys?: string[];
          deadline?: string | null;
          started_at?: string;
          status?: GoalStatus;
          priority?: number;
          color?: string | null;
          icon?: string | null;
          note?: string | null;
          metadata?: Record<string, unknown>;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_snapshots: {
        Row: {
          user_id: string;
          date: string;
          total_usd: number;
          cashflow_usd: number;
          sp500_close: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          total_usd: number;
          cashflow_usd?: number;
          sp500_close?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          date?: string;
          total_usd?: number;
          cashflow_usd?: number;
          sp500_close?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          closing_day: number;
          due_day: number;
          brand: string | null;
          last_four: string | null;
          color: string | null;
          currency: "ARS" | "USD";
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          closing_day: number;
          due_day: number;
          brand?: string | null;
          last_four?: string | null;
          color?: string | null;
          currency?: "ARS" | "USD";
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          closing_day?: number;
          due_day?: number;
          brand?: string | null;
          last_four?: string | null;
          color?: string | null;
          currency?: "ARS" | "USD";
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          theme: Theme;
          density: Density;
          stealth_mode: boolean;
          accent_color: AccentColor;
          avatar_url: string | null;
          display_name: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: Theme;
          density?: Density;
          stealth_mode?: boolean;
          accent_color?: AccentColor;
          avatar_url?: string | null;
          display_name?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          theme?: Theme;
          density?: Density;
          stealth_mode?: boolean;
          accent_color?: AccentColor;
          avatar_url?: string | null;
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      expense_category: ExpenseCategory;
      asset_type: AssetType;
      tx_type: TxType;
      income_category: IncomeCategory;
      goal_type: GoalType;
      goal_status: GoalStatus;
      quest_type: QuestType;
    };
    CompositeTypes: Record<string, never>;
  };
};
