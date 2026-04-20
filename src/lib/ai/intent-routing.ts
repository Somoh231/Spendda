/**
 * Spendda AI local engine — intent detection before any dataset-driven reply.
 */

export type ChatIntent =
  | "greeting"
  | "readiness"
  | "thanks"
  | "help"
  | "analytics_query"
  | "report_request"
  | "upload_request"
  | "clarification"
  | "unknown";

/** High-resolution routing for the local copilot (user text only — no assistant merge). */
export type UserIntentMode =
  | "greeting"
  | "conversational"
  | "clarification"
  | "analytics_query"
  | "summary_request"
  | "report_request"
  | "follow_up_question"
  | "feedback_from_user"
  | "help_request"
  | "thanks"
  | "readiness"
  | "upload_request";

function norm(ql: string) {
  return ql.replace(/\s+/g, " ").trim();
}

/**
 * Merge recent user turns with the current question so follow-ups like “what about payroll?”
 * still route to finance analytics.
 * @deprecated Prefer {@link mergeUserTurnsOnly} for intent — assistant text here caused false finance routing.
 */
export function mergeConversationForFinanceIntent(
  currentQuestion: string,
  turns: readonly { role: string; content: string }[] | undefined,
  maxUserTurns = 5,
): string {
  const parts: string[] = [];
  if (turns?.length) {
    const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant" && t.content.trim());
    if (lastAssistant) {
      parts.push(lastAssistant.content.trim().slice(0, 360));
    }
    const users = turns.filter((t) => t.role === "user").slice(-maxUserTurns);
    for (const u of users) {
      const chunk = u.content.trim();
      if (chunk) parts.push(chunk);
    }
  }
  const cq = currentQuestion.trim();
  if (cq) parts.push(cq);
  return norm(parts.join(" ").toLowerCase());
}

/** User-only merge for analytics gating (avoids inheriting “summarize / KPI” wording from assistant replies). */
export function mergeUserTurnsOnly(
  currentQuestion: string,
  turns: readonly { role: string; content: string }[] | undefined,
  maxUserTurns = 6,
): string {
  const parts: string[] = [];
  if (turns?.length) {
    const users = turns
      .filter((t) => t.role === "user" || t.role === "User")
      .slice(-maxUserTurns)
      .map((u) => u.content.trim())
      .filter(Boolean);
    parts.push(...users);
  }
  const cq = currentQuestion.trim();
  if (cq) parts.push(cq);
  return norm(parts.join(" ").toLowerCase());
}

function isBriefAck(t: string) {
  return /^(ok|okay|sure|yeah|yep|sounds good|got it|cool|nice|great|👍)\b[!.,\s]*$/i.test(t.trim());
}

/** Summary / exec overview asks (not general “analyze trends”). */
export function wantsSummaryRequest(ql: string): boolean {
  const t = norm(ql.toLowerCase());
  if (!t) return false;
  if (/\b(summarize|summarise|summary|executive summary|high-?level overview|give me a summary|quick summary)\b/i.test(t))
    return true;
  if (/\boverview of (my|the)?\s*(upload|data|dataset|file)\b/i.test(t)) return true;
  if (/\b(analyze|analyse)\b.*\b(upload|latest|file|dataset|data)\b/i.test(t)) return true;
  if (/\b(latest upload|this upload|uploaded file)\b.*\b(summarize|summary|analyze|analyse|review)\b/i.test(t)) return true;
  return false;
}

/** True when the user is clearly asking for numbers / analysis (excludes pure “summarize” — use {@link wantsSummaryRequest}). */
export function wantsFinanceDataQuestion(ql: string): boolean {
  const t = norm(ql.toLowerCase());
  if (!t) return false;

  if (/\b(why|how come)\b.*\bpayroll\b|\bpayroll\b.*\b(high|higher|highest|up|rise|risen|rising|large|big|expensive|costly|so much)\b/i.test(t))
    return true;
  if (/\b(payroll|salary|wages)\b.*\b(%|percent|pct|of revenue|vs revenue|relative to revenue)\b/i.test(t))
    return true;
  if (/\b(where|which)\b.*\b(overspend|over-spend|over spending|spending too|bleeding|leakage|waste|too much)\b/i.test(t))
    return true;
  if (/\b(what should i fix|what to fix|fix first|priorit|prioritize|most urgent|where to start|biggest problem|biggest issue)\b/i.test(t))
    return true;
  if (/\b(cost save|savings opportunit|reduce spend|cut costs|trim spend)\b/i.test(t)) return true;
  if (/\b(debt|leverage|covenant)\b.*\b(signal|risk|pressure|stress)\b/i.test(t)) return true;
  if (/\b(profitabilit|margin|bottom line)\b.*\b(signal|trend|look)\b|\bare we profitable\b/i.test(t)) return true;

  if (/\b(show departments|department breakdown)\b/i.test(t)) return true;
  if (/\b(find anomalies|anomaly hunt|scan for anomalies)\b/i.test(t)) return true;
  if (/\b(analyze|analyse|analysis|break\s*down|deep\s*dive)\b/i.test(t)) return true;
  if (/\b(suspicious|suspicion|anomal|anomaly|anomalies|red flag|what looks wrong|looks?\s+off|fishy)\b/i.test(t))
    return true;
  if (/\bwhat looks suspicious\b/i.test(t)) return true;
  if (/\b(trend|trends|over time|monthly pattern|historical)\b/i.test(t)) return true;
  if (
    /\b(show|give)\b.*\b(top vendors?|vendor ranking|leading vendors?)\b|\b(top vendors?|vendor (list|names)|which vendors|largest vendors?|biggest vendors?)\b/i.test(t)
  )
    return true;
  if (
    /\b(overspent|overspend|overspending|who overspent|who spent|top spend|highest spend|biggest spend|spend most)\b/i.test(
      t,
    )
  )
    return true;
  if (/\b(duplicate|duplicates)\b.*\b(invoice|payment)|\b(repeated payment)\b/i.test(t)) return true;
  if (/\b(vendors?\s+(to\s+)?review|vendor.*\b(risk|flag))\b/i.test(t)) return true;
  if (/\b(forecast|next quarter|projection|projected)\b/i.test(t)) return true;
  if (/\bpayroll\b.*\b(anomal|risk|issue|problem|flag)\b|\bpayroll anomalies\b/i.test(t)) return true;
  if (/\b(department|departments)\b.*\b(list|names|what are)\b/i.test(t)) return true;
  if (/\b(vendor|vendors)\b.*\b(list|names|which)\b/i.test(t)) return true;
  if (/\b(show|list|what|tell me|give me|see)\b.*\b(risks?|alerts?|investigations?|flags?)\b/i.test(t)) return true;
  if (/\b(top risks?|show risks?|investigation queue)\b/i.test(t)) return true;
  if (/\b(kpi|metrics|stats|numbers|data dump)\b/i.test(t)) return true;
  if (/\b(savings opportunity|recoverable|leakage|waste)\b/i.test(t)) return true;
  return false;
}

/** True when the user is clearly asking for numbers / analysis OR a summary (union of finance + summary detectors). */
export function wantsAnalytics(ql: string): boolean {
  return wantsFinanceDataQuestion(ql) || wantsSummaryRequest(ql);
}

export function shouldRunDatasetAnalytics(mode: UserIntentMode): boolean {
  return mode === "analytics_query" || mode === "summary_request" || mode === "follow_up_question";
}

export function routeUserIntent(
  q: string,
  turns: readonly { role: string; content: string }[] | undefined,
): UserIntentMode {
  const t = norm(q.trim().toLowerCase());
  const mergedUser = mergeUserTurnsOnly(q, turns);

  if (!t) return "clarification";

  if (isBriefAck(t)) return "conversational";

  if (/^(thanks|thank you|thx|ty)\b[!.,\s]*$/i.test(t)) return "thanks";
  if (/^(thanks|thank you|thx|ty)\b/i.test(t) && t.length < 48 && !wantsFinanceDataQuestion(t) && !wantsSummaryRequest(t))
    return "thanks";
  if (/\b(much appreciated|appreciate it)\b/i.test(t) && t.length < 48 && !wantsFinanceDataQuestion(t)) return "thanks";

  if (
    /^(hi|hello|hey|yo|sup)\b[!.,\s]*$/i.test(t) &&
    t.length < 48 &&
    !wantsFinanceDataQuestion(t) &&
    !wantsSummaryRequest(t)
  )
    return "greeting";
  if (
    /^(hi|hello|hey)\b/i.test(t) &&
    t.length < 36 &&
    !wantsFinanceDataQuestion(t) &&
    !wantsSummaryRequest(t)
  )
    return "greeting";
  if (
    /^good (morning|afternoon|evening)\b/i.test(t) &&
    t.length < 40 &&
    !wantsFinanceDataQuestion(t) &&
    !wantsSummaryRequest(t)
  )
    return "greeting";

  if (/\b(are you ready|you ready|ready\?|can we start|shall we start|good to go)\b/i.test(t)) return "readiness";

  if (
    /^help\b[!?.]*$/i.test(t) ||
    /\bwhat can you (do|help)\b/i.test(t) ||
    /\bhow does (this|the) (work|platform)\b/i.test(t)
  )
    return "help_request";

  if (
    /\b(your responses are bad|this (isn't|is not) helpful|you('re| are) wrong|that('s| is) wrong|useless|horrible answers|not helpful)\b/i.test(
      t,
    )
  )
    return "feedback_from_user";

  if (/\b(did you make a mistake|can you clarify|what did you mean|are you sure)\b/i.test(t)) return "clarification";

  if (/\b(are you okay|are you there|you good|how are you)\b/i.test(t)) return "conversational";

  if (
    /\b(build|generate|create|export|download)\b.*\b(monthly|executive|payroll|cfo|owner|controller)?\s*(report|brief|pdf|pack)\b/i.test(
      t,
    ) ||
    /\b(monthly|executive|payroll)\s+(report|brief)\b/i.test(t) ||
    /\b(owner monthly|expense trends|risk\s*&\s*action)\s*report\b/i.test(t)
  ) {
    return "report_request";
  }

  if (/\b(how (do|can) i upload|where (do|can) i upload|upload (a |my )?file|attach (a )?file)\b/i.test(t))
    return "upload_request";

  if (wantsFinanceDataQuestion(t)) return "analytics_query";

  if (wantsSummaryRequest(t)) return "summary_request";

  if (wantsFinanceDataQuestion(mergedUser) && t.length < 160 && !isBriefAck(t)) return "follow_up_question";

  if (wantsSummaryRequest(mergedUser) && t.length < 120 && !isBriefAck(t)) return "summary_request";

  return "conversational";
}

/** User asked for long-form tables, evidence dumps, or narrative depth. */
export function wantsDeepDetail(ql: string): boolean {
  const t = norm(ql.toLowerCase());
  if (!t) return false;
  return /\b(explain|explanation|in detail|deep dive|full (picture|breakdown|table|list)|all rows|every row|complete list|verbose|line by line|show me all|evidence dump|entire table)\b/i.test(
    t,
  );
}

/** Legacy coarse intent — prefer {@link routeUserIntent} for new code. */
export function detectChatIntent(q: string, ql: string): ChatIntent {
  const mode = routeUserIntent(q, undefined);
  switch (mode) {
    case "thanks":
      return "thanks";
    case "greeting":
      return "greeting";
    case "readiness":
      return "readiness";
    case "help_request":
      return "help";
    case "report_request":
      return "report_request";
    case "upload_request":
      return "upload_request";
    case "analytics_query":
    case "summary_request":
    case "follow_up_question":
      return "analytics_query";
    case "clarification":
      return "clarification";
    default:
      return "unknown";
  }
}
