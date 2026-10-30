-- Bỏ quy trình duyệt: bài đang chờ duyệt hoặc bị từ chối quay về nháp.
UPDATE "MktPost" SET "status" = 'DRAFT' WHERE "status" IN ('PENDING_REVIEW', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "MktPostStatus_new" AS ENUM ('DRAFT', 'PUBLISHING', 'SCHEDULED', 'PUBLISHED', 'FAILED');
ALTER TABLE "MktPost" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MktPost" ALTER COLUMN "status" TYPE "MktPostStatus_new" USING ("status"::text::"MktPostStatus_new");
ALTER TYPE "MktPostStatus" RENAME TO "MktPostStatus_old";
ALTER TYPE "MktPostStatus_new" RENAME TO "MktPostStatus";
DROP TYPE "MktPostStatus_old";
ALTER TABLE "MktPost" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "MktPost" DROP COLUMN "reviewNote",
DROP COLUMN "reviewerName";

