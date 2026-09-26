-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('OK', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "RunOrigin" AS ENUM ('SCHEDULED', 'PREVIEW', 'IMPORT');

-- CreateEnum
CREATE TYPE "CityStatus" AS ENUM ('ACTIVE', 'DORMANT', 'QUEUED');

-- CreateTable
CREATE TABLE "City" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLocal" JSONB,
    "admin1" TEXT,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL,
    "population" INTEGER,
    "status" "CityStatus" NOT NULL DEFAULT 'ACTIVE',
    "availableModels" TEXT[],
    "firstTrackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "runsCollected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "regional" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRun" (
    "id" TEXT NOT NULL,
    "issueTime" TIMESTAMP(3) NOT NULL,
    "origin" "RunOrigin" NOT NULL,
    "cityId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" "RunStatus" NOT NULL,
    "rows" INTEGER NOT NULL DEFAULT 0,
    "citiesCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB,
    "archivePath" TEXT,

    CONSTRAINT "CollectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "cityId" INTEGER NOT NULL,
    "issueTime" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "origin" "RunOrigin" NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "metnoLastModified" TEXT,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("cityId","issueTime")
);

-- CreateTable
CREATE TABLE "Forecast" (
    "cityId" INTEGER NOT NULL,
    "modelId" TEXT NOT NULL,
    "issueTime" TIMESTAMP(3) NOT NULL,
    "validTime" TIMESTAMP(3) NOT NULL,
    "leadHours" INTEGER NOT NULL,
    "tempC" DOUBLE PRECISION,
    "windMs" DOUBLE PRECISION,
    "windDirDeg" DOUBLE PRECISION,
    "pressureMsl" DOUBLE PRECISION,
    "pressureSfc" DOUBLE PRECISION,
    "precipMm" DOUBLE PRECISION,
    "rainMm" DOUBLE PRECISION,
    "snowCm" DOUBLE PRECISION,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("cityId","issueTime","modelId","validTime")
) PARTITION BY RANGE ("issueTime");
-- Hand-edited: weekly partitions are created ahead of each write and dropped after 14 days (src/partitions.ts).

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_status_lastViewedAt_idx" ON "City"("status", "lastViewedAt");

-- CreateIndex
CREATE INDEX "CollectionRun_issueTime_idx" ON "CollectionRun"("issueTime" DESC);

-- CreateIndex
CREATE INDEX "CollectionRun_startedAt_idx" ON "CollectionRun"("startedAt" DESC);

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CollectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
