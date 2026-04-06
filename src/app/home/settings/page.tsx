import { requireSession } from "@/lib/auth";
import { getProjectMapping } from "@/lib/project/project-mapper";
import { EntitySyncPanel } from "@/components/settings/EntitySyncPanel";
import { CustomerSheetExportButton } from "@/components/settings/CustomerSheetExportButton";

type SettingsPageProps = {
  searchParams?: Promise<{
    project?: string;
    from?: string;
    to?: string;
  }>;
};

function shiftDate(base: Date, offsetDays: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + offsetDays);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function SettingsPage(props: SettingsPageProps) {
  const session = await requireSession();
  const workspaceId = session.user?.workspaceId;

  if (!workspaceId) {
    throw new Error("Missing workspace context on the current session.");
  }

  const searchParams = (await props.searchParams) ?? {};
  const today = new Date();
  const defaultFrom = formatDate(shiftDate(today, -30));
  const defaultTo = formatDate(today);

  const projectRef = searchParams.project ?? "zt";
  const from = searchParams.from ?? defaultFrom;
  const to = searchParams.to ?? defaultTo;

  const project = await getProjectMapping({
    projectRef,
    workspaceId,
  });

  return (
    <main className="space-y-8">
      <EntitySyncPanel
        projectSlug={project.projectSlug}
        projectLabel={project.projectLabel}
        initialFrom={from}
        initialTo={to}
      />

      <CustomerSheetExportButton
        projectSlug={project.projectSlug}
        projectLabel={project.projectLabel}
        from={from}
        to={to}
      />
    </main>
  );
}