/*
* Author: dqminh (http://github.com/dqminh)
* Walltube implementation
*/

// ### Youtube implementation
var playlist = [],
    playerId = "myvideo",
    player,
    current = 0;

function play() {
    if (player) {
        if (playlist.length > 0 && current < playlist.length) {
            player.loadVideoById(playlist[current]);
            player.playVideo();
        }
    }
}

function playLazy(delay) {
    if (typeof playLazy.timeoutid != 'undefined') {
        window.clearTimeout(playLazy.timeoutid);
    }
    playLazy.timeoutid = window.setTimeout(play, delay);
}

// ### Backbone Inteface implementation
// Selected tags that will be used to filter tweets
var Tags = [];
var youtubeMatcher = function(string) {
    return string.match(/https?:\/\/(?:[a-zA_Z]{2,3}.)?(?:youtube\.com\/watch\?)((?:[\w\d\-\_\=]+&amp;(?:amp;)?)*v(?:&lt;[A-Z]+&gt;)?=([0-9a-zA-Z\-\_]+))/i);
};

// A Tweet will contain its tags and a url that link to the requested
// youtube video. JSON representation of it will take the form of the tweets json
var Tweet = Backbone.Model.extend({});

// Collection of tweets that contains a request
var RequestsCollection = Backbone.Collection.extend({model: Tweet});

// View of a request
var Thumbnail = Backbone.View.extend({
    tagName: "li",
    events: {
        "click": "play"
    },
    initialize: function(options) {
        _.bindAll(this, "render", "play");
        this.template = _.template($("#playlist_template").html());
        playlist.push(this.model.get("video_id"));

        // if the playlist only has 1 item now, play it
        if (playlist.length === 1 && current === 0) {
            this.play();
        }
    },
    play: function() {
        current = this.model.collection.indexOf(this.model);
        playLazy(500);
        return this;
    },
    render: function() {
        var model = this.model;
        $(this.el).append(this.template({
            link: model.get("video_link"),
            profile: "http://twitter.com/" + model.get("user").screen_name,
            user: model.get("user").screen_name 
        }));
        return this;
    }
});

var PlaylistView = Backbone.View.extend({
    el: "#playlist",
    initialize: function(options) {
        _.bindAll(this, "render", "addOne");
        this.collection.bind("add", this.addOne);
    },
    addOne: function(model) {
        var thumbnail = new Thumbnail({
            model: model
        });

        $(this.el).find("ul").append(thumbnail.render().el);
    },
    render: function() {
        this.collection.each(this.addOne);
        return this;
    }
});


// ### Initialize Youtube
function onYouTubePlayerReady(playerid) {
    player = document.getElementById(playerId);
    if (player) {
        player.addEventListener("onStateChange", "onPlayerStateChange");
        player.addEventListener("onError", "onPlayerError");
    }
    // initialize the request collection
    var Request = new RequestsCollection();
    window.PlayListView = new PlaylistView({
        collection: Request
    });

    Request.add({
        video_link: "http://www.youtube.com/watch?v=NQOLyplEmzw",
        video_id: "NQOLyplEmzw",
        user: {screen_name: "dqminh"}
    });
}

// load the next video in playlist
function loadNext() {
    current += 1;

    if (current < playlist.length) {
        playLazy(5000);
    }
}

function onPlayerStateChange(state){
    if (state === 0) {
        loadNext();
    }
}

function onPlayerError(error) {
    if (error) {
        loadNext();
    }
}

$(function() {
    swfobject.embedSWF(
        "http://www.youtube.com/apiplayer?enablejsapi=1&version=3&autoplay=1",
        'video', '425', '344', '8', null, null,
        {allowScriptAccess: 'always', allowFullScreen: 'true'},
        {id: playerId}
    );

    var followTag = $("#follow_tag");

    // Init a websocket connection to server to retrieve the tweets
    var Courrier = new io.Socket('127.0.0.1', {port: 8011});
    Courrier.connect();
    Courrier.on('connect', function() {
        console.log("connected");
    });
    Courrier.on('message', function(message) {
        // get a new tweet that matched our tags. Hurray !!!
        // Add it to our request
        var parsed = youtubeMatcher(message.text);

        if (parsed !== undefined) {
            message.video_link = parsed[0];
            message.video_id = parsed[2];
            Request.add(message);
        }
    });

    // whenever we add a new tag, send it to server so we can refresh the stream
    followTag.click(function() {
        var tag = $("#add_tag").val();

        if (val !== undefined && val.length > 0) {
            Courrier.send(val);
        }
        return false;
    });
});
