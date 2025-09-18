# End-to-End Testing

End-to-end test setup with [Playwright](https://playwright.dev/) for the main business logic.

## Overview

The testing setup provides:

- **Test mode:** a mode that bypasses authentication and uses mock data
- **Authentication bypass:** tests start from a mocked authenticated state and focus on the business logic
- **Mock data:** simple test data mocking the data in the Supabase database as well as the data coming from the GitHub API
- **Isolated environment:** tests are run on an instance running on port 5174 (independently of the dev server, which uses port 5173)

Test mode is activated by appending `?test=true` to the URL. For example:

> <http://localhost:5174/github-projects-dashboard/?test=true>

## Files

- **`index.ts`:** test utilities (test mode and mock database operations)
- **`mock-data/database.json`:** mocking the Supabase database
  - **`userInfo`:** GitHub user information
  - **`columns`:** set of mock columns
  - **`projects`:** set of mock projects
  - **`labels`:** set of mock labels
  - **`project_labels`:** project ← label assignments
- **`mock-data/github.json`:** mocking the GitHub Projects data from GitHub
  - **`projects`:** mock GitHub Projects data

## Usage

### Running Tests Locally

Tests can be run locally on demand as follows.

Run all tests:

```bash
npm run test
```

Run tests with visual feedback:

```bash
npm run test:headed     # Show tested app in browser
npm run test:ui         # Interactive UI with step-by-step control
npm run test:debug      # Debug mode with manual step advancement
```

Run a specific test file:

```bash
npm run test:file tests/smoke-tests.spec.ts
```

Run for specific browsers:

```bash
npm run test:chrome
npm run test:firefox
npm run test:safari
```

> While tests are running, you can also visit <http://localhost:5174/github-projects-dashboard/?test=true> to see the instance the tests are interacting with.

### CI/CD

The complete set of tests is automatically executed on every push to GitHub by GitHub Actions (defined in `.github/workflows/playwright.yml`).

> **Note:** currently the test and the build-and-deploy workflows are independent from each other. That is, even if the tests fail, the application is still deployed.

## Tests

The individual test cases are defined in `tests/*.spec.ts` files.

## Decommissioning

To remove the test setup, delete the following:

1. This entire `src/tests/` directory
2. Test mode imports and logic from `src/App.svelte`
3. The `setTestModeGitHubProjects` function from `src/lib/api/github.ts`
4. Mock database imports and conditional logic from `src/lib/database.ts`
5. The GitHub Action `.github/workflows/playwright.yml`
6. Test-related configuration files (`tests/` directory, `playwright.config.ts` file)

The application will continue to work normally without the testing setup.
