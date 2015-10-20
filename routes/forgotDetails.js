var express = require('express');
var router = express.Router();
var config = require('config');
var User = require('../models/user.js');
var Session = require('../models/session.js');
var nodemailer = require("nodemailer");

router.get('/', function(req, res, next) {
  res.render('forgotDetails');
});

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
        var smtpTransport = nodemailer.createTransport("SMTP",{
          service: "Gmail",
          auth: {
            user: "poker.cs4920@gmail.com",
            pass: "weaxviorgglomlnk" // or: tgdHN6kNj9SaD['Bs_kc
          }
        });
        var mailOptions={
          from: "PokerPros Support <poker.cs4920@gmail.com>",
          to: data.email,
          subject: "Account Recovery",
          text: "Hello!\nYour username for PokerPros is: " + user.username + "\nYour password is: " + user.password + "\nWe recommend you change your password immediately once you log in under the Update Details section in your account.\nKind regards,\nPokerPros Support\n"
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
            console.log("Message sent: " + response.message);
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

module.exports = router;
