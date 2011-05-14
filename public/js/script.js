/*
* Author: dqminh (http://github.com/dqminh)
* Walltube implementation
*
* TODO:
* remove a tags
* control the player using tweets (how)
*/

// ### Youtube implementation
var playlist = [],
    playerId = "myvideo",
    player,
    isPlaying = false,
    current = 0;

// play the current video in playlist
function play() {
    if (player) {
        if (playlist.length > 0 && current < playlist.length) {
            isPlaying = true;
            player.loadVideoById(playlist[current]);
            player.playVideo();
        }
    }
}

// set timeout for the playing
function playLazy(delay) {
    if (typeof playLazy.timeoutid != 'undefined') {
        window.clearTimeout(playLazy.timeoutid);
    }
    playLazy.timeoutid = window.setTimeout(play, delay);
}

// ### Backbone Inteface implementation
// Selected tags that will be used to filter tweets
var Tags = [];

// assert that the tweet will contain valid youtube url
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
        // initialize the template when jquery is ready
        this.template = _.template($("#playlist_template").html());
        // push the video into playlist
        playlist.push(this.model.get("video_id"));
        // if the playlist only has 1 item now, play it
        if (playlist.length === 1 && current === 0) {
            this.play();
        }
    },
    // play the view's associated video
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

// ###Playlist
var PlaylistView = Backbone.View.extend({
    el: "#playlist",
    initialize: function(options) {
        _.bindAll(this, "render", "addOne");

        // whenever the collection is updated, we want the view to be updated
        // as well
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

var Request = new RequestsCollection();

// ### Initialize Youtube
function onYouTubePlayerReady(playerid) {
    player = document.getElementById(playerId);
    if (player) {
        player.addEventListener("onStateChange", "onPlayerStateChange");
        player.addEventListener("onError", "onPlayerError");
    }
    // initialize the request collection
    window.PlayListView = new PlaylistView({
        collection: Request
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
    // When the current video ending, we want to play the next one
    // TODO: also highlight the current playing video in the playlist
    if (state === 0) {
        loadNext();
    }
}

function onPlayerError(error) {
    // When the current video has troubled playing, we want to play the next
    // one
    if (error) {
        loadNext();
    }
}

$(function() {
    // Initialize the swfobject that will handle youtube player
    swfobject.embedSWF(
        "http://www.youtube.com/apiplayer?enablejsapi=1&version=3",
        'video', '425', '344', '8', null, null,
        {allowScriptAccess: 'always', allowFullScreen: 'true'},
        {id: playerId}
    );

    var followTag = $("#follow_tag"),
        tagList = $('#following_tags').find('ul'),
        inputTag = $('#add_tag'),
        previousVid = $('#previous'),
        nextVid = $('#next'),
        playVid = $('#play'),
        pauseVid = $('#pause');

    // Init a websocket connection to server to retrieve the tweets
    var Courrier = new io.Socket('127.0.0.1', {port: 8011});
    Courrier.connect();
    Courrier.on('connect', function() {
        console.log("connected");
    });
    Courrier.on('message', function(message) {
        // get a new tweet that matched our tags. Hurray !!!
        var parsed = youtubeMatcher(message.text);

        if (parsed !== undefined && parsed !== null && parsed.length >= 3) {
            // If this is a valid tweet that contains an youtube video,
            // Add it to our request
            console.log(parsed);
            message.video_link = parsed[0];
            message.video_id = parsed[2];
            Request.add(message);
        }
    });

    followTag.click(function() {
        var tag = inputTag.val();
        console.log(tag);

        // whenever we add a new tag, send it to server so we can refresh the
        // stream
        if (tag !== undefined && tag.length > 0) {
            Courrier.send(tag);
            tagList.append("<li>" + tag + "</li>");
        }
        return false;
    });

    previousVid.click(function() {
        // if the pointer is not pointing to the first, then move it back
        current = (current > 0) ? current - 1 : 0;
        play();
    });

    nextVid.click(function() {
        // if the pointer is not pointing to the last, the move it forward
        current = (current < playlist.length - 1) ? current + 1: current;
        play();
    });

    playVid.click(function() {
        // oh, start playing already
        if (playlist.length > 0 && !isPlaying) {
            player.playVideo();
        }
    });

    pauseVid.click(function() {
        // pause the playing
        player.stopVideo();
        isPlaying = false;
    });
});
