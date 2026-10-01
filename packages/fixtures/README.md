# Fixtures

- `snapshot-kharkiv.json`: a real collector run for Kharkiv on the former 6-hour grid, used by chart geometry tests.
- `upstream/`: real Open-Meteo and met.no responses for New York, issue 2026-09-24T12:00Z, used to test the
  collector without network access.
- `csv/`: small CSVs in the two header versions of the Python collector this project grew out of, for the importer. Expected
  counts are asserted in `packages/server/src/importCsv.test.ts`.
