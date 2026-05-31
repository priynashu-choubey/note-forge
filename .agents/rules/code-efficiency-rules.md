---
trigger: always_on
---

## Code Efficiency Rules

- Never generate boilerplate I didn't ask for
- No placeholder comments like "// add logic here" or "// TODO"
- No unnecessary console.log or print statements unless I ask for debugging
- Never repeat code that already exists in the file, reference it instead
- No redundant imports, remove unused ones
- Keep functions small and single-purpose, max 20-30 lines per function
- Never wrap simple logic in unnecessary abstractions or helper functions
- If you can solve it in 5 lines, don't write 20
- No over-engineering — match complexity to the actual requirement
- Don't add error handling for cases that can't realistically happen
- Never generate example/demo/test data unless I ask
- When editing a file, only show me the changed lines not the entire file
- If a solution requires more than 50 lines, stop and break it into steps first
- Prefer built-in language features over adding new dependencies
- Before adding any new package/library, ask me first