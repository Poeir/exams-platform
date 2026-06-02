-- Fold mbti.results into mbti.attempts (1:1 — results.attempt_id was UNIQUE),
-- giving attempts the same lifecycle+result single-table shape as
-- english.attempts. Run AFTER phase2-transfer.sql.
--
-- Apply once per database:
--   npx prisma db execute --file prisma/merge-results.sql --schema prisma/schema.prisma
--
-- Result ids die with the table: a result is addressed by its attempt id from
-- now on (toResultRecord returns id = attempt id). In-flight /assessment-results
-- links issued before this migration will 404.
--
-- The UPDATE/INDEX statements run through sp_executesql because SQL Server
-- compiles a whole batch up front — referencing the columns the ALTER above
-- just added would otherwise fail with "invalid column name".

BEGIN TRY

BEGIN TRAN;

ALTER TABLE [mbti].[attempts] ADD
    [mbti_code] VARCHAR(4),
    [soft_code] VARCHAR(40),
    [axes_json] NVARCHAR(max),
    [bars_json] NVARCHAR(max),
    [confidence_json] NVARCHAR(max),
    [midzones_json] NVARCHAR(max),
    [facets_json] NVARCHAR(max),
    [responses_json] NVARCHAR(max),
    [engine_version] VARCHAR(50);

-- Copy every result onto its attempt row. completed_at already lives on
-- attempts (the completion flow stamped both tables with the same value);
-- COALESCE keeps the attempt's own stamp when present.
EXEC sp_executesql N'
UPDATE a SET
    a.[mbti_code]       = r.[mbti_code],
    a.[soft_code]       = r.[soft_code],
    a.[axes_json]       = r.[axes_json],
    a.[bars_json]       = r.[bars_json],
    a.[confidence_json] = r.[confidence_json],
    a.[midzones_json]   = r.[midzones_json],
    a.[facets_json]     = r.[facets_json],
    a.[responses_json]  = r.[responses_json],
    a.[engine_version]  = r.[engine_version],
    a.[completed_at]    = COALESCE(a.[completed_at], r.[completed_at])
FROM [mbti].[attempts] a
JOIN [mbti].[results] r ON r.[attempt_id] = a.[id];';

DROP TABLE [mbti].[results];

-- Serves listSubjectResults (completed attempts per subject, newest first).
EXEC sp_executesql N'
CREATE NONCLUSTERED INDEX [attempts_subject_id_completed_at_idx]
    ON [mbti].[attempts]([subject_id], [completed_at] DESC);';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
