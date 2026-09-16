-- CreateTable
CREATE TABLE "SyncHealthRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectSlug" TEXT NOT NULL,
    "projectLabel" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "ownerSheet" JSONB,
    "intelligence" JSONB,
    "nextActions" JSONB,
    "totalRowsSynced" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncHealthRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncHealthRun_workspaceId_projectSlug_createdAt_idx" ON "SyncHealthRun"("workspaceId", "projectSlug", "createdAt");

-- AddForeignKey
ALTER TABLE "SyncHealthRun" ADD CONSTRAINT "SyncHealthRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
