-- 1) Drop the legacy free-text identity column: candidate identity now lives
--    exclusively on shared.subjects via attempts.subject_id.
-- 2) Fold the former prisma/sqlserver-constraints.sql objects into the ledger
--    so a fresh database needs nothing beyond `prisma migrate deploy`. Every
--    statement is IF-guarded: on databases where constraints.sql already ran
--    (local dev) the guards skip; on shadow/fresh replays they apply. Prisma
--    introspection ignores filtered indexes and CHECK constraints, so none of
--    these objects ever register as drift.
--
-- HAND-WRITTEN (like the phase2 migration): launch_token's @unique was
-- removed from schema.prisma in this change, so Prisma's generated diff would
-- emit a plain DROP CONSTRAINT that fails where the constraint was already
-- swapped for the filtered index.

BEGIN TRY

BEGIN TRAN;

-- DropColumn: user_ref (+ its index)
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'attempts_user_ref_idx')
  DROP INDEX [attempts_user_ref_idx] ON [english].[attempts];
IF COL_LENGTH('english.attempts', 'user_ref') IS NOT NULL
  ALTER TABLE [english].[attempts] DROP COLUMN [user_ref];

-- launch_token: swap Prisma's plain UNIQUE KEY constraint for a FILTERED
-- unique index. SQL Server allows only ONE NULL in a plain unique index, and
-- every consumed/anonymous attempt has launch_token = NULL.
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'attempts_launch_token_key')
  ALTER TABLE [english].[attempts] DROP CONSTRAINT [attempts_launch_token_key];
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE name = 'attempts_launch_token_key' AND is_unique = 1 AND has_filter = 0)
  DROP INDEX [attempts_launch_token_key] ON [english].[attempts];
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'attempts_launch_token_key')
  CREATE UNIQUE INDEX [attempts_launch_token_key]
    ON [english].[attempts] ([launch_token])
    WHERE [launch_token] IS NOT NULL;

-- Lifecycle CHECK on attempts.status.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'attempts_status_check')
  ALTER TABLE [english].[attempts] WITH CHECK
    ADD CONSTRAINT [attempts_status_check]
    CHECK (status IN ('pending', 'in_progress', 'submitted', 'expired'));

-- Find pending webhook deliveries fast (submitted but not yet pushed).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attempts_undelivered')
  CREATE INDEX [idx_attempts_undelivered]
    ON [english].[attempts] ([submitted_at])
    WHERE status = 'submitted' AND result_delivered_at IS NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
