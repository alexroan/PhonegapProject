var Conference = Conference || {};

Conference.dataContext = (function ($) {
    "use strict";

    var db = null;
    var processorFunc = null;
    var id;
    var DATABASE_NAME = 'visits_db';
    // Use OLD_DATABASE_VERSION when upgrading databases. It indicates
    // the version we can upgrade from. Anything older and we tell the user
    // there's a problem
    var OLD_DATABASE_VERSION = "0";
    // The current database version supported by this script
    var DATABASE_VERSION = "1.0";

    var populateDB = function (tx) {
        // There is much more here than we need for the assignment. We only need sessions and days
        tx.executeSql('create table visits (_id INTEGER PRIMARY KEY AUTOINCREMENT, title text not null, notes text, datetaken datetime not null, latitude text not null, longitude text not null, imagepath text not null)', [], createSuccess, errorDB);

        tx.executeSql('insert into visits (_id, title, notes, datetaken, latitude, longitude, imagepath) values (1, \'TESTentry\', \'testNOTES\', \'2014-11-11\', \'52.415303\', \'-4.082920\', \'C://Alex/images/image.jpg\')', [], insertSuccess, errorDB);
        tx.executeSql('insert into visits (_id, title, notes, datetaken, latitude, longitude, imagepath) values (2, \'second test\', \'noteynoteynotey\', \'2014-11-11\', \'51.415303\', \'-4.082920\', \'C://Alex/images/image.jpg\')', [], insertSuccess, errorDB);

    }

    var createSuccess = function (tx, results) {
        console.log("Created table");
    }

    var insertSuccess = function (tx, results) {
        console.log("Insert ID = " + results.insertId);
    }

    var successPopulate = function () {

    }

    var errorDB = function (err) {
        console.log("Error processing SQL: " + err.code);
    }

    var initialise_database = function () {
        // We open any existing database with this name and from the same origin.
        // Check first that openDatabase is supported.
        // Note that if not supported natively and we are running on a mobile
        // then PhoneGap will provide the support.
        if (typeof window.openDatabase === "undefined") {
            return false;
        }
        db = window.openDatabase(DATABASE_NAME, "", "Visits App", 200000);

        // If the version is empty then we know it's the first create so set the version
        // and populate
        if (db.version.length == 0) {
            db.changeVersion("", DATABASE_VERSION);
            db.transaction(populateDB, errorDB, successPopulate);
        }
        else if (db.version == OLD_DATABASE_VERSION) {
            // We can upgrade but in this example we don't!
            alert("upgrading database");
        }
        else if (db.version != DATABASE_VERSION) {
            // Trouble. They have a version of the database we
            // cannot upgrade from
            alert("incompatible database version");
            return false;
        }

        return true;
    }

    var init = function () {
        return initialise_database();
    };

    var queryListSuccess = function (tx, results) {
        var list = [];
        var len = results.rows.length;
        for (var i = 0; i < len; i++) {
            list[i] = results.rows.item(i);
        }
        // After asynchronously obtaining the data we call the processor provided
        // by the caller, e.g. it could be a UI renderer
        processorFunc(list);
    }

    var queryVisits = function (tx) {
        // For the moment we just deal with the first day
        tx.executeSql("SELECT * FROM visits ORDER BY visits.datetaken ASC",
            [], queryListSuccess, errorDB);
    }

    var processVisitsList = function (processor) {
        processorFunc = processor;
        if (db) {
            db.transaction(queryVisits, errorDB);
        }
    };



    var insertNewVisit = function(title, notes, datetaken, latitude, longitude, imagepath){
        var insertString = "insert into visits (title, notes, datetaken, latitude, longitude, imagepath) values ('"+title+"', '"+notes+"', '"+datetaken+"', '"+latitude+"', '"+longitude+"', '"+imagepath+"')";
        if(db){
            db.transaction(function(tx){
                tx.executeSql(insertString, [], insertSuccess, errorDB);
            });
        }
    }

    var pub = {
        init:init,
        processVisitsList:processVisitsList,
        insertNewVisit:insertNewVisit
    };

    return pub;
}(jQuery));