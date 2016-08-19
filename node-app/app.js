var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var sys = require('sys')
var childProcess = require('child_process');

var app = express();
var sqlite3 = require('sqlite3').verbose();
var _ = require('lodash');


var fs = require("fs");
var file = "dbfile.db";
var exists = fs.existsSync(file);
var db = new sqlite3.Database(file);



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
    storePostWords(header + ' ' + body);

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
    var response = suggestWord(word);
    res.send({"a":response});
  });




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
//
  db.run('CREATE TABLE IF NOT EXISTS words (first_word VARCHAR(255), second_word VARCHAR(255), count int, UNIQUE(first_word, second_word) ON CONFLICT REPLACE)');
});

function storePostWords(post) {
  var allWords = _.map(post.split(/\W+/), function(word) {
    return word.replace(/^\W+|\W+$/gm, '').toLowerCase();
  });

  allWords = _.filter(allWords, function(word) {
    return word.length > 0;
  });

  var stmt;
  var index = -1;
  var runNext = function() {
    if (++index >= allWords.length - 1) {
      return;
    }

    stmt.run({$first_word: allWords[index], $second_word: allWords[index + 1]}, 
      function(err) {
        if (!err) {
          console.log('saved ');
          runNext();
        } else {
          console.log('got error ' + err);
        }
      });
  };


  stmt = db.prepare("INSERT OR REPLACE INTO words (first_word, second_word, count) VALUES($first_word, $second_word, COALESCE((SELECT count + 1 FROM words WHERE first_word=$first_word AND second_word=$second_word), 1))", 
    function (err) {
      if (err) {
        console.log('error prepping stmt');
        return;
      }

      runNext();
    });
}

function storeWordPair(stmt, firstWord, secondWord) {
  stmt.run({$first_word: firstWord, $second_word: secondWord}, 
  function(stmtErr) {
    if (stmtErr) {
      console.log('Error storing word pair:' + firstWord + ', ' + secondWord + ' : ' + stmtErr);
    } else {
      console.log('Stored ' + firstWord + ', ' + secondWord);
    }
  });
}

function suggestWord(word) {
  console.log('suggest word: ' + word);
  return 'a suggestion';
}
 
function backup() {

  var time = Date.now();

  var filename = '~/documents/ctb-backup-' + time + '.db';

  console.log('backing up to:' + filename);

  //if (!fs.existsSync(file)) {
    childProcess.exec('cp dbfile.db ' + filename, function(err) {
      console.log('err:' + err);
    });
  //}
};


app.set('port', process.env.PORT || 8888);

backup();

setInterval(backup, 24 * 60 * 60 * 1000);

function launchChrome() {
  console.log('launching chrome...');
  var exists = fs.existsSync('/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome');

  if (exists) {
    childProcess.exec('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --kiosk --incognito http://localhost:8888/', function(err) {
      console.log('err:' + err);
    });
  } else {
    var exists = fs.existsSync('/Applications/Internet/Google\ Chrome.app/Contents/MacOS/Google\ Chrome');

    if (exists) {
      childProcess.exec('/Applications/Internet/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --kiosk --incognito http://localhost:8888/', function(err) {
        console.log('err:' + err);
      });
    } else {
      console.log('cant find google chrome.');
    }
  }
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