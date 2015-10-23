var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');
var nodemailer = require("nodemailer");

router.post('/', function(req, res, next) {
  var errors = [];
  var data = JSON.parse(req.body.data);
  if(!isEmail(data.email)) {
    errors.push({
      name: 'email'
      , message: 'A valid email is required'
    });
  }
  User.count({email: data.email})
  .then(function(emailCount) {
    if (emailCount == 0) {
      errors.push({
        name: 'email'
        , message: 'That email is not in use'
      });
    } else {
      User.findOne({email: data.email})
      .then(function(user) {
        var token = randomString(10);
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        user.save();
        var smtpTransport = nodemailer.createTransport("SMTP",{
          service: "Gmail",
          auth: {
            user: "poker.cs4920@gmail.com",
            pass: "weaxviorgglomlnk"
          }
        });
        var mailOptions={
          from: "PokerDots Support <poker.cs4920@gmail.com>",
          to: data.email,
          subject: "Account Recovery",
          text: 'Hello!\n\n' +
            'You are receiving this because you have requested a recovery email.\n\n' +
            'Your username is: ' + user.username + '\n\n' +
            'Please click on the following link, or paste this into your browser to reset your password:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        }
        console.log(mailOptions);
        smtpTransport.sendMail(mailOptions, function(error, response){
          if(error){
            console.log("Error: " + error);
            errors.push({
              name: 'email'
              , message: 'Error when sending mail, try again or contact the site admin'
            });
          } else {
          }
        });
      });
    }
    res.json({ errors: errors });
  })
});

function isEmail(email) {
  var regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  return regex.test(email);
}

function randomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

module.exports = router;
