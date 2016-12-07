var Conference = Conference || {};

Conference.controller = (function ($, dataContext, document) {
    "use strict";

    var position = null;
    var mapDisplayed = false;
    var currentMapWidth = 0;
    var currentMapHeight = 0;
    var visitsListSelector = "#visits-list-content";
    var noVisitsCachedMsg = "<div>You visits list is empty</div>";
    var databaseNotInitialisedMsg = "<div>Your browser does not support local databases.</div>";

    var MAP_PAGE = "map",
        CAMERA_PAGE = "camera",
        VISITS_PAGE = "visits",
        DETAILS_PAGE = "visitdetails";

    // This changes the behaviour of the anchor <a> link
    // so that when we click an anchor link we change page without
    // updating the browser's history stack (changeHash: false).
    // We also don't want the usual page transition effect but
    // rather to have no transition (i.e. tabbed behaviour)
    var initialisePage = function (event) {
        change_page_back_history();
    };

    var onPageChange = function (event, data) {
        // Find the id of the page
        var toPageId = data.toPage.attr("id");

        clear_inputs();
        // If we're about to display the map tab (page) then
        // if not already displayed then display, else if
        // displayed and window dimensions changed then redisplay
        // with new dimensions
        switch (toPageId) {
            case MAP_PAGE:
                /*if (!mapDisplayed || (currentMapWidth != get_map_width() ||
                    currentMapHeight != get_map_height())) {
                    deal_with_geolocation();
                }*/
                dataContext.processVisitsList(print_map);
                break;
            case CAMERA_PAGE:
                camera_page();
                break;
            case VISITS_PAGE:
                dataContext.processVisitsList(renderVisitsList);
                break;
            case DETAILS_PAGE:
                dataContext.processVisitsList(show_details);
                break;
        }
    };

    var show_details = function(visitslist){
        var detailslabel = document.querySelector('#visitdetailslabel');
        var detailstitle = document.querySelector('#visitdetailstitle');
        var detailsnotes = document.querySelector('#visitdetailsnotes');
        var detailsdate = document.querySelector('#visitdetailsdate');
        var detailsimg = document.querySelector('#visitdetailsimg');

        var visitid = detailslabel.innerHTML;

        if (visitslist.length === 0) {
        }
        else {
            var visitsCount = visitslist.length,
                visit,
                i;
            for (i = 0; i < visitsCount; i += 1) {
                visit = visitslist[i];
                if((visit._id) == (visitid)){
                    detailstitle.innerHTML = visit.title;
                    detailsnotes.innerHTML = visit.notes;
                    detailsdate.innerHTML = visit.datetaken;
                    detailsimg.setAttribute("src", visit.imagepath)
                }
            }
        }
    }

    var getURLParameter = function(name) {
        return decodeURI(
            (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
        );
    }

    var clear_inputs = function(){
        var photo = document.querySelector('#camphoto');
        var title = document.querySelector('#title');
        var notes = document.querySelector('#notes');
        var debuglabel = document.querySelector('#debuglabel');
        var debuglabel2 = document.querySelector('#debuglabel2');
        var opencamerabutton = document.querySelector('#phoneopencamera');
        photo.setAttribute('src', '#');
        title.setAttribute('value', '');
        notes.setAttribute('value', '');
        debuglabel.innerHTML = "";
        debuglabel2.innerHTML = "";
        opencamerabutton.innerHTML = "Open Camera";
    }


    var camera_page = function(){
        $('#newcamerainput').hide();
        $('#cameraresults').hide();
        var opencamerabutton = document.querySelector('#phoneopencamera');
        var savevisitbutton = document.querySelector('#savevisit');
        opencamerabutton.addEventListener('click', open_camera, false);
        savevisitbutton.addEventListener('click', save_visit, false);
    }

    var save_visit = function(){
        var photo = document.querySelector('#camphoto');
        var file = photo.getAttribute('src');
        window.resolveLocalFileSystemURI(file, successResolve, resolveError);
    }

    var successResolve = function(entry){
        var date = new Date();
        var filenow = date.getTime();
        var newFileName = filenow+".jpg";
        var myFolder = "Visits";
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSys){
                fileSys.root.getDirectory(myFolder, {create:true, exclusive:false}, function(directory){
                    entry.moveTo(directory, newFileName, successMove, moveError);
                }, moveError);
            },
        moveError);
    }

    var resolveError = function(error){
        alert("File not resolved. message: "+error);
    }

    var successMove = function(entry){
        var debuglabel = document.querySelector('#debuglabel');
        var debuglabel2 = document.querySelector('#debuglabel2');
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(function(pos){
                var titlefield = document.getElementById('title');
                var notesfield = document.getElementById('notes');
                var title = titlefield.value;
                var notes = notesfield.value;
                var latitude = pos.coords.latitude;
                var longitude = pos.coords.longitude;
                var now = new Date();
                var strDateTime = [[addZero(now.getDate()), addZero(now.getMonth() + 1), now.getFullYear()].join("/"), [addZero(now.getHours()), addZero(now.getMinutes())].join(":")].join(" ");
                var filePath = "file:///storage/emulated/0"+entry.fullPath;
                debuglabel.innerHTML = "Saving "+title;
                dataContext.insertNewVisit(title,notes,strDateTime,latitude,longitude,filePath);
                //debuglabel.innerHTML = "";
                //debuglabel2.innerHTML = "Saved "+title;
                $('#cameraresults').hide();
                clear_inputs();
            }, locationError);
        }
    }

    var addZero = function(num){
        return (num >= 0 && num < 10) ? "0" + num : num + "";
    }

    var locationError = function(error){
        alert("location error: "+error);
    }

    var moveError = function(error){
        alert("move error: "+error);
    }

    var open_camera = function(){
        clear_inputs();
        if(navigator.camera){
            navigator.camera.getPicture(cameraSuccess, cameraFail, {quality: 50, destinationType: Camera.DestinationType.FILE_URI});
            $('#cameraresults').show();
        }
        else if(navigator.webkitGetUserMedia || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia){
            $('#newcamerainput').show();
            getDesktopPhoto();
            $('#cameraresults').show();
        }
        else{
            alert('no camera plugin');
        }
    }

    var cameraSuccess = function(imageData){
        var photoElement = document.getElementById("camphoto");
        var opencamerabutton = document.querySelector('#phoneopencamera');
        opencamerabutton.innerHTML = "Take Again";
        photoElement.src = imageData;
    }

    var cameraFail = function(message){
        alert('Failed because '+message);
    }

    var getDesktopPhoto = function(){
        var streaming = false,
            video        = document.querySelector('#camvideo'),
            canvas       = document.querySelector('#camcanvas'),
            photo        = document.querySelector('#camphoto'),
            startbutton  = document.querySelector('#takephoto'),
            width = 320,
            height = 0;

        navigator.getMedia = ( navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);

        navigator.getMedia(
            {
                video: true,
                audio: false
            },
            function(stream) {
                if (navigator.mozGetUserMedia) {
                    video.mozSrcObject = stream;
                } else {
                    var vendorURL = window.URL || window.webkitURL;
                    video.src = vendorURL.createObjectURL(stream);
                }
                video.play();
            },
            function(err) {
                console.log("An error occured! " + err);
            }
        );

        video.addEventListener('canplay', function(ev){
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth/width);
                video.setAttribute('width', width);
                video.setAttribute('height', height);
                canvas.setAttribute('width', width);
                canvas.setAttribute('height', height);
                streaming = true;
            }
        }, false);

        function takepicture() {
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
            var data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
        }

        startbutton.addEventListener('click', function(ev){
            takepicture();
            ev.preventDefault();
        }, false);
    }

    var print_map = function(visitsList){

        //debug.innerHTML = locations;
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (pos) {
                var debug = document.querySelector('#mapdebug');
                var locations = [
                    /*['Bondi Beach', -33.890542, 151.274856, 4],
                     ['Coogee Beach', -33.923036, 151.259052, 5],
                     ['Cronulla Beach', -34.028249, 151.157507, 3],
                     ['Manly Beach', -33.80010128657071, 151.28747820854187, 2],
                     ['Maroubra Beach', -33.950198, 151.259302, 1]*/
                ];

                var visitsCount = visitsList.length,
                    visit,
                    i;

                for (i = 0; i < visitsCount; i += 1) {
                    var liArray = [];
                    visit = visitsList[i];
                    liArray.push(visit.title);
                    liArray.push(visit.latitude);
                    liArray.push(visit.longitude);
                    locations.push(liArray);
                }
                position = pos;
                var mapdiv = document.getElementById('mapdiv');
                var h,w;
                h = get_map_height();
                w = get_map_width();
                mapdiv.style.height = h+"px";
                mapdiv.style.width = w+"px";
                var map = new google.maps.Map(mapdiv, {
                    zoom: 10,
                    center: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
                    mapTypeId: google.maps.MapTypeId.ROADMAP
                });
                var infowindow = new google.maps.InfoWindow();
                var marker, i;

                for (i = 0; i < locations.length; i++) {
                    marker = new google.maps.Marker({
                        position: new google.maps.LatLng(locations[i][1], locations[i][2]),
                        map: map
                    });
                    google.maps.event.addListener(marker, 'click', (function (marker, i) {
                        return function () {
                            infowindow.setContent(locations[i][0]);
                            infowindow.open(map, marker);
                        }
                    })(marker, i));
                }
            }, handle_errors);
        }
    }

    var renderVisitsList = function (visitsList) {
        var view = $(visitsListSelector);
        view.empty();
        if (visitsList.length === 0) {
            $(noVisitsCachedMsg).appendTo(view);
        } else {
            var liArray = [],
                listItem,
                visitsCount = visitsList.length,
                visit,
                i;

            // Loop through all sessionList data and build up the session list item
            // HTML data dynamically using jQuery and jQuery Mobile commands
            // such as appendTo and listView
            var ul = $("<ul id=\"visit-list\" data-role=\"listview\" data-filter=\"true\"></ul>").appendTo(view);
            for (i = 0; i < visitsCount; i += 1) {
                visit = visitsList[i];
                listItem = "<li onclick=\"list_item_clicked("+visit._id+")\" id=\"visitbutton"+i+"\">";
                listItem = listItem + "<a href=\"#\">";
                liArray.push(listItem
                + "<span class='session-list-item'>"
                + "<img src=\""+visit.imagepath+"\" />"
                + "<div>"
                + "<h6>" + visit.title + "</h6>"
                + "<h6>" + visit.notes + "</h6>"
                + "<h6>" + visit.datetaken + "</h6>"
                + "</div>"
                + "</span>"
                + "</a>"
                + "</li>");
            }

            var listItems = liArray.join("");
            $(listItems).appendTo(ul);
            ul.listview();
        }
    };


    var noDataDisplay = function (event, data) {
        var view = $(sessionsListSelector);
        view.empty();
        $(databaseNotInitialisedMsg).appendTo(view);
    }

    var change_page_back_history = function () {
        $('a[data-role="tab"]').each(function () {
            var anchor = $(this);
            anchor.bind("click", function () {
                $.mobile.changePage(anchor.attr("href"), { // Go to the URL
                    transition: "none",
                    changeHash: false
                });
                return false;
            });
        });
    };

    var deal_with_geolocation = function () {
        var phoneGapApp = (document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 );
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            // Running on a mobile. Will have to add to this list for other mobiles.
            // We need the above because the deviceready event is a phonegap event and
            // if we have access to PhoneGap we want to wait until it is ready before
            // initialising geolocation services
            if (phoneGapApp) {
                //alert('Running as PhoneGapp app');
                document.addEventListener("deviceready", initiate_geolocation, false);
            }
            else {
                initiate_geolocation(); // Directly from the mobile browser
            }
        } else {
            //alert('Running as desktop browser app');
            initiate_geolocation(); // Directly from the browser
        }
    };

    var initiate_geolocation = function () {

        // Do we have built-in support for geolocation (either native browser or phonegap)?
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handle_geolocation_query, handle_errors);
        }
        else {
            // We don't so let's try a polyfill
            yqlgeo.get('visitor', normalize_yql_response);
        }
    };

    var handle_errors = function (error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert("user did not share geolocation data");
                break;

            case error.POSITION_UNAVAILABLE:
                alert("could not detect current position");
                break;

            case error.TIMEOUT:
                alert("retrieving position timed out");
                break;

            default:
                alert("unknown error");
                break;
        }
    };

    var normalize_yql_response = function (response) {
        if (response.error) {
            var error = { code: 0 };
            handle_errors(error);
            return;
        }

        position = {
            coords: {
                latitude: response.place.centroid.latitude,
                longitude: response.place.centroid.longitude
            },
            address: {
                city: response.place.locality2.content,
                region: response.place.admin1.content,
                country: response.place.country.content
            }
        };

        handle_geolocation_query(position);
    };

    var get_map_height = function () {
        return $(window).height() - ($('#maptitle').height() + $('#mapfooter').height());
    }

    var get_map_width = function () {
        return $(window).width();
    }


    var handle_geolocation_query = function (pos) {
        position = pos;

        var the_height = get_map_height();
        var the_width = get_map_width();

        var image_url = "http://maps.google.com/maps/api/staticmap?sensor=false&center=" + position.coords.latitude + "," +
            position.coords.longitude + "&zoom=14&size=" +
            the_width + "x" + the_height + "&markers=color:blue|label:S|" +
            position.coords.latitude + ',' + position.coords.longitude;

        $('#map-img').remove();

        jQuery('<img/>', {
            id: 'map-img',
            src: image_url,
            title: 'Google map of my location'
        }).appendTo('#mapPos');

        mapDisplayed = true;
    };

    var init = function () {
        // The pagechange event is fired every time we switch pages or display a page
        // for the first time.
        var d = $(document);
        var databaseInitialised = dataContext.init();
        if (!databaseInitialised) {
            d.bind("pagechange", noDataDisplay);
        }
        d.bind("pagechange", onPageChange);
        // The pageinit event is fired when jQM loads a new page for the first time into the
        // Document Object Model (DOM). When this happens we want the initialisePage function
        // to be called.
        d.bind("pageinit", initialisePage);
    };


    // Provides a hash of functions that we return to external code so that they
    // know which functions they can call. In this case just init.
    var pub = {
        init: init
    };

    return pub;
}(jQuery, Conference.dataContext, document));

// Called when jQuery Mobile is loaded and ready to use.
$(document).bind("mobileinit", function () {
    Conference.controller.init();
});


