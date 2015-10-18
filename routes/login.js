var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user.js');

passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username })
  .then(function(user) {
    if(!user){
      return done(null, false, [{ name: 'username', message: 'Incorrect username' }]);
    }
    if(!user.validPassword(password)) {
      return done(null, false, [{ name: 'password', message: 'Incorrect password' }]);
    }

    return done(null, user);
  })
}));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, { username: 1, chips: 1 }, function(err, user) {
    done(err, user);
  });
});

router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if(err) {
      return next(err);
    }

    if(!user) {
      return res.json({ errors: info });
    }

    req.logIn(user, function(err) {
      if(err) {
        return next(err);
      }

      res.json({ errors: [] });
    });

  })(req, res, next);
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

module.exports = router;
