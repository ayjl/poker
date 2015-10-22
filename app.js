var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require('config');
var mongoose = require('mongoose');
mongoose.connect(config.get('db'));
mongoose.Promise = require('bluebird');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var nodemailer = require("nodemailer");
var passport = require('passport');
var flash = require('connect-flash');

var routes = require('./routes/index');
var poker = require('./routes/poker');
var dbTest = require('./routes/db-test');
var account = require('./routes/account');
var forgotDetails = require('./routes/forgotDetails');
var settings = require('./routes/settings');
var reset = require('./routes/reset');
var signup = require('./routes/signup');
var tablesRouter = require('./routes/tables');
var socketTest = require('./routes/socket-test');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var secret = process.env.SESSION_SECRET || 'correct entropy staple at battery caps horse';
var sessionMiddleware = session({
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  resave: false,
  saveUninitialized: false,
  secret: secret,
  store: new mongoStore( {
    autoRemove: 'interval',
    autoRemoveInterval: 10,   // In minutes
    mongooseConnection: mongoose.connection,
    touchAfter: 24 * 60 * 60, // 1 day
    ttl: 30 * 24 * 60 * 60    // 30 days
  })
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(secret));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

app.use(require('./middleware/auth'));
app.use(require('./middleware/flash'));


app.use('/', routes);
app.use('/db', dbTest);
app.use('/socket', socketTest);
app.use('/poker', poker);
app.use('/account', account);
app.use('/reset', reset);
app.use('/forgotDetails', forgotDetails);
app.use('/account/settings', settings);
app.use('/signup', signup);
app.use('/profile', require('./routes/profile'));
app.use('/', require('./routes/login'));
app.use('/tables', tablesRouter);

var Tables = require('./helpers/tables');
tables = new Tables();
tables.create(10,   'default-1');
tables.create(50,   'default-2');
tables.create(200,  'default-3');
tables.create(1000, 'default-4');
tables.create(4000, 'default-5');

var io = require('socket.io')();
io.of('/poker').use(function(socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});
require('./io')(io);
app.io = io;

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});




module.exports = app;
