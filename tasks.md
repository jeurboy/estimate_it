# Tasks: Project Estimation History and Reference

**Input**: `plan.md`, `spec.md`
**Prerequisites**: `plan.md` is approved.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions.

## Phase 1: Backend Setup & Services

- [ ] T001: **Setup**: Configure a PostgreSQL database, enable the `pgvector` extension, and add `POSTGRES_URL` to `.env.local`.
- [ ] T002: **Database**: Update the schema in `code/src/lib/db/schema.ts` to include the `is_reference` boolean field in the `EstimationHistory` interface and the reference SQL.
- [ ] T003: [P] **Service**: Create the embedding service in `code/src/lib/services/embeddingService.ts` to generate vector embeddings from text.
- [ ] T004: **Service**: Update the history database service in `code/src/lib/db/history.ts`:
  - Modify `saveEstimation` to accept and insert the `is_reference` flag.
  - Modify `findSimilarEstimations` to only search records where `is_reference` is `true`.
  - `listEstimations` remains unchanged, showing all records.

## Phase 2: Backend API Endpoints

_Dependencies: Phase 1 must be complete._

- [ ] T005: [P] **API**: Update the `POST` endpoint in `code/src/app/api/history/find-similar/route.ts`. This endpoint will continue to receive a `featureDescription` but will now correctly use the updated `findSimilarEstimations` service function.
- [ ] T006: [P] **API**: Update the `POST` endpoint in `code/src/app/api/history/route.ts` to accept an `isReference` boolean in the request body and pass it to the `saveEstimation` service function.
- [ ] T007: [P] **API**: Implement the `GET` functionality within `code/src/app/api/history/route.ts` to list all estimations, regardless of their `isReference` status.

## Phase 3: Frontend UI Development

_Dependencies: Phase 2 must be complete for full functionality, but components can be built in parallel._

- [ ] T008: [P] **Component**: Update the `SaveToHistoryForm` component in `code/src/components/SaveToHistoryForm.tsx`. Add an `antd` `Checkbox` to allow the user to decide if the estimation should be "Saved as a reference for future AI estimations".
- [ ] T009: [P] **Page**: Create the history page at `code/src/app/history/page.tsx`. It will fetch data from `GET /api/history` and display it in a table. Add a column or visual indicator to show which items are saved as references (`isReference: true`).

## Phase 4: Frontend Integration

_Dependencies: All previous phases must be complete._

- [ ] T010: **Integration**: Modify `code/src/app/(main)/page.tsx` to render the updated `SaveToHistoryForm` component and pass the save handler function to it.
- [ ] T011: **Hook Logic**: Update the `useEstimationPage` hook in `code/src/hooks/useEstimationPage.ts`:
  - Modify `handleSaveToHistory` to accept both the project name and the `isReference` boolean from the form.
  - Ensure the `handleSaveToHistory` function passes the `isReference` value in the body of the `POST /api/history` request.
  - The `handleEstimate` logic for finding similar projects remains correct as the filtering is handled on the backend.

## Phase 5: Testing & Polish

- [ ] T012: [P] **Testing**: Write/update unit tests for the database service (`history.ts`), mocking the DB connection and verifying that `findSimilarEstimations` includes a `WHERE is_reference = true` clause.
- [ ] T013: [P] **Testing**: Write/update integration tests for the API endpoints:
  - `POST /api/history`: Test saving with both `isReference: true` and `isReference: false`.
  - `POST /api/history/find-similar`: Verify it only returns records where `is_reference` is true.
- [ ] T014: [P] **Testing**: Write unit tests for the `SaveToHistoryForm` to ensure the checkbox state is correctly passed to the handler function.

## Dependencies

- **Phase 1 (T001-T004)** must be completed before Phase 2.
- **Phase 2 (T005-T007)** must be completed before Phase 3 and 4 can be fully tested.
- **T004** depends on **T003**.
- **T011** depends on T006, T008, and T010.

## Parallel Execution Example

```
# After Phase 1 is complete, the following API and UI tasks can be started in parallel:

Task: "T005 [P] API: Create the POST endpoint in code/src/app/api/history/find-similar/route.ts"
Task: "T006 [P] API: Create the POST endpoint in code/src/app/api/history/route.ts"
Task: "T007 [P] API: Implement the GET functionality within code/src/app/api/history/route.ts"
Task: "T008 [P] Component: Create the SaveToHistoryForm component..."
Task: "T009 [P] Page: Create the new history page at code/src/app/history/page.tsx"
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions.

## Path Conventions

- Paths are based on the Next.js App Router structure defined in `plan.md`.

## Phase 1: Backend Setup & Services

- [ ] T001: **Setup**: Configure a PostgreSQL database, enabling the `pgvector` extension, and adding the `POSTGRES_URL` to the `.env.local` file as per `quickstart.md`.
- [x] T002: **Database**: Create the database schema definition in `code/src/lib/db/schema.ts`. This file will not execute the SQL but will serve as the source of truth for the table structure.
- [x] T003: [P] **Service**: Create the embedding service in `code/src/lib/services/embeddingService.ts`. It should export a function that takes a string and returns a vector embedding using the `@google/generative-ai` package.
- [x] T004: **Service**: Implement the history database service in `code/src/lib/db/history.ts`. This service will use the `postgres` package and should include three functions:
  - `saveEstimation(data)`: Inserts a new record into the `EstimationHistory` table.
  - `listEstimations(searchTerm)`: Retrieves all records, with optional filtering by `projectName`.
  - `findSimilarEstimations(vector)`: Uses cosine distance (`<=>`) to find the top 3 most similar records based on the input vector.

## Phase 2: Backend API Endpoints

_Dependencies: Phase 1 must be complete._

- [x] T005: [P] **API**: Create the `POST` endpoint in `code/src/app/api/history/find-similar/route.ts`. This endpoint will receive a `featureDescription`, use the `embeddingService` to create a vector, and call `findSimilarEstimations` from the history service to return similar projects.
- [x] T006: [P] **API**: Create the `POST` endpoint in `code/src/app/api/history/route.ts`. This endpoint will receive all estimation data, generate an embedding for the `featureDescription`, and call `saveEstimation` from the history service.
- [x] T007: [P] **API**: Implement the `GET` functionality within `code/src/app/api/history/route.ts`. It should handle an optional `search` query parameter and call `listEstimations` from the history service.

## Phase 3: Frontend UI Development

_Dependencies: Phase 2 must be complete for full functionality, but components can be built in parallel._

- [x] T008: [P] **Component**: Create the `SaveToHistoryForm` component in `code/src/components/SaveToHistoryForm.tsx`. It should contain an `Input` for the project name and a `Button` to trigger the save action. It will be displayed only after an estimation is complete.
- [x] T009: [P] **Page**: Create the new history page at `code/src/app/history/page.tsx`. This page will contain a client component that fetches data from `GET /api/history` and displays it in an `antd` `Table`. Include a search input to filter the history.

## Phase 4: Frontend Integration

_Dependencies: All previous phases must be complete._

- [x] T010: **Integration**: Modify `code/src/app/(main)/page.tsx` to render the `SaveToHistoryForm` component when `results` are available.
- [x] T011: **Hook Logic**: Update the `useEstimationPage` hook in `code/src/hooks/useEstimationPage.ts` with the following changes:
  - Add a new state for the `featureDescription` to hold it for saving.
  - Add a new handler function `handleSaveToHistory(projectName: string)` that calls the `POST /api/history` endpoint.
  - Modify `handleEstimate` to first call `POST /api/history/find-similar`.
  - Dynamically construct the `systemPrompt` within `handleEstimate` to include the similar examples returned from the API before sending the request to `/api/estimate`.

## Phase 5: Testing & Polish

- [x] T012: [P] **Testing**: Write unit tests for the new database and embedding services (`history.ts`, `embeddingService.ts`), mocking the database connection and AI SDK.
- [x] T013: [P] **Testing**: Write integration tests for the three new API endpoints to ensure they handle requests and interact with the services correctly.
- [x] T014: [P] **Testing**: Write unit tests for the new `SaveToHistoryForm` and the history page's client component.

## Dependencies

- **Phase 1 (T001-T004)** must be completed before Phase 2.
- **Phase 2 (T005-T007)** must be completed before Phase 3 and 4 can be fully tested.
- **T004** depends on **T003**.
- **T011** depends on all other tasks.

## Parallel Execution Example

```
# After Phase 1 is complete, the following API and UI tasks can be started in parallel:

Task: "T005 [P] API: Create the POST endpoint in code/src/app/api/history/find-similar/route.ts"
Task: "T006 [P] API: Create the POST endpoint in code/src/app/api/history/route.ts"
Task: "T007 [P] API: Implement the GET functionality within code/src/app/api/history/route.ts"
Task: "T008 [P] Component: Create the SaveToHistoryForm component..."
Task: "T009 [P] Page: Create the new history page at code/src/app/history/page.tsx"
```
