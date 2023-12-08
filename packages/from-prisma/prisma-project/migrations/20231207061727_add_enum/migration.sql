-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('None', 'Low', 'Medium', 'High');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'Medium';
