BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[papers] (
    [id] VARCHAR(255) NOT NULL,
    [name] NVARCHAR(500) NOT NULL,
    [description] NVARCHAR(max),
    [status] VARCHAR(40),
    [total_score] INT,
    [time_limit_min] INT,
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [papers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [completed_at] DATETIMEOFFSET,
    CONSTRAINT [papers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sections] (
    [id] VARCHAR(255) NOT NULL,
    [paper_id] VARCHAR(255) NOT NULL,
    [name] NVARCHAR(500) NOT NULL,
    [part_number] INT,
    [skill] VARCHAR(80),
    [cefr] VARCHAR(20),
    [topic] NVARCHAR(500),
    [passage_length] INT,
    [item_count] INT,
    [section_score] INT,
    [section_time_min] INT,
    [passage_id] VARCHAR(255),
    [passage_content] NVARCHAR(max),
    [order_index] INT NOT NULL CONSTRAINT [sections_order_index_df] DEFAULT 0,
    CONSTRAINT [sections_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[items] (
    [id] VARCHAR(255) NOT NULL,
    [section_id] VARCHAR(255) NOT NULL,
    [stem] NVARCHAR(max) NOT NULL,
    [question_type] VARCHAR(80),
    [cefr_level] VARCHAR(20),
    [difficulty_band] VARCHAR(40),
    [score_weight] FLOAT(53),
    [correct_answer] NVARCHAR(max) NOT NULL,
    [explanation] NVARCHAR(max),
    [judge_score] FLOAT(53),
    [objective] NVARCHAR(max),
    [tags] NVARCHAR(max) NOT NULL CONSTRAINT [items_tags_df] DEFAULT '[]',
    [order_index] INT NOT NULL CONSTRAINT [items_order_index_df] DEFAULT 0,
    [options] NVARCHAR(max) NOT NULL,
    [extras] NVARCHAR(max) NOT NULL CONSTRAINT [items_extras_df] DEFAULT '{}',
    CONSTRAINT [items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[attempts] (
    [id] VARCHAR(255) NOT NULL,
    [paper_id] VARCHAR(255) NOT NULL,
    [user_ref] VARCHAR(255),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [attempts_status_df] DEFAULT 'pending',
    [launch_token] VARCHAR(64),
    [launch_token_expires_at] DATETIMEOFFSET,
    [callback_url] NVARCHAR(max),
    [answers] NVARCHAR(max) NOT NULL CONSTRAINT [attempts_answers_df] DEFAULT '{}',
    [result] NVARCHAR(max),
    [correct_total] INT,
    [max_total] INT,
    [cefr_level] INT,
    [cefr_label] VARCHAR(40),
    [time_limit_min] INT,
    [expires_at] DATETIMEOFFSET,
    [result_delivered_at] DATETIMEOFFSET,
    [delivery_attempts] INT NOT NULL CONSTRAINT [attempts_delivery_attempts_df] DEFAULT 0,
    [created_at] DATETIMEOFFSET NOT NULL CONSTRAINT [attempts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [started_at] DATETIMEOFFSET,
    [submitted_at] DATETIMEOFFSET,
    [updated_at] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [attempts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [attempts_launch_token_key] UNIQUE NONCLUSTERED ([launch_token])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sections_paper_id_part_number_order_index_idx] ON [dbo].[sections]([paper_id], [part_number], [order_index]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [items_section_id_order_index_idx] ON [dbo].[items]([section_id], [order_index]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attempts_paper_id_idx] ON [dbo].[attempts]([paper_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attempts_user_ref_idx] ON [dbo].[attempts]([user_ref]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [attempts_status_idx] ON [dbo].[attempts]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[sections] ADD CONSTRAINT [sections_paper_id_fkey] FOREIGN KEY ([paper_id]) REFERENCES [dbo].[papers]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[items] ADD CONSTRAINT [items_section_id_fkey] FOREIGN KEY ([section_id]) REFERENCES [dbo].[sections]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[attempts] ADD CONSTRAINT [attempts_paper_id_fkey] FOREIGN KEY ([paper_id]) REFERENCES [dbo].[papers]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
