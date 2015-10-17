module.exports = function(req, res, next) {
  if(!req.session.user) {
    var num = Math.floor((Math.random() * 100000) + 1).toString();
    var pad = '000000';
    var padded = pad.substring(0, pad.length - num.length) + num;
    req.session.user = 'Guest' + padded;
    req.session.chips = 2000;
  }

  res.locals.session = req.session;
  res.locals.query = req.query;

  next();
};
