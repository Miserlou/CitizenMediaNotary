#!/usr/bin/env node

// Take a file, hash it, describe it, and send the metadata to a notary.

var fs = require('fs');
var crypto = require('crypto');
var path = require("path");
var util = require('util');
var querystring = require('querystring');  
var http = require('http'); 

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
data.size = getSize(argv.file);

if(argv.d){
	console.log('Description: ', argv.d);
	data.description = argv.d;
}

host = {'address': argv.n, 'port': argv.p};
data.time = new Date().getTime();

sendMetadata(host, data);

/*
	Util
*/

function sendMetadata(host, data){

  console.log("Sending data..");

  var options = {
    host: host.address,
    port: host.port,
    path: '/new',
    method: 'POST'
  };

  var encoded_data=JSON.stringify(data);
  console.log(encoded_data);

  request(
    { method: 'POST'
    , uri: "http://localhost:2000/new"
    , json: encoded_data
    }

  , function (error, response, body) {
      if(response.statusCode == 200){
        console.log('Hooray');
        console.log(body);
      } else {
        console.log('error: '+ response.statusCode);
        console.log(body);
      }
    }
  )

// request.post({
//         headers: {'content-type' : 'application/x-www-form-urlencoded'},
//         url: host.address,
//         port: host.port,
//         body: "mes=heydude"
//         }, function(error, response, body){
//           console.log(body);
//     });

  // var req = http.request(options, function(res) {
  //   res.setEncoding('utf8');
  //   res.on('data', function (chunk) {
  //   });
  // });

  // req.on('error', function(e) {
  //   console.log('Problem talking to', host.address, ': ')
  //   console.log(e.message);
  // });

  // write data to request body
  // req.write(encoded_data);
  // req.end();
  
}