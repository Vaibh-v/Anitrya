import { prisma } from "@/lib/prisma";

type GscQueryMetricInput = {
  workspaceId: string;
  siteId: string;
  date: Date;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscPageMetricInput = {
  workspaceId: string;
  siteId: string;
  date: Date;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type Ga4LandingPageMetricInput = {
  workspaceId: string;
  propertyId: string;
  date: Date;
  page: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

type Ga4SourceMediumMetricInput = {
  workspaceId: string;
  propertyId: string;
  date: Date;
  sourceMedium: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number | null;
};

/**
 * Temporary compatibility shape so the file compiles even when Prisma Client
 * has not been regenerated yet.
 */
type EntityMetricClient = typeof prisma & {
  gscQueryMetric: {
    deleteMany(args: { where: { siteId: string; date: Date } }): Promise<unknown>;
    createMany(args: { data: GscQueryMetricInput[] }): Promise<unknown>;
  };
  gscPageMetric: {
    deleteMany(args: { where: { siteId: string; date: Date } }): Promise<unknown>;
    createMany(args: { data: GscPageMetricInput[] }): Promise<unknown>;
  };
  ga4LandingPageMetric: {
    deleteMany(args: { where: { propertyId: string; date: Date } }): Promise<unknown>;
    createMany(args: { data: Ga4LandingPageMetricInput[] }): Promise<unknown>;
  };
  ga4SourceMediumMetric: {
    deleteMany(args: { where: { propertyId: string; date: Date } }): Promise<unknown>;
    createMany(args: { data: Ga4SourceMediumMetricInput[] }): Promise<unknown>;
  };
};

const db = prisma as EntityMetricClient;

export async function replaceGscEntityMetrics(input: {
  siteId: string;
  date: Date;
  queryRows: GscQueryMetricInput[];
  pageRows: GscPageMetricInput[];
}) {
  await prisma.$transaction(async () => {
    await db.gscQueryMetric.deleteMany({
      where: {
        siteId: input.siteId,
        date: input.date,
      },
    });

    await db.gscPageMetric.deleteMany({
      where: {
        siteId: input.siteId,
        date: input.date,
      },
    });

    if (input.queryRows.length > 0) {
      await db.gscQueryMetric.createMany({
        data: input.queryRows,
      });
    }

    if (input.pageRows.length > 0) {
      await db.gscPageMetric.createMany({
        data: input.pageRows,
      });
    }
  });
}

export async function replaceGa4EntityMetrics(input: {
  propertyId: string;
  date: Date;
  landingRows: Ga4LandingPageMetricInput[];
  sourceRows: Ga4SourceMediumMetricInput[];
}) {
  await prisma.$transaction(async () => {
    await db.ga4LandingPageMetric.deleteMany({
      where: {
        propertyId: input.propertyId,
        date: input.date,
      },
    });

    await db.ga4SourceMediumMetric.deleteMany({
      where: {
        propertyId: input.propertyId,
        date: input.date,
      },
    });

    if (input.landingRows.length > 0) {
      await db.ga4LandingPageMetric.createMany({
        data: input.landingRows,
      });
    }

    if (input.sourceRows.length > 0) {
      await db.ga4SourceMediumMetric.createMany({
        data: input.sourceRows,
      });
    }
  });
}