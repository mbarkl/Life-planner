-- Add recurring flag to items
-- Run this in Supabase SQL Editor

alter table items add column if not exists recurring boolean default false;
