CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'CONFLICTING', 'UNVERIFIED');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Brand" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE TABLE "DeviceCategory" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "slug" TEXT NOT NULL UNIQUE);
CREATE TABLE "Device" (
  "id" TEXT PRIMARY KEY,
  "brandId" TEXT NOT NULL REFERENCES "Brand"("id"),
  "categoryId" TEXT NOT NULL REFERENCES "DeviceCategory"("id"),
  "slug" TEXT NOT NULL UNIQUE,
  "modelName" TEXT NOT NULL,
  "modelNumber" TEXT,
  "announcementDate" TIMESTAMPTZ,
  "releaseDate" TIMESTAMPTZ,
  "availabilityStatus" TEXT,
  "startingPrice" DECIMAL(12,2),
  "currency" TEXT,
  "officialProductUrl" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "rawProviderPayload" JSONB,
  "lastUpdatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "Device_brandId_modelName_idx" ON "Device"("brandId", "modelName");
CREATE INDEX "Device_categoryId_releaseDate_idx" ON "Device"("categoryId", "releaseDate");

CREATE TABLE "DeviceVariant" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "region" TEXT, "color" TEXT, "ramGb" INTEGER, "storageGb" INTEGER, "modelNumber" TEXT,
  UNIQUE ("deviceId", "region", "ramGb", "storageGb", "modelNumber")
);
CREATE TABLE "SpecificationGroup" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0);
CREATE TABLE "DataSource" (
  "id" TEXT PRIMARY KEY, "provider" TEXT NOT NULL, "url" TEXT NOT NULL, "license" TEXT,
  "retrievedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, "rawPayloadHash" TEXT,
  UNIQUE ("provider", "url")
);
CREATE TABLE "Specification" (
  "id" TEXT PRIMARY KEY,
  "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "groupId" TEXT NOT NULL REFERENCES "SpecificationGroup"("id"),
  "key" TEXT NOT NULL, "label" TEXT NOT NULL, "valueText" TEXT, "valueNumber" DECIMAL(18,4), "unit" TEXT, "region" TEXT,
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"), "lastVerifiedAt" TIMESTAMPTZ,
  UNIQUE ("deviceId", "key", "region")
);
CREATE TABLE "ProductImage" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"), "url" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL,
  "license" TEXT, "color" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "matchConfidence" DOUBLE PRECISION, "lastVerifiedAt" TIMESTAMPTZ
);
CREATE TABLE "Retailer" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "url" TEXT NOT NULL);
CREATE TABLE "PriceOffer" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "retailerId" TEXT NOT NULL REFERENCES "Retailer"("id"), "price" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL,
  "affiliateUrl" TEXT, "availability" TEXT, "checkedAt" TIMESTAMPTZ NOT NULL
);
CREATE TABLE "ProfessionalReview" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"), "title" TEXT NOT NULL, "author" TEXT,
  "score" DECIMAL(4,2), "excerpt" TEXT, "url" TEXT NOT NULL, "publishedAt" TIMESTAMPTZ
);
CREATE TABLE "UserReview" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("rating" BETWEEN 1 AND 5)
);
CREATE TABLE "Benchmark" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"), "name" TEXT NOT NULL, "score" DECIMAL(18,4),
  "methodologyUrl" TEXT NOT NULL, "measuredAt" TIMESTAMPTZ
);
CREATE TABLE "Comparison" ("id" TEXT PRIMARY KEY, "slug" TEXT NOT NULL UNIQUE, "priorities" JSONB, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "ComparisonItem" (
  "comparisonId" TEXT NOT NULL REFERENCES "Comparison"("id") ON DELETE CASCADE,
  "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE, "sortOrder" INTEGER NOT NULL,
  PRIMARY KEY ("comparisonId", "deviceId")
);
CREATE TABLE "VerificationRecord" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "sourceId" TEXT NOT NULL REFERENCES "DataSource"("id"), "fieldPath" TEXT NOT NULL,
  "status" "VerificationStatus" NOT NULL, "note" TEXT, "verifiedBy" TEXT, "verifiedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AIContent" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL, "content" JSONB NOT NULL, "model" TEXT NOT NULL, "confidence" DOUBLE PRECISION NOT NULL,
  "sourceIds" JSONB NOT NULL, "status" "ContentStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "EditorialContent" (
  "id" TEXT PRIMARY KEY, "deviceId" TEXT NOT NULL REFERENCES "Device"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "author" TEXT NOT NULL, "methodology" TEXT,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMPTZ
);
