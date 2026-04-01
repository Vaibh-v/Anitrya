export type MemoryPersistInput = {
  projectId: string;
  writtenTabs: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
};

export type MemoryPersistResult = {
  ok: boolean;
  summary: string;
  stored: boolean;
};

function buildDateRangeLabel(
  dateRange?: {
    start?: string;
    end?: string;
  }
) {
  if (!dateRange?.start && !dateRange?.end) {
    return "current selection";
  }

  const start = dateRange?.start ?? "open";
  const end = dateRange?.end ?? "open";

  return `${start} → ${end}`;
}

export async function triggerMemoryPersistFromExport(
  input: MemoryPersistInput
): Promise<MemoryPersistResult> {
  const tabs =
    input.writtenTabs.length > 0
      ? input.writtenTabs.join(", ")
      : "no evidence tabs written";

  return {
    ok: true,
    stored: false,
    summary: `Export executed for ${input.projectId} across ${buildDateRangeLabel(
      input.dateRange
    )}. Tabs written: ${tabs}.`,
  };
}