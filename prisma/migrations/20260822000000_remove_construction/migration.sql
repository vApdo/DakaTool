-- Remove the retired Construction module and all of its persisted data.
DELETE FROM "AppSetting" WHERE "key" = 'construction.managerCode';

DROP TABLE IF EXISTS "ConstructionPhoto";
DROP TABLE IF EXISTS "ConstructionUpdate";
DROP TABLE IF EXISTS "ConstructionMilestone";
DROP TABLE IF EXISTS "ConstructionCostItem";
DROP TABLE IF EXISTS "ConstructionFile";
DROP TABLE IF EXISTS "ConstructionProject";
DROP TABLE IF EXISTS "ConstructionAuthAttempt";

DROP TYPE IF EXISTS "ConstructionFileKind";
DROP TYPE IF EXISTS "MilestoneStatus";
DROP TYPE IF EXISTS "ConstructionStatus";
