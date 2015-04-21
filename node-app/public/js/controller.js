/**
 * Main controller, owns columns + persister. Pipes all keydown/key up events
 * to their correct column instance.
 * @param {number} numCols
 * @param {number} addrStart
 * @constructor
 */
var Controller = function(numCols, addrStart) {
    var self = this;
    this.currentAddr = -1;
    this.numColumns = numCols;
    this.addrStart = addrStart;
    this.persister = new Persister();
    this.columns = null;
    this.password = 'hairspice';
    this.passwordPos = 0;

    // Initialize the persister and then load columns and start listening for
    // key events.
    this.persister.init().then(function() {
        self.columns = _.map(_.range(self.numColumns), function(id) {
            var column = new Column(self.addrStart + id, self.persister);
            $('.columns').append(column.container);
            return column;
        });

        $('.columns').focus();

        $(document).bind('keydown', function(evt) { self.keyDown(evt); });
        $(document).bind('keyup', function(evt) { self.keyUp(evt); });
        $(document).bind('keypress', function(evt) { self.keyPress(evt); });
    });      
};

/**
 * Key down handler. If the key is an f1-f12 key it is a set address key which
 * selects the appropriate column, we also check for keys that don't generate
 * keyPress events, like delete/backspace.
 * @param {Event} evt
 */
Controller.prototype.keyDown = function(evt) {
    //evt.preventDefault();
    var keyCode = evt.keyCode;
    //console.log('kcd:'  +keyCode);
    if (keyCode >= 112 && keyCode < 112 + this.columns.length) {
        this.startAddr(keyCode - 112);
    } else if (keyCode == 8 || keyCode == 127) { // Delete
        if (this.currentAddr > -1) {
            this.columns[this.currentAddr].keyBack();
        }
        evt.preventDefault();
        
    }

    //evt.preventDefault();
};

/**
 * Key up handler. If the key is an f1-f12 key it is an unset address key
 * which deselects that column channel.
 * @param {Event} evt
 */
Controller.prototype.keyUp = function(evt) {
    var keyCode = evt.keyCode;

    if (keyCode >= 112 && keyCode < 112 + this.columns.length) {
        this.endAddr(keyCode - 112);
    }

    //evt.preventDefault();
};

/**
 * Key press handler. Forwards all events to the current column channel, if 
 * there is one.
 * @param {Event} evt
 */
Controller.prototype.keyPress = function(evt) {
    var self = this;
    if (this.currentAddr > -1) {
        var character = String.fromCharCode(evt.charCode);
        if (this.passwordPos < this.password.length && character == this.password[this.passwordPos]) {
            this.passwordPos++;
            if (this.passwordPos == this.password.length) {
                this.persister.loadDreams(this.columns.length * 3).then(function(posts) {
                    console.log('loaded posts:' + posts);
                    //this.columns[i].clear();
                    var colPosts = [];
                    for (var i = 0; i < self.columns.length; ++i) {
                        colPosts[i] = [];
                    }

                    var column = 0;
                    while (posts.length) {
                        column = (column + 1) % colPosts.length;
                        colPosts[column].push(posts.shift());
                    }

                    for (var i = 0; i < self.columns.length; ++i) {
                        self.columns[i].loadPosts(colPosts[i]);
                    }
                });  
                
                this.passwordPos = 0;
                return;
            }


        } else {
            this.passwordPos = 0;
        }

        this.columns[this.currentAddr].keyPress(evt.charCode);
    }

    //evt.preventDefault();
};


/**
 * Convenience function for setting the current colum channel.
 * @param {number} addr
 */
Controller.prototype.startAddr = function(addr) {
    if (this.currentAddr != addr && addr >= this.addrStart && addr < this.addrStart + this.numColumns) {
        this.currentAddr = addr;
    }
};

/**
 * Convenience function for unsetting the current column channel.
 * @param {number} addr
 */
Controller.prototype.endAddr = function(addr) {
    if (addr == this.currentAddr) {
        this.currentAddr = -1;
    }
};
