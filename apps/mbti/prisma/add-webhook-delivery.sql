-- Adds parent-webhook delivery columns to mbti.attempts (mirrors english.attempts)
-- + the filtered "undelivered" index. Applied via `prisma db execute` (this repo
-- never runs migrate dev/db push against the shared DB).
--
-- The index DDL references columns ADDed in the same batch, and SQL Server
-- compiles a batch up front — so it is wrapped in sp_executesql (same trick as
-- merge-results.sql).

BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('mbti.attempts', 'callback_url') IS NULL
  ALTER TABLE [mbti].[attempts] ADD [callback_url] NVARCHAR(max),
    [delivery_attempts] INT NOT NULL CONSTRAINT [attempts_delivery_attempts_df] DEFAULT 0,
    [result_delivered_at] DATETIMEOFFSET;

-- Find pending webhook deliveries fast (completed but not yet pushed).
-- Filtered index: invisible to Prisma introspection, so it never drifts.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attempts_undelivered'
               AND object_id = OBJECT_ID('mbti.attempts'))
  EXEC sp_executesql N'CREATE INDEX [idx_attempts_undelivered]
    ON [mbti].[attempts] ([completed_at])
    WHERE status = ''completed'' AND result_delivered_at IS NULL';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
