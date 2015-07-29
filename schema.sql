CREATE SCHEMA `data_labeler`;

USE data_labeler;

CREATE TABLE `data` (
  `auto_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `id` varchar(32) NOT NULL DEFAULT '',
  `account_sid` varchar(64) NOT NULL DEFAULT '',
  `body` text NOT NULL,
  `cluster` varchar(16) NOT NULL DEFAULT '',
  `is_spam` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9155 DEFAULT CHARSET=utf8;
