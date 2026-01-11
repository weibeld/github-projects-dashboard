<!--
Sync Impact Report:
- Version: 1.1.0 → 1.2.0 (E2E testing deferral clarification)
- Modified principles: III. End-to-End Testing (allowed deferral in early stages)
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  ✅ plan-template.md (constitution check already allows justified deferrals)
  ✅ spec-template.md (no changes needed)
  ✅ tasks-template.md (no changes needed)
  ✅ agent-file-template.md (no changes needed)
- Follow-up TODOs: None
-->

# GitHub Projects Dashboard Constitution

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

The application MUST follow Clean Architecture principles with strict separation of concerns:

- **Layer separation:** Clear boundaries between UI, business logic, and external services
- **Dependency rule:** Inner layers MUST NOT depend on outer layers
- **Single responsibility:** Each layer has one clearly defined purpose
- **DRY principle:** Avoid duplication through proper abstraction at layer boundaries
- **Modularity:** Components within each layer MUST be independently testable

**Rationale:** Layered separation enables independent testing, clear boundaries of responsibility, and maintainable code evolution. Violations create tight coupling and make testing difficult.

### II. Simplicity Over Tooling

Keep build tools, dependencies, and architectural complexity minimal:

- **YAGNI:** Don't add tools, libraries, or abstractions until they're actually needed
- **Minimal dependencies:** Every new dependency MUST justify its inclusion
- **Direct solutions:** Prefer straightforward implementations over clever abstractions
- **Build simplicity:** Keep build pipeline simple and fast

**Rationale:** Every dependency and tool adds maintenance burden, learning curve, and potential failure points. Simplicity improves reliability and developer velocity.

### III. End-to-End Testing

All user workflows MUST eventually have corresponding end-to-end tests:

- **User perspective:** Tests MUST validate complete workflows as users experience them
- **UI interaction coverage:** All interactive UI features MUST have E2E test coverage
- **Isolated testing:** Tests MUST NOT depend on external APIs or services
- **Fast feedback:** Test suite MUST run quickly enough for regular execution
- **Early-stage deferral:** E2E testing MAY be deferred in early project stages with interim manual testing validation

**Rationale:** E2E tests catch integration issues that unit tests miss, validate real user workflows, and provide confidence in application behaviour. Early deferral allows rapid iteration while manual testing provides interim validation.

### IV. Strict TypeScript (NON-NEGOTIABLE)

All code MUST pass strict TypeScript checking before execution:

- **Zero tolerance:** No type errors or warnings allowed in any code (application, tests, configuration)
- **Compile-time validation:** All scripts (`dev`, `build`, `test`) MUST include TypeScript checking
- **Strict mode:** TypeScript strict mode MUST be enabled with comprehensive error checking
- **Type safety at boundaries:** All layer interfaces and external integrations MUST have explicit types

**Rationale:** Compile-time validation eliminates entire categories of runtime errors, improves maintainability, and documents contracts between components.

## Quality Gates

All development work MUST satisfy these gates before proceeding:

1. **Type Check Gate (MANDATORY):** `npm run typecheck` MUST pass without any errors or warnings
2. **Build Gate (MANDATORY):** `npm run build` MUST complete successfully with zero warnings
3. **Test Gate:** `npm run test` MUST pass all E2E tests (may be deferred in early stages with manual testing as interim validation)

**Enforcement:** Type Check and Build gates are mandatory checkpoints with zero tolerance. No code proceeds if either gate fails. Test gate is required for mature projects but may be deferred in early development with documented manual testing procedures.

## Coding Standards

### Spelling Conventions

**Documentation and Comments:** Use British English spelling in all documentation files (README.md, spec.md, plan.md, etc.) and code comments.

**Code Identifiers:** Use American English spelling in all code identifiers (variable names, function names, types, etc.).

**Examples:**
- ✅ Documentation: "The user can select a colour for the label"
- ✅ Code comment: `// Set the colour based on user preference`
- ✅ Code identifier: `const color = user.getColor()`
- ❌ Code identifier: `const colour = user.getColour()` (incorrect)

**Rationale:** British spelling maintains consistency with project documentation standards, while American spelling in code identifiers follows industry conventions and library APIs (e.g., CSS `color`, HTML `color` attribute).

## Governance

**Constitutional Authority:** This constitution supersedes all other development practices and documentation. In case of conflict, constitutional principles take precedence.

**Amendment Process:**

1. Proposed amendments MUST document rationale and impact on existing codebase
2. Version MUST increment per semantic versioning (MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
3. All dependent templates (plan, spec, tasks, agent files) MUST be reviewed and updated for consistency
4. Sync Impact Report MUST be generated documenting version change, modified principles, and template updates

**Compliance Review:**

- All PRs MUST verify compliance with constitutional principles
- Complexity that violates principles MUST be justified in `Complexity Tracking` section of implementation plans
- Unjustifiable violations MUST be rejected with request to simplify approach
- Constitution check is a mandatory gate in implementation planning workflow

**Version:** 1.2.0 | **Ratified:** 2025-09-29 | **Last Amended:** 2025-09-30