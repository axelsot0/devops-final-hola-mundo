-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "balance" DECIMAL(14,2),
ADD COLUMN     "balanceAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

