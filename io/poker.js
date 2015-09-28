module.exports = function(io) {
  var poker = io.of('/poker');

  var table = {
      players: [null, null, null, null, null, null, null, null, null]
    , pot: 0
    , cards: []
    , numPlayers: 0
    , playing: false
  };

  poker.on('connection', function(socket) {
    var req = socket.handshake;

    var player = {
        id: req.sessionID
      , name: req.session.user
    };

    var seat;

    for (seat = 0; seat < table.players.length; seat++) {
      if (!table.players[seat]) {
        break;
      }
    }

    player.cards = [];
    player.hand = null;
    player.socketID = socket.id;
    table.players.splice(seat, 1, player);
    table.numPlayers++;
    player.seat = seat;

    socket.broadcast.emit('player join', player);
    socket.emit('players', table.players);
    socket.emit('player id', player.id);

    var gameTimer = {};
    if (table.numPlayers > 1 && !table.playing) {
      table.playing = true;
      startGame(table, poker, socket, gameTimer);
    }

    socket.on('disconnect', function() {
      var seat;
      for (seat = 0; seat < table.players.length; seat++) {
        if (table.players[seat] && table.players[seat].id === req.sessionID) {
          break;
        }
      }

      if (seat < table.players.length) {
        socket.broadcast.emit('player leave', seat);
        table.players.splice(seat, 1, null);
        table.numPlayers--;
      }

      if (table.numPlayers < 2) {
        resetGame(table);
        table.playing = false;
        poker.emit('reset');
        clearTimeout(gameTimer.timer);
      }
    });
  });

  return io;
};

function startGame(table, poker, socket, gameTimer) {
  var deck = require('../helpers/deck')();
  var seat = 0;
  var playerSeats = [];

  // Deal player cards
  for (var i = 0; i < table.numPlayers; i++) {
    while (!table.players[seat]) {
      seat++;
    }
    playerSeats.push(seat);
    table.players[seat].cards.push(deck.shift());
    seat++;
  }
  for (var i = 0; i < table.numPlayers; i++) {
    var player = table.players[playerSeats[i]];
    player.cards.push(deck.shift());
    if (socket.id == player.socketID) {
      socket.emit(player.socketID).emit('player cards', player.cards);
    } else {
      socket.broadcast.to(player.socketID).emit('player cards', player.cards);
    }
  }

  // Deal community cards
  table.cards.push(deck.shift());
  table.cards.push(deck.shift());
  table.cards.push(deck.shift());
  deck.shift();
  table.cards.push(deck.shift());
  deck.shift();
  table.cards.push(deck.shift());
  poker.emit('community cards', table.cards);

  evalWinner(table);
  poker.emit('winner', table.winner);

  gameTimer['timer'] = setTimeout(function() {
    resetGame(table);
    startGame(table, poker, socket, gameTimer);
  }, 3000);
}

function resetGame(table) {
  table.cards = [];
  table.winner = null;
  for (var i = 0; i < table.players.length; i++) {
    if (table.players[i]) {
      var player = table.players[i];
      player.cards = [];
      player.hand = null
    }
  }
}

function evalWinner(table) {
  var evaluator = require("poker-evaluator");

  for (var i = 0; i < table.players.length; i++) {
    if (table.players[i]) {
      var player = table.players[i];
      var hand = table.cards.concat(player.cards);
      var eval = evaluator.evalHand(hand);
      player.hand =
      {
          handType: eval.handType
        , handRank: eval.handRank
        , handName: eval.handName
        , hand: hand
      }

      if (!table.winner) {
        table.winner = player;
      }
      else if (player.hand.handType > table.winner.hand.handType ||
               (player.hand.handType == table.winner.hand.handType &&
                player.hand.handRank > table.winner.hand.handRank)) {
        table.winner = player;
      }
    }
  }
}