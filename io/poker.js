module.exports = function(io) {
  var poker = io.of('/poker');

  var table = {
      players: [null, null, null, null, null, null, null, null, null]
    , pot: 0
    , cards: []
    , numPlayers: 0
    , playing: false
    , turn: -1
    , handPlayers: []
    , gameState: -1
  };

  poker.on('connection', function(socket) {
    var req = socket.handshake;

    var seat;

    for (seat = 0; seat < table.players.length; seat++) {
      if (!table.players[seat]) {
        break;
      }
    }

    var player = {
        id: req.sessionID
      , name: req.session.user
      , cards: []
      , hand: null
      , socketID: socket.id
      , seat: seat
      , inHand: false
    };

    // Should try to avoid exposing this to all clients
    // and also a player's cards
    table.players.splice(seat, 1, player);
    table.numPlayers++;

    socket.broadcast.emit('player join', player);
    socket.emit('players', table.players);
    socket.emit('player id', player.id);

    var gameTimer = {};
    if (table.numPlayers > 1 && !table.playing) {
      table.playing = true;
      startGame(table, poker, socket, gameTimer);
    }

    // This is inside the poker namespace, so emitting 'action' from the client outside
    // the poker namespace will not trigger this
    socket.on('action', function(action) {
      var idx = getHandPlayerBySocket(socket.id, table);
      var player = table.handPlayers[idx];

      if (idx != -1 && table.turn == idx) {
        var prevTableTurn = table.turn;

        if (action.action == 'fold') {
          table.turn = prevTableTurn;

          table.handPlayers[table.turn].inHand = false;
          poker.emit('fold', table.handPlayers[table.turn]);
          table.handPlayers.splice(idx, 1);
          if (table.handPlayers.length <= 1) {
            progressGameState(table, poker, socket, gameTimer);
          }
        }
        else{
          table.turn++;
        }

        // Check if all players have had a turn
        if (table.turn == table.handPlayers.length) {
          progressGameState(table, poker, socket, gameTimer);
        }

        poker.emit('turn', table.handPlayers[table.turn]);
        console.log('thank you');
      } else {
        console.log('not your turn');
      }
    });

    socket.on('disconnect', function() {
      var seat;
      for (seat = 0; seat < table.players.length; seat++) {
        if (table.players[seat] && table.players[seat].id === req.sessionID) {
          break;
        }
      }

      if (seat < table.players.length) {
        socket.broadcast.emit('player leave', seat);
        player = table.players[seat];
        if (player.inHand) {
          player.inHand = false;
          handPlayerIdx = getHandPlayerBySocket(player.socketID, table);
          table.handPlayers.splice(handPlayerIdx, 1);

          if (table.turn > handPlayerIdx) {
            table.turn--;
          }

          if (table.handPlayers.length <= 1) {
            progressGameState(table, poker, socket, gameTimer);
          }
        }
        console.log(table.handPlayers);
        table.players.splice(seat, 1, null);
        table.numPlayers--;
      }
    });
  });

  return io;
};

function startGame(table, poker, socket, gameTimer) {
  resetGame(table, poker);
  var deck = require('../helpers/deck')();
  var seat = 0;
  table.handPlayers = table.players.filter(function(item) {
    return item;
  });

  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.inHand = true;
  }

  poker.emit('players in hand', table.handPlayers);

  // Deal player cards
  var player;
  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
    player.cards.push(deck.shift());
  }
  for (var i = 0; i < table.handPlayers.length; i++) {
    var player = table.handPlayers[i];
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

  table.gameState = 0;
  table.turn = 0;
  poker.emit('turn', table.handPlayers[table.turn]);
}

function progressGameState(table, poker, socket, gameTimer) {
  table.turn = 0;

  if (table.handPlayers.length <= 1) {
    table.winner = table.handPlayers[0];
    poker.emit('winner', table.winner);

    gameTimer['timer'] = setTimeout(function() {
      startGame(table, poker, socket, gameTimer);
    }, 3000);

    if (table.numPlayers <= 1) {
      resetGame(table, poker);
      table.playing = false;
      clearTimeout(gameTimer.timer);
    }

    return;
  }
  
  switch (table.gameState) {
    case 0:
      poker.emit('community cards', table.cards.slice(0, 3));
      console.log('time for flop');
      break;
    case 1:
      poker.emit('community cards', table.cards.slice(0, 4));
      console.log('time for turn');
      break;
    case 2:
      poker.emit('community cards', table.cards);
      console.log('time for river');
      break;
    case 3:
      console.log('time for reveal');
      evalWinner(table);
      poker.emit('winner', table.winner);

      gameTimer['timer'] = setTimeout(function() {
        startGame(table, poker, socket, gameTimer);
      }, 3000);
      break;
    default:
      console.log("default switch. should not be here. gameState: "+table.gameState);
  }

  table.gameState++;
}

function resetGame(table, poker) {
  poker.emit('reset');
  table.cards = [];
  table.winner = null;
  table.turn = -1;
  table.handPlayers = [];
  table.gameState = -1;
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

function getHandPlayerBySocket(socketID, table) {
  for (var i = 0; i < table.handPlayers.length; i++) {
    if (table.handPlayers[i] && table.handPlayers[i].socketID == socketID) {
      return i;
    }
  }

  return -1;
}