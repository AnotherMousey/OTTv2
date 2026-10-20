-- Optional account cosmetics; existing accounts keep their data and use ID-based defaults.
ALTER TABLE `User` ADD COLUMN `appearance` JSON NULL;
