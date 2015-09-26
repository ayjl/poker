module.exports = function(io) {
  var poker = io.of('/poker');
  var Dict = require('collections/dict');

  var table = {
      players: new Dict()
    , pot: 0
    , cards: []
    , freeSeats: [0, 1, 2, 3, 4, 5, 6, 7, 8]
  };

  poker.on('connection', function(socket) {
    var req = socket.handshake;

    var player = {
        name: req.session.user
      , seat: table.freeSeats.shift()
    }
    table.players.add(player, req.sessionID);

    player['id'] = req.sessionID;

    socket.broadcast.emit('player join', player);
    socket.emit('players', table.players.toObject());

    socket.on('disconnect', function() {
      var seat = table.players.get(req.sessionID).seat;
      socket.broadcast.emit('player leave', seat);
      table.freeSeats.unshift(seat);
      table.freeSeats.sort();
      table.players.delete(req.sessionID);
    });
  });

  return io;
};
