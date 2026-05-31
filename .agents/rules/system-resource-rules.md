---
trigger: always_on
---

## System Resource Rules

- Always add mem_limit and memswap_limit to every Docker service
- PostgreSQL max 512m, Redis max 256m, any other service max 256m
- Always use Alpine-based images (postgres:16-alpine, redis:7-alpine etc)
- Use restart: on-failure, never unless-stopped
- Never run all services simultaneously unless I explicitly ask
- When adding a new service to docker-compose, flag its memory cost first

## Development Approach

- Build one feature at a time, never scaffold everything at once
- Before starting a heavy task, ask me to close unused services
- If the stack has more than 3 services running, warn me
- Prefer a single backend language per session
- Remind me to run `docker compose stop` when switching tasks or taking breaks

## Code Quality

- Always write incremental, testable code
- Never generate more than 100 lines at once without asking
- Break large features into steps and confirm before moving to next step
- Flag any approach that could cause memory leaks or runaway processes

## This Project

- Stack: PostgreSQL + Redis + Docker
- Mac: 16GB RAM, Apple M2
- Goal: stable long vibe-coding sessions without kernel panics