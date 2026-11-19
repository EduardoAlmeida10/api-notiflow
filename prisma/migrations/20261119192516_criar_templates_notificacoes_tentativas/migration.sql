-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryAttemptStatus" AS ENUM ('SUCCESS', 'TEMPORARY_FAILURE', 'PERMANENT_FAILURE');

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "payload_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "DeliveryAttemptStatus" NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "templates_application_id_name_key" ON "templates"("application_id", "name");

-- CreateIndex
CREATE INDEX "notifications_application_id_status_idx" ON "notifications"("application_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_application_id_idempotency_key_key" ON "notifications"("application_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempts_notification_id_attempt_number_key" ON "delivery_attempts"("notification_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
