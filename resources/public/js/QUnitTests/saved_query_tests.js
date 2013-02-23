//
// QUnit tests for saved queries.
//
//

$(document).ready(function () {

    module("Saved Query Tests");


    // This is a runnable query...
    var sampleQuery = {
        db: '7SM_Reporting',
        table: 'Test_EmployeeView',
        queryType: 'Raw',
        crosstabColVar: "",
        crosstabFunction: "",
        crosstabRowVar: "",
        crosstabSubjectVar: "",
        filterLogicString: "",
        filterLogicType: "MatchAny",
        limit: 50,
        offset: 0,
        groupBy: [],
        orderBy: ["HourlyWage", "OnLeave"],
        outputColumns: ["DateOfBirth", "FirstName", "LastName"],
        filters: [{ column: "FirstName", operator: "Contains", value: "e" },
                  { column: "LastName", operator: "Equals", value: "Flintstone" }, ]
    };

    // This is a saved query, which consists of the runnable query,
    // plus some metadata.
    var sampleSavedQuery = {
        id: null,
        name: '*** QUnit Test Query ***',
        description: 'This is a test query, created by the QUnit front-end automated tests.',
        isShared: true,
        userIsOwner: true,
        query: sampleQuery
    };


    // Loads all saved queries and calls fn on each
    function loadAllSavedQueries(fn) {
        var url = APP_ROOT_URL + "SavedQuery/Index/7SM_Reporting";
        $.getJSON(url, function (data) {
            if (data['status'] == 'OK') {
                var savedQueries = data['data'];
                $.each(savedQueries, function (index, savedQuery) { fn(savedQuery); });
            }
            else {
                throw data['message'];
            }
        });
    }

    // Deletes a saved query, if it was created by this test.
    function deleteTestQuery(savedQuery) {
        if (savedQuery.name == sampleSavedQuery.name) {
            var postUrl = APP_ROOT_URL + 'SavedQuery/Delete/' + savedQuery.id;
            ssmReporting.log(postUrl);
            $.post(postUrl, { "queryId": savedQuery.id }, function () { ssmReporting.log("Deleted query " + savedQuery.id) }, "json");
        }
    }

    // Deletes all the test queries created by the tests in this module.
    function deleteAllTestQueries() {
        loadAllSavedQueries(deleteTestQuery);
    }



    // Before starting these tests, let's make sure we have
    // the 7SM_Reporting database loaded.
    QUnit.moduleStart(function () {
        var dbMenuItem = $('#db_menu_7SM_Reporting');
        dbMenuItem.click();
        stop();
        setTimeout(function () {
            $('#db-menu').click(); // Force DB menu to close.
            $('#report_menu_Test_EmployeeView').click();
            $('#reports-menu').click();
            start();
        }, 500);
    });



    // This test sucks. QUnit behaves inconsistently.
    test("Ensure we can create a saved query", function () {
        expect(1);
        ssmReporting.savedQuery = null;
        ssmReporting.loadQuery(sampleQuery);
        stop();
        setTimeout(function () {
            $('#save-query-button').click();
            ssmReporting.loadSavedQueryIntoForm(sampleSavedQuery);
            start();
            ssmReporting.saveQuery();
            stop();
            setTimeout(function () {
                ok(($('#msg-content').html().indexOf('has been saved') > 0), "Query was saved.");
                sampleSavedQuery.id = ssmReporting.savedQuery.id;
                ssmReporting.log("Saved query id is " + sampleSavedQuery.id);
                start();
            }, 700);
        }, 700);
    });


    test("Ensure we can load list of saved queries", function () {
        expect(2);
        $('#query_menu_show_saved_queries').click();
        stop();
        setTimeout(function () {
            var savedQueryDivs = $('.saved-query-display');
            var allText = $('#list-of-saved-queries').text();
            $("#dialog-saved-queries").dialog('close');
            ok((savedQueryDivs.length >= 1), "Saved queries were loaded");
            ok((allText.indexOf(sampleSavedQuery.name) > -1), "The query we just saved is in the list.")
            start();
        }, 500);
    });


    test("Ensure we can load and run a single saved query", function () {
        expect(1);
        $('#query_menu_show_saved_queries').click();
        stop();
        setTimeout(function () {
            start();
            // The clickable links to execute saved queries get an id like this:
            // saved-query-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            // When we saved the sample query in the test above, 
            // we saved its ID. This lets us run it now and delete it later.
            var queryLinkSelector = '#saved-query-' + sampleSavedQuery.id;
            $(queryLinkSelector).click();
            $("#dialog-saved-queries").dialog('close');
            stop();
            setTimeout(function () {
                var gridRows = $('.slick-row');
                ssmReporting.log("Grid rows follow:");
                ssmReporting.log(gridRows);
                ok((gridRows.length > 0), "Query ran and returned at least one result.");
                start();
            }, 700);
        }, 500);
    });



    test("Delete test queries", function () {
        expect(1);
        deleteAllTestQueries();
        stop();
        setTimeout(function () {
            $('#query_menu_show_saved_queries').click();
            $('#query-menu').click();
            setTimeout(function () {
                var savedQueryDivs = $('.saved-query-display');
                var allText = $('#list-of-saved-queries').text();
                ssmReporting.log(allText);
                $("#dialog-saved-queries").dialog('close');
                ok((allText.indexOf(sampleSavedQuery.name) < 0), "QUnit test queries no longer appear in the list.")
                start();
            }, 800);
        }, 800);
    });


    // TODO: Complete the tests below!

    //    test("Ensure we can edit a saved query", function () {
    //        expect(1);
    //        stop();
    //        setTimeout(function () {
    //            equal('1', '1', "1");
    //            start();
    //        }, 500);
    //    });


    //    test("Ensure we can delete a saved query", function () {
    //        expect(1);
    //        stop();
    //        setTimeout(function () {
    //            equal('1', '1', "1");
    //            start();
    //        }, 500);
    //    });


    //    test("Ensure we cannot delete a saved query that we do not own", function () {
    //        expect(1);
    //        stop();
    //        setTimeout(function () {
    //            equal('1', '1', "1");
    //            start();
    //        }, 500);
    //    });

});