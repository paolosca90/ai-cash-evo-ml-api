-- Fix signup: enable pgcrypto for gen_random_bytes/gen_random_uuid
create extension if not exists pgcrypto with schema public;

-- Ensure extension stays in public schema
alter extension pgcrypto set schema public;