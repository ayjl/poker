module.exports = function(req, res, next) {
  if(!req.session.user) {
    var num = Math.floor((Math.random() * 100000) + 1).toString();
    var pad = '000000';
    var padded = pad.substring(0, pad.length - num.length) + num;

    req.session.user = {};
    req.session.user.username = 'Guest' + padded;
    req.session.user.chips = 2000;
  }

  res.locals.query = req.query;

  if(req.isAuthenticated()) {
    res.locals.user = req.user;
  }
  else {
    res.locals.user = req.session.user;
  }
  res.locals.loggedIn = req.isAuthenticated();

  next();
};
