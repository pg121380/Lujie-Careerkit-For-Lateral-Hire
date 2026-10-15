-- Add project materials: user-uploaded project documents stored as extracted plain text,
-- with resume-material draft generations kept inline as JSON.
CREATE TABLE "ProjectMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "generations" JSONB NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "ProjectMaterial_updatedAt_idx" ON "ProjectMaterial"("updatedAt");
