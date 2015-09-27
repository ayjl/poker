module.exports = function() {
  var uuid = require('node-uuid');
  var deck = [
      '2c', '3c', '4c', '5c', '6c', '7c', '8c', '9c', '10c', 'Jc', 'Qc', 'Kc', 'Ac'
    , '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d', '10d', 'Jd', 'Qd', 'Kd', 'Ad'
    , '2h', '3h', '4h', '5h', '6h', '7h', '8h', '9h', '10h', 'Jh', 'Qh', 'Kh', 'Ah'
    , '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', 'Js', 'Qs', 'Ks', 'As'
  ];

  var rand = [];

  for(var i=0; i<deck.length; i++) {
    rand.unshift({ card: deck[i], uuid: uuid.v4() });
  }

  rand.sort(function(a, b) {
    if(a.uuid < b.uuid) {
      return -1;
    }
    return 1;
  });

  for(var i=0; i<deck.length; i++) {
    deck[i] = rand[i].card;
  }

  return deck;
};