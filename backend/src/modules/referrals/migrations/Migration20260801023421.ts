import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260801023421 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "referral_account" drop constraint if exists "referral_account_code_unique";`);
    this.addSql(`alter table if exists "referral_account" drop constraint if exists "referral_account_customer_id_unique";`);
    this.addSql(`alter table if exists "referral" drop constraint if exists "referral_referred_customer_id_unique";`);
    this.addSql(`create table if not exists "referral" ("id" text not null, "code" text not null, "host_customer_id" text not null, "referred_customer_id" text not null, "status" text check ("status" in ('pending', 'qualified', 'review', 'rejected')) not null default 'pending', "order_id" text null, "reward" integer not null default 0, "reason" text null, "cedula" text null, "phone" text null, "signup_ip" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_code" ON "referral" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_host_customer_id" ON "referral" ("host_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_referred_customer_id_unique" ON "referral" ("referred_customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_deleted_at" ON "referral" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "referral_account" ("id" text not null, "customer_id" text not null, "code" text not null, "balance" integer not null default 0, "redeemed" integer not null default 0, "qualified_count" integer not null default 0, "cedula" text null, "phone" text null, "accepts_marketing" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_account_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_account_customer_id_unique" ON "referral_account" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_account_code_unique" ON "referral_account" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_account_deleted_at" ON "referral_account" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral" cascade;`);

    this.addSql(`drop table if exists "referral_account" cascade;`);
  }

}
