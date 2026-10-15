-- Add career scene preference (campus | experienced) to the singleton settings row.
ALTER TABLE "Settings" ADD COLUMN "careerScene" TEXT NOT NULL DEFAULT 'campus';
