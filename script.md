# Presentation Script: PeerPrep Containerization

### **Slide 1: Containers & Orchestration**

"The entire PeerPrep stack is managed using a single `docker-compose.yml` file. This architecture consists of 8 key components:

*   **Microservices**: We have four core back-end services: **User** for profiles, **Question** for the bank, **Collaboration** for real-time editing, and **Matching** for peer pairing.
*   **Gateway**: The `api-gateway` acts as the unified entry point, proxying all REST and WebSocket traffic.a
*   **Frontend**: A React/Vite-based UI served via Nginx.
*   **Databases**: We use **MongoDB** for persistent storage and **Redis** for in-memory collaboration state. Both are local containers but we've built the system to easily toggle to Cloud Atlas for the database."

> [!NOTE]
> **Deep Dive / Extra Details:**
> *   **Data Persistence**: We use **Docker Volumes** for `peerprep-mongodb`. Even if the container is deleted (`docker compose down`), your data is saved in a managed Docker volume and restored automatically on the next start.
> *   **Isolation**: Every microservice runs in its own isolated container with its own filesystem, meaning a crash in the `matching-service` won't bring down the `user-service`.

---

### **Slide 2: Image Strategy & Multi-Stage Builds**

"To ensure performance and security, we followed two main Dockerfile strategies:

1.  **Base Image (`node:20-alpine`)**: We switched from standard Node images to Alpine Linux. This reduced our average image size from over 1GB to approximately 150MB, providing a smaller attack surface and faster build/deploy cycles.
2.  **Multi-Stage Builds**:
    *   **Builder Stage**: Handles dependency installation (including `devDependencies`) and compiles the static React assets for the frontend.
    *   **Runtime Stage**: Copies only the production `node_modules` and the application context. This results in clean, artifact-free images that only contain what is necessary for execution."

> [!NOTE]
> **Deep Dive / Extra Details:**
> *   **Alpine OS**: Standard Node images are ~900MB because they include a full Debian OS. `alpine` is only ~5MB. This is why our final images are so much smaller and faster to pull.
> *   **DevDependencies**: By spliting the build, we can use heavy tools like `vite` or `tsc` in the **Builder** stage, but they never make it into the **Runtime** image. This reduces the "attack surface" (security risk).

---

### **Slide 3: Cross-Platform & Context Optimization**

"A major implementation challenge was cross-platform dependency resolution.

*   **Rollup Fix**: Since macOS users generate a `package-lock.json` targeting different architectures, running `npm ci` inside a Linux container would cause failures for native binaries like `@rollup/rollup-linux-arm64-musl`. We solved this in the Frontend Dockerfile by explicitly running `RUN rm -f package-lock.json && npm install` during the build to force the correct Linux-specific lockfile.
*   **Context Optimization**: We use `.dockerignore` to keep images lean, but we deliberately **include** `frontend/.env` (by not ignoring it). This allows Vite to natively inject environment variables during the `npm run build` step within the container."

> [!NOTE]
> **Deep Dive / Extra Details:**
> *   **The Rollup Error**: Vite uses `rollup` under the hood. On macOS, npm installs the "arm64-darwin" binary. Inside Docker (Linux), that binary won't run. By deleting `package-lock.json` and running `npm install` inside the container, we force npm to fetch the **linux-musl** binary instead.
> *   **Git Bloat**: A `.git` folder can be 200MB+. By ignoring it, we reduce the "Build Context" size, making the initial "Sending context to Docker daemon" step instantaneous.

---

### **Slide 4: Service Resilience & Health Checks**

"To prevent 'Connection Refused' errors during startup, we implemented custom health checks:

*   **Dependencies**: The `mongodb` and `redis` services are now governed by `healthcheck` commands that verify their readiness.
*   **Wait Mechanism**: By using the `condition: service_healthy` property in Docker Compose, our microservices are blocked from starting until the databases are fully responsive. This ensures a reliable startup sequence without manual intervention or restart loops."

> [!NOTE]
> **Deep Dive / Extra Details:**
> *   **Implementation Details**:
>     *   **MongoDB**: We run `mongosh --eval "db.adminCommand('ping')"` every 10s. This probes the actual database engine, not just the container.
>     *   **Redis**: We run `redis-cli ping` every 5s. 
> *   **The "Wait" Strategy**: We use `depends_on` with the `condition: service_healthy` flag. Standard `depends_on` only waits for the container to "exist," but our method waits for the DB to be **fully usable**.
> *   **Precedence**: For the backend, we prioritize the `.env` file over environment variables inside `docker-compose.yml`. This allows developers to change settings locally without ever touching the orchestration file.

---

### **Slide 5: Inter-service Communication Architecture**

"This final slide illustrates our internal 'peerprep-network'. It shows how we've achieved a 'Single Entry Point' architecture:

1.  **External Visibility**: Only the **Frontend** (port 5173) and **API Gateway** (port 3000) are exposed to the user's browser. This significantly reduces our security risk.
2.  **Internal DNS**: All backend communication happens on a private Docker bridge. The `matching-service` doesn't need to know where the `question-service` is located physically; it simply reaches out to `http://question-service:8080`.
3.  **Data Layer**: You'll notice that **MongoDB** and **Redis** are shared resources, but they live on the same internal network, ensuring lightning-fast database queries without going out to the open internet."

> [!NOTE]
> **Deep Dive / Extra Details:**
> *   **Network Isolation**: Even if a hacker compromises the frontend, they cannot directly access the database because the database doesn't expose any ports to the outside world—it only listens inside the private `peerprep-network`.
> *   **Service Dependency**: You'll see a dotted line from the **Matching Service** to the **Collab Service**. This shows how the Matching Service automatically triggers a room creation in the Collab Service once a pair is found—a process that happens entirely within the Docker cluster.

---

### **Closing: Future Roadmap (Q&A Strategy)**

"While the system is now fully containerized and stable, we’ve identified three key areas for the next phase:

*   **Database Seeding**: We want to add an automated seeder that populates sample questions on first run, eliminating the 'empty state' problem.
*   **Performance**: We're looking into a runtime injection strategy for the frontend to avoid the need for full rebuilds when simple config changes occur.
*   **Scaling**: The current API Gateway is a single point of failure; in a production setting, we would move toward a load-balanced setup with Kubernetes for better high-availability."