-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationProvider" ADD VALUE 'GOOGLE_ADS';
ALTER TYPE "IntegrationProvider" ADD VALUE 'GOOGLE_GBP';
ALTER TYPE "IntegrationProvider" ADD VALUE 'GOOGLE_TRENDS';
ALTER TYPE "IntegrationProvider" ADD VALUE 'META_AD_LIBRARY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SyncSource" ADD VALUE 'GOOGLE_ADS';
ALTER TYPE "SyncSource" ADD VALUE 'GOOGLE_GBP';
ALTER TYPE "SyncSource" ADD VALUE 'GOOGLE_TRENDS';
ALTER TYPE "SyncSource" ADD VALUE 'META_AD_LIBRARY';

-- CreateTable
CREATE TABLE "GscQueryMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "query" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscQueryMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscPageMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscPageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ga4LandingPageMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "sessions" DOUBLE PRECISION NOT NULL,
    "users" DOUBLE PRECISION NOT NULL,
    "conversions" DOUBLE PRECISION NOT NULL,
    "engagementRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ga4LandingPageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ga4SourceMediumMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceMedium" TEXT NOT NULL,
    "sessions" DOUBLE PRECISION NOT NULL,
    "users" DOUBLE PRECISION NOT NULL,
    "conversions" DOUBLE PRECISION NOT NULL,
    "engagementRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ga4SourceMediumMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GscQueryMetric_workspaceId_date_idx" ON "GscQueryMetric"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "GscQueryMetric_siteId_date_idx" ON "GscQueryMetric"("siteId", "date");

-- CreateIndex
CREATE INDEX "GscQueryMetric_siteId_query_idx" ON "GscQueryMetric"("siteId", "query");

-- CreateIndex
CREATE INDEX "GscQueryMetric_siteId_page_idx" ON "GscQueryMetric"("siteId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "GscQueryMetric_siteId_date_query_page_key" ON "GscQueryMetric"("siteId", "date", "query", "page");

-- CreateIndex
CREATE INDEX "GscPageMetric_workspaceId_date_idx" ON "GscPageMetric"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "GscPageMetric_siteId_date_idx" ON "GscPageMetric"("siteId", "date");

-- CreateIndex
CREATE INDEX "GscPageMetric_siteId_page_idx" ON "GscPageMetric"("siteId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "GscPageMetric_siteId_date_page_key" ON "GscPageMetric"("siteId", "date", "page");

-- CreateIndex
CREATE INDEX "Ga4LandingPageMetric_workspaceId_date_idx" ON "Ga4LandingPageMetric"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "Ga4LandingPageMetric_propertyId_date_idx" ON "Ga4LandingPageMetric"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Ga4LandingPageMetric_propertyId_page_idx" ON "Ga4LandingPageMetric"("propertyId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "Ga4LandingPageMetric_propertyId_date_page_key" ON "Ga4LandingPageMetric"("propertyId", "date", "page");

-- CreateIndex
CREATE INDEX "Ga4SourceMediumMetric_workspaceId_date_idx" ON "Ga4SourceMediumMetric"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "Ga4SourceMediumMetric_propertyId_date_idx" ON "Ga4SourceMediumMetric"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Ga4SourceMediumMetric_propertyId_sourceMedium_idx" ON "Ga4SourceMediumMetric"("propertyId", "sourceMedium");

-- CreateIndex
CREATE UNIQUE INDEX "Ga4SourceMediumMetric_propertyId_date_sourceMedium_key" ON "Ga4SourceMediumMetric"("propertyId", "date", "sourceMedium");

-- AddForeignKey
ALTER TABLE "GscQueryMetric" ADD CONSTRAINT "GscQueryMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscQueryMetric" ADD CONSTRAINT "GscQueryMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "GscSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscPageMetric" ADD CONSTRAINT "GscPageMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscPageMetric" ADD CONSTRAINT "GscPageMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "GscSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4LandingPageMetric" ADD CONSTRAINT "Ga4LandingPageMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4LandingPageMetric" ADD CONSTRAINT "Ga4LandingPageMetric_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Ga4Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4SourceMediumMetric" ADD CONSTRAINT "Ga4SourceMediumMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4SourceMediumMetric" ADD CONSTRAINT "Ga4SourceMediumMetric_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Ga4Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
