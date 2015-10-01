module.exports = function(io) {
  var poker = io.of('/poker');

  var table = {
      players: [null, null, null, null, null, null, null, null, null]
    , pot: 0
    , cards: []
    , numPlayers: 0
    , playing: false
    , turn: -1
    , lastAction: -1
    , handPlayers: []
    , gameState: -1
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
    // Should try to avoid exposing this to all clients
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

    // This is inside the poker namespace, so emitting 'action' from the client outside
    // the poker namespace will not trigger this
    socket.on('action', function(action) {
      var idx = getHandPlayerBySocket(socket.id, table);
      var player = table.handPlayers[idx];
      if (idx != -1 && table.turn == idx) {
        table.turn++;
        if (table.turn == table.handPlayers.length) {
          table.turn -= table.handPlayers.length;
        }

        if (table.lastAction == -1) {
          table.lastAction = player.seat;
        }
        if (table.turn == table.lastAction) {
          progressGameState(table, poker, socket, gameTimer);
        }
        console.log('thank you');
      } else {
        console.log('not your turn');
      }

      console.log(table.turn);
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
        table.players.splice(seat, 1, null);
        table.numPlayers--;
      }

      if (table.numPlayers < 2) {
        resetGame(table, poker);
        table.playing = false;
        clearTimeout(gameTimer.timer);
      }
    });
  });

  return io;
};

function startGame(table, poker, socket, gameTimer) {
  var deck = require('../helpers/deck')();
  var seat = 0;
  table.handPlayers = table.players.filter(function(item) {
    return item;
  });
  // table.playersInHand.addEach(table.handPlayers);

  // Deal player cards
  // var it = table.playersInHand.iterator();
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
}

function progressGameState(table, poker, socket, gameTimer) {

  switch(table.gameState) {
    case 0:
      poker.emit('community cards', table.cards.slice(0, 3));
      table.lastAction = -1;
      console.log('time for flop');
      break;
    case 1:
      poker.emit('community cards', table.cards.slice(0, 4));
      table.lastAction = -1;
      console.log('time for turn');
      break;
    case 2:
      poker.emit('community cards', table.cards);
      table.lastAction = -1;
      console.log('time for river');
      break;
    case 3:
      console.log('time for reveal');
      evalWinner(table);
      poker.emit('winner', table.winner);

      gameTimer['timer'] = setTimeout(function() {
        resetGame(table, poker);
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
  table.lastAction = -1;
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