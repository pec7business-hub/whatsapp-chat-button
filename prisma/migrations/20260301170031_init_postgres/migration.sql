-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL DEFAULT '',
    "defaultMessage" TEXT NOT NULL DEFAULT 'Ciao! Ho una domanda riguardo...',
    "buttonPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "buttonSize" TEXT NOT NULL DEFAULT 'medium',
    "buttonColor" TEXT NOT NULL DEFAULT '#25D366',
    "tooltipText" TEXT NOT NULL DEFAULT 'Chatta con noi!',
    "tooltipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "showOnDesktop" BOOLEAN NOT NULL DEFAULT true,
    "marginBottom" INTEGER NOT NULL DEFAULT 20,
    "marginSide" INTEGER NOT NULL DEFAULT 20,
    "animation" TEXT NOT NULL DEFAULT 'pulse',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "availabilityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "availabilityDays" TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '18:00',
    "offlineMessage" TEXT NOT NULL DEFAULT 'Siamo offline. Lasciaci un messaggio!',
    "agents" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "page" TEXT NOT NULL DEFAULT '/',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");

-- CreateIndex
CREATE INDEX "ClickEvent_shop_createdAt_idx" ON "ClickEvent"("shop", "createdAt");
