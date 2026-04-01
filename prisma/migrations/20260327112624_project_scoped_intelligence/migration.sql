/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,slug]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ga4PropertyId_fkey" FOREIGN KEY ("ga4PropertyId") REFERENCES "Ga4Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_gscSiteId_fkey" FOREIGN KEY ("gscSiteId") REFERENCES "GscSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
