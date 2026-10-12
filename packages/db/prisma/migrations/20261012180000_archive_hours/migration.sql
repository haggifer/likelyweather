-- A city's past weather, one row per UTC hour, from Open-Meteo's Historical Weather API. Kept for good: a place and
-- period is fetched from Open-Meteo once and read from here afterwards. REAL keeps a row about 120 bytes with its key.
CREATE TABLE "ArchiveHour" (
    "cityId" INTEGER NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "tempC" REAL,
    "feelsC" REAL,
    "windMs" REAL,
    "gustsMs" REAL,
    "windDirDeg" REAL,
    "pressureMsl" REAL,
    "precipMm" REAL,
    "humidityPct" REAL,
    "cloudPct" REAL,

    CONSTRAINT "ArchiveHour_pkey" PRIMARY KEY ("cityId", "time")
);

ALTER TABLE "ArchiveHour" ADD CONSTRAINT "ArchiveHour_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
