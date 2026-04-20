import type { ConnectorId } from "../connector-id";
import type { ConnectorDefinition } from "./types";

export const CONNECTOR_DEFINITIONS: Record<ConnectorId, ConnectorDefinition> = {
  quickbooks: {
    id: "quickbooks",
    displayName: "QuickBooks",
    category: "accounting",
    description: "Chart of accounts, bills, and expenses for SMB and mid-market finance teams.",
    availability: "planned",
    authKind: "oauth2",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
    },
  },
  xero: {
    id: "xero",
    displayName: "Xero",
    category: "accounting",
    description: "Invoices, bank feeds, and multi-currency ledgers common in growth companies.",
    availability: "planned",
    authKind: "oauth2",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
    },
  },
  gusto: {
    id: "gusto",
    displayName: "Gusto",
    category: "payroll",
    description: "Pay runs, benefits, and contractor payments for US payroll.",
    availability: "planned",
    authKind: "oauth2",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: false,
    },
  },
  adp: {
    id: "adp",
    displayName: "ADP",
    category: "payroll",
    description: "Enterprise payroll and workforce data for large and regulated employers.",
    availability: "planned",
    authKind: "partner_token",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
    },
  },
  plaid: {
    id: "plaid",
    displayName: "Plaid",
    category: "banking",
    description: "Bank transactions and balances for cash analytics and reconciliation.",
    availability: "planned",
    authKind: "oauth2",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
    },
  },
  netsuite: {
    id: "netsuite",
    displayName: "NetSuite",
    category: "erp",
    description: "ERP financials, procurement, and subsidiaries for complex entities.",
    availability: "planned",
    authKind: "oauth2",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: true,
      supportsWebhooks: true,
    },
  },
  bamboohr: {
    id: "bamboohr",
    displayName: "BambooHR",
    category: "hr",
    description: "Employee directory, time-off, and compensation context for payroll QA.",
    availability: "planned",
    authKind: "api_key",
    capabilities: {
      supportsScheduledSync: true,
      supportsIncrementalSync: false,
      supportsWebhooks: false,
    },
  },
};

export function listConnectorDefinitions(): ConnectorDefinition[] {
  return Object.values(CONNECTOR_DEFINITIONS);
}

export function getConnectorDefinition(id: ConnectorId): ConnectorDefinition {
  return CONNECTOR_DEFINITIONS[id];
}
