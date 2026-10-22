-- open: joining players are accepted. judge: the organizing judge adds players.
ALTER TABLE `Tournament` ADD COLUMN `entryMode` VARCHAR(8) NOT NULL DEFAULT 'open';
