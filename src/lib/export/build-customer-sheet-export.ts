type CustomerSheetExportInput = {
  projectId: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
};

type ExportPrimitive = string | number | null;
type ExportRow = Record<string, ExportPrimitive>;
type ExportPayload = Record<string, ExportRow[]>;

export async function buildCustomerSheetExport(
  input: CustomerSheetExportInput
): Promise<ExportPayload> {
  const now = new Date().toISOString();

  return {
    workspace: [
      {
        workspace_id: input.projectId,
        workspace_name: input.projectId,
        owner_email: "unknown",
        created_at: now,
      },
    ],
  };
}