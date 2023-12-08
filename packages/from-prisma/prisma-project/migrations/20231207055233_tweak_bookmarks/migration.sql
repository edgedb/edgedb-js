/*
  Warnings:

  - You are about to drop the `Bookmarks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bookmarks" DROP CONSTRAINT "Bookmarks_postId_fkey";

-- DropForeignKey
ALTER TABLE "Bookmarks" DROP CONSTRAINT "Bookmarks_userId_fkey";

-- DropTable
DROP TABLE "Bookmarks";

-- CreateTable
CREATE TABLE "user_bookmarks" (
    "id" SERIAL NOT NULL,
    "note" TEXT,
    "from_user" INTEGER NOT NULL,
    "to_post" INTEGER NOT NULL,

    CONSTRAINT "user_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bookmarks_from_user_to_post_idx" ON "user_bookmarks"("from_user", "to_post");

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "User"("numId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_to_post_fkey" FOREIGN KEY ("to_post") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
