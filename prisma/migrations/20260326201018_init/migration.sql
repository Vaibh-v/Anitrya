-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE_GSC', 'GOOGLE_GA4', 'SEMRUSH', 'AHREFS', 'BIRDEYE');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('GOOGLE_GSC', 'GOOGLE_GA4', 'SEMRUSH', 'AHREFS', 'BIRDEYE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" INTEGER,
    "scope" TEXT,
    "apiKey" TEXT,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "rowsSynced" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "nextSteps" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscSite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "permission" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GscDailyMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clicks" DOUBLE PRECISION NOT NULL,
    "impressions" DOUBLE PRECISION NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GscDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ga4Property" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "displayName" TEXT,
    "accountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ga4Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ga4DailyMetric" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "users" DOUBLE PRECISION NOT NULL,
    "sessions" DOUBLE PRECISION NOT NULL,
    "engagedSessions" DOUBLE PRECISION NOT NULL,
    "engagementRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ga4DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_idx" ON "Membership"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "IntegrationToken_userId_idx" ON "IntegrationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_workspaceId_provider_key" ON "IntegrationToken"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "SyncRun_workspaceId_source_idx" ON "SyncRun"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "Insight_workspaceId_createdAt_idx" ON "Insight"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GscSite_workspaceId_siteUrl_key" ON "GscSite"("workspaceId", "siteUrl");

-- CreateIndex
CREATE INDEX "GscDailyMetric_workspaceId_date_idx" ON "GscDailyMetric"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GscDailyMetric_siteId_date_key" ON "GscDailyMetric"("siteId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Ga4Property_workspaceId_propertyName_key" ON "Ga4Property"("workspaceId", "propertyName");

-- CreateIndex
CREATE INDEX "Ga4DailyMetric_workspaceId_date_idx" ON "Ga4DailyMetric"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Ga4DailyMetric_propertyId_date_key" ON "Ga4DailyMetric"("propertyId", "date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscSite" ADD CONSTRAINT "GscSite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscDailyMetric" ADD CONSTRAINT "GscDailyMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GscDailyMetric" ADD CONSTRAINT "GscDailyMetric_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "GscSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4Property" ADD CONSTRAINT "Ga4Property_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4DailyMetric" ADD CONSTRAINT "Ga4DailyMetric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ga4DailyMetric" ADD CONSTRAINT "Ga4DailyMetric_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Ga4Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
