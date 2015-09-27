module.exports = function(io) {
  var poker = io.of('/poker');
  var Dict = require('collections/dict');

  var table = {
      seats: [null, null, null, null, null, null, null, null, null]
    , pot: 0
    , cards: []
  };

  poker.on('connection', function(socket) {
    var req = socket.handshake;

    var player = {
        id: req.sessionID
      , name: req.session.user
    };

    var seat;

    for(seat=0; seat<table.players.length; seat++) {
      if(!table.players[seat]){
        break;
      }
    }

    table.players.splice(seat, 1, player);
    player['seat'] = seat;

    socket.broadcast.emit('player join', player);
    socket.emit('players', table.players);

    socket.on('disconnect', function() {
      var seat;
      for(seat=0; seat<table.players.length; seat++) {
        if(table.players[seat] && table.players[seat].id === req.sessionID){
          break;
        }
      }
      socket.broadcast.emit('player leave', seat);
      table.players.splice(seat, 1, null);
    });
  });

  return io;
};
