-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(30) NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(200) NOT NULL,
    `role` VARCHAR(12) NOT NULL DEFAULT 'player',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `rating` INTEGER NOT NULL DEFAULT 1000,
    `games` INTEGER NOT NULL DEFAULT 0,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `draws` INTEGER NOT NULL DEFAULT 0,
    `losses` INTEGER NOT NULL DEFAULT 0,
    `lastDelta` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_rating_id_idx`(`rating`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `tokenHash` CHAR(64) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tournament` (
    `id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(240) NOT NULL,
    `ownerId` VARCHAR(30) NOT NULL,
    `phase` VARCHAR(20) NOT NULL DEFAULT 'registration',
    `round` INTEGER NOT NULL DEFAULT 1,
    `totalRounds` INTEGER NOT NULL DEFAULT 3,
    `capacity` INTEGER NOT NULL DEFAULT 4000,
    `mapId` VARCHAR(32) NOT NULL DEFAULT 'standard-9',
    `firstSide` VARCHAR(8) NOT NULL DEFAULT 'white',
    `maxTurns` INTEGER NOT NULL DEFAULT 31,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tournament_phase_createdAt_idx`(`phase`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entry` (
    `tournamentId` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'pending',
    `activeSubmissionId` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Entry_tournamentId_status_userId_idx`(`tournamentId`, `status`, `userId`),
    PRIMARY KEY (`tournamentId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `tournamentId` VARCHAR(64) NULL,
    `filename` VARCHAR(100) NOT NULL,
    `language` VARCHAR(8) NOT NULL,
    `source` LONGTEXT NOT NULL,
    `sourceHash` CHAR(64) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(16) NOT NULL DEFAULT 'queued',
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Submission_userId_tournamentId_createdAt_idx`(`userId`, `tournamentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(48) NOT NULL,
    `tournamentId` VARCHAR(64) NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `whiteId` VARCHAR(30) NOT NULL,
    `blackId` VARCHAR(30) NULL,
    `whiteSubmissionId` VARCHAR(30) NULL,
    `blackSubmissionId` VARCHAR(30) NULL,
    `ownerId` VARCHAR(30) NULL,
    `status` VARCHAR(16) NOT NULL DEFAULT 'queued',
    `config` JSON NOT NULL,
    `runId` VARCHAR(36) NULL,
    `whiteBefore` INTEGER NOT NULL DEFAULT 1000,
    `blackBefore` INTEGER NOT NULL DEFAULT 1000,
    `whiteDelta` INTEGER NOT NULL DEFAULT 0,
    `blackDelta` INTEGER NOT NULL DEFAULT 0,
    `score` DOUBLE NULL,
    `result` JSON NULL,
    `metadata` JSON NULL,
    `snapshot` JSON NULL,
    `error` TEXT NULL,
    `rated` BOOLEAN NOT NULL DEFAULT false,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Match_tournamentId_round_status_idx`(`tournamentId`, `round`, `status`),
    INDEX `Match_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Match_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
    UNIQUE INDEX `Match_tournamentId_round_whiteId_key`(`tournamentId`, `round`, `whiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Frame` (
    `matchId` VARCHAR(48) NOT NULL,
    `runId` VARCHAR(36) NOT NULL,
    `seq` INTEGER NOT NULL,
    `payload` JSON NOT NULL,

    PRIMARY KEY (`matchId`, `runId`, `seq`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(30) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `type` VARCHAR(12) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'queued',
    `submissionId` VARCHAR(30) NULL,
    `matchId` VARCHAR(48) NULL,
    `config` JSON NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `claim` VARCHAR(36) NULL,
    `leaseUntil` DATETIME(3) NULL,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Job_key_key`(`key`),
    INDEX `Job_status_availableAt_createdAt_idx`(`status`, `availableAt`, `createdAt`),
    INDEX `Job_status_leaseUntil_idx`(`status`, `leaseUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateBucket` (
    `key` VARCHAR(100) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RateBucket_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audit` (
    `id` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NULL,
    `action` VARCHAR(48) NOT NULL,
    `tournamentId` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Audit_tournamentId_createdAt_idx`(`tournamentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tournament` ADD CONSTRAINT `Tournament_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_activeSubmissionId_fkey` FOREIGN KEY (`activeSubmissionId`) REFERENCES `Submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Frame` ADD CONSTRAINT `Frame_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

