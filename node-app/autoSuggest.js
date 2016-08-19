var _ = require('lodash');
var settings = require('./settings');


function buildSeq(db, firstWord, callback) {
  var maxLength = settings.autoSuggest.maxWords || 50;

  var lastWord = firstWord;

  var seq = [firstWord];
  var length = 0;

  var cycle = function() {
    nextWord(db, lastWord, function(err, word) {
      if (err) {
        callback(err);
        return;
      }

      if (!word || word.length == 0) {
        callback(null, seq);
        return;
      }

      console.log('next word: ' + word);

      seq.push(word);
      lastWord = word;

      if (seq.length >= maxLength) {
        callback(null, seq);
        return;
      }

      cycle();
    });
  };

  cycle();
};

function nextWord(db, firstWord, callback) {
  var results = [];
  var totalCount = 0;
  db.each('SELECT second_word, count FROM words WHERE first_word=? ORDER BY count DESC LIMIT 200',
    [firstWord],
    function(err, row) {
      if (err) {
        callback(err);
        return;
      }

      results.push({
        word: row.second_word,
        count: totalCount,
      });

      totalCount += row.count;
    },
    function(err, ctx) {
      if (err) {
        callback(err);
        return;
      }

      var length = results.length;

      if (length == 0) {
        callback(null, '');
        return;
      }

      var value = Math.random() * totalCount;
      for (var i = 0; i < length - 1; i++) {
        if (value >= results[i].count && value < results[i+1].count) {
          callback(null, results[i].word);
          return;
        }
      }

      callback(null, results[length - 1].word);
    });
}

function storeText(db, text, opt_cb) {
  var allWords = _.map(text.split(/\W+/), function(word) {
    if (word.length > 255) {
      word = word.substr(0, 255);
    }
    return word.toLowerCase();//replace(/^\W+|\W+$/gm, '').toLowerCase();
  });

  allWords = _.filter(allWords, function(word) {
    return word.length > 0;
  });

  var stmt;
  var index = -1;

  var complete = function(err) {
    if (stmt) {
      stmt.finalize();
    }

    if (opt_cb) {
      opt_cb(err);
    }
  };

  var runNext = function() {
    if (++index >= allWords.length - 1) {
      complete();
      return;
    }

    stmt.run({$first_word: allWords[index], $second_word: allWords[index + 1]}, 
      function(err) {
        if (!err) {
          runNext();
        } else {
          complete(err);
        }
      });
  };

  stmt = db.prepare("INSERT OR REPLACE INTO words (first_word, second_word, count) VALUES($first_word, $second_word, COALESCE((SELECT count + 1 FROM words WHERE first_word=$first_word AND second_word=$second_word), 1))", 
    function (err) {
      if (err) {
        complete('error prepping stmt ' + err);
        return;
      }

      runNext();
    });
}



function suggest(db, word, callback) {
  var dict = {};

  db.each('SELECT first_word, count FROM words WHERE first_word LIKE ?',
    [word + '%'],
    function(err, row) {
      if (err) {
        callback(err);
        return;
      }

      for (var key in row) {
        console.log(key);
      }
      console.log('got row ' + row.first_word);

      if (!(row.first_word in dict)) {
        dict[row.first_word] = row.count;
      } else {
        dict[row.first_word] += row.count;
      }
    }, function(err, ctx) {
      if (err) {
        callback(err);
        return;
      }

      // Find the word with the highest count.
      var maxCount = 0;
      var foundWord = '';
      for (var key in dict) {
        if (dict[key] > maxCount) {
          maxCount = dict[key];
          foundWord = key;
        }
      }

      if (maxCount == 0) {
        callback('No matching word');
        // Maybe retry by removing characters one at a time
        return;
      }

      buildSeq(db, foundWord, callback);
    });
}

function initDB(db) {
  db.run('CREATE TABLE IF NOT EXISTS words (first_word VARCHAR(255), second_word VARCHAR(255), count int, UNIQUE(first_word, second_word) ON CONFLICT REPLACE)');
}

module.exports = {
  storeText: storeText,
  suggest: suggest,
  initDB: initDB
};