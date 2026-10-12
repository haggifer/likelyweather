-- Feels-like (computed when a run is stored), wind gusts, relative humidity and cloud cover. Added on the partitioned
-- parent, so every weekly partition gets them. Nullable: older rows and models without a field keep NULL.
ALTER TABLE "Forecast"
    ADD COLUMN "feelsC" DOUBLE PRECISION,
    ADD COLUMN "gustsMs" DOUBLE PRECISION,
    ADD COLUMN "humidityPct" DOUBLE PRECISION,
    ADD COLUMN "cloudPct" DOUBLE PRECISION;
