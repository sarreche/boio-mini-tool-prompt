export type Locale = "es" | "en";

export type TaskCard = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryCode: string;
  categoryName: string;
  categoryDescription: string | null;
  isPremium: boolean;
  sortOrder: number;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
  initialTaskId: string | null;
};

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  sequenceNumber: number;
  createdAt: string;
  rating: { isHelpful: boolean; comment: string | null } | null;
  executionId?: string | null;
};

export type ProductBootstrap = {
  tasks: TaskCard[];
  conversations: ConversationSummary[];
  profile: {
    displayName: string | null;
    locale: Locale;
    timezone: string;
    analyticsContentOptOut: boolean;
  };
  plan: { code: string; name: string; entitlements: Record<string, unknown> };
  access: {
    used: number;
    periodStart: string;
    monthlyUses: { configured: boolean; limit: number | null };
    premiumTrials: { configured: boolean; limit: number | null };
    attachments: { enabled: boolean };
    conversationExport: { enabled: boolean };
  };
  deletionRequest: { status: string; requestedAt: string } | null;
  nextConversationCursor: string | null;
};
