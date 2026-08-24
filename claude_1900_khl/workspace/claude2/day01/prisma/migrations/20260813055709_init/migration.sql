-- CreateTable
CREATE TABLE `tbl_member` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberEmail` VARCHAR(191) NOT NULL,
    `memberPassword` VARCHAR(191) NOT NULL,
    `memberName` VARCHAR(191) NOT NULL,
    `memberAge` INTEGER NOT NULL,
    `memberCreateAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tbl_member_memberEmail_key`(`memberEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
