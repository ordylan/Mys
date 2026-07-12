CREATE DATABASE IF NOT EXISTS `MyKPs` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `MyKPs`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `pass` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Announcements 检测主键和updatedAt
CREATE TABLE `Announcements` (
  `userid` VARCHAR(64) NOT NULL,
  `id` BIGINT NOT NULL,
  `text` LONGTEXT,
  `createdAt` DATETIME(3),
  `updatedAt` DATETIME(3),
  `pinned` TINYINT(1) DEFAULT 0,
  `pinnedAt` DATETIME(3),
  `deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`userid`, `id`),
  KEY `updateat` (`userid`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. AppConfig 通过主键 or updateat完整更新
CREATE TABLE `AppConfig` (
  `userid` VARCHAR(64) NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `subjects` LONGTEXT,
  `updatedAt` DATETIME(3),
  `deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`userid`, `id`),
  KEY `updateat` (`userid`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. DailyPlans检测updateat
CREATE TABLE `DailyPlans` (
  `userid` VARCHAR(64) NOT NULL,
  `id` BIGINT NOT NULL,
  `date` DATE,
  `category` VARCHAR(32),
  `tag` VARCHAR(32),
  `content` TEXT,
  `kpsId` BIGINT DEFAULT NULL,
  `status` INT DEFAULT NULL,
  `createdAt` DATETIME(3),
  `statusUpdatedAt` DATETIME(3),
  `deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`userid`, `id`),
  KEY `updateat` (`userid`, `statusUpdatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Flawless
CREATE TABLE `Flawless` (
  `userid` VARCHAR(64) NOT NULL,
  `id` BIGINT NOT NULL,
  `date` DATE,
  `text` TEXT,
  `updatedAt` DATETIME(3),
  `deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`userid`, `id`),
  KEY `updateat` (`userid`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. KPs updateat
CREATE TABLE `KPs` (
  `userid` VARCHAR(64) NOT NULL,
  `uniqueId` BIGINT NOT NULL,
  `subject` VARCHAR(32),
  `name` VARCHAR(128),
  `clickCount` INT DEFAULT 0,
  `lastClicked` DATETIME(3),
    `updatedAt` DATETIME(3),
  `deleted` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`userid`, `uniqueId`),
  KEY `updateat` (`userid`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. MyLearningLogs updateat
CREATE TABLE `MyLearningLogs` (
  `userid` VARCHAR(64) NOT NULL,
  `id` BIGINT NOT NULL,
  `KPsId` BIGINT,
  `KPsName` VARCHAR(128),
  `timestamp` DATETIME(3),
  PRIMARY KEY (`userid`, `id`),
  KEY `updateat` (`userid`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;