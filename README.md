[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/HpD0QZBI)

# CS3219 Project (PeerPrep) - AY2526S2

## Group: G08

## How to run PeerPrep

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A MongoDB Atlas cluster (for user-service and question-service)

---

### 1. Set up environment files

Copy every service's `.env.example` to `.env` and fill in the required values:
See each service's `.env.example` for the required variables.

---

### 2. Start all services

```bash
docker compose up --build
```


---

### Useful commands

```bash
# Check all containers are running
docker compose ps

# View logs for a specific service
docker compose logs -f collab-service
docker compose logs -f matching-service

# Stop all containers
docker compose down
```