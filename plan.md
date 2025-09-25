# Implementation Plan: Project Estimation History and Reference

**Branch**: `003-estimation-history-and-reference` | **Date**: 2024-05-23 | **Spec**: ./spec.md
**Input**: Feature specification from `/code/spec.md`

## Summary

This feature introduces a persistence layer, allowing users to save estimations to a global reference database. This database provides relevant examples (few-shot prompting) for new estimations, improving AI accuracy. A key distinction is made between "History" (a log of estimations for the current project) and "Reference" (the global database of all past projects used for AI examples). The implementation requires a database, APIs for saving/retrieving data, and a UI for browsing the history.

## Technical Context

**Language/Version**: `TypeScript 5.x`
**Primary Dependencies**: `Next.js 14.x`, `React 18.x`, `antd`, `postgres` (for database), `@google/generative-ai` (for embeddings)
**Storage**: `PostgreSQL` with the `pgvector` extension.
**Testing**: `Jest`, `React Testing Library`
**Target Platform**: `Modern Web Browsers`
**Project Type**: `web`
**Performance Goals**: `Semantic search for similar projects should resolve in < 1000ms.`
**Constraints**: `Requires a Postgres database with vector support. The quality of semantic search is critical for the feature's success.`
**Scale/Scope**: `Adds a significant new data persistence and retrieval layer, including a database and vector search capabilities.`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Simplicity**: This feature introduces significant complexity (database, vector search). This is justified as it is a core requirement to enhance the AI's primary function. The approach uses a standard PostgreSQL database and the `@google/generative-ai` library to simplify the implementation. **PASS (Justified)**
- **Security**: Database credentials must be stored securely as environment variables. Input validation is required for all new API endpoints to prevent misuse. No sensitive user data is being stored. **PASS**
- **Testability**: New API endpoints and database service functions can be unit/integration tested. The UI components are testable. The semantic search logic can be tested by mocking the embedding and database query results. **PASS**

## Project Structure

### Modified Files

- `code/src/hooks/useEstimationPage.ts`: To call history APIs and pass the current project name to exclude it from reference searches.
- `code/src/app/(main)/page.tsx`: To add the "Save to History" UI.
- `code/src/lib/services/geminiService.ts`: To potentially modify the prompt structure to include examples.

### New Files

- `code/src/lib/db/schema.ts`: To define the database table schema.
- `code/src/lib/db/history.ts`: To contain database query functions (save, list, find similar).
- `code/src/lib/services/embeddingService.ts`: To handle the creation of vector embeddings.
- `code/src/app/api/history/route.ts`: For saving and listing history.
- `code/src/app/api/history/find-similar/route.ts`: For semantic search, updated to exclude the current project.
- `code/src/app/history/page.tsx`: The new UI page for browsing history.
- `code/src/components/SaveToHistoryForm.tsx`: A new component for the save functionality.

**Structure Decision**: Maintain the existing Next.js App Router project structure.

## Phase 0: Outline & Research

The primary `[NEEDS CLARIFICATION]` from the spec is how to determine project "similarity".

1.  **FR-H06 (Similarity Search)**:
    - **Research**: Investigate the best way to implement semantic search.
    - **Decision**: Use Google's `text-embedding-004` model via the `@google/generative-ai` package to create vector embeddings from the `featureDescription`. Store these embeddings in a `vector` column in the `EstimationHistory` table on PostgreSQL (which requires the `pgvector` extension). Use cosine distance (`<=>`) to query for the most similar vectors.
    - **Rationale**: This approach provides a powerful, scalable solution for semantic search using the same AI provider as the core estimation feature.

**Output**: `research.md` confirming the above decision.

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1.  **Data Model (`data-model.md`)**:

    - Define the `EstimationHistory` table schema for PostgreSQL.

    ```sql
    -- Enable the vector extension
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Create the table
    CREATE TABLE EstimationHistory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      projectName VARCHAR(255) NOT NULL,
      featureDescription TEXT NOT NULL,
      systemPrompt TEXT NOT NULL,
      subTasks JSONB NOT NULL,
      cost NUMERIC(10, 6) NOT NULL,
      createdAt TIMESTAMPTZ DEFAULT NOW(),
      descriptionVector VECTOR(768) -- Dimension for text-embedding-004
    );
    ```

2.  **API Contracts (`contracts/`)**:

    - **`POST /api/history`**:
      - **Request Body**: `{ projectName: string; estimationResult: EstimationResult; featureDescription: string; systemPrompt: string; }`
      - **Response (Success)**: `201 Created` with the saved record.
    - **`GET /api/history`**:
      - **Request Query Params**: `?search=...`
      - **Response (Success)**: `200 OK` with body `{ history: EstimationHistory[] }`.
    - **`POST /api/history/find-similar`**:
      - **Request Body**: `{ featureDescription: string; currentProjectName?: string; }`
      - **Response (Success)**: `200 OK` with body `{ similarProjects: EstimationHistory[] }`.

3.  **Quickstart Guide (`quickstart.md`)**:
    - Add instructions for creating a Neon database, enabling `pgvector`, and adding the `POSTGRES_URL` to the environment variables.

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Tasks will be generated in a backend-first approach, followed by frontend integration.
- **Database & Services**: Create tasks for setting up the DB schema, the embedding service, and the database service functions for CRUD and search operations.
- **API Endpoints**: Create tasks for each of the three new API endpoints (`/history` GET/POST, `/history/find-similar` POST).
- **Frontend UI**: Create tasks for the new `/history` page and the `SaveToHistoryForm` component.
- **Integration**: Create tasks to modify the `useEstimationPage` hook and the main page to integrate the new save and "find similar" logic.

**Ordering Strategy**:

1.  **Backend Setup**: DB Schema, Embedding Service, History DB Service.
2.  **Backend API**: Implement and test the three new API endpoints.
3.  **Frontend (Isolated)**: Build the `/history` page and its components to list data from the `GET /api/history` endpoint.
4.  **Frontend (Integration)**: Modify the main estimation page to incorporate the "find similar" and "save" flows.

**Estimated Output**: 10-12 numbered, ordered tasks in `tasks.md`.

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (`/tasks` command creates `tasks.md`)
**Phase 4**: Implementation (execute `tasks.md`)
**Phase 5**: Validation (run tests, manual UI verification)

## Complexity Tracking

| Violation                                | Why Needed                                                                               | Simpler Alternative Rejected Because                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Increased Complexity (DB, Vector Search) | This is a core requirement of the feature to improve AI accuracy via historical context. | A simpler file-based or local storage solution would not scale and cannot support the required semantic search functionality. |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

```

This plan is now ready. The next logical step would be to use this plan to generate the specific, actionable tasks for development.

<!--
[PROMPT_SUGGESTION]Generate the tasks for this feature based on the new implementation plan.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]How would you modify the `systemPrompt` to incorporate the historical examples found by the semantic search?[/PROMPT_SUGGESTION]
->
```
