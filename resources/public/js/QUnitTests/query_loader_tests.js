//
// QUnit tests for query loading.
//
// Query loading is the process of loading a pre-defined
// query into the UI. This is not the same as running
// and query and loading data. It just means that given
// a query with a set of filters, output columns and
// sort columns, the 7SM Reporting JavaScript should be
// able to set up the UI to show the filters and 
// columns defined in the query.
//
// Because jQuery queues the document.ready() functions,
// you must be sure to load reporting.js before any test
// files in the document head. These tests assume that
// reporting.js has already done it's setup work.
//

$(document).ready(function () {

    module("Query Loader Tests");

    var rawQuery = {
        db: '7SM_Reporting',
        table: 'Test_EmployeeView',
        queryType: 'Raw',
        crosstabColVar: "",
        crosstabFunction: "",
        crosstabRowVar: "",
        crosstabSubjectVar: "",
        filterLogicString: "(A and B) or (X and Y)",
        filterLogicType: "Custom",
        limit: 50,
        offset: 0,
        groupBy: [],
        orderBy: ["HourlyWage", "OnLeave"],
        outputColumns: ["DateOfBirth", "FirstName", "LastName"],
        filters: [{ column: "FirstName", operator: "Contains", value: "e" },
                  { column: "LastName", operator: "Equals", value: "Flintstone" }, ]
    };


    var crosstabQuery = {
        db: '7SM_Reporting',
        table: 'Test_EmployeeView',
        queryType: 'Crosstab',
        crosstabColVar: "Test_OrganizationName",
        crosstabFunction: "Average",
        crosstabRowVar: "FirstName",
        crosstabSubjectVar: "HourlyWage",
        filterLogicString: "",
        filterLogicType: "MatchAny",
        limit: 50,
        offset: 0,
        groupBy: [],
        orderBy: [],
        outputColumns: [],
        filters: [{ column: "HourlyWage", operator: "GreaterThan", value: 1.22 },
                  { column: "OnLeave", operator: "Equals", value: "true" }, ]
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




    test("Ensure raw query loads correctly", function () {
        expect(21);
        ssmReporting.loadQuery(rawQuery);
        stop();
        setTimeout(function () {
            var query = ssmReporting.buildQuery();
            equal(query.db, "7SM_Reporting", "Query uses 7SM_Reporting database");
            equal(query.table, "Test_EmployeeView", "Query uses Test_EmployeeView view");
            equal(query.queryType, "Raw", "Query type is Raw");
            equal(query.filterLogicType, "Custom", "Filter logic type is Custom");
            equal(query.filterLogicString, "(A and B) or (X and Y)", "Filter logic string is (A and B) or (X and Y)");
            equal(query.limit, 50, "Query limit is 50");
            equal(query.offset, 0, "Query offset is 0");
            equal(query.outputColumns.length, 3, "Query has 3 output columns");
            equal(query.outputColumns[0], "DateOfBirth", "First output column is DateOfBirth");
            equal(query.outputColumns[1], "FirstName", "Second output column is FirstName");
            equal(query.outputColumns[2], "LastName", "Third output column is LastName");
            equal(query.orderBy.length, 2, "Query has 2 sort columns");
            equal(query.orderBy[0], "HourlyWage", "First sort column is HourlyWage");
            equal(query.orderBy[1], "OnLeave", "Second sort column is OnLeave");
            equal(query.filters.length, 2, "Query has 2 filters");
            equal(query.filters[0]['column'], 'FirstName', "First query filter column is FirstName");
            equal(query.filters[0]['operator'], 'Contains', "First query filter operator is Contains");
            equal(query.filters[0]['value'], 'e', "First query filter value is e");
            equal(query.filters[1]['column'], 'LastName', "Second query filter column is LastName");
            equal(query.filters[1]['operator'], 'Equals', "Second query filter operator is Equals");
            equal(query.filters[1]['value'], 'Flintstone', "Second query filter value is Flintstome");
            start();
        }, 500);
    });


    test("Ensure crosstab query loads correctly", function () {
        expect(17);
        ssmReporting.loadQuery(crosstabQuery);
        stop();
        setTimeout(function () {
            var query = ssmReporting.buildQuery();
            equal(query.db, "7SM_Reporting", "Query uses 7SM_Reporting database");
            equal(query.table, "Test_EmployeeView", "Query uses Test_EmployeeView view");
            equal(query.queryType, "Crosstab", "Query type is Crosstab");
            equal(query.filterLogicType, "MatchAny", "Filter logic type is MatchAny");
            equal(query.limit, 50, "Query limit is 50"); // Ignored when running crosstabs
            equal(query.offset, 0, "Query offset is 0"); // Ignored when running crosstabs
            equal(query.crosstabColVar, "Test_OrganizationName", "Crosstab column var is Test_OrganizationName");
            equal(query.crosstabFunction, "Average", "Crosstab function is Average");
            equal(query.crosstabRowVar, "FirstName", "Crosstab row var is FirstName");
            equal(query.crosstabSubjectVar, "HourlyWage", "Crosstab subject var is HourlyWage");
            equal(query.filters.length, 2, "Query has 2 filters");
            equal(query.filters[0]['column'], 'HourlyWage', "First query filter column is HourlyWage");
            equal(query.filters[0]['operator'], 'GreaterThan', "First query filter operator is GreaterThan");
            equal(query.filters[0]['value'], '1.22', "First query filter value is 1.22");
            equal(query.filters[1]['column'], 'OnLeave', "Second query filter column is OnLeave");
            equal(query.filters[1]['operator'], 'Equals', "Second query filter operator is Equals");
            equal(query.filters[1]['value'], 'true', "Second query filter value is true");
            start();
        }, 500);
    });


    test("Ensure query equality function works (1 of 3)", function () {
        expect(1);
        ssmReporting.loadQuery(rawQuery);
        stop();
        setTimeout(function () {
            var query = ssmReporting.buildQuery();
            equal(query.equals(rawQuery), true, "Query equals raw query.");
            start();
        }, 500);
    });


    test("Ensure query equality function works (2 of 3)", function () {
        expect(1);
        ssmReporting.loadQuery(crosstabQuery);
        stop();
        setTimeout(function () {
            var query = ssmReporting.buildQuery();
            equal(query.equals(crosstabQuery), true, "Query equals crosstab query.");
            start();
        }, 500);
    });


    test("Ensure query equality function works (3 of 3)", function () {
        expect(1);
        ssmReporting.loadQuery(rawQuery);
        stop();
        setTimeout(function () {
            var query = ssmReporting.buildQuery();
            equal(query.equals(crosstabQuery), false, "Raw query does not equal crosstab query.");
            start();
        }, 500);
    });

});
