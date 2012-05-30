// Requirements

// Web requirements
var app = require('express').createServer()
  , express = require('express')
  , jqtpl = require("jqtpl");

// Load the config file
var config = require('config').Server;

// DB Requirements
var cradle = require('cradle');
var db = new(cradle.Connection)().database('notary');

// Validation requirements
var sys = require('util'), fs = require('fs');
var validate = require('commonjs-utils/lib/json-schema').validate;

// Crypto setup
var crypto = require('crypto');
var signer = crypto.createSign(config.signatureAlgorithm);
var verifier = crypto.createVerify(config.signatureAlgorithm);

 // App Stuff
app.use('/public', express.static(__dirname + '/public'));
app.listen(config.port);
app.set("view engine", "html");
app.set("view options", {layout: false});
app.register(".html", require("jqtpl").express);

app.get('/', function (req, res) {
  res.render(__dirname + '/html/index.html', {domain: config.siteDomain});
  console.log('does this work?');
});

// DB Stuff

db.exists(function (err, exists) {
  if (err) {
    console.log('error', err);
  } else if (exists) {
    console.log('Database exists..');
  } else {
    console.log('No database. Creating one..');
    db.create();
    // It crashes here the first time. Wtf.
  }
});


// Validation stuff

// Load a schema by which to validate
fs.readFile(__dirname + '/schema/schema.json',function(err,data) {
  if(err) throw err;
  var schema = data;

    // var posts = JSON.parse(data);
    // Validate
    // var validation = validate(posts, schema);
    // Echo to command line
    // sys.puts('The result of the validation:  ',validation.valid);
});
