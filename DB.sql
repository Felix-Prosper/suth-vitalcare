-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: vitalcare
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `assessment_answers`
--

DROP TABLE IF EXISTS `assessment_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int DEFAULT NULL,
  `health_assessment_id` int DEFAULT NULL,
  `question_text` text COLLATE utf8mb4_general_ci NOT NULL COMMENT 'เก็บข้อความคำถามเพื่อดูประวัติย้อนหลังได้',
  `answer_text` text COLLATE utf8mb4_general_ci NOT NULL COMMENT 'ระบุข้อความคำตอบที่เลือก',
  `score` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `submission_id` (`submission_id`),
  KEY `fk_health_assessment` (`health_assessment_id`),
  CONSTRAINT `assessment_answers_ibfk_1` FOREIGN KEY (`submission_id`) REFERENCES `assessment_submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_health_assessment` FOREIGN KEY (`health_assessment_id`) REFERENCES `health_assessments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assessment_submissions`
--

DROP TABLE IF EXISTS `assessment_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `test_type` enum('pre_test','post_test') COLLATE utf8mb4_general_ci NOT NULL,
  `total_score` int DEFAULT '0',
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `target_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `target_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `description` text COLLATE utf8mb4_general_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `user_agent` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_user_action` (`user_id`,`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_chk_1` CHECK (json_valid(`metadata`))
) ENGINE=InnoDB AUTO_INCREMENT=4821 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `banners`
--

DROP TABLE IF EXISTS `banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image_url` longtext COLLATE utf8mb4_general_ci,
  `link_url` text COLLATE utf8mb4_general_ci,
  `link_type` enum('activity','url','none') COLLATE utf8mb4_general_ci DEFAULT 'none',
  `link_activity_id` int DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `positions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `link_activity_id` (`link_activity_id`),
  CONSTRAINT `banners_ibfk_1` FOREIGN KEY (`link_activity_id`) REFERENCES `events` (`id`) ON DELETE SET NULL,
  CONSTRAINT `banners_chk_1` CHECK (json_valid(`positions`))
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bonus_points`
--

DROP TABLE IF EXISTS `bonus_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bonus_points` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `points` int NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `given_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_user` (`event_id`,`user_id`),
  KEY `idx_event` (`event_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `certificate_templates`
--

DROP TABLE IF EXISTS `certificate_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `certificate_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'เกียรติบัตร',
  `background_url` longtext COLLATE utf8mb4_general_ci,
  `canvas_json` longtext COLLATE utf8mb4_general_ci COMMENT 'Fabric.js JSON ทั้ง canvas',
  `width` int DEFAULT '1754' COMMENT 'ความกว้าง pixels (A4 landscape 150dpi)',
  `height` int DEFAULT '1240' COMMENT 'ความสูง pixels',
  `issue_mode` enum('goal_complete','event_end','manual','immediately') COLLATE utf8mb4_general_ci DEFAULT 'event_end',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `certificate_templates_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_favorites`
--

DROP TABLE IF EXISTS `event_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_favorites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_event` (`user_id`,`event_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_favorites_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `event_leaderboards`
--

DROP TABLE IF EXISTS `event_leaderboards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_leaderboards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `rank` int DEFAULT NULL,
  `score` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `event_leaderboards_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_leaderboards_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `poster` longtext COLLATE utf8mb4_general_ci,
  `detail` longtext COLLATE utf8mb4_general_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `registration_start_date` date DEFAULT NULL,
  `registration_end_date` date DEFAULT NULL,
  `is_continuous_registration` tinyint(1) DEFAULT '0',
  `is_continuous_event` tinyint(1) DEFAULT '0',
  `is_unlimited_max_slots` tinyint(1) DEFAULT '0',
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `max_slots` int DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'กิจกรรม',
  `activity_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'event',
  `leaderboard_enabled` tinyint(1) DEFAULT '0',
  `team_mode` tinyint(1) DEFAULT '0',
  `location_name` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organizer` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `rules_regulations` text COLLATE utf8mb4_general_ci,
  `inclusions` text COLLATE utf8mb4_general_ci,
  `event_code` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `visibility` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `health_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'open',
  `publish_start_date` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `goal_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `certificate_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `assessment_config` longtext COLLATE utf8mb4_general_ci,
  `auto_join_team` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_event_search` (`start_date`,`end_date`,`status`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `events_chk_1` CHECK (json_valid(`visibility`)),
  CONSTRAINT `events_chk_2` CHECK (json_valid(`health_config`)),
  CONSTRAINT `events_chk_3` CHECK (json_valid(`goal_config`)),
  CONSTRAINT `events_chk_4` CHECK (json_valid(`certificate_config`))
) ENGINE=InnoDB AUTO_INCREMENT=681 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `gamification_titles`
--

DROP TABLE IF EXISTS `gamification_titles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gamification_titles` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `rarity` varchar(50) DEFAULT 'common',
  `conditions` json DEFAULT NULL,
  `hint` varchar(255) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `unlock_type` varchar(20) NOT NULL DEFAULT 'conditions',
  `unlock_code` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `health_assessments`
--

DROP TABLE IF EXISTS `health_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_score` int DEFAULT NULL,
  `overall_level` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `admin_comment` text COLLATE utf8mb4_general_ci,
  `commented_at` timestamp NULL DEFAULT NULL,
  `commented_by` int DEFAULT NULL,
  `summary_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `health_assessments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `health_assessments_chk_1` CHECK (json_valid(`summary_json`))
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `master_configs`
--

DROP TABLE IF EXISTS `master_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_configs` (
  `id` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `key_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `display_label` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category` (`category`,`key_name`),
  CONSTRAINT `master_configs_chk_1` CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mission_submissions`
--

DROP TABLE IF EXISTS `mission_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mission_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mission_id` int NOT NULL,
  `user_id` int NOT NULL,
  `submission_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `value` decimal(10,2) DEFAULT NULL,
  `image_url` text COLLATE utf8mb4_general_ci,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mission_id` (`mission_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `mission_submissions_ibfk_1` FOREIGN KEY (`mission_id`) REFERENCES `activity_missions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mission_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `event_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`event_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `registrations_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=951 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `submissions`
--

DROP TABLE IF EXISTS `submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `task_id` int DEFAULT NULL,
  `img_url` longtext COLLATE utf8mb4_general_ci,
  `text_response` text COLLATE utf8mb4_general_ci,
  `value` decimal(10,2) DEFAULT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `comment` text COLLATE utf8mb4_general_ci,
  `activity_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'exercise',
  `proof_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'manual',
  `device_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `task_id` (`task_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `submissions_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=978 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tanita`
--

DROP TABLE IF EXISTS `tanita`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tanita` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `submission_id` int DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `body_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gender` text COLLATE utf8mb4_general_ci,
  `age` int DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `waist_cm` text COLLATE utf8mb4_general_ci,
  `clothes_weight` decimal(5,2) DEFAULT NULL,
  `weight` text COLLATE utf8mb4_general_ci,
  `fat_pc` text COLLATE utf8mb4_general_ci,
  `fat_mass` text COLLATE utf8mb4_general_ci,
  `ffm` decimal(5,2) DEFAULT NULL,
  `muscle_mass` text COLLATE utf8mb4_general_ci,
  `tbw_mass` decimal(5,2) DEFAULT NULL,
  `tbw_pc` decimal(5,2) DEFAULT NULL,
  `bone_mass` decimal(5,2) DEFAULT NULL,
  `bmr_kj` int DEFAULT NULL,
  `bmr_kcal` int DEFAULT NULL,
  `metabolic_age` text COLLATE utf8mb4_general_ci,
  `visceral_fat` text COLLATE utf8mb4_general_ci,
  `bmi` text COLLATE utf8mb4_general_ci,
  `ideal_weight` decimal(5,2) DEFAULT NULL,
  `obesity_degree` decimal(5,2) DEFAULT NULL,
  `physique_rating` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `session_label` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `event_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `submission_id` (`submission_id`),
  KEY `user_id` (`user_id`),
  KEY `fk_tanita_event` (`event_id`),
  CONSTRAINT `fk_tanita_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tanita_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tanita_ibfk_2` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int DEFAULT NULL,
  `task_date` date DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `points` int DEFAULT '0',
  `allowed_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_active` tinyint(1) DEFAULT '1',
  `metric_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `metric_unit` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `goal_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `goal_value` decimal(10,2) DEFAULT NULL,
  `submission_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'manual',
  `use_ocr` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_chk_1` CHECK (json_valid(`allowed_days`))
) ENGINE=InnoDB AUTO_INCREMENT=1295 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `max_members` int DEFAULT '6',
  `host_id` int DEFAULT NULL,
  `total_score` decimal(10,2) DEFAULT '0.00',
  `is_private` tinyint(1) DEFAULT '0',
  `auto_join_activity` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `host_id` (`host_id`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`host_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_certificates`
--

DROP TABLE IF EXISTS `user_certificates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `image_url` longtext COLLATE utf8mb4_general_ci,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_event` (`user_id`,`event_id`),
  KEY `template_id` (`template_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `user_certificates_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `certificate_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_certificates_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_certificates_ibfk_3` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_titles`
--

DROP TABLE IF EXISTS `user_titles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title_id` varchar(255) NOT NULL,
  `unlocked_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_title` (`user_id`,`title_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `line_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `email` text COLLATE utf8mb4_general_ci,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` text COLLATE utf8mb4_general_ci,
  `fname_th` text COLLATE utf8mb4_general_ci,
  `lname_th` text COLLATE utf8mb4_general_ci,
  `nickname` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `gender` text COLLATE utf8mb4_general_ci,
  `birth_date` date DEFAULT NULL,
  `role` enum('admin','user','host') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user',
  `id_code` text COLLATE utf8mb4_general_ci,
  `address` text COLLATE utf8mb4_general_ci,
  `picture_url` longtext COLLATE utf8mb4_general_ci,
  `weight` text COLLATE utf8mb4_general_ci,
  `height` text COLLATE utf8mb4_general_ci,
  `underlying_disease` text COLLATE utf8mb4_general_ci,
  `main_goal` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total_score` decimal(10,2) DEFAULT '0.00',
  `points` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `role_detail_1` text COLLATE utf8mb4_general_ci,
  `role_detail_2` text COLLATE utf8mb4_general_ci,
  `is_suspended` tinyint(1) DEFAULT '0',
  `activity_level` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'sedentary',
  `reset_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `last_bot_task_id` int DEFAULT NULL,
  `pending_bot_result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `equipped_title_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `line_id` (`line_id`),
  KEY `fk_users_team` (`team_id`),
  KEY `idx_user_role_team` (`role`,`team_id`),
  CONSTRAINT `fk_users_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_chk_1` CHECK (json_valid(`pending_bot_result`))
) ENGINE=InnoDB AUTO_INCREMENT=401 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'vitalcare'
--

--
-- Dumping routines for database 'vitalcare'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-14 13:58:04
