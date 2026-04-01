import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getProjectBySlug } from "@/lib/projects";
import { Sidebar } from "@/components/Sidebar";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";

type LayoutSearchParams = {
  project?: string;
};

type ProjectWithRelations = Awaited<
  ReturnType<typeof getProjectBySlug>
>["projects"][number];

type Ga4PropertyOption = {
  id: string;
  displayName: string | null;
  propertyName: string;
};

type GscSiteOption = {
  id: string;
  siteUrl: string;
};

export default async function HomeLayout({
  children,
  searchParams
}: {
  children: ReactNode;
  searchParams?: Promise<LayoutSearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.id) {
    return (
      <div className="app-shell min-h-screen px-8 py-8 text-white">
        Authentication state is missing.
      </div>
    );
  }

  const workspace = await ensureWorkspaceForUser({
    userId: session.user.id,
    email: session.user.email
  });

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentProjectSlug = resolvedSearchParams?.project ?? null;

  const [{ projects, selectedProject }, ga4Properties, gscSites] = await Promise.all([
    getProjectBySlug(workspace.id, currentProjectSlug),
    prisma.ga4Property.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { displayName: "asc" }
    }),
    prisma.gscSite.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { siteUrl: "asc" }
    })
  ]);

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px]">
        <Sidebar />

        <main className="min-w-0 flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <div className="mb-8">
            <ProjectSwitcher
              projects={projects.map((project: ProjectWithRelations) => ({
                id: project.id,
                name: project.name,
                slug: project.slug,
                ga4Property: project.ga4Property
                  ? {
                      id: project.ga4Property.id,
                      displayName: project.ga4Property.displayName,
                      propertyName: project.ga4Property.propertyName
                    }
                  : null,
                gscSite: project.gscSite
                  ? {
                      id: project.gscSite.id,
                      siteUrl: project.gscSite.siteUrl
                    }
                  : null
              }))}
              selectedProjectSlug={selectedProject?.slug ?? null}
              ga4Properties={ga4Properties.map((property: Ga4PropertyOption) => ({
                id: property.id,
                label: property.displayName ?? property.propertyName
              }))}
              gscSites={gscSites.map((site: GscSiteOption) => ({
                id: site.id,
                label: site.siteUrl
              }))}
            />
          </div>

          <div className="min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}