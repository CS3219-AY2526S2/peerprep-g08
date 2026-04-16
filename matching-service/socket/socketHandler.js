const { handleFindMatch, handleDisconnect, handleCancelMatch } = require('../controllers/matchController');

const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('find-match', (data) => {
      handleFindMatch(io, socket, data);
    });

    socket.on('cancel-match', () => {
      handleCancelMatch(socket);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });
};

module.exports = initSocketHandler;
