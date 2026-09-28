
CREATE TABLE `Act_prop_def` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `type_id` INT NOT NULL COMMENT '道具类型ID',
  `code` VARCHAR(64) NOT NULL COMMENT '道具友好id',
  `name` VARCHAR(128) NOT NULL COMMENT '道具名字',
  `description` VARCHAR(512) DEFAULT NULL COMMENT '道具介绍',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '图片',
  `quality` TINYINT NOT NULL DEFAULT 1 COMMENT '1-5',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prop_code` (`code`),
  KEY `idx_prop_type` (`type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='道具信息们';


CREATE TABLE `Act_myprops` (
  `userid` BIGINT NOT NULL COMMENT '用户id',
  `prop_id` BIGINT NOT NULL COMMENT '道具数字ID',
  `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userid`, `prop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='我的包包';

CREATE TABLE `Act_prop_log` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `userid` BIGINT NOT NULL COMMENT '用户id',
  `prop_id` BIGINT NOT NULL COMMENT '道具数字ID',
  `change_type` TINYINT NOT NULL COMMENT '变更类型：1获得 2消耗 3后台操作 4其他',
  `change_quantity` INT NOT NULL COMMENT '变更数量',
  `before_quantity` INT NOT NULL COMMENT '变更前数量',
  `reason` VARCHAR(64) NOT NULL COMMENT '业务原因',
  `ref_id` VARCHAR(64) DEFAULT NULL COMMENT '关联业务ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_prop_time` (`userid`, `prop_id`, `created_at`),
  KEY `idx_ref` (`ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='道具流水';


CREATE TABLE Act_task (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    userid     BIGINT UNSIGNED NOT NULL,
    period_type VARCHAR(32)  NOT NULL COMMENT 'daily, weekly, Act_2026_10...',
    task_start  DATETIME    NOT NULL COMMENT '任务开启时间(筛选要用不能乱写)',
    expires_at  DATETIME    NOT NULL COMMENT '清理数据用',
    task_type   VARCHAR(32) NOT NULL,
    config      JSON        NOT NULL COMMENT 'json',
    is_completed TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '是否已领奖',
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY idx_user_period (userid, period_type, task_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户活动任务';

