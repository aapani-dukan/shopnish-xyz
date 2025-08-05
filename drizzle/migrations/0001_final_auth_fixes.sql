ALTER TABLE "users" RENAME COLUMN "uuid" TO "firebase_uid";
ALTER TABLE "users" ADD CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid");

ALTER TABLE "delivery_boys" RENAME COLUMN "uuid" TO "firebase_uid";
ALTER TABLE "delivery_boys" ADD CONSTRAINT "delivery_boys_firebase_uid_unique" UNIQUE("firebase_uid");
