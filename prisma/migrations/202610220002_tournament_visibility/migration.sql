ALTER TABLE `Tournament`
 ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN `deletedAt` DATETIME(3) NULL,
 ADD INDEX `Tournament_deletedAt_hidden_ownerId_idx` (`deletedAt`,`hidden`,`ownerId`);
