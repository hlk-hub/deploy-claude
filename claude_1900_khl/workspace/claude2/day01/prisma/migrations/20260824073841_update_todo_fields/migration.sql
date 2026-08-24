/*
  Warnings:

  - You are about to drop the column `completed` on the `tbl_todo` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `tbl_todo` table. All the data in the column will be lost.
  - Added the required column `content` to the `tbl_todo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tbl_todo` DROP COLUMN `completed`,
    DROP COLUMN `title`,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `content` VARCHAR(200) NOT NULL,
    ADD COLUMN `isDone` BOOLEAN NOT NULL DEFAULT false;
