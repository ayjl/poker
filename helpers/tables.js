function Tables() {
  this.tables = [];
  this.names = [
      'Acropolis'
    , 'Amazon Rainforest'
    , 'Angkor Wat'
    , 'Big Ben'
    , 'Chichen Itza'
    , 'Easter Island'
    , 'Eiffel Tower'
    , 'Giza'
    , 'Golden Gate'
    , 'Grand Canyon'
    , 'Great Wall'
    , 'Halong Bay'
    , 'Hoover Dam'
    , 'Iguazu Falls'
    , 'Kilimanjaro'
    , 'Komodo Island'
    , 'Machu Picchu'
    , 'Mount Everest'
    , 'Mount Fuji'
    , 'Niagara Falls'
    , 'Opera House'
    , 'Panama Canal'
    , 'Stonehenge'
    , 'Taj Mahal'
    , 'The Colosseum'
    , 'The Louvre'
    , 'Uluru'
    , 'Yosemite'
  ];

  this.names.sort(function() { return 0.5 - Math.random() });
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

Tables.prototype.create = function(blinds, id) {
  var uuid = require('node-uuid');
  if(!id) {
    id = uuid.v4();
  }

  var name = this.names.shift();
  this.names.push(name);

  var suffix = Math.floor(this.tables.length / this.names.length);
  if(suffix > 0) {
    name += ' ' + suffix;
  }

  var table = {
      id: id
    , name: name
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
    idx = -(idx + 1);
    this.tables.splice(idx, 0, table);
  }
  else{
    console.log('Table exists');
  }

  return table;
}

Tables.prototype.binarySearch = function(key) {
  var lo = 0;
  var hi = this.tables.length - 1;

  while(lo <= hi) {
    var mid = (lo + hi) >>> 1;
    var midID = this.tables[mid].id;

    if(midID < key) {
      lo = mid + 1;
    }
    else if(midID > key) {
      hi = mid - 1;
    }
    else {
      return mid;
    }
  }

  return -(lo + 1);
}

module.exports = Tables;