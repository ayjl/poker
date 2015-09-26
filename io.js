var io = require('socket.io')();

io.on('connection', function (socket) {
  io.emit('chat message', 'A user connected');

  socket.on('disconnect', function(){
    io.emit('chat message', 'A user disconnected');
  });

  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

module.exports = io;
