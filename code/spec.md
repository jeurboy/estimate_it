# Feature Specification: Project Estimation History and Reference

**Feature Branch**: `003-estimation-history-and-reference`  
**Status**: Draft  
**Input**: User request: "ต้องการเก็บประวัติการทำงานที่ผ่านมาลงในระบบ เพือใช้เป็นข้อมูลอ้างอิงการประเมินโปรเจกต์ใหม่"

## 1. User Scenarios & Testing

### User Stories

1.  **As a Project Manager (using References)**, when I estimate a new task, I want the system to automatically find similar tasks from a global database of _all past projects_ and use them as examples for the AI, so that the new estimation is more accurate and consistent.

2.  **As a Project Manager (using History)**, I want to view a log of all estimations I've performed for the _current project session_ so I can review my work. I also want to save these estimations to the global reference database for future use.

### Acceptance Scenarios

1.  **Given** a user has completed an estimation, **When** they provide a project name and click "Save to History", **Then** the feature description, sub-tasks, and cost are saved to the database.
2.  **Given** a user is estimating a new task, **When** they trigger the estimation, **Then** the system automatically finds 1-3 similar past projects from the _global reference database_ and includes them in the prompt sent to the AI. The examples used MUST NOT be from the current project being estimated.
3.  **Given** a user navigates to the "History" page, **When** the page loads, **Then** a table of all past estimations is displayed, showing the project name, date, and total cost.
4.  **Given** a user is on the "History" page, **When** they click on a specific project, **Then** they can view the full details of that estimation, including the original description and the list of sub-tasks.

### Edge Cases

- How does the system behave if no similar past projects are found? (It should proceed without examples).
- What happens if the database connection fails during saving or fetching? (The user should be notified with an error message).
- How is "similarity" determined for finding reference projects? [NEEDS CLARIFICATION: Propose using vector embeddings for semantic search].

## 2. Requirements

### Functional Requirements

#### Data Persistence

- **FR-H01**: The system MUST use a PostgreSQL database to store estimation history.
- **FR-H02**: Each history record MUST include: a project name, the feature description, the system prompt used, the resulting sub-tasks, the final cost, and a creation timestamp.

#### API Endpoints

- **FR-H03**: A new API endpoint `POST /api/history` MUST be created to save a completed estimation to the database. It requires a `projectId` and the full estimation result.
- **FR-H04**: A new API endpoint `GET /api/history` MUST be created to retrieve a list of all saved estimations.
- **FR-H05**: The `GET /api/history` endpoint SHOULD support searching by project name.
- **FR-H06**: The `POST /api/history/find-similar` endpoint MUST be updated to accept an optional `currentProjectName` and exclude it from the search results.

#### Frontend UI

- **FR-H07**: After an estimation is complete, a new UI section with an input for "Project Name" and a "Save to History" button MUST be displayed.
- **FR-H08**: A new page at `/history` MUST be created to display a searchable table of all past estimations.
- **FR-H09**: The history table MUST be paginated to handle a large number of records.
- **FR-H10**: Clicking a row in the history table MUST open a modal or navigate to a detail page showing the full saved estimation.

#### AI Integration (Few-Shot Prompting)

- **FR-H11**: The `handleEstimate` function MUST first call the `/api/history/find-similar` endpoint before calling `/api/estimate`.
- **FR-H12**: The `systemPrompt` MUST be dynamically updated to include the similar examples found, instructing the AI to use them as a reference.
- **FR-H13**: If no similar examples are found, the estimation process MUST proceed normally without them.

### Non-Functional Requirements

- **NFR-H01**: Database queries for finding similar projects must be optimized to not significantly delay the estimation process.
- **NFR-H02**: All new API endpoints must have appropriate error handling and validation.

## 3. Key Entities

- **`EstimationHistory`**: Represents a single saved estimation record in the database.
  - `id`: string (UUID)
  - `projectName`: string
  - `featureDescription`: string
  - `systemPrompt`: string
  - `subTasks`: JSON/JSONB (Array of `SubTask` objects)
  - `cost`: number
  - `createdAt`: timestamp
  - `descriptionVector`: vector (for semantic search)

---

## Review & Acceptance Checklist

### Content Quality

- [x] No implementation details (specific libraries, etc.)
- [x] Focused on user value and business needs

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Scope is clearly bounded

---

## Execution Status

- [x] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed
