var $container = $('#events');

function tell(evt) {
    $container.prepend(
        '<p>' +
        '<b class="d">' + new Date().toLocaleString() + ' &gt;</b>' +
        '<b class="t" title="evt.type">' + evt.type + '</b>' +
        '<b class="n" title="evt.which">' + evt.which + '</b>' +
        '<b class="n" title="evt.keyCode">' + evt.keyCode + '</b>' +
        '<b class="n" title="evt.charCode">' + evt.charCode + '</b>' +
        (evt.altKey ? '<b title="evt.altKey">alt</b>' : '') +
        (evt.metaKey ? '<b title="evt.metaKey">meta</b>' : '') +
        (evt.shiftKey ? '<b title="evt.shiftKey">shift</b>' : '') +
        '</p>'
    );
}

$(document).bind('keydown keypress keyup', tell);

$('#d').html(new Date().toLocaleString() + ' &gt;');