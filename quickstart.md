# Quickstart: PostgreSQL Database Setup

This guide outlines the general steps to configure a PostgreSQL database for the "Project Estimation History" feature.

## Prerequisites

- Access to a PostgreSQL database instance (local, cloud-hosted, etc.).

## Step 1: Create a Database

1.  Create a new database in your PostgreSQL instance for this project.

## Step 2: Enable the `pgvector` Extension

1.  Connect to your newly created database using a SQL client (like `psql`, DBeaver, etc.).
2.  Execute the following SQL command to enable the vector extension, which is necessary for semantic search:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

## Step 3: Configure Local Environment

1.  Obtain the connection string (URL) for your database. It typically follows the format: `postgres://USER:PASSWORD@HOST:PORT/DATABASE`.
2.  Create a file named `.env.local` in the `code/` directory of your project and paste the entire connection string into it. This file is ignored by Git and will not be committed.
