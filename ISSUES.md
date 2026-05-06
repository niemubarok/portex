# PortEx Issues & Backlog

## Performance & Optimization

- [ ] **Audit Log Handling for Large Data Volumes (10k - 1M+ rows)**
  - **Database Level (Supabase/PostgreSQL)**
    - Add B-Tree indexing on `user_id`, `document_id`, `action`, and `created_at` in `audit_logs` table.
    - Setup GIN index if text-search on `details`/payload is required.
    - Plan for Table Partitioning (by month) when logs exceed 1 million rows.
    - Implement Data Archiving / cold storage strategy (move logs > 2 years to S3/Supabase Storage via `pg_cron`).
    - Use Asynchronous Logging or background triggers to prevent UI blocking during document approvals.
  - **Backend Level (API)**
    - Refactor API to use Cursor-based Pagination instead of Offset/Limit for the `/api/audit_logs` endpoint.
    - Limit the default date range on API requests (e.g., fetch only the last 30 days by default).
  - **Frontend Level (UI/Next.js)**
    - Implement List Virtualization (`@tanstack/react-virtual` or `react-window`) for infinite scrolling lists if displaying without pagination.
    - Use Server-Side Filtering for search bars and advanced filters instead of frontend `.filter()`.
    - Apply debouncing (e.g., 500ms) on text search inputs to avoid spamming the API.
