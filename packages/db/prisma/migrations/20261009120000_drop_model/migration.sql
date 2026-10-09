-- Nothing reads the Model table: the API and both apps take the models from @fa/shared/models. Only `db:seed` wrote
-- it, so a model added without a re-seed made every forecast write fail on this foreign key.
ALTER TABLE "Forecast" DROP CONSTRAINT "Forecast_modelId_fkey";
DROP TABLE "Model";
