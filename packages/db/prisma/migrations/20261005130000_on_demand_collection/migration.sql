-- Collection is on demand only: cities have no status, view counters or scheduled-run count.
DROP INDEX "City_status_lastViewedAt_idx";

ALTER TABLE "City"
    DROP COLUMN "status",
    DROP COLUMN "availableModels",
    DROP COLUMN "lastViewedAt",
    DROP COLUMN "viewCount",
    DROP COLUMN "runsCollected";

DROP TYPE "CityStatus";
