/**
 * A column of text that is linked to a single keyboard via an id/address.
 * @param {number} id
 * @param {Persister} persister
 */
var Column = function(id, persister, delegate) {
    var self = this;
    this.id = id;

    this.delegate = delegate;
    this.container = $('<div class="column-container">');
    this.column = $('<div class="column">');
    this.el = $('<div class="inner">');
    this.dummy = $('<div class="dummy">');
    this.cta = $('<div class="cta">');
    this.cursor = $('<div class="cursor inactive">');
    this.password = 'hairspice';

    this.passwords = [{password: 'hairspice', pos:0, cb:function() {
        self.delegate.loadDreams();
    }}, {password:'fullscreenx', pos:0, cb: function() {
        var el = document.documentElement;
        el.webkitRequestFullScreen();
    }}];
   // this.fullScreenPassword = 'fullscreenx';
    this.passwordPos = 0;

    this.lastAutoSuggest = '';
    this.lastAutoSuggestTimeMS = 0;
    this.lastSuccessfulAutoSuggestTimeMS = 0;
    this.autoSuggestTimeout = -1;

    this.ctaVisible = false;
    this.ctaAnimation = -1;
    this.ctaText = 'Time to type your dreams';

    this.active = false;
    this.persister = persister;
    this.post = new Post();
    this.pruneInterval = -1;

    this.isHeader = false;
    this.numHeaderWords = 0;
    this.pruning = false;

    this.postViews = [];
    
    this.el.append(this.dummy);
    this.column.append(this.el);
    this.container.append(this.column);

    this.dreamEl = $('<div class="dream-cloud">');
    this.column.append(this.dreamEl);

    
    // Load posts from database.
    this.persister.load(id).then(function(posts) {
        // Posts are loaded in descending order, but we want the newest post
        // last, so we reverse.
        posts.reverse();

        _.each(posts, function(postData) {
            var postView = PostView.create();
            var post = new Post();
            post.set(postData);
            postView.update(post);
            self.push(postView);


        });

        // Auto prune to make sure we don't go over the column size.
        var initInterval = setInterval(function() {
            if ($('.columns').height() > 0) {
                self.prune(true);
                self.init();
                clearInterval(initInterval);
            }
            
        }, 100);
        
    });
};

Column.MIN_AUTOSUGGEST_INTERVAL_MS = 15000;
Column.AUTOSUGGEST_TIMEOUT_MS = 2500;
Column.MIN_AUTOSUGGEST_WORDS = 4;

Column.prototype.startPost = function() {
    // Create an empty post to type into
    this.isHeader = true;
    this.numHeaderWords = (2 + Math.random() * 5) | 0;
    this.push(PostView.create());
    this.getCurrentPostView().headerContainer.append(this.cursor);
};

Column.prototype.showCta = function() {
    if (!this.ctaVisible) {
        this.dreamEl.remove();

        var self = this;
        var ctaPos = 0;
        this.getCurrentPostView().container[0].style.display = 'none';
        this.ctaAnimation = setInterval(function() {
            var text = self.ctaText;
            ctaPos = (ctaPos + 1) % 4;
            for (var i = 0; i < ctaPos; ++i) {
                text += '.';
            }
            self.cta.text(text);
        }, 1000);
        this.ctaVisible = true;
        this.el.append(this.cta);
    }
};

Column.prototype.hideCta = function() {
    if (this.ctaVisible) {
        this.getCurrentPostView().container[0].style.display = '';
        clearInterval(this.ctaAnimation);
        this.ctaAnimation = -1;
        this.ctaVisible = false;
        this.cta.remove();
    }
};

Column.prototype.init = function() {
    this.startPost();
    // If a post is untouched for 15 seconds it is persisted and a new post
    // is created.
    var self = this;
    this.postCheckInterval = setInterval(function() {
        if (self.active && Date.now() - self.post.time > Post.MAX_IDLE_TIME_MS) {
            self.active = false;
            self.cursor.addClass('inactive');
        }

        if (!self.post.isEmpty()) {
            var time = Date.now();
            if (time - self.post.time > Post.MAX_IDLE_TIME_MS || (self.post.isFull())) {
                self.persist();
                self.showCta();
            }
        }


    }, 1000);


    // Start auto-pruning every 2 seconds while someone is typing. If they stop
    // for 5 seconds we stop the interval.
    if (this.pruneInterval == -1) {
        this.pruneInterval = setInterval(function() {
            self.prune();
            var time = Date.now();
            if (time - self.post.time > Post.MAX_IDLE_TIME_MS) {
                self.showCta();
            }
        }, 2000);
    }
};

Column.prototype.getCurrentPostView = function() {
    return this.postViews[this.postViews.length - 1];
};

/**
 * Convenience function for pushing the a new post onto the column dom. Keeps
 * track of all the posts using an array so we can prune them later.
 * @param {PostView} postView
 */
Column.prototype.push = function(postView) {
    this.postViews.push(postView);
    this.el.append(postView.container);
};

Column.prototype.testPassword = function(charCode) {
    var character = String.fromCharCode(charCode);

    for (var i = 0; i < this.passwords.length; ++i) {
        var password = this.passwords[i].password;
        var pos = this.passwords[i].pos;
        if (pos < password.length && character == password[pos]) {
            this.passwords[i].pos++;
            if (this.passwords[i].pos == password.length) {
                this.passwords[i].pos = 0;
                this.post.reset();
                this.getCurrentPostView().update(this.post);
                this.passwords[i].cb();
                return true;
            }
        } else {
            this.passwords[i].pos = 0;
        }
    }
};

Column.prototype.displayAutoSuggest = function(text) {
    // Fade it in only if its not in the dom already.
    var shouldFadeIn = true;//this.dreamEl.parent().length == 0;
    // Hide any previous post views
    if (shouldFadeIn) {
        this.dreamEl.remove();
        this.dreamEl.css({opacity: 0, filter: 'blur(5px)'});
        this.getCurrentPostView().container.append(this.dreamEl);
        var self = this;
        setTimeout(function() {
            self.dreamEl.css({opacity: 1, filter: 'blur(0px)'});
        }, 100);
    }

    this.dreamEl.text(text);
}

Column.prototype.autoSuggest = function() {
    var self = this;

    // If we received a suggestion response, don't request another one for 
    // 5 seconds. Also don't do requests faster than 2.5 seconds apart.
    var t = new Date().getTime();
    if (t - this.lastSuccessfulAutoSuggestTimeMS < Column.MIN_AUTOSUGGEST_INTERVAL_MS || t - this.lastAutoSuggestTimeMS < Column.AUTOSUGGEST_TIMEOUT_MS) {
        clearTimeout(this.autoSuggestTimeout);
        this.autoSuggestTimeout = setTimeout(function() {
            self.autoSuggest();
        }, Column.AUTOSUGGEST_TIMEOUT_MS);
        return;
    }


    // Extract the current word from the whole text
    // TODO: might be a faster way to do this.
    var blurb = this.post.header;
    if (this.post.body.length) {
        if (blurb.length) {
            blurb += ' ';
        }
        blurb += this.post.body;
    }

    var allWords = blurb.split(/[^\w']+/);
    var lastWord = '';

    // Pop off any garbage
    while (allWords.length) {
        lastWord = allWords.pop().replace(/^\W+|\W+$/gm, '');
        if (lastWord.length) {
            break;
        }
    }

    if (lastWord.length < Column.MIN_AUTOSUGGEST_WORDS || lastWord == this.lastAutoSuggest) {
        return;
    }

    this.lastAutoSuggest = lastWord;

    clearTimeout(this.autoSuggestTimeout);
    this.autoSuggestTimeout = -1;
    this.lastAutoSuggestTimeMS = t;

   
    $.get('/suggest/' + lastWord, function(response) {
        if (response && response.length > 0) {
            self.lastSuccessfulAutoSuggestTimeMS = new Date().getTime();
            self.displayAutoSuggest(response);
        }
    });
};

/**
 * Keypress handler received from controller. Reads the character code and 
 * appends the proper string to the current postview.
 */
Column.prototype.keyPress = function(charCode) {
    var time = Date.now();
    this.hideCta();

    if (this.testPassword(charCode)) {
        return;
    }

    var prevPostTime = this.post.time;
    this.post.time = time;

    // Header is over if its been 5 seconds, they hit enter, the header is
    // more than 128 characters, or the header is more than the number of
    // words.
    if (this.isHeader && !this.post.isHeaderEmpty()) {
        if (
                charCode == 13 || 
                this.post.getNumHeaderWords() >= this.numHeaderWords) {
            this.isHeader = false;
            this.getCurrentPostView().bodyContainer.append(this.cursor);
        } else if (this.post.isHeaderFull()) {
            var headerWords = this.post.header.split(/\s+/g);
            if (headerWords.length > 1) {
                this.post.body = headerWords.pop();
                this.post.header = headerWords.join(' ');
                this.getCurrentPostView().update(this.post);
                this.isHeader = false;
                this.getCurrentPostView().bodyContainer.append(this.cursor);
            }
        }
    } 

    if (this.isHeader) {
        // Ignore any return calls within the header
        if (charCode != 13) {
            this.post.header += String.fromCharCode(charCode);
            this.getCurrentPostView().setHeader(this.post.header);
        }
    } else {
        var isPostBodyEmpty = this.post.isBodyEmpty();
        var shouldAppend = true;
        var shouldPersist = false;

        if (isPostBodyEmpty) {
            if (charCode == 13) {
                shouldAppend = false;
            }
        } else {
            if (charCode == 13 && this.post.body.length > 2 && 
                    this.post.body[this.post.body.length - 1] == '\r') {
                shouldPersist = true;
            }
        }

        if (shouldPersist) {
            this.persist();
        } else if (shouldAppend) {
            this.post.body += String.fromCharCode(charCode);
            this.getCurrentPostView().setBody(this.post.body);
        }
    }

    this.autoSuggest();

    if (!this.active) {
        this.active = true;
        this.cursor.removeClass('inactive');
    }
};

/**
 * Checks if the posts are nearing the bottom of the screen, if so, it removes
 * the oldest post and animates up.
 */
Column.prototype.prune = function(opt_immediate) {
    var self = this;
    if (this.pruning) return;
    if (this.postViews.length > 1 && this.el.height() >= $('.columns').height() * 0.95) {
        // TODO: Animate it away
        var postView = this.postViews.shift();

        if (opt_immediate) {
            PostView.dispose(postView);
            this.prune(true);
        } else {
            this.pruning = true;
            var height = postView.container.height();
            var width = postView.container.width();
            this.dummy.css({'padding-top': height + 'px'});
            

            postView.container.css({'position': 'absolute', 'width': width + 'px', 'height': height + 'px'});
            postView.container.addClass('start-trans');
            setTimeout(function() {
                postView.container.css({/*'transform': 'translateY(-500px) rotate(600deg)', */'opacity': '0'})
                setTimeout(function() {
                    self.dummy.animate({'padding-top': '0px'});
                    PostView.dispose(postView);
                    setTimeout(function() {
                        self.pruning = false;
                        self.prune();
                    }, 1000);
                }, 1000);
            }, 30);
        }
    }
};

Column.prototype.clear = function() {

    while (this.postViews.length > 1) {
        var postView = this.postViews.shift();
        PostView.dispose(postView);
    }

    this.post.reset();
    this.getCurrentPostView().update(this.post);
};

Column.prototype.loadPosts = function(posts) {
    var self = this;

    var postView = this.postViews.pop();
    postView.container.remove();

    _.each(posts, function(postData) {
        var postView = PostView.create();
        var post = new Post();
        post.set(postData);
        postView.update(post);
        self.push(postView);
    });

    this.prune(true);
    this.hideCta();

    this.push(postView);
};

Column.prototype.persist = function() {
    if (this.post.isValid()) {
        this.persister.persist(this.post, this.id);
        this.post.reset();
        this.startPost();
    } else {
        this.isHeader = true;
        this.post.reset();
        this.getCurrentPostView().update(this.post);
    }
};

Column.prototype.keyBack = function() {
    // If they deleted past the body, then jump back to the header
    if (!this.isHeader && this.post.isBodyEmpty()) {
        this.isHeader = true;
        this.getCurrentPostView().headerContainer.append(this.cursor);
    }

    if (this.isHeader) {
        this.post.deleteHeaderChar();
        this.getCurrentPostView().setHeader(this.post.header);

    } else {
        this.post.deleteBodyChar();
        this.getCurrentPostView().setBody(this.post.body);
    }
};

