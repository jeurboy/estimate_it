import { SubTask } from '@/lib/services/geminiService';

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
  cost: number;
  created_at: Date;
  description_vector: number[]; // Stored as VECTOR
}

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
  created_at: Date;
  updated_at: Date;
}

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
  created_at: Date;
}

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
