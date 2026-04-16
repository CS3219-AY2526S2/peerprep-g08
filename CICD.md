# CI/CD Pipeline Documentation

## Quick Start

**First time setting up?** Follow the [CI/CD Setup Checklist](./CI_CD_SETUP_CHECKLIST.md) to configure GitHub Secrets, branch protection rules, and verify the pipeline works.

---

## Overview

This document describes the GitHub Actions CI/CD pipeline for the PeerPrep microservices project. The pipeline automates testing, linting, building, and deployment of Docker images to GitHub Container Registry (GHCR).

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Pull Request (ci.yml)                      │
│  Lint → Unit Tests → Integration Tests → Status Check  │
│  Blocks merge if any check fails                        │
└─────────────────────────────────────────────────────────┘
                           ↓
        ✅ All checks pass → Approve & Merge
                           ↓
┌─────────────────────────────────────────────────────────┐
│ develop branch (deploy-staging.yml)                     │
│ Build all 6 services → Push :develop tags to GHCR       │
└─────────────────────────────────────────────────────────┘
                           ↓
                  staging images available
                           ↓
         Manual merge to main branch (PR or git)
                           ↓
┌─────────────────────────────────────────────────────────┐
│ main branch (deploy-production.yml)                     │
│ Build all 6 services → Push :latest tags to GHCR        │
│ Create GitHub Release with deployment notes             │
└─────────────────────────────────────────────────────────┘
                           ↓
                production images available
```

## Workflows

### 1. CI - PR Validation (`ci.yml`)

**Triggered on:** Pull requests targeting `main` or `develop` branches

**Jobs:**

#### Lint Job

- Installs dependencies for each backend service
- Runs ESLint (if configured)
- Checks frontend using vite config
- **Status:** Non-blocking (reports issues but doesn't block merge)

#### Unit Tests Job (Matrix Strategy)

- Tests only services with existing test suites:
  - **User Service** (`npm test`)
  - **Question Service** (`npm test`)
- **Status:** Must pass (blocking)

#### Integration Tests Job

- Starts entire Docker Compose stack
- Waits for all services to reach healthy state
- Runs basic connectivity smoke tests
- Collects logs if any service fails
- Cleans up resources after completion
- **Status:** Must pass (blocking)

#### Security: .env File Cleanup

⚠️ **Important:** The integration tests job securely handles `.env` files:

1. **Generation**: Creates temporary `.env` files with test-only values (no real secrets)

   ```bash
   cat > user-service/.env << 'EOF'
   DB_LOCAL_URI=mongodb://mongodb:27017/...
   JWT_SECRET=test-secret-key-for-ci  # Test value only
   EOF
   ```

2. **Cleanup**: After tests complete (success or failure), all `.env` files are securely removed:

   ```bash
   rm -f user-service/.env
   rm -f question-service/.env
   rm -f collab-service/.env
   # ... etc
   ```

3. **Verification**: Confirms all `.env` files are deleted before workflow ends

**Why this matters:**

- Prevents accidental secret exposure in GitHub Actions logs
- Ensures test credentials don't persist on runners
- GitHub-hosted runners are destroyed after each workflow, but explicit cleanup is a security best practice
- CI/CD never stores or exposes real production credentials

**PR Status Requirements:**

- ✅ Unit tests must pass
- ✅ Integration tests must pass
- ⚠️ Linting issues are reported but don't block merge

**branch protection Rules:**

```
Required status checks:
- Lint Services
- Unit Tests (user-service)
- Unit Tests (question-service)
- Integration Tests (Docker Compose)
```

---

### 2. Deploy - Staging (`deploy-staging.yml`)

**Triggered on:** Pushes to `develop` branch (automatic merge from approved PRs)

**Services deployed:**

- api-gateway
- user-service
- question-service
- collab-service
- matching-service
- frontend

**Image tagging:**

- `ghcr.io/<owner>/peerprep-g08-<service>:develop` (primary tag, overwrites on each push)
- `ghcr.io/<owner>/peerprep-g08-<service>:develop-<commit-sha>` (for traceability)

**Duration:** ~5-10 minutes

**Verification:**

1. Go to GitHub repository → Packages tab
2. Look for `peerprep-g08-api-gateway`, `peerprep-g08-user-service`, etc.
3. Verify `:develop` tags are present with today's date

**Pull staging images:**

```bash
docker pull ghcr.io/<owner>/peerprep-g08-api-gateway:develop
docker pull ghcr.io/<owner>/peerprep-g08-user-service:develop
# ... etc for all services
```

---

### 3. Deploy - Production (`deploy-production.yml`)

**Triggered on:** Pushes to `main` branch (manual merge only via PR or git)

**Services deployed:** Same 6 services as staging

**Image tagging:**

- `ghcr.io/<owner>/peerprep-g08-<service>:latest` (primary tag, always points to latest main)
- `ghcr.io/<owner>/peerprep-g08-<service>:main-<commit-sha>` (immutable commit reference)
- `ghcr.io/<owner>/peerprep-g08-<service>:release-<run-number>-<sha>` (GitHub Release tag)

**Additional Steps:**

1. Generates release notes summarizing commits since last release
2. Creates GitHub Release with changelog and deployment instructions
3. Sends notification with image location

**Duration:** ~5-10 minutes

**Verification:**

1. Check GitHub Releases page for new release entry
2. View GHCR packages for `:latest` tags
3. Pull production images:
   ```bash
   docker pull ghcr.io/<owner>/peerprep-g08-api-gateway:latest
   ```

---

## Local Development & Testing

### Overview: .env Files & .gitignore

All `.env` files are in `.gitignore` for security (prevent committing secrets). However, services need them to run.

**Solution:**

- `.env.example` files show required variables (committed to git)
- CI/CD workflows generate `.env` files automatically before running tests
- Local development: Use provided setup scripts to generate `.env` files

---

### Generating .env Files Locally

Before running Docker Compose or services, generate `.env` files from templates:

**Windows Users:**

```batch
scripts\setup-env.bat
```

**macOS/Linux Users:**

```bash
bash scripts/setup-env.sh
```

**Manual Setup (if scripts don't work):**

Create the following `.env` files in each service directory:

**user-service/.env:**

```env
DB_LOCAL_URI=mongodb://127.0.0.1:27017/peerprepUserServiceDB
PORT=3001
ENV=PROD
JWT_SECRET=local-test-secret-key-change-in-production
```

**question-service/.env:**

```env
DB_LOCAL_URI=mongodb://127.0.0.1:27017/peerprepQuestionServiceDB
PORT=8080
ENV=PROD
```

**collab-service/.env:**

```env
PORT=3219
REDIS_URL=redis://127.0.0.1:6379
MONGODB_URL=mongodb://127.0.0.1:27017/peerprep-collab
```

**api-gateway/.env:**

```env
PORT=3000
USER_SERVICE_URL=http://localhost:3001
QUESTION_SERVICE_URL=http://localhost:8080
MATCHING_SERVICE_URL=http://localhost:3002
COLLAB_SERVICE_URL=http://localhost:3219
```

**matching-service/.env:**

```env
PORT=3002
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
QUESTION_SERVICE_URL=http://localhost:8080
COLLAB_SERVICE_URL=http://localhost:3219
```

**frontend/.env:**

```env
VITE_USER_API_URL=http://localhost:3000/api/user-service
VITE_QUESTION_API_URL=http://localhost:3000/api/question-service
VITE_API_GATEWAY_URL=http://localhost:3000
VITE_MATCHING_API_GATEWAY_URL=http://localhost:3000
VITE_COLLAB_API_URL=http://localhost:3219
```

⚠️ **Note:** These local values use `127.0.0.1` (localhost). Docker Compose uses service hostnames (`mongodb`, `redis`) from the Docker network.

---

### Running Tests Locally

**User Service Tests:**

```bash
cd user-service
npm install
npm test
```

**Question Service Tests:**

```bash
cd question-service
npm install
npm test
```

**All Services with Docker Compose:**

```bash
# 1. Generate .env files (if not already done)
scripts/setup-env.sh  # or setup-env.bat on Windows

# 2. Start services with health checks
docker compose up -d

# 3. Wait for services to be healthy (should show "healthy" status)
docker compose ps

# 4. Stop services and clean up
docker compose down -v

# 5. (Optional but recommended) Remove temporary .env files after testing
rm user-service/.env question-service/.env collab-service/.env \
   api-gateway/.env matching-service/.env frontend/.env
# Windows: del user-service\.env question-service\.env collab-service\.env etc.
```

**Security Tip:** While `.env` files are in `.gitignore` and won't be committed, it's good practice to remove them after testing to avoid accidental exposure if you share your screen or commit by accident.

### Running Linter Locally

**Install ESLint globally or locally:**

```bash
npm install eslint --save-dev
```

**Lint backend services:**

```bash
# Check all service issues
npx eslint api-gateway/ --ext .js
npx eslint user-service/ --ext .js
npx eslint question-service/ --ext .js
# ... etc

# Fix fixable issues automatically
npx eslint api-gateway/ --fix
```

**Lint frontend:**

```bash
cd frontend
npm run lint  # if available
# or
npx eslint src/ --ext .js,.jsx,.ts,.tsx
```

---

## Setting Up GitHub Secrets

### Automatic Authentication (GHCR)

The pipeline uses `secrets.GITHUB_TOKEN` (automatically available) for authentication to GHCR. No manual configuration needed!

**Automatic Authentication:**

- GitHub Actions automatically provides `GITHUB_TOKEN` with necessary permissions
- Token scope: Read/write to packages in this repository
- No Personal Access Token needed for GHCR

### Sensitive Values for CI/CD Testing

For security, sensitive test values are stored in GitHub Secrets (not hardcoded in workflow files):

**Required Secret:**

- `JWT_SECRET_CI` — JWT signing key for integration tests (can be any random string for testing)

**How to Set Up:**

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `JWT_SECRET_CI`
5. Value: Enter any random string (example: `test-jwt-secret-key-12345`)
6. Click "Add secret"

**Why This Matters:**

- ✅ Sensitive values are NOT visible in the workflow YAML file
- ✅ Secrets are masked in GitHub Actions logs
- ✅ Only referenced as `${{ secrets.JWT_SECRET_CI }}` in workflows
- ✅ Anyone viewing the repo code cannot see the actual secret values
- ❌ Hardcoding secrets in YAML = visible to everyone who can read the repo

**Current Workflow Usage:**

The `ci.yml` workflow references `JWT_SECRET_CI` when generating `.env` files for integration tests:

```yaml
JWT_SECRET=${{ secrets.JWT_SECRET_CI }}
```

**Non-Sensitive Values (OK to Hardcode):**

These can remain visible in the workflow file (they're not secrets):

- Database URIs for local testing (`mongodb://mongodb:27017/...`)
- Service ports (`3001`, `8080`, `3219`, etc.)
- Service URLs (`http://user-service:3001`)
- Environment names (`PROD`, `DEV`)

**Future Secrets (if needed):**

As the project grows, add more secrets for:

- Real database credentials (if connecting to cloud MongoDB)
- API keys
- Third-party service credentials
- OAuth tokens

---

## Troubleshooting

### .env files not detected (Docker Compose fails to start)

**Symptom:**

```
ERROR: error reading 'user-service/.env': open user-service/.env: no such file or directory
```

**Cause:** `.env` files are in `.gitignore`, so they're not checked into git or pulled in CI/local clones.

**Solution:**

1. **Generate .env files:**

   ```bash
   # Windows
   scripts\setup-env.bat

   # macOS/Linux
   bash scripts/setup-env.sh
   ```

2. **Or manually create them** (see sections above)

3. **Verify they exist:**
   ```bash
   ls user-service/.env question-service/.env  # macOS/Linux
   dir user-service\.env  # Windows
   ```

**CI/CD Note:** GitHub Actions workflow automatically generates .env files before running integration tests, so this issue shouldn't occur in CI.

### Image fails to push to GHCR

**Symptom:**

```
Error: unauthorized: authentication required
```

**Solution:**

- Verify repository settings allow GitHub Actions to write packages
- Check Settings → Actions → General → Workflow permissions
- Ensure "Read and write permissions" is selected

### Integration tests timeout

**Symptom:**

```
"Services failed to start" after 30 seconds
```

**Debug:**

```bash
# Check Docker Compose logs
docker compose logs

# Verify services explicitly
docker compose ps

# Check specific service logs
docker compose logs api-gateway
docker compose logs mongodb
```

**Common issues:**

- Port conflicts (3000, 3001, 3002, 3219, 6379, 27017 already in use)
- Docker daemon not running
- Insufficient disk space for MongoDB/Redis containers
- Network issues in Docker environment

**Solution:**

```bash
# Free ports and clear containers
docker compose down -v

# Restart Docker daemon
# Windows: Restart Docker Desktop
# macOS: Docker → Restart
# Linux: sudo systemctl restart docker

# Retry workflow on GitHub
```

### Lint checks pass locally but fail in GitHub Actions

**Cause:** Different Node.js versions or missing dependencies

**Solution:**

```bash
# Match GitHub Actions Node version (20.x)
nvm use 20
# or
node --version  # should be v20.x

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run lint
```

### Docker image doesn't appear in GHCR after successful build

**Wait time:** Images typically appear in Packages tab within 2-3 minutes

**Verify in GitHub UI:**

1. Repository → Packages tab
2. Search for `peerprep-g08-api-gateway`
3. Check if `:develop` or `:latest` tags are present

**Alternative: Check via registry API**

```bash
# List tags for a service (requires auth)
docker ls ghcr.io/<owner>/peerprep-g08-api-gateway
```

---

## Best Practices

### 1. Commit Messages

Use clear, descriptive commit messages for better release notes:

```
feat: add user password reset functionality
fix: resolve MongoDB connection timeout
docs: update API documentation
test: add integration tests for matching service
```

### 2. PR Reviews

- At least one approval required before merge
- Ensure all CI checks pass (lint + tests + integration)
- Verify changes don't break Docker builds

### 3. Staging vs Production

- **Develop branch**: Fast iteration, testing pipeline
  - Auto-deployed with `:develop` tag
  - Can push directly or via PR
  - Safe for experimental features
- **Main branch**: Production releases only
  - Manual merge to main (requires PR review)
  - Production images tagged `:latest`
  - GitHub Release created automatically
  - Stable, tested code only

### 4. Monitoring Deployments

- Watch GitHub Actions tab for workflow progress
- Check Packages tab to verify image availability
- Test pulled images locally before promoting to production

---

## Extending the Pipeline

### Adding AWS ECS Deployment

To auto-deploy production images to AWS ECS:

1. **Add AWS credentials as secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

2. **Extend `deploy-production.yml` with AWS ECS task:**
   ```yaml
   - name: Deploy to AWS ECS
     env:
       AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
       AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
     run: |
       aws ecs update-service \
         --cluster peerprep-cluster \
         --service api-gateway \
         --force-new-deployment
   ```

### Adding Slack Notifications

Add workflow status notifications:

1. **Create Slack webhook URL** (Slack workspace → Incoming Webhooks)

2. **Add as GitHub secret:** `SLACK_WEBHOOK_URL`

3. **Add notification step:**
   ```yaml
   - name: Notify Slack
     if: always()
     run: |
       curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
         -H 'Content-Type: application/json' \
         -d '{"text":"Deployment ${{ job.status }}"}'
   ```

### Adding Test Coverage Reports

1. Install coverage tools in services
2. Generate coverage reports in CI
3. Upload to Codecov or similar service

---

## Workflow Status Badges

Add to README.md for visibility:

```markdown
![CI - PR Validation](https://github.com/<owner>/peerprep-g08/actions/workflows/ci.yml/badge.svg?branch=develop)
![Deploy - Staging](https://github.com/<owner>/peerprep-g08/actions/workflows/deploy-staging.yml/badge.svg?branch=develop)
![Deploy - Production](https://github.com/<owner>/peerprep-g08/actions/workflows/deploy-production.yml/badge.svg?branch=main)
```

---

## FAQ

**Q: Can I manually trigger a workflow?**
A: Yes! GitHub Actions workflows can be triggered manually from the Actions tab. Click the workflow name and select "Run workflow".

**Q: How long does a full pipeline run take?**
A: Approximately 10-15 minutes end-to-end:

- Lint: 1-2 min
- Unit tests: 2-3 min
- Integration tests: 3-5 min
- Docker builds & push: 3-5 min

**Q: Can I push to main branch directly without PR?**
A: Technically yes, but not recommended. Always use PR workflows for:

- Code review
- CI validation before merge
- Clean commit history
- Push protection rules

**Q: What if I need to redeploy a previous version?**
A: Use Docker image tags:

```bash
# Pull specific version
docker pull ghcr.io/<owner>/peerprep-g08-api-gateway:develop-<old-commit-sha>

# Or use GitHub releases for production versions
```

---

## Summary

| Workflow                  | Trigger            | Purpose                        | Status       |
| ------------------------- | ------------------ | ------------------------------ | ------------ |
| **ci.yml**                | PR to develop/main | Validate code quality          | Blocking     |
| **deploy-staging.yml**    | Push to develop    | Build & push staging images    | Non-blocking |
| **deploy-production.yml** | Push to main       | Build & push production images | Non-blocking |

For questions or issues, check the GitHub Actions logs or this documentation.
