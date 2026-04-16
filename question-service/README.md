# Question Service Microservice

## Set Up

- Create a `.env` file in the question-service directory.
  Inside it, add this:

```
DB_CLOUD_URI=mongodb+srv://<USERNAME>:<PASSWORD>@peerprep-grp8.wu6qj3s.mongodb.net/question_service_db?appName=Peerprep-Grp8
DB_LOCAL_URI=mongodb://127.0.0.1:27017/peerprepUserServiceDB
PORT=8080
ENV=PROD
```

Take note this URI links this service specifically to the question_service_db in the shared cluster. Any database queries will update there.

- Run `npm install` in the question-service directory to install dependencies

- Run `npm run dev` to run the microservice

- Run `npm run test` to run the test cases.

- Run  `npx jest --coverage` to see test coverage. 