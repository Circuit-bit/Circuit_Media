-- Circuit Media MySQL schema (ported from Prisma)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS circuit_media CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE circuit_media;

DROP TABLE IF EXISTS comparison_items;
DROP TABLE IF EXISTS comparisons;
DROP TABLE IF EXISTS editorial_contents;
DROP TABLE IF EXISTS ai_contents;
DROP TABLE IF EXISTS verification_records;
DROP TABLE IF EXISTS benchmarks;
DROP TABLE IF EXISTS user_reviews;
DROP TABLE IF EXISTS professional_reviews;
DROP TABLE IF EXISTS price_offers;
DROP TABLE IF EXISTS retailers;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS specifications;
DROP TABLE IF EXISTS specification_groups;
DROP TABLE IF EXISTS device_variants;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS device_categories;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS data_sources;

CREATE TABLE brands (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  slug VARCHAR(191) NOT NULL UNIQUE,
  device_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE device_categories (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  slug VARCHAR(64) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE data_sources (
  id VARCHAR(32) PRIMARY KEY,
  provider VARCHAR(128) NOT NULL,
  url VARCHAR(512) NOT NULL,
  license VARCHAR(255) NULL,
  retrieved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_payload_hash VARCHAR(128) NULL,
  UNIQUE KEY uq_provider_url (provider, url(191))
) ENGINE=InnoDB;

CREATE TABLE devices (
  id VARCHAR(191) PRIMARY KEY,
  brand_id VARCHAR(32) NOT NULL,
  category_id VARCHAR(32) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  source_slug VARCHAR(191) NULL,
  model_name VARCHAR(255) NOT NULL,
  model_number VARCHAR(512) NULL,
  announcement_date DATE NULL,
  release_date DATE NULL,
  availability_status VARCHAR(128) NULL,
  starting_price DECIMAL(12,2) NULL,
  currency VARCHAR(8) NULL DEFAULT 'USD',
  official_product_url VARCHAR(512) NULL,
  verification_status ENUM('VERIFIED','CONFLICTING','UNVERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
  score DECIMAL(4,1) NULL,
  popularity INT NOT NULL DEFAULT 0,
  summary TEXT NULL,
  image_url VARCHAR(512) NULL,
  accent VARCHAR(32) NULL,
  best_for_json JSON NULL,
  pros_json JSON NULL,
  cons_json JSON NULL,
  component_scores_json JSON NULL,
  features_json JSON NULL,
  device_json JSON NOT NULL,
  raw_provider_payload JSON NULL,
  last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_devices_brand FOREIGN KEY (brand_id) REFERENCES brands(id),
  CONSTRAINT fk_devices_category FOREIGN KEY (category_id) REFERENCES device_categories(id),
  KEY idx_brand_model (brand_id, model_name),
  KEY idx_category_release (category_id, release_date),
  KEY idx_popularity (popularity),
  KEY idx_score (score)
) ENGINE=InnoDB;

CREATE TABLE device_variants (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  region VARCHAR(64) NULL,
  color VARCHAR(64) NULL,
  ram_gb INT NULL,
  storage_gb INT NULL,
  model_number VARCHAR(512) NULL,
  CONSTRAINT fk_variants_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_variant (device_id, region, ram_gb, storage_gb, model_number)
) ENGINE=InnoDB;

CREATE TABLE specification_groups (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE specifications (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  group_id VARCHAR(32) NOT NULL,
  `key` VARCHAR(128) NOT NULL,
  label VARCHAR(255) NOT NULL,
  value_text TEXT NULL,
  value_number DECIMAL(18,4) NULL,
  unit VARCHAR(32) NULL,
  region VARCHAR(64) NULL,
  verification_status ENUM('VERIFIED','CONFLICTING','UNVERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
  source_id VARCHAR(32) NOT NULL,
  last_verified_at DATETIME NULL,
  CONSTRAINT fk_specs_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_specs_group FOREIGN KEY (group_id) REFERENCES specification_groups(id),
  CONSTRAINT fk_specs_source FOREIGN KEY (source_id) REFERENCES data_sources(id),
  UNIQUE KEY uq_spec (device_id, `key`, region)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  source_id VARCHAR(32) NOT NULL,
  url VARCHAR(512) NOT NULL,
  source_url VARCHAR(512) NOT NULL,
  license VARCHAR(255) NULL,
  color VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  match_confidence FLOAT NULL,
  last_verified_at DATETIME NULL,
  CONSTRAINT fk_images_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_images_source FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB;

CREATE TABLE retailers (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  url VARCHAR(512) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE price_offers (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  retailer_id VARCHAR(32) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  affiliate_url VARCHAR(512) NULL,
  availability VARCHAR(128) NULL,
  checked_at DATETIME NOT NULL,
  CONSTRAINT fk_prices_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_prices_retailer FOREIGN KEY (retailer_id) REFERENCES retailers(id)
) ENGINE=InnoDB;

CREATE TABLE professional_reviews (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  source_id VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(128) NULL,
  score DECIMAL(4,2) NULL,
  excerpt TEXT NULL,
  url VARCHAR(512) NOT NULL,
  published_at DATETIME NULL,
  CONSTRAINT fk_proreviews_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_proreviews_source FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB;

CREATE TABLE user_reviews (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('DRAFT','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_userreviews_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE benchmarks (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  source_id VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  score DECIMAL(18,4) NULL,
  methodology_url VARCHAR(512) NOT NULL,
  measured_at DATETIME NULL,
  CONSTRAINT fk_bench_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_bench_source FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB;

CREATE TABLE comparisons (
  id VARCHAR(32) PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  priorities_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE comparison_items (
  comparison_id VARCHAR(32) NOT NULL,
  device_id VARCHAR(191) NOT NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (comparison_id, device_id),
  CONSTRAINT fk_ci_comparison FOREIGN KEY (comparison_id) REFERENCES comparisons(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE verification_records (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  source_id VARCHAR(32) NOT NULL,
  field_path VARCHAR(255) NOT NULL,
  status ENUM('VERIFIED','CONFLICTING','UNVERIFIED') NOT NULL,
  note VARCHAR(500) NULL,
  verified_by VARCHAR(128) NULL,
  verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vr_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_vr_source FOREIGN KEY (source_id) REFERENCES data_sources(id)
) ENGINE=InnoDB;

CREATE TABLE ai_contents (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  type VARCHAR(64) NOT NULL,
  content_json JSON NOT NULL,
  model VARCHAR(128) NOT NULL,
  confidence FLOAT NOT NULL,
  source_ids_json JSON NOT NULL,
  status ENUM('DRAFT','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ai_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE editorial_contents (
  id VARCHAR(32) PRIMARY KEY,
  device_id VARCHAR(191) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  author VARCHAR(128) NOT NULL,
  methodology TEXT NULL,
  status ENUM('DRAFT','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  published_at DATETIME NULL,
  CONSTRAINT fk_editorial_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO device_categories (id, name, slug) VALUES
  ('cat_phone', 'Phone', 'phone'),
  ('cat_tablet', 'Tablet', 'tablet'),
  ('cat_watch', 'Watch', 'watch');
