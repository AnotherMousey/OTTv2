-- Existing tournaments keep their implicit 00:00 start.
ALTER TABLE `Tournament` ADD COLUMN `startTime` CHAR(5) NOT NULL DEFAULT '00:00';
