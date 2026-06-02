BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[assessment_subjects] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [source_system] VARCHAR(80) NOT NULL,
    [external_user_id] VARCHAR(255) NOT NULL,
    [email_snapshot] NVARCHAR(255),
    [display_name_snapshot] NVARCHAR(255),
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [assessment_subjects_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [assessment_subjects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_subjects_source_system_external_user_id_key] UNIQUE NONCLUSTERED ([source_system],[external_user_id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_attempts] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [subject_id] UNIQUEIDENTIFIER NOT NULL,
    [attempt_token_hash] CHAR(64) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [started_at] DATETIMEOFFSET NOT NULL CONSTRAINT [assessment_attempts_started_at_df] DEFAULT CURRENT_TIMESTAMP,
    [completed_at] DATETIMEOFFSET,
    [expires_at] DATETIMEOFFSET NOT NULL,
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [assessment_attempts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [assessment_attempts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_attempts_attempt_token_hash_key] UNIQUE NONCLUSTERED ([attempt_token_hash])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_results] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [attempt_id] UNIQUEIDENTIFIER NOT NULL,
    [subject_id] UNIQUEIDENTIFIER NOT NULL,
    [mbti_code] VARCHAR(4) NOT NULL,
    [soft_code] VARCHAR(40),
    [axes_json] NVARCHAR(max) NOT NULL,
    [bars_json] NVARCHAR(max) NOT NULL,
    [confidence_json] NVARCHAR(max) NOT NULL,
    [midzones_json] NVARCHAR(max) NOT NULL,
    [facets_json] NVARCHAR(max) NOT NULL,
    [responses_json] NVARCHAR(max) NOT NULL,
    [engine_version] VARCHAR(50) NOT NULL,
    [completed_at] DATETIMEOFFSET NOT NULL,
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [assessment_results_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [assessment_results_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_results_attempt_id_key] UNIQUE NONCLUSTERED ([attempt_id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessment_attempts_subject_id_created_at_idx] ON [dbo].[assessment_attempts]([subject_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessment_results_subject_id_completed_at_idx] ON [dbo].[assessment_results]([subject_id], [completed_at] DESC);

-- AddForeignKey
ALTER TABLE [dbo].[assessment_attempts] ADD CONSTRAINT [assessment_attempts_subject_id_fkey] FOREIGN KEY ([subject_id]) REFERENCES [dbo].[assessment_subjects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_results] ADD CONSTRAINT [assessment_results_attempt_id_fkey] FOREIGN KEY ([attempt_id]) REFERENCES [dbo].[assessment_attempts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_results] ADD CONSTRAINT [assessment_results_subject_id_fkey] FOREIGN KEY ([subject_id]) REFERENCES [dbo].[assessment_subjects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

