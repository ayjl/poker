module.exports = function(req, res, next) {
  res.locals.errorFlash = req.flash('error');
  next();
};
