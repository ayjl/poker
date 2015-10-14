function Tables() {
  this.tables = [];
}

Tables.prototype.find = function(tableID) {
  var idx = this.binarySearch(tableID);
  if(idx >= 0) {
    return this.tables[idx];
  }
  else {
    return null;
  }
}

Tables.prototype.all = function(tableID) {
  return this.tables;
}

// For testing
Tables.prototype.init = function() {
  var table = {
      id: 'p0k3r'
    , players: [null, null, null, null, null, null]
    , spectators: []
    , winners: []
    , cards: []
    , numPlayers: 0
    , playing: false
    , turn: -1
    , handPlayers: []
    , handFirstPlayer: null
    , gameState: -1
    , pot: 0
    , bet: 0
    , roundBet: 0
    , blind: 50
    , minRaise: 0  // This gets set to the blind before each round of betting
    , dealerSeat: 0
    , bigBlindSeat: -1
    , smallBlindSeat: -1
    , gameTimer: null
  };

  // this.tables.set(table.id, table);
  var idx = this.binarySearch(table.id);
  // Table not found
  if(idx < 0) {
    idx = 1 - idx;
    this.tables.splice(idx, 0, table);
  }
  else{
    console.log('Table exists');
  }

  return table;
}

Tables.prototype.create = function(blinds) {
  var uuid = require('node-uuid');
  var table = {
      id: uuid.v4()
    , players: [null, null, null, null, null, null]
    , spectators: []
    , winners: []
    , cards: []
    , numPlayers: 0
    , playing: false
    , turn: -1
    , handPlayers: []
    , handFirstPlayer: null
    , gameState: -1
    , pot: 0
    , bet: 0
    , roundBet: 0
    , blind: parseInt(blinds)
    , minRaise: 0  // This gets set to the blind before each round of betting
    , dealerSeat: 0
    , bigBlindSeat: -1
    , smallBlindSeat: -1
    , gameTimer: null
  };

  // this.tables.set(table.id, table);
  var idx = this.binarySearch(table.id);
  // Table not found
  if(idx < 0) {
    idx = 1 - idx;
    this.tables.splice(idx, 0, table);
  }
  else{
    console.log('Table exists');
  }

  return table;
}

Tables.prototype.binarySearch = function(id) {
  var lo = 0;
  var hi = this.tables.length - 1;

  while(lo <= hi) {
    var mid = (lo + hi) >>> 1;
    var midID = this.tables[mid].id;

    if(midID < id) {
      lo = mid + 1;
    }
    else if(midID > id) {
      hi = mid - 1;
    }
    else {
      return mid;
    }
  }

  return -(lo + 1);
}

module.exports = Tables;