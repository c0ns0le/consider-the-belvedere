/**
 * Html content for a single post. This is a reusable component that represents
 * a single post. It gets appended to a column and can be filled with content.
 * @constructor
 */
var PostView = function() {
    this.container = $('<div class="post">');
    this.headerContainer = $('<h2>');
    this.header = $('<span>');
    this.bodyContainer = $('<p>');
    this.body = $('<span>');
    this.date = $('<div class="date">');

    this.dateText = '';

    this.headerContainer.append(this.header);
    this.bodyContainer.append(this.body);

    this.container.append(this.headerContainer);
    this.container.append(this.date);
    this.container.append(this.bodyContainer);
};

/**
 * @type {Array.<PostView>}
 */
PostView.pool = [];

/**
 * Factory function for creating a PostView from the pool.
 */
PostView.create = function() {
    if (PostView.pool.length) {
        var view = PostView.pool.pop();
        view.reset();
        return view;
    }

    return new PostView();
};

/**
 * Factory function for returning a PostView to the pool when done using it.
 */
PostView.dispose = function(view) {
    view.container.remove();
    PostView.pool.push(view);
};

/**
 * Convenience function for taking the keyboard input and formatting it as
 * html.
 * @param {string} text
 */
PostView.prototype.formatHtml = function(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '<br>');
};

/**
 * Resets the PostView so it can be reused.
 */
PostView.prototype.reset = function() {
    this.container.css({'display': '', 'position': '', 'width': '', 'height': '', 'transform':'', 'opacity': ''});
    this.container.removeClass('start-trans');
    this.setHeader('');
    this.setBody('');
    this.date.text('');
};

/**
 * Sets the header keyboard text.
 */
PostView.prototype.setHeader = function(text) {
    this.header.html(this.formatHtml(text));

    if (this.dateText && !text) {
        this.dateText = '';
        this.date.text('');
    } else if (!this.dateText && text) {
        this.updateDate(new Date);
    }
};

/**
 * Sets the body keyboard text.
 * @param {string} text
 */
PostView.prototype.setBody = function(text) {
    this.body.html(this.formatHtml(text));

    if (text && !this.dateText) {
        this.updateDate(new Date);
    }
};

PostView.prototype.updateDate = function(time) {
    console.log('updating post with time:' + time);
    var date = new Date(+time);
    var parts = date.toLocaleTimeString().split(':');
    var time = '';
    if (parts.length == 3) {
        time = parts[0] + ':' + parts[1] + parts[2].substr(2);
    } else {
        time = parts.join(':');
    }
    this.dateText = 
    ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"][date.getMonth()]
     + '  ' + date.getDate()
     + ', ' + date.getFullYear()
     + ' ' + time
    this.date.text(this.dateText);
}

/**
 * Updates the postview with the model data.
 * @param {Post} post
 */
PostView.prototype.update = function(post) {
    this.updateDate(post.time);
    this.setHeader(post.header);
    this.setBody(post.body);
};



