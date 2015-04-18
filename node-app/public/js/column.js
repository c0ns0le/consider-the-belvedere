/**
 * A column of text that is linked to a single keyboard via an id/address.
 * @param {number} id
 * @param {Persister} persister
 */
var Column = function(id, persister) {
    var self = this;
    this.id = id;

    this.container = $('<div class="column-container">');
    this.column = $('<div class="column">');
    this.el = $('<div class="inner">');
    this.dummy = $('<div class="dummy">');
    this.cursor = $('<div class="cursor inactive">');

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

Column.prototype.startPost = function() {
    // Create an empty post to type into
    this.isHeader = true;
    this.numHeaderWords = (2 + Math.random() * 5) | 0;
    this.push(PostView.create());
    this.getCurrentPostView().headerContainer.append(this.cursor);
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
            }
        }


    }, 1000);


    // Start auto-pruning every 2 seconds while someone is typing. If they stop
    // for 5 seconds we stop the interval.
    if (this.pruneInterval == -1) {
        this.pruneInterval = setInterval(function() {
            self.prune();
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

/**
 * Keypress handler received from controller. Reads the character code and 
 * appends the proper string to the current postview.
 */
Column.prototype.keyPress = function(charCode) {
    var time = Date.now();
/*
    if (!this.post) {
        this.isHeader = true;
        this.numHeaderWords = 2 + (Math.random() * 2 | 0);

        this.post = {
            time: time,
            header: '',
            body: ''
        };

        this.push(this.postEl = PostView.create());
    } else {
        this.post.time = time;
    }
    */

    var prevPostTime = this.post.time;
    this.post.time = time;

    // Header is over if its been 5 seconds, they hit enter, the header is
    // more than 128 characters, or the header is more than the number of
    // words.
    if (this.isHeader && !this.post.isHeaderEmpty()) {
        if (
                charCode == 13 || 
                this.post.isHeaderFull() || 
                this.post.getNumHeaderWords() >= this.numHeaderWords) {
            this.isHeader = false;
            this.getCurrentPostView().bodyContainer.append(this.cursor);
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
                    this.post.body[this.post.body.length - 1] == '\r' &&
                    this.post.body[this.post.body.length - 2] == '\r') {
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
    if (this.postViews.length > 1 && this.el.height() >= $('.columns').height() * 0.9) {
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

Column.prototype.persist = function() {
    this.persister.persist(this.post, this.id);
    this.post.reset();
    this.startPost();
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

