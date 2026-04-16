# Collaboration Service

## Currently

### API
- `POST /rooms`: Create a new room. Returns the room ID.
- `POST /rooms/join`: Join an existing room by ID cthat is sent in request body.
- `DELETE /rooms/:id`: Delete a room by ID.

### Frontend Testing

A temporary page `/rooms` is available to to test create and join room logic before matching service integration.

`/rooms/:id` allows users to join created rooms if they know the id.

## Todos

### Frontend
Add code editor and question display

Usernames should be obtained from HTTP request to /auth/me of the User service and sent together with each chat message.

### Add Database Connection
Currently, the collab service uses an in-memory data structure to store room information. This should be replaced with a persistent database connection.

### User status
Add logic to check user status (disconnected, idle, active)

### Integration with Matching Service
Matching Service should call the create room API of Collaboration Service when a match is found.

The returned room ID will then be used to create the join request and redirect users.

Decide if Matching Service pulls a question from the Question Service and sends it to the room during room creation to be displayed.

### Integration with User Service
Collaboration Service should authenticate users so only the matched users are allowed to join the room. 