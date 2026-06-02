-- Phase 2 transfer for the mbti service (english-test/docs/unified-db-plan.md).
--
-- Moves this service's tables out of dbo into the `mbti` schema, folds
-- dbo.assessment_subjects into the cross-service shared.subjects table
-- (created by english-test's migration ledger — run THAT first), and rewires
-- the subject FKs. Runs OUTSIDE any Prisma ledger by design: this repo owns
-- only the `mbti` schema and must never `db push`/`migrate dev` against the
-- shared database.
--
-- Apply once per database:
--   npx prisma db execute --file prisma/phase2-transfer.sql --schema prisma/schema.prisma
--
-- All moves are ALTER SCHEMA ... TRANSFER / sp_rename — pure metadata, no data
-- is copied except the subjects rows (which keep their GUIDs so existing
-- subject_id FK values stay valid).

BEGIN TRY

BEGIN TRAN;

-- 1) Own namespace.
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'mbti') EXEC sp_executesql N'CREATE SCHEMA [mbti];';

-- 2) Move + rename the lifecycle tables (schema gives the namespace, so the
--    assessment_ prefix is dropped).
ALTER SCHEMA mbti TRANSFER [dbo].[assessment_attempts];
ALTER SCHEMA mbti TRANSFER [dbo].[assessment_results];
EXEC sp_rename N'mbti.assessment_attempts', N'attempts';
EXEC sp_rename N'mbti.assessment_results', N'results';

-- 3) Rename constraints/indexes to match what Prisma would generate for the
--    new table names (keeps future `migrate diff --from-url` output clean).
EXEC sp_rename N'mbti.assessment_attempts_pkey', N'attempts_pkey', N'OBJECT';
EXEC sp_rename N'mbti.assessment_attempts_attempt_token_hash_key', N'attempts_attempt_token_hash_key', N'OBJECT';
EXEC sp_rename N'mbti.attempts.assessment_attempts_subject_id_created_at_idx', N'attempts_subject_id_created_at_idx', N'INDEX';
EXEC sp_rename N'mbti.assessment_attempts_started_at_df', N'attempts_started_at_df', N'OBJECT';
EXEC sp_rename N'mbti.assessment_attempts_created_at_df', N'attempts_created_at_df', N'OBJECT';

EXEC sp_rename N'mbti.assessment_results_pkey', N'results_pkey', N'OBJECT';
EXEC sp_rename N'mbti.assessment_results_attempt_id_key', N'results_attempt_id_key', N'OBJECT';
EXEC sp_rename N'mbti.results.assessment_results_subject_id_completed_at_idx', N'results_subject_id_completed_at_idx', N'INDEX';
EXEC sp_rename N'mbti.assessment_results_created_at_df', N'results_created_at_df', N'OBJECT';

EXEC sp_rename N'mbti.assessment_results_attempt_id_fkey', N'results_attempt_id_fkey', N'OBJECT';

-- 4) Fold identity rows into shared.subjects, GUIDs preserved. source_system
--    namespaces them away from english's backfilled rows, so the
--    (source_system, external_user_id) unique key cannot collide.
INSERT INTO [shared].[subjects]
    ([id], [source_system], [external_user_id], [email_snapshot], [display_name_snapshot], [created_at], [updated_at])
SELECT [id], [source_system], [external_user_id], [email_snapshot], [display_name_snapshot], [created_at], [updated_at]
FROM [dbo].[assessment_subjects];

-- 5) Re-point the subject FKs from dbo.assessment_subjects to shared.subjects,
--    then retire the old table.
ALTER TABLE [mbti].[attempts] DROP CONSTRAINT [assessment_attempts_subject_id_fkey];
ALTER TABLE [mbti].[attempts] ADD CONSTRAINT [attempts_subject_id_fkey]
    FOREIGN KEY ([subject_id]) REFERENCES [shared].[subjects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [mbti].[results] DROP CONSTRAINT [assessment_results_subject_id_fkey];
ALTER TABLE [mbti].[results] ADD CONSTRAINT [results_subject_id_fkey]
    FOREIGN KEY ([subject_id]) REFERENCES [shared].[subjects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

DROP TABLE [dbo].[assessment_subjects];

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
