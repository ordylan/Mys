-- backend/db_init.sql
-- MySQL table for MyFQs (single table)
CREATE TABLE IF NOT EXISTS `myfqs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `img_path` VARCHAR(512) NOT NULL,
  `key_coords` TEXT NOT NULL,
  `subject_code` TINYINT NOT NULL,
  `kps` VARCHAR(1024) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
