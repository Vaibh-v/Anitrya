export type CustomerExportTab = {
  title: string;
  values: string[][];
};

export type CustomerExportPayload = {
  spreadsheetId: string;
  tabs: CustomerExportTab[];
};

export type CustomerExportRecord = {
  id: string;
  workspaceId: string;
  projectSlug: string;
  spreadsheetId: string;
  from: string;
  to: string;
  status: "success" | "failed";
  message: string;
  createdAt: string;
};