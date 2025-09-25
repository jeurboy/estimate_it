# Feature Specification: Gemini-Powered Feature Estimation from Google Sheets

# Feature Specification: Project Estimation History and Reference

**Feature Branch**: `001-gemini-feature-estimation`  
**Created**: [DATE]  
**Feature Branch**: `003-estimation-history-and-reference`  
**Status**: Draft  
**Input**: User description: "แอปพลิเคชันต้องสามารถเชื่อมต่อ Google Sheets และใช้ Gemini AI เพื่อประเมินและแบ่งงานย่อยของฟีเจอร์ใหม่ได้ โดยต้องแสดงผลการประเมินเป็นตาราง HTML ที่ชัดเจน และแสดงข้อความทั่วไปในกล่องแชท นอกจากนี้ ต้องมีการคำนวณและแสดงค่าใช้จ่ายจาก Gemini และบันทึกข้อมูลผู้ใช้ลงใน Local Storage ระบบควรทำงานได้อย่างรวดเร็ว, มีความน่าเชื่อถือในการจัดการข้อผิดพลาด, และสามารถปรับแก้ไข prompt ได้จาก Google Sheets"
**Input**: User request: "ต้องการเก็บประวัติการทำงานที่ผ่านมาลงในระบบ เพือใช้เป็นข้อมูลอ้างอิงการประเมินโปรเจกต์ใหม่"

## Execution Flow (main)

## 1. User Scenarios & Testing

###

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

### Primary User Story

---

As a Project Manager, after estimating a new feature, I want to save the result to a project history database with a unique name. When I estimate another, similar feature in the future, I want the AI to use relevant past projects as examples to provide a more accurate and consistent estimation. I also want to be able to browse and search the history of all past estimations.

## ⚡ Quick Guidelines

### Acceptance Scenarios

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

1.  **Given** a user has completed an estimation, **When** they provide a project name and click "Save to History", **Then** the feature description, sub-tasks, and cost are saved to the database.
2.  **Given** a user is estimating a new feature, **When** they trigger the estimation, **Then** the system automatically finds 1-3 similar past projects from the history and includes them in the prompt sent to the AI.
3.  **Given** a user navigates to the "History" page, **When** the page loads, **Then** a table of all past estimations is displayed, showing the project name, date, and total cost.
4.  **Given** a user is on the "History" page, **When** they click on a specific project, **Then** they can view the full details of that estimation, including the original description and the list of sub-tasks.

### Section Requirements

### Edge Cases

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")
- How does the system behave if no similar past projects are found? (It should proceed without examples).
- What happens if the database connection fails during saving or fetching? (The user should be notified with an error message).
- How is "similarity" determined for finding reference projects? [NEEDS CLARIFICATION: Propose using vector embeddings for semantic search].

### For AI Generation

## 2. Requirements

When creating this spec from a user prompt:

### Functional Requirements

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

#### Data Persistence

- **FR-H01**: The system MUST use a PostgreSQL database to store estimation history.
- **FR-H02**: Each history record MUST include: a project name, the feature description, the system prompt used, the resulting sub-tasks, the final cost, and a creation timestamp.

---

#### API Endpoints

- **FR-H03**: A new API endpoint `POST /api/history` MUST be created to save a completed estimation to the database. It requires a `projectId` and the full estimation result.
- **FR-H04**: A new API endpoint `GET /api/history` MUST be created to retrieve a list of all saved estimations.
- **FR-H05**: The `GET /api/history` endpoint SHOULD support searching by project name.
- **FR-H06**: A new API endpoint `POST /api/history/find-similar` MUST be created. It will accept a feature description and return 1-3 of the most semantically similar historical records.

## User Scenarios & Testing _(mandatory)_

#### Frontend UI

- **FR-H07**: After an estimation is complete, a new UI section with an input for "Project Name" and a "Save to History" button MUST be displayed.
- **FR-H08**: A new page at `/history` MUST be created to display a searchable table of all past estimations.
- **FR-H09**: The history table MUST be paginated to handle a large number of records.
- **FR-H10**: Clicking a row in the history table MUST open a modal or navigate to a detail page showing the full saved estimation.

### Primary User Story

#### AI Integration (Few-Shot Prompting)

- **FR-H11**: The `handleEstimate` function MUST first call the `/api/history/find-similar` endpoint before calling `/api/estimate`.
- **FR-H12**: The `systemPrompt` MUST be dynamically updated to include the similar examples found, instructing the AI to use them as a reference.
- **FR-H13**: If no similar examples are found, the estimation process MUST proceed normally without them.

As a Project Manager, I want to input a new feature description into an application. The application should use a configurable prompt from my team's Google Sheet to ask Gemini AI to break down the feature into sub-tasks. I expect to see the results in a clear HTML table, view the API cost for the evaluation, and have my settings (like the Google Sheet link) saved for future use.

### Non-Functional Requirements

### Acceptance Scenarios

- **NFR-H01**: Database queries for finding similar projects must be optimized to not significantly delay the estimation process.
- **NFR-H02**: All new API endpoints must have appropriate error handling and validation.

1. **Given** a user has connected their Google Sheet and entered a feature description, **When** they trigger the evaluation, **Then** the system displays a table of sub-tasks, shows the Gemini API cost, and saves the session information to local storage.
2. **Given** the prompt in the connected Google Sheet is modified, **When** the user runs a new evaluation, **Then** the output from Gemini AI reflects the new prompt structure.

## 3. Key Entities

### Edge Cases

- **`EstimationHistory`**: Represents a single saved estimation record in the database.

  - `id`: string (UUID)
  - `projectName`: string
  - `featureDescription`: string
  - `systemPrompt`: string
  - `subTasks`: JSON/JSONB (Array of `SubTask` objects)
  - `cost`: number
  - `createdAt`: timestamp
  - `descriptionVector`: vector (for semantic search)

- What happens if the Google Sheets API is unavailable or the sheet is not accessible?
- How does the system handle API failures or timeouts from the Gemini AI service?
- What is the expected behavior if the Gemini response does not match the format required for parsing into a table?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow a user to connect to a Google Sheet to fetch configuration.
- **FR-002**: System MUST fetch a prompt template from a specified location within the connected Google Sheet.
- **FR-003**: System MUST provide a user interface for inputting a feature description.
- **FR-004**: System MUST send the feature description to the Gemini AI API, using the prompt fetched from the Google Sheet.
- **FR-005**: System MUST parse the Gemini AI response to extract a list of sub-tasks.
- **FR-006**: System MUST render the extracted sub-tasks in a clear HTML table.
- **FR-007**: System MUST display general status messages, results, and errors in a chat-like interface.
- **FR-008**: System MUST calculate and display the cost of the Gemini API call.
- **FR-009**: System configuration (API keys, Google Sheet URL) MUST be managed via server-side environment variables.
- **FR-010**: System MUST handle errors from external APIs (Google Sheets, Gemini) gracefully and provide informative feedback to the user.
- **FR-011**: The application MUST be performant and provide a responsive user experience.
- **FR-012**: The prompt used for Gemini AI MUST be read from cell `A1` of a sheet named `Config` within the connected Google Sheet.
- **FR-013**: The output table MUST contain the following columns: `Sub-Task`, `Description`, and `Complexity (1-5)`.
- **FR-014**: System MUST calculate Gemini API costs based on the number of input and output tokens for each request.
- **FR-015**: The system does not require user accounts or evaluation history persistence.
- **FR-016**: System MUST connect to a public Google Sheet ("Anyone with the link can view") using a user-provided Google API Key. User authentication to the application will be handled separately.
- **FR-017**: The user interface MUST be responsive and adapt its layout for optimal viewing on mobile, tablet, and desktop screen sizes.
- **FR-018**: The user interface MUST be built using the Ant Design component library to ensure a consistent and high-quality visual design.

### Key Entities _(include if feature involves data)_

- **EvaluationRequest**: Represents a single request to the system, containing the raw feature description provided by the user.
- **EvaluationResult**: Represents the processed output, containing the list of parsed sub-tasks, the raw response from Gemini, and the calculated API cost.

---

## Review & Acceptance Checklist

### Content Quality

- [x] No implementation details (specific libraries, etc.)
- [x] Focused on user value and business needs

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Scope is clearly bounded

---
