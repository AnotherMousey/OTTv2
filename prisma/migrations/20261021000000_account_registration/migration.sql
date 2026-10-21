-- Registration stays closed until a judge enables it. Existing accounts are untouched.
CREATE TABLE `RegistrationSettings` (
  `id` VARCHAR(32) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
