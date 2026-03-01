-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'it',
ADD COLUMN     "productMessageTemplate" TEXT NOT NULL DEFAULT 'Ciao! Sono interessato a: {{product}}';
