-- Widen device primary keys so long GSM-style slugs fit (was VARCHAR(32)).
USE circuit_media;

SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE devices MODIFY id VARCHAR(191) NOT NULL;
ALTER TABLE device_variants MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE specifications MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE product_images MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE price_offers MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE professional_reviews MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE user_reviews MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE benchmarks MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE comparison_items MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE verification_records MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE ai_contents MODIFY device_id VARCHAR(191) NOT NULL;
ALTER TABLE editorial_contents MODIFY device_id VARCHAR(191) NOT NULL;
SET FOREIGN_KEY_CHECKS = 1;
