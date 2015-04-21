
/**
 * Service used to store posts in a database via an ajax endpoint.
 */
var Persister = function() {
};

/**
 * Initializes.
 * @ return {Promise} A promise immediately resolved for now.
 */
Persister.prototype.init = function() {
    var deferred = $.Deferred();
    deferred.resolve();
    return deferred.promise();
};

/**
 * Loads posts from server for a specific column.
 * @param {number} id
 * @return {Promise} Promise resolved with an array of posts.
 */
Persister.prototype.load = function(id) {
    var deferred = $.Deferred();
    var posts = [];

    $.get('/posts/' + id, function(posts) {
        deferred.resolve(posts);
    });

    return deferred.promise();
};

Persister.prototype.loadDreams = function(count) {
    var deferred = $.Deferred();

    // Choose 10 some random posts
    var posts = _.clone(OLD_DREAMS.dreams);

    var total = Math.min(count, posts.length);
    var shuffled = _.shuffle(posts);
    deferred.resolve(shuffled.slice(0, total));

    return deferred.promise();
};

/**
 * Persists a post to a given column id.
 * @param {Post} post
 * @param {number} id
 */
Persister.prototype.persist = function(post, id) {
    // Write teh post to the database
    var self = this;

    $.post('/posts/' + id, {header: post.header, body: post.body, time: post.time},
        function() {
            console.log('posted');
        }, "json").fail(function() {
            console.log('post failed');
        });
};