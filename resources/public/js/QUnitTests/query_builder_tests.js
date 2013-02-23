//
// QUnit tests for query builder
//
// Because jQuery queues the document.ready() functions,
// you must be sure to load reporting.js before any test
// files in the document head. These tests assume that
// reporting.js has already done it's setup work.
//

$(document).ready(function () {

    module("Query Builder Tests");


    test("buildQuery() returns correct raw query object", function () {

        expect(9);

        // Set up the first filter
        var columnList1 = $('.filter-column select')[0];
        $(columnList1).val('City');
        $(columnList1).change();
        var operatorsList1 = $('.filter-op select')[0];
        $(operatorsList1).val('Contains');
        $(operatorsList1).change();
        var valueControl1 = $('.filter-value :text')[0];
        $(valueControl1).val('xyz900');


        // Set up the second filter
        $('#add-filter-button').click();
        var columnList2 = $('.filter-column select')[1];
        $(columnList2).val('OnLeave');
        $(columnList2).change();

        // Set logic to custom & add a custom logic string
        $('#filter-logic-type').val('Custom');
        $('#filter-logic-string').val('(Larry AND Moe) or (Curly AND Larry)');


        // Select all columns for output
        ssmReporting.moveAllListItems('available-output-columns', 'selected-output-columns');

        // Select all columns for sorting
        ssmReporting.moveAllListItems('available-sort-columns', 'selected-sort-columns');



        stop();

        setTimeout(function () {
            // Need the timeout before we set this...
            var valueControl2 = $('.filter-value select')[0];
            $(valueControl2).val('true').attr('selected', true);

            var query = ssmReporting.buildQuery();
            equal(query.db, "7SM_Reporting", "Query has correct database");
            equal(query.table, "Test_EmployeeView", "Query has correct table");


            equal(query.outputColumns.length, 8, "Query has 8 output columns");
            equal(query.orderBy.length, 8, "Query has 8 order by columns");
            equal(query.filters.length, 2, "Query has 2 filters");
            equal(query.filterLogicType, "Custom", "Filter logic type is Custom");
            equal(query.filterLogicString, "(Larry AND Moe) or (Curly AND Larry)", "Custom logic refers to the Three Stooges");
            equal(query.offset, 0, "Query offset is 0");
            equal(query.limit, 50, "Query limit is 50");
            start();
        }, 800);
    });

});
