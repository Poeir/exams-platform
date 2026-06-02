-- Phase 2 (docs/unified-db-plan.md): split ownership by SQL Server schema and
-- introduce the cross-service shared.subjects identity table.
--
-- HAND-WRITTEN. Prisma's generated diff wanted to CREATE all english tables
-- from scratch (it cannot see dbo once `schemas = ["english","shared"]` is
-- declared). Instead we MOVE the live dbo tables with ALTER SCHEMA ... TRANSFER
-- — a pure namespace move that keeps data, indexes, constraints and the
-- filtered launch_token index intact.
--
-- Shadow-replay safe: the init migration creates these tables in dbo, so the
-- TRANSFERs below work both on a fresh shadow database and on the real one.
-- mbti's tables are NOT touched here — they move via mbti-personality/prisma/
-- phase2-transfer.sql (applied with `prisma db execute` from that repo).

BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'english') EXEC sp_executesql N'CREATE SCHEMA [english];';

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'shared') EXEC sp_executesql N'CREATE SCHEMA [shared];';

-- Move the existing english tables out of dbo (data + constraints + indexes
-- move along; nothing is rebuilt).
ALTER SCHEMA english TRANSFER [dbo].[papers];
ALTER SCHEMA english TRANSFER [dbo].[sections];
ALTER SCHEMA english TRANSFER [dbo].[items];
ALTER SCHEMA english TRANSFER [dbo].[attempts];

-- CreateTable: the shared identity table. Created fresh here (owned by this
-- ledger); the mbti transfer script then copies its assessment_subjects rows
-- in, preserving their GUIDs so mbti's FKs keep pointing at the same ids.
CREATE TABLE [shared].[subjects] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [source_system] VARCHAR(80) NOT NULL,
    [external_user_id] VARCHAR(255) NOT NULL,
    [email_snapshot] NVARCHAR(255),
    [display_name_snapshot] NVARCHAR(255),
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [subjects_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [subjects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [subjects_source_system_external_user_id_key] UNIQUE NONCLUSTERED ([source_system],[external_user_id])
);

-- AlterTable: link attempts to the shared identity. Nullable — anonymous
-- attempts have no subject. user_ref stays populated for one deploy cycle.
ALTER TABLE [english].[attempts] ADD [subject_id] UNIQUEIDENTIFIER;

-- CreateIndex
CREATE NONCLUSTERED INDEX [attempts_subject_id_idx] ON [english].[attempts]([subject_id]);

-- AddForeignKey (NO ACTION: deleting a subject must not ripple into attempt
-- history, and it sidesteps SQL Server's multiple-cascade-path restriction).
ALTER TABLE [english].[attempts] ADD CONSTRAINT [attempts_subject_id_fkey] FOREIGN KEY ([subject_id]) REFERENCES [shared].[subjects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Backfill: every distinct non-null user_ref becomes one subject row
-- (source_system 'english' namespaces them away from mbti's rows), then the
-- attempts are pointed at their subject. No-op on an empty shadow database.
INSERT INTO [shared].[subjects] ([id], [source_system], [external_user_id], [created_at], [updated_at])
SELECT NEWID(), 'english', d.user_ref, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
FROM (SELECT DISTINCT user_ref FROM [english].[attempts] WHERE user_ref IS NOT NULL) AS d;

UPDATE att
SET att.subject_id = s.id
FROM [english].[attempts] AS att
JOIN [shared].[subjects] AS s
  ON s.source_system = 'english' AND s.external_user_id = att.user_ref
WHERE att.user_ref IS NOT NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
