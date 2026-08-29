-- Remove Auto Subtitle persistence. This intentionally deletes subtitle jobs,
-- segments, exports, and projects while preserving AppSetting and construction data.
DROP TABLE IF EXISTS "SubtitleExport";
DROP TABLE IF EXISTS "SubtitleJob";
DROP TABLE IF EXISTS "SubtitleSegment";
DROP TABLE IF EXISTS "SubtitleProject";

DROP TYPE IF EXISTS "ExportStatus";
DROP TYPE IF EXISTS "ExportType";
DROP TYPE IF EXISTS "JobStatus";
DROP TYPE IF EXISTS "JobType";
DROP TYPE IF EXISTS "ProjectStatus";
