# Technical Context: VisionaryAI

This document details the technologies, tools, and setup procedures for the VisionaryAI project.

## Core Technologies

- **Frontend:**
    - **Language:** JavaScript (ES6+)
    - **Framework/Library:** React 18+
    - **Build Tool:** Vite
    - **Styling:** CSS (potentially CSS Modules or a UI library later)
    - **State Management:** React Context API (initially), may evolve if needed.
    - **HTTP Client:** `fetch` API (built-in)
- **Backend (Supabase):**
    - **Database:** PostgreSQL
    - **Storage:** Supabase Storage (S3 compatible)
    - **Edge Functions:** Deno Runtime (TypeScript)
    - **Authentication:** Supabase Auth (email/password initially)
- **AI Service:**
    - **Provider:** Replicate AI
    - **Interaction:** REST API calls from Supabase Edge Functions

## Development Environment

- **Package Manager:** npm (Node Package Manager)
- **Node.js Version:** (Assumed LTS, e.g., 18.x or 20.x - verify with user if specific version needed)
- **Code Editor:** Visual Studio Code (based on environment details)
- **Version Control:** Git (repository hosting TBD - likely GitHub)
- **Supabase CLI:** Required for local development and deployment of Edge Functions.

## Setup Instructions (Initial)

1.  **Clone Repository:** (Once created) `git clone <repository-url>`
2.  **Install Frontend Dependencies:**
    ```bash
    cd visionary-ai-app
    npm install
    ```
3.  **Configure Supabase:**
    - Create a Supabase project via the Supabase dashboard.
    - Obtain Project URL and Anon Key.
    - Create a `.env` file in `visionary-ai-app/` (based on `.env.example` if provided, or manually):
      ```
      VITE_SUPABASE_URL=YOUR_SUPABASE_URL
      VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
      ```
4.  **Install Supabase CLI:** Follow instructions at [https://supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli)
5.  **Link Supabase Project (Local):**
    ```bash
    cd supabase # Navigate to the supabase directory within the project
    supabase login
    supabase link --project-ref YOUR_PROJECT_REF # Get project ref from Supabase dashboard URL
    # Potentially pull database changes if schema exists: supabase db pull
    ```
6.  **Configure Replicate AI:**
    - Sign up for Replicate AI.
    - Obtain an API Token.
    - Store the API Token securely (e.g., as a Supabase Edge Function secret).

## Running Locally

- **Frontend:**
    ```bash
    cd visionary-ai-app
    npm run dev
    ```
- **Supabase (Local Services):**
    ```bash
    cd supabase
    supabase start # Starts local Supabase stack (DB, Auth, Storage, Functions emulator)
    ```

## Technical Constraints

- Edge Functions have execution time limits (check Supabase docs).
- API rate limits for Replicate AI (check Replicate docs).
- Supabase free tier limitations (DB size, storage, function invocations).
