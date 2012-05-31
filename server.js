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
var schema;

// Crypto setup
var crypto = require('crypto');
var signer = crypto.createSign(config.signatureAlgorithm);
var verifier = crypto.createVerify(config.signatureAlgorithm);

var publicKey;
var privateKey;

fs.readFile(__dirname + '/crypto/private.pem', 'utf8', function (err,data) {
  if (err) {
    console.log("Private key not found!");
    return console.log(err);
  }
  privateKey = data;
  console.log("Private key loaded.");
});

fs.readFile(__dirname + '/crypto/public.pem', 'utf8', function (err,data) {
  if (err) {
    console.log("Public key not found!");
    return console.log(err);
  }
  publicKey = data;
  console.log("Public key loaded.");
});

 // App Stuff
app.use('/public', express.static(__dirname + '/public'));
app.use(express.bodyParser()); //nicer POST
app.listen(config.port);
app.set("view engine", "html");
app.set("view options", {layout: false});
app.register(".html", require("jqtpl").express);

// Validate, sign, store and duplicate a new record.
app.post('/new', function(req, res){

    /*
      Validate
    */
    metadata = req.body;
    metadata['storeTime'] = new Date().getTime();

    //Get remote address
    if(req.headers['x-forwarded-for']){
        ip_address = req.headers['x-forwarded-for'];
    }
    else {
        ip_address = req.connection.remoteAddress;
    }

    metadata['remoteAddress'] = ip_address;
    metadata['host'] = req.headers.host;

    var validation = validate(metadata, schema);
    console.log('Is this data valid.. ', validation.valid);

    if (!validation.valid){
      console.log(validation.errors);
      return res.send("You sent some invalid data.");
    }

    /*
      Sign
    */
    var signer = crypto.createSign(config.signatureAlgorithm); //Signers can only be used once, so make a new one.
    signer.update(JSON.stringify(metadata)); // Feed it
    var signature = signer.sign(privateKey, 'base64'); // Signer is now spent.
    metadata['signature'] = signature; // Attach it.

    /*
      Store
    */
    db.save(metadata['hash'], metadata, function (err, res) {
          if (err) {
              // TODO. Handle error
              console.log('Entry NOT saved!');
              console.log(err);
          } else {
             console.log('Entry saved.');
             //XXX Share.
          }
      });

    /*
      Share
    */


    // Return response
    res.send(req.body);
});


// Verify and store a duplicate from a sister server.
app.post('/duplicate', function(req, res){

    // Verify and store duplicate

    // Return response
    res.send(req.body);
});


// Check database for a record with the given hash.
app.get('/verify/:hash', function (req, res) {
  db.get(req.params.hash, 
     function (err, doc) {
        if (err) {
            res.send("We have no record for a file of with that hash.");
        } else {
            res.send(doc);
        }
    });

});

// Homepage
app.get('/', function (req, res) {
  res.render(__dirname + '/html/index.html', {domain: config.siteDomain});
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

// Sharing

// Validation stuff

// Load a schema by which to validate
fs.readFile(__dirname + '/schema/schema.json', 'utf8', function(err,data) {
  if(err) throw err;
  schema = JSON.parse(data);
});
