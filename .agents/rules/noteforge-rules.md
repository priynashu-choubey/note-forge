---
trigger: always_on
---

## NoteForge Architecture
- This is a microservices app: Auth Service, Notes Service, Media Service, API Gateway, Frontend
- Each service is independent — never mix logic between services
- All inter-service communication goes through the API Gateway, never directly
- PostgreSQL for persistent data, Redis for caching and queuing
- Frontend is offline-first: Dexie.js local DB + sync engine + PWA

## Service Boundaries
- Auth Service: only handles users, JWT, sessions — nothing else
- Notes Service: only handles notes, folders, full-text search, bulk sync
- Media Service: only handles upload, download, delete, Sharp thumbnails
- API Gateway: only handles routing, JWT validation, rate limiting, circuit breaker
- Frontend: React + Vite, never call services directly, always go through Gateway

## Current Progress
- Dockerfiles missing for: Auth, Notes, Media, Gateway — build these next
- Circuit breaker (opossum) is partially done — complete before testing
- Frontend npm install in progress — don't touch frontend until resolved
- Dexie.js, PDF viewer, Image viewer, Sync engine, Service Worker still pending

## Docker Rules (NoteForge)
- PostgreSQL: mem_limit 512m, memswap_limit 512m, shm_size 128m
- Redis: mem_limit 256m, memswap_limit 256m
- Each microservice container: mem_limit 256m
- Frontend dev server: mem_limit 512m
- Never run all services at once during development
- During auth work: only start postgres + auth service
- During notes work: only start postgres + redis + notes service
- During media work: only start postgres + media service
- Only run full stack when doing end-to-end testing

## Database Rules (NoteForge)
- Two databases: auth_db and notes_db — never mix them
- Always use migrations, never modify schema directly
- Always add indexes on foreign keys
- Use connection pooling (pg-pool), never raw connections
- Auth queries go to auth_db only, Notes queries go to notes_db only

## API Rules (NoteForge)
- Always validate input before it touches the database
- Keep response payloads lean
- Build one endpoint at a time
- No unnecessary middleware
- JWT validation happens at Gateway only, not inside individual services

## Frontend Rules (NoteForge)
- Always go through the API client, never fetch directly
- Dexie.js is the local source of truth, sync engine reconciles with server
- PWA/Service Worker handles offline — don't duplicate offline logic elsewhere
- Markdown editor, Excalidraw, PDF viewer, Image viewer are isolated components
- Never put business logic inside UI components

## Session Hygiene (NoteForge)
- Build one feature at a time
- Don't touch completed checkboxes unless I specifically ask to revisit
- If a task touches more than 3 files, list them first and confirm
- Don't refactor working code unless I ask
- Never rename variables or functions without asking
- Remind me to run `docker compose stop` when switching between services