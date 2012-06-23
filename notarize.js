#!/usr/bin/env node

// Take a file, hash it, describe it, and send the metadata to a notary.

var fs = require('fs');
var crypto = require('crypto');
var path = require("path");
var util = require('util');
var querystring = require('querystring');  
var http = require('http'); 
var moment = require('moment'); 
var color = require('cli-color'); 
var request = require('request');

var argv = require('optimist')
    .usage('Notarize a file with the CitizenMediaNotary network.')
    .alias('f', 'file')
    .describe('f', 'File to notarize')
    .demand('n')
    .default('n', 'localhost')
    .alias('n', 'notary')
    .describe('n', 'Notary to use')
	  .default('p', '2000')
    .alias('p', 'port')
    .describe('p', 'Notary port')
    .alias('d', 'description')
    .describe('d', 'A description of the file being notarized')
    .alias('v', 'verify')
    .describe('v', 'Verify a file against the CMN network. Requires --file, unless used with --self.')
    .alias('s', 'self')
    .describe('s', 'Verify this client with the CMN network. Requires --verify.')
    .argv
;

var data={}; // TODO actually use this.

// Simple utility that doesn't error out when the file doesn't exist
// and returns the size    
function getSize(filename) {
  stat = fs.statSync(filename);
  return stat.size;
}

var sha1sum = crypto.createHash('sha1');

var fs = require('fs');

if (!argv.file && !argv.verify){
  require('optimist').showHelp();
  return;
}

if(argv.verify && argv.self){
  argv.file = __filename;
}

if (!argv.file && argv.verify){
  require('optimist').showHelp();
  return;
}

// XXX: Convert to synchronous 

try {
  var file_data = fs.readFileSync(argv.file, 'binary');
}
catch (err) {
  console.error("There was an error opening the file:");
  console.log(err);
  return;
}

sha1sum.update(file_data);
var d = sha1sum.digest('hex');

data.filename = argv.file.replace(/^.*[\\\/]/, '');
data.hash = d;
data.hashAlgorithm = 'SHA1';
data.size = new String(getSize(argv.file));

if(argv.d){
	console.log('Description: ', argv.d);
	data.description = argv.d;
}

host = {'address': argv.n, 'port': argv.p};
data.time = new String(new Date().getTime());

if(!argv.verify){
  sendMetadata(host, data);}
else{
  verifyMetadata(host, data);
}

/*
	Util
*/

function sendMetadata(host, data){

  var encoded_data=JSON.stringify(data);

  request(
    { method: 'POST'
    , uri: "http://localhost:2000/new"
    , json: encoded_data
    }

  , function (error, response, body) {
      
      if (error != undefined){
        console.log('Error! ', error.code);
        return;
      }

      if(response.statusCode == 200){
        console.log(color.green('Document notarized!'));
      } else {
        console.log(color.red('error: '+ response.statusCode));
        console.log(body);
      }
    }
  )
}

function verifyMetadata(host, data){

  request(
    { method: 'GET'
    , uri: "http://localhost:2000/verify/json/" + data.hash
    }

  , function (error, response, body) {
      
      if (error != undefined){
        console.log('Error! ', error.code);
        return;
      }

      if(response.statusCode == 200){
        console.log(color.green('Document verified!'));
        response = JSON.parse(body);
        console.log('The local file ' + color.magenta(data.filename) + ' with fingerprint ' + color.blue(data.hash) + ' was first seen on ' + color.green(moment(response.storeTime).format("dddd, MMMM Do YYYY h:mm:ssa")) + '.');

      } else {
        console.log(color.red('We have no record for that file.'));
      }
    }
  )
}