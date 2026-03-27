import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return <div className="text-white">Authentication state is missing.</div>;
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  const runs = await prisma.syncRun.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { startedAt: "desc" },
    take: 20
  });

  const latestGsc = runs.find((run) => run.source === "GOOGLE_GSC");
  const latestGa4 = runs.find((run) => run.source === "GOOGLE_GA4");

  return (
    <div className="space-y-8">
      <div>
        <div className="section-kicker">System state</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-3 max-w-4xl body-muted">
          Integration state, sync health, and recent execution history.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="section-title">Source status</div>
          <div className="mt-5 grid gap-4">
            <div className="card-soft">
              <div className="font-medium">Google Search Console</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-success">Connected</span>
                {latestGsc ? (
                  <span className="badge">
                    Last run: {latestGsc.status} · {latestGsc.rowsSynced} rows
                  </span>
                ) : null}
              </div>
            </div>

            <div className="card-soft">
              <div className="font-medium">Google Analytics 4</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-success">Connected</span>
                {latestGa4 ? (
                  <span className="badge">
                    Last run: {latestGa4.status} · {latestGa4.rowsSynced} rows
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Operational standard</div>
          <div className="mt-5 space-y-3">
            <div className="card-soft text-sm">
              Failures must remain visible and explainable.
            </div>
            <div className="card-soft text-sm">
              Intelligence must remain evidence-backed.
            </div>
            <div className="card-soft text-sm">
              Future integrations should plug into the same normalized reasoning layer.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Recent sync runs</div>
        <div className="mt-4 overflow-hidden rounded-2xl">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Started</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.source}</td>
                  <td>{run.status}</td>
                  <td>{run.rowsSynced}</td>
                  <td className="body-muted">{run.startedAt.toLocaleString()}</td>
                  <td className="body-muted">
                    {run.endedAt ? run.endedAt.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}