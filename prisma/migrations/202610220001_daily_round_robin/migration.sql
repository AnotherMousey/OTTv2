ALTER TABLE `Tournament`
 ADD COLUMN `format` VARCHAR(24) NOT NULL DEFAULT 'legacy',
 ADD COLUMN `startDate` CHAR(10) NULL,
 ADD COLUMN `endDate` CHAR(10) NULL,
 ADD COLUMN `publishedBatchId` VARCHAR(48) NULL;
ALTER TABLE `Submission` ADD COLUMN `readyAt` DATETIME(3) NULL;
-- Preserve validation evidence for existing immutable ready sources.
UPDATE `Submission` SET `readyAt` = CURRENT_TIMESTAMP(3) WHERE `status` = 'ready';
CREATE TABLE `DailyBatch` (
 `id` VARCHAR(48) NOT NULL, `tournamentId` VARCHAR(64) NOT NULL,
 `date` CHAR(10) NOT NULL, `round` INTEGER NOT NULL,
 `cutoff` DATETIME(3) NOT NULL, `publishAfter` DATETIME(3) NOT NULL,
 `state` VARCHAR(16) NOT NULL DEFAULT 'scheduling', `bots` JSON NOT NULL, `config` JSON NOT NULL,
 `expected` INTEGER NOT NULL, `scheduled` INTEGER NOT NULL DEFAULT 0,
 `ratingCursor` INTEGER NOT NULL DEFAULT 0, `publishedAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), UNIQUE INDEX `DailyBatch_tournamentId_date_key` (`tournamentId`,`date`),
 INDEX `DailyBatch_tournamentId_state_date_idx` (`tournamentId`,`state`,`date`),
 CONSTRAINT `DailyBatch_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `DailyStanding` (
 `batchId` VARCHAR(48) NOT NULL, `userId` VARCHAR(30) NOT NULL,
 `rating` INTEGER NOT NULL DEFAULT 1000, `games` INTEGER NOT NULL DEFAULT 0,
 `wins` INTEGER NOT NULL DEFAULT 0, `draws` INTEGER NOT NULL DEFAULT 0,
 `losses` INTEGER NOT NULL DEFAULT 0, `points` DOUBLE NOT NULL DEFAULT 0, `lastDelta` INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY (`batchId`,`userId`), INDEX `DailyStanding_batchId_points_rating_userId_idx` (`batchId`,`points`,`rating`,`userId`),
 CONSTRAINT `DailyStanding_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `DailyBatch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Match`
 ADD COLUMN `batchId` VARCHAR(48) NULL, ADD COLUMN `sequence` INTEGER NULL,
 ADD INDEX `Match_tournamentId_round_whiteId_idx` (`tournamentId`,`round`,`whiteId`),
 DROP INDEX `Match_tournamentId_round_whiteId_key`,
 ADD UNIQUE INDEX `Match_batchId_sequence_key` (`batchId`,`sequence`),
 ADD CONSTRAINT `Match_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `DailyBatch` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX `Submission_tournamentId_createdAt_idx` ON `Submission` (`tournamentId`,`createdAt`);
CREATE INDEX `Match_batchId_status_idx` ON `Match` (`batchId`,`status`);
