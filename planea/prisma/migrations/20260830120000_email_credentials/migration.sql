-- CreateEnum
CREATE TYPE "EmailProviderKind" AS ENUM ('GMAIL');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "credentialId" TEXT;

-- CreateTable
CREATE TABLE "EmailCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProviderKind" NOT NULL DEFAULT 'GMAIL',
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailCredential_userId_provider_email_key" ON "EmailCredential"("userId", "provider", "email");

-- AddForeignKey
ALTER TABLE "EmailCredential" ADD CONSTRAINT "EmailCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "EmailCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

