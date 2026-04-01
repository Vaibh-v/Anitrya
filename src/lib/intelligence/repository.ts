import { prisma } from "@/lib/prisma";
import type {
  ProjectDataBundle,
  ResolvedDateRange,
  SourceConnection,
} from "@/lib/intelligence/contracts";

export type LoadProjectDataInput = {
  workspaceId?: string | null;
  projectSlug?: string | null;
  dateRange: ResolvedDateRange;
};

type ProjectWithRelations = Awaited<ReturnType<typeof findResolvedProject>>;

type GscQueryMetricRow = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscPageMetricRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type Ga4LandingPageMetricRow = {
  page: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

type Ga4SourceMediumMetricRow = {
  sourceMedium: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

/**
 * Temporary compatibility cast so repository compiles even if Prisma Client
 * is stale before `prisma generate` runs in Codespaces.
 */
const db = prisma as typeof prisma & {
  gscQueryMetric: {
    findMany(args: {
      where: {
        siteId: string;
        date: { gte: Date; lte: Date };
      };
      orderBy: Array<{ clicks: "desc" } | { impressions: "desc" }>;
      take: number;
    }): Promise<GscQueryMetricRow[]>;
  };
  gscPageMetric: {
    findMany(args: {
      where: {
        siteId: string;
        date: { gte: Date; lte: Date };
      };
      orderBy: Array<{ clicks: "desc" } | { impressions: "desc" }>;
      take: number;
    }): Promise<GscPageMetricRow[]>;
  };
  ga4LandingPageMetric: {
    findMany(args: {
      where: {
        propertyId: string;
        date: { gte: Date; lte: Date };
      };
      orderBy: Array<{ sessions: "desc" } | { users: "desc" }>;
      take: number;
    }): Promise<Ga4LandingPageMetricRow[]>;
  };
  ga4SourceMediumMetric: {
    findMany(args: {
      where: {
        propertyId: string;
        date: { gte: Date; lte: Date };
      };
      orderBy: Array<{ sessions: "desc" } | { users: "desc" }>;
      take: number;
    }): Promise<Ga4SourceMediumMetricRow[]>;
  };
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sortByDateAscending<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.date.localeCompare(right.date));
}

function startOfDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

async function findResolvedProject(input: LoadProjectDataInput) {
  const normalizedWorkspaceId = input.workspaceId?.trim() || null;
  const normalizedProjectSlug = input.projectSlug?.trim() || null;

  if (normalizedWorkspaceId && normalizedProjectSlug) {
    const exact = await prisma.project.findFirst({
      where: {
        workspaceId: normalizedWorkspaceId,
        slug: normalizedProjectSlug,
      },
      include: {
        ga4Property: true,
        gscSite: true,
      },
    });

    if (exact) {
      return exact;
    }
  }

  if (normalizedProjectSlug) {
    const bySlug = await prisma.project.findFirst({
      where: {
        slug: normalizedProjectSlug,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        ga4Property: true,
        gscSite: true,
      },
    });

    if (bySlug) {
      return bySlug;
    }
  }

  if (normalizedWorkspaceId) {
    const latestForWorkspace = await prisma.project.findFirst({
      where: {
        workspaceId: normalizedWorkspaceId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        ga4Property: true,
        gscSite: true,
      },
    });

    if (latestForWorkspace) {
      return latestForWorkspace;
    }
  }

  return prisma.project.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      ga4Property: true,
      gscSite: true,
    },
  });
}

function toProjectReference(project: NonNullable<ProjectWithRelations>) {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    ga4PropertyId: project.ga4Property?.propertyName ?? null,
    gscSiteUrl: project.gscSite?.siteUrl ?? null,
  };
}

async function loadConnections(project: ProjectWithRelations): Promise<SourceConnection[]> {
  if (!project) {
    return [
      { source: "ga4", connected: false, synced: false, message: "No project is available." },
      { source: "gsc", connected: false, synced: false, message: "No project is available." },
      { source: "gmb", connected: false, synced: false, message: "Connector not wired yet." },
      { source: "google_ads", connected: false, synced: false, message: "Connector not wired yet." },
      { source: "google_trends", connected: false, synced: false, message: "Connector not wired yet." },
      { source: "meta_ad_library", connected: false, synced: false, message: "Connector not wired yet." },
    ];
  }

  const [latestGa4Run, latestGscRun] = await Promise.all([
    prisma.syncRun.findFirst({
      where: {
        workspaceId: project.workspaceId,
        source: "GOOGLE_GA4",
      },
      orderBy: {
        startedAt: "desc",
      },
    }),
    prisma.syncRun.findFirst({
      where: {
        workspaceId: project.workspaceId,
        source: "GOOGLE_GSC",
      },
      orderBy: {
        startedAt: "desc",
      },
    }),
  ]);

  return [
    {
      source: "ga4",
      connected: Boolean(project.ga4PropertyId),
      synced: latestGa4Run?.status === "SUCCESS",
      message: project.ga4PropertyId
        ? latestGa4Run
          ? `Last sync: ${latestGa4Run.status}`
          : "GA4 property mapped but no sync run found."
        : "No GA4 property mapped.",
    },
    {
      source: "gsc",
      connected: Boolean(project.gscSiteId),
      synced: latestGscRun?.status === "SUCCESS",
      message: project.gscSiteId
        ? latestGscRun
          ? `Last sync: ${latestGscRun.status}`
          : "GSC site mapped but no sync run found."
        : "No GSC site mapped.",
    },
    {
      source: "gmb",
      connected: false,
      synced: false,
      message: "Connector not wired yet.",
    },
    {
      source: "google_ads",
      connected: false,
      synced: false,
      message: "Connector not wired yet.",
    },
    {
      source: "google_trends",
      connected: false,
      synced: false,
      message: "Connector not wired yet.",
    },
    {
      source: "meta_ad_library",
      connected: false,
      synced: false,
      message: "Connector not wired yet.",
    },
  ];
}

async function loadGa4Daily(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.ga4PropertyId) {
    return [];
  }

  const rows = await prisma.ga4DailyMetric.findMany({
    where: {
      propertyId: project.ga4PropertyId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return rows.map((row) => ({
    date: formatDate(row.date),
    sessions: row.sessions,
    users: row.users,
    conversions: 0,
    engagementRate: row.engagementRate,
  }));
}

async function loadGscDaily(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.gscSiteId) {
    return [];
  }

  const rows = await prisma.gscDailyMetric.findMany({
    where: {
      siteId: project.gscSiteId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  return rows.map((row) => ({
    date: formatDate(row.date),
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

async function loadGscQueries(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.gscSiteId) {
    return [];
  }

  const rows = await db.gscQueryMetric.findMany({
    where: {
      siteId: project.gscSiteId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
    take: 50,
  });

  return rows.map((row: GscQueryMetricRow) => ({
    query: row.query,
    page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

async function loadGscPages(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.gscSiteId) {
    return [];
  }

  const rows = await db.gscPageMetric.findMany({
    where: {
      siteId: project.gscSiteId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: [{ clicks: "desc" }, { impressions: "desc" }],
    take: 50,
  });

  return rows.map((row: GscPageMetricRow) => ({
    page: row.page,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

async function loadGa4Landings(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.ga4PropertyId) {
    return [];
  }

  const rows = await db.ga4LandingPageMetric.findMany({
    where: {
      propertyId: project.ga4PropertyId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: [{ sessions: "desc" }, { users: "desc" }],
    take: 50,
  });

  return rows.map((row: Ga4LandingPageMetricRow) => ({
    page: row.page,
    sessions: row.sessions,
    users: row.users,
    conversions: row.conversions,
    engagementRate: row.engagementRate,
  }));
}

async function loadGa4Sources(project: ProjectWithRelations, dateRange: ResolvedDateRange) {
  if (!project?.ga4PropertyId) {
    return [];
  }

  const rows = await db.ga4SourceMediumMetric.findMany({
    where: {
      propertyId: project.ga4PropertyId,
      date: {
        gte: startOfDay(dateRange.from),
        lte: endOfDay(dateRange.to),
      },
    },
    orderBy: [{ sessions: "desc" }, { users: "desc" }],
    take: 25,
  });

  return rows.map((row: Ga4SourceMediumMetricRow) => ({
    sourceMedium: row.sourceMedium,
    sessions: row.sessions,
    users: row.users,
    conversions: row.conversions,
    engagementRate: row.engagementRate,
  }));
}

export async function loadProjectData(input: LoadProjectDataInput): Promise<ProjectDataBundle> {
  const project = await findResolvedProject(input);

  if (!project) {
    return {
      project: null,
      dateRange: input.dateRange,
      connections: [
        { source: "ga4", connected: false, synced: false, message: "No project available." },
        { source: "gsc", connected: false, synced: false, message: "No project available." },
        { source: "gmb", connected: false, synced: false, message: "Connector not wired yet." },
        { source: "google_ads", connected: false, synced: false, message: "Connector not wired yet." },
        { source: "google_trends", connected: false, synced: false, message: "Connector not wired yet." },
        { source: "meta_ad_library", connected: false, synced: false, message: "Connector not wired yet." },
      ],
      ga4Daily: [],
      gscDaily: [],
      gscQueries: [],
      gscPages: [],
      ga4Landings: [],
      ga4Sources: [],
    };
  }

  const [connections, ga4Daily, gscDaily, gscQueries, gscPages, ga4Landings, ga4Sources] =
    await Promise.all([
      loadConnections(project),
      loadGa4Daily(project, input.dateRange),
      loadGscDaily(project, input.dateRange),
      loadGscQueries(project, input.dateRange),
      loadGscPages(project, input.dateRange),
      loadGa4Landings(project, input.dateRange),
      loadGa4Sources(project, input.dateRange),
    ]);

  return {
    project: toProjectReference(project),
    dateRange: input.dateRange,
    connections,
    ga4Daily: sortByDateAscending(ga4Daily),
    gscDaily: sortByDateAscending(gscDaily),
    gscQueries,
    gscPages,
    ga4Landings,
    ga4Sources,
  };
}