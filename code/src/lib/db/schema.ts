import { SubTask } from '@/lib/services/geminiService';
import { pgTable, uuid, varchar, text, boolean, jsonb, numeric, timestamp, pgEnum, serial } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

/**
 * Represents a single saved estimation record in the database.
 */
export interface EstimationHistory {
  id: string;
  project_id: string | null; // Can be null for global references
  source_project_id: string | null; // For cloned references, which project did it come from?
  function_name: string;
  feature_description: string;
  system_prompt: string;
  is_reference: boolean;
  sub_tasks: SubTask[]; // Stored as JSONB
  cost: string;
  created_at: Date | null;
  description_vector: number[] | null; // Stored as VECTOR
}

export const estimation_history = pgTable('estimation_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  source_project_id: uuid('source_project_id').references(() => projects.id, { onDelete: 'set null' }),
  function_name: varchar('function_name', { length: 255 }).notNull(),
  feature_description: text('feature_description').notNull(),
  system_prompt: text('system_prompt').notNull(),
  is_reference: boolean('is_reference').notNull().default(false),
  sub_tasks: jsonb('sub_tasks').notNull().$type<SubTask[]>(),
  cost: numeric('cost', { precision: 10, scale: 6 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  description_vector: vector('description_vector', { dimensions: 768 }),
});

/**
 * The SQL schema for the EstimationHistory table.
 * This is for reference and setup, not executed by the application directly.
 */
export const schemaSQL = `
-- Run this in your PostgreSQL database that has the pgvector extension enabled.
CREATE TABLE IF NOT EXISTS estimation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Link to a project, can be null
  source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- For cloned references
  function_name VARCHAR(255) NOT NULL,
  feature_description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  is_reference BOOLEAN NOT NULL DEFAULT FALSE,
  sub_tasks JSONB NOT NULL,
  cost NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description_vector VECTOR(768) -- Dimension for Google's text-embedding-004 model
)`;

/**
 * Represents a single project in the database.
 */
export interface Project {
  id: string;
  name_th: string;
  name_en: string;
  description: string;
  duration_months: number;
  created_at: Date | null;
  updated_at: Date | null;
}

export const projects = pgTable('projects', {
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  id: uuid('id').primaryKey().defaultRandom(),
  name_th: varchar('name_th', { length: 255 }).notNull(),
  name_en: varchar('name_en', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  duration_months: numeric('duration_months', { precision: 5, scale: 2 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * The SQL schema for the projects table.
 */
export const projectSchemaSQL = `
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_months NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

/**
 * Represents a single user story linked to a project.
 */
export interface UserStory {
  id: string;
  project_id: string;
  feature_name: string;
  story_text: string;
  created_at: Date | null;
}

export const user_stories = pgTable('user_stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  feature_name: varchar('feature_name', { length: 255 }).notNull(),
  story_text: text('story_text').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * The SQL schema for the user_stories table.
 */
export const userStorySchemaSQL = `
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  story_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

// 1. สร้าง Enum สำหรับ 'role'
export const userRoleEnum = pgEnum('user_role', ['superadmin', 'admin', 'user']);

// 2. สร้างและ export ตาราง 'users'
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  organization_id: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The SQL schema for altering the users table to add organization_id.
 */
export const userAlterSchemaSQL = `
ALTER TABLE users
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
`;

/**
 * Represents a single organization in the database.
 */
export interface Organization {
  id: string;
  name_th: string;
  name_en: string;
  description: string;
  created_at: Date | null;
}

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name_th: varchar('name_th', { length: 255 }).notNull(),
  name_en: varchar('name_en', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * The SQL schema for the organizations table.
 */
export const organizationSchemaSQL = `
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;