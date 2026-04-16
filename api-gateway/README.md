## PeerPrep API Gateway

This service acts as the entry point for our PeerPrep microservices architecture.
It will serve as a centralized point to handle routing and handle authentication checks

## How it works

The gateway listens on port **3000**. It recieve request from frontend and proxies to each microservice

- `http://localhost:3000/api/user-service/*` → Proxies to **User Service** (Port 3001)
- `http://localhost:3000/api/question-service/*` → Proxies to **Question Service** (Port 8080)

## Set-Up

1. Install Dependencies
   In the `api-gateway` folder,
   npm install

2. Config Env Variables.
   Create `.env` file in `api-gateway` folder

PORT=3000
USER_SERVICE_URL=http://localhost:3001
QUESTION_SERVICE_URL=http://localhost:8080
MATCHING_SERVICE_URL=http://localhost:3002

## Running the gateway

Run :
npm start

Ensure that you run in this sequence.

1. User Service (Port 3001)
2. Question Service (Port 8080)
3. API Gateway (Port 3000)
4. Frontend (Port 5173)

## Verification

You can verify if gateway is routing correctly by visiting:
`http://localhost:3000/`

You can also test the routing to Question and User service.
http://localhost:3000/api/question-service/`
http://localhost:3000/api/user-service/`
