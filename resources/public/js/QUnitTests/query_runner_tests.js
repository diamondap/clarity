//
// QUnit tests for running queries.
//
// These tests run queries and ensure that
// the right results come back. These are
// simple tests, meant to serve as a basic
// sanity check and to test for regressions.
//

$(document).ready(function () {

    module("Query Runner Tests");

    var rawQuery = {
        db: '7SM_Reporting',
        table: 'Test_EmployeeView',
        queryType: 'Raw',
        crosstabColVar: "",
        crosstabFunction: "",
        crosstabRowVar: "",
        crosstabSubjectVar: "",
        filterLogicString: "(1 and 2) or (3 and 4)",
        filterLogicType: "Custom",
        limit: 50,
        offset: 0,
        groupBy: [],
        orderBy: ["HourlyWage", "OnLeave"],
        outputColumns: ["DateOfBirth", "FirstName", "LastName"],
        filters: [{ column: "FirstName", operator: "Contains", value: "e" },
                  { column: "LastName", operator: "Equals", value: "Flintstone" },
                  { column: "State", operator: "Equals", value: "CA" },
                  { column: "OnLeave", operator: "DoesNotEqual", value: "true" }, ]
    };


    var crosstabQuery = {
        db: '7SM_Reporting',
        table: 'Test_EmployeeView',
        queryType: 'Crosstab',
        crosstabColVar: "Test_OrganizationName",
        crosstabFunction: "Count",
        crosstabRowVar: "State",
        crosstabSubjectVar: "*",
        filterLogicString: "",
        filterLogicType: "MatchAll",
        limit: 50,
        offset: 0,
        groupBy: [],
        orderBy: [],
        outputColumns: [],
        filters: [{ column: "OnLeave", operator: "DoesNotEqual", value: "true"}]
    };



    // Before starting these tests, let's make sure we have
    // the 7SM_Reporting database loaded.
    QUnit.moduleStart(function () {
        var dbMenuItem = $('#db_menu_7SM_Reporting');
        dbMenuItem.click();
        stop();
        setTimeout(function () {
            $('#db-menu').click(); // Force DB menu to close.
            start();
        }, 500);
    });

    // Before each test, load the Test_EmployeeView table.
    QUnit.testStart(function () {
        var tableMenuItem = $('#report_menu_Test_EmployeeView');
        tableMenuItem.click();
        stop();
        setTimeout(function () {
            $('#reports-menu').click(); // Force reports menu to close.
            start();
        }, 500);
    });


    test("Ensure raw query with custom logic returns correct results", function () {
        expect(7);
        ssmReporting.runQuery(rawQuery);
        stop();
        setTimeout(function () {
            equal(5, ssmReporting.gridData.length, "Query with custom logic yields 5 results");
            equal("1/1/1950", ssmReporting.gridData[0].DateOfBirth, "First DateOfBirth is correct");
            equal("Fred", ssmReporting.gridData[0].FirstName, "First FirstName is correct");
            equal("Flintstone", ssmReporting.gridData[0].LastName, "First LastName is correct");
            equal("2/26/2116", ssmReporting.gridData[4].DateOfBirth, "Last DateOfBirth is correct");
            equal("George", ssmReporting.gridData[4].FirstName, "Last FirstName is correct");
            equal("Jetson", ssmReporting.gridData[4].LastName, "Last LastName is correct");
            start();
        }, 500);
    });


    test("Ensure raw query with MatchAll logic returns correct results", function () {
        expect(4);
        var alteredRawQuery = $.extend(true, {}, rawQuery);
        // Match all criteria
        alteredRawQuery.filterLogicType = 'MatchAll';
        alteredRawQuery.filterLogicString = '';
        // Remove last two filters
        alteredRawQuery.filters.pop();
        alteredRawQuery.filters.pop();
        ssmReporting.runQuery(alteredRawQuery);
        stop();
        setTimeout(function () {
            equal(1, ssmReporting.gridData.length, "Query with custom logic yields 1 result");
            equal("1/1/1950", ssmReporting.gridData[0].DateOfBirth, "First DateOfBirth is correct");
            equal("Fred", ssmReporting.gridData[0].FirstName, "First FirstName is correct");
            equal("Flintstone", ssmReporting.gridData[0].LastName, "First LastName is correct");
            start();
        }, 500);
    });


    test("Ensure raw query with MatchAny logic returns correct results", function () {
        expect(7);
        var alteredRawQuery = $.extend(true, {}, rawQuery);
        // Match all criteria
        alteredRawQuery.filterLogicType = 'MatchAny';
        alteredRawQuery.filterLogicString = '';
        ssmReporting.runQuery(alteredRawQuery);
        stop();
        setTimeout(function () {
            equal(9, ssmReporting.gridData.length, "Query with custom logic yields 9 results");
            equal("1/1/1950", ssmReporting.gridData[0].DateOfBirth, "First DateOfBirth is correct");
            equal("Fred", ssmReporting.gridData[0].FirstName, "First FirstName is correct");
            equal("Flintstone", ssmReporting.gridData[0].LastName, "First LastName is correct");
            equal("5/18/1922", ssmReporting.gridData[8].DateOfBirth, "Last DateOfBirth is correct");
            equal("Montgomery", ssmReporting.gridData[8].FirstName, "Last FirstName is correct");
            equal("Burns", ssmReporting.gridData[8].LastName, "Last LastName is correct");
            start();
        }, 500);
    });


    test("Ensure crosstab query returns correct results", function () {
        expect(16);
        ssmReporting.runQuery(crosstabQuery);
        ssmReporting.loadQuery(crosstabQuery);
        stop();
        setTimeout(function () {
            equal(3, ssmReporting.gridData.length, "Query with custom logic yields 3 results");
            equal('CA', ssmReporting.gridData[0]['State'], "");
            equal(1, ssmReporting.gridData[0]['Hannah-Barbara'], "");
            equal(0, ssmReporting.gridData[0]['The Simpsons'], "");
            equal(3, ssmReporting.gridData[0]['Warner Brothers'], "");
            equal(4, ssmReporting.gridData[0]['Roll Up'], "");
            equal('OR', ssmReporting.gridData[1]['State'], "");
            equal(0, ssmReporting.gridData[1]['Hannah-Barbara'], "");
            equal(3, ssmReporting.gridData[1]['The Simpsons'], "");
            equal(0, ssmReporting.gridData[1]['Warner Brothers'], "");
            equal(3, ssmReporting.gridData[1]['Roll Up'], "");
            equal('Roll Up', ssmReporting.gridData[2]['State'], "");
            equal(1, ssmReporting.gridData[2]['Hannah-Barbara'], "");
            equal(3, ssmReporting.gridData[2]['The Simpsons'], "");
            equal(3, ssmReporting.gridData[2]['Warner Brothers'], "");
            equal(7, ssmReporting.gridData[2]['Roll Up'], "");
            start();
        }, 500);
    });


    // Drilldown tests don't work. 
    // Chrome and Firefox popup-blockers prevent the new window
    // from opening. IE spawns infinite windows.

//    test("Ensure drilldown queries work", function () {
//        expect(2);
//        ssmReporting.runQuery(crosstabQuery);
//        ssmReporting.loadQuery(crosstabQuery);
//        stop();
//        var simpsonsWindow = null;
//        var rollUpWindow = null;
//        setTimeout(function () {

//            // Click on the cell for The Simpsons, in the second row.
//            simpsonsWindow = $('.slick-cell.l2.r2')[1].click();

//            // Click on the roll up cell in the bottom right corner.
//            rollUpWindow = $('.slick-cell.l4.r4')[2].click();

//            setTimeout(function () {
//                equal(3, simpsonsWindow.ssmReporting.gridData.length, "Drilldown on Simpsons yields 3 results");
//                equal(7, rollUpWindow.ssmReporting.gridData.length, "Drilldown on Roll Up yields 7 results");
//                try { simpsonsWindow.close(); }
//                catch (ex) { }
//                try { rollUpWindow.close(); }
//                catch (ex) { }
//            }, 1000);
//            start();

//        }, 500);
//    });

});
