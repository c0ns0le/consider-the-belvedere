var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var sys = require('sys')
var childProcess = require('child_process');

var app = express();
var request = require('request');
var sqlite3 = require('sqlite3').verbose();
var _ = require('lodash');

var autoSuggest = require('./autoSuggest');
var settings = require('./settings');

var util = require('util');


var fs = require("fs");
var dbFileName = "dbfile.db";
var dbBackupFileName = "dbfile.db.tmp";
//var exists = fs.existsSync(file);
var db = new sqlite3.Database(dbFileName);



// Setup requests to load json and urlencoded
app.use(bodyParser());

/**
 * Endpoint for adding a new post to a specific column.
 */
app.post('/posts/:colId', 
  function(req, res) {
    var colId = req.param('colId');
    var time = req.body.time;
    var header = req.body.header;
    var body = req.body.body;

    // Store the post words
    autoSuggest.storeText(db, header + ' ' + body, function(err) {
      if (err) {
        console.log("Error storing post words:" + err);
      }
    });

    var stmt = db.prepare('INSERT INTO posts (user_column, ts, header, body) VALUES (?,?,?,?)',
        function(err) {
          if (!err) {
            stmt.run(colId, time, header, body);
            stmt.finalize();
            res.send({'result': 'success'});
          } else {
            res.send({'result': 'error'});
          }
        });
  });

/**
 * Endpoint for listing the last 10 posts from a specific column.
 */
app.get('/posts/:colId',
  function(req, res) {
    var colId = req.param('colId');
    var posts = [];
    // Return last 10 posts for each id
    db.each('SELECT * FROM posts WHERE user_column=' + colId + ' ORDER BY id DESC LIMIT 10 ',
      function(err, row) {
        posts.push({
          id: colId,
          time: row.ts,
          header: row.header,
          body: row.body
        });
      },
      function(err, ctx) {
        res.send(posts);
      });
  });


/**
 * Endpoint for suggesting dreams.
 */
app.get('/suggest/:word',
  function(req, res) {
    var word = req.param('word');
    autoSuggest.suggest(db, word,
      function(err, seq) {
        if (err) {
          console.log('Error with autosuggest ' + err);
          res.send('');
          return;
        }

        res.send(seq.join(' '));
      });
  });

app.get('/update-db',
  function(req, res) {
    updateDB(function(err) {
      res.send('Updated db.');
    });
  });


function updateDB(cb) {
  var file = fs.createWriteStream(dbBackupFileName);

  file.on('finish', function() {
    file.close(function() {
      var stat = fs.statSync(dbBackupFileName);
      console.log('Got file ' + util.inspect(stat, false, null));
      db.close();
      fs.renameSync(dbBackupFileName, dbFileName)
      db = new sqlite3.Database(dbFileName);
      cb(null);
    });
  });

  request.get(settings.remoteDB).pipe(file);
}

// Load the index page + js
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

 
// Setup database on first run.
db.serialize(function() {
  db.run('CREATE TABLE IF NOT EXISTS posts (id unique, user_column int, ts VARCHAR(255), header VARCHAR(255), body VARCHAR(2047))');

  autoSuggest.initDB(db,
    function(err) {
      if (err) {
        console.log('Error initing auto suggest db ' + err);
        return;
      }

      autoSuggest.isEmpty(db,
        function(err, empty) {
          if (err) {
            console.log('Error checking autosuggest empty.');
            return;
          }

          if (empty) {
            learnFromDB(db);
          }
      });
    });
});



function learnFromDB(db) {
  var count = 0;
  var texts = [];
  var index = -1;

  var learnNext = function() {
    if (++index >= texts.length) {
      return;
    }

    console.log('Learning ' + ((index / (texts.length - 1)) * 100) + '%');
    autoSuggest.storeText(db, texts[index], function(err) {
      if (err) {
        console.log('Error learning ' + err);
        return;
      }

      learnNext();
    });
  };
  db.each('SELECT header, body FROM posts',
    function(err, row) {
      if (err) {
        console.log('Error with row ' + err);
        return;
      }
      texts.push(row.header + ' ' + row.body);
    },
    function(err, ctx) {
      if (err) {
        console.log('Error getting posts ' + err);
        return;
      }

      learnNext();
    });
};
 
function backup() {

  var time = Date.now();

  var filename = settings.backupDir + 'ctb-backup-' + time + '.db';

  console.log('Backing up to:' + filename);

  //if (!fs.existsSync(file)) {
    childProcess.exec('cp dbfile.db ' + filename, function(err) {
      if (err) {
        console.log('Error backing up:' + err);
      }
    });
  //}
};


app.set('port', process.env.PORT || settings.port);

backup();

setInterval(backup, 24 * 60 * 60 * 1000);

function launchChrome() {
  for (var i = 0; i < settings.chromePaths.length; i++) {
    var path = settings.chromePaths[i];
    console.log('Attempting to launch chrome from ' + path);
    if (fs.existsSync(path)) {
      childProcess.exec(['"' + path + '"', settings.chromeFlags, 'http://localhost:' + settings.port].join(' '), 
        function(err) {
          if (err) {
            console.log('Error launching chrome: ' + err);
          }
        });
      return;
    }
  }

  console.log('Can\'t find Chrome, update the settings.js file and add its path.');
}

function killChrome() {
  console.log('killing chrome');
  //killall -9 "Google Chrome"
  childProcess.exec('killall -9 "Google Chrome"', function(err) {
    console.log('error killing chrome:' + err);
  });
}

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
  launchChrome();

  var lastRefresh = new Date().getTime();
  
  // Every hour we check to see if we should refresh full screen.
  setInterval(function() {
    var date = new Date();
    var hour = date.getHours();

    // Only refresh in the morning between 3 and 7
    if (hour > 3 && hour < 7) {
      var time = date.getTime();
      // Refresh every 6 hours
      if (time - lastRefresh > (6 * 60 * 60 * 1000)) {
        lastRefresh = time;
        killChrome();
        setTimeout(launchChrome, 10000);
      }
    }
  }, 1 * 60 * 60 * 1000);
});





module.exports = app;