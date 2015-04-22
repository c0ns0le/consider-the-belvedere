/**
 * A post model.
 * @constructor
 */
var Post = function() {
    this.time = 0;
    this.header = '';
    this.body = '';
};

/**
 * @const {number}
 */
Post.MAX_IDLE_TIME_MS = 25000;

/**
 * @const {number}
 */
Post.MAX_HEADER_TIME_MS = 7000;

/**
 * @const {number}
 */
Post.MAX_HEADER_CHARS = 45;

/**
 * @const {number}
 */
Post.MAX_BODY_CHARS = 2000;

/**
 * Whether the post is untouched (not typed into yet.)
 * @return {boolean}
 */
Post.prototype.isEmpty = function() {
    return !this.header && !this.body;
};

/**
 * Whether the post is too full where it should be ended by force.
 * @return {boolean}
 */
Post.prototype.isFull = function() {
    return this.body.length >= Post.MAX_BODY_CHARS;
};

Post.prototype.isHeaderFull = function() {
    return this.header.length >= Post.MAX_HEADER_CHARS;
};

Post.prototype.getNumHeaderWords = function() {
    return this.header.split(/\s+/).length ;
};

/**
 * Whether the header is empty.
 */
Post.prototype.isHeaderEmpty = function() {
    return !this.header;
};

Post.prototype.isBodyEmpty = function() {
    return !this.body;
};

Post.prototype.isValid = function() {
    return this.header.length && this.body.length > 10 && (this.header.length + this.body.length) > 15;
};

Post.prototype.deleteHeaderChar = function() {
    if (this.header.length) {
        this.header = this.header.substr(0, this.header.length - 1);
    }
};

Post.prototype.deleteBodyChar = function() {
    if (this.body.length) {
        this.body = this.body.substr(0, this.body.length - 1);
    }
};

Post.prototype.set = function(post) {
    this.reset();
    this.header = post && post.header ? post.header : '';
    this.body = post && post.body ? post.body : '';
    this.time = post && post.time ? post.time : Date.now();
};

/**
 * Resets the post to its untouched state.
 */
Post.prototype.reset = function() {
    this.time = Date.now();
    this.header = '';
    this.body = '';
};

