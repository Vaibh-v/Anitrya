export type CustomerSheetTab = {
  title: string;
  rows: Array<Array<string | number | boolean | null>>;
};

export type CustomerSheetExport = {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabs: CustomerSheetTab[];
};

export type CustomerExportRecord = {
  id: string;
  createdAt: string;
  workspaceId: string | null;
  projectSlug: string;
  projectLabel: string;
  spreadsheetId: string;
  spreadsheetUrl?: string | null;
  from: string;
  to: string;
  generatedAt: string;
  tabCount?: number;
  rowCount?: number;
  status?: "success" | "error";
  message?: string | null;
};

export type BuildCustomerSheetExportInput = {
  spreadsheetId: string;
  projectId: string;
  projectLabel: string;
  workspaceId: string | null;
  from: string;
  to: string;
  generatedAt: string;
  providerHealth: {
    connectedCount: number;
    readyCount: number;
    evidenceReadyCount: number;
    intelligenceReadyCount: number;
    records: Array<{
      label: string;
      state: string;
      connected: boolean;
      mapped: boolean;
      syncCapable: boolean;
      evidenceReady: boolean;
      intelligenceReady: boolean;
      nextAction: string;
      evidenceTargets: string[];
      blockers: string[];
    }>;
  };
  projectHealth: {
    providersConnected: number;
    providersReady: number;
    evidenceReady: number;
    intelligenceReady: number;
    criticalBlockers: string[];
    nextActions: string[];
  };
};
