-- Add suggested_project text field to items
-- AI suggests a project name but doesn't auto-create it
-- Run in Supabase SQL Editor

alter table items add column if not exists suggested_project text;
