//
// QUnit tests for filters
//
// Because jQuery queues the document.ready() functions,
// you must be sure to load reporting.js before any test
// files in the document head. These tests assume that
// reporting.js has already done it's setup work.
//

$(document).ready(function () {

    module("Filter Tests");

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

    // Returns the number of filters currently visible on the page.
    function visibleFilterCount() {
        return $('.filter-column').length;
    }

    test("Ensure one empty filter exists", function () {
        expect(1);
        stop();
        setTimeout(function () {
            equal(visibleFilterCount(), 1, "There should be one visible filter when a table loads.");
            start();
        }, 200);
    });


    test("Add Filter adds a new filter", function () {
        expect(1);                        // We expect 1 passing assertion in this test.
        $('#add-filter-button').click();  // Click the Add Filter button.
        stop();                           // Stop the test framework so our new filter has time to render.

        // In this timeout, we wait 200ms, then assert the new filter has been rendered.
        // Then we call start() to tell the test framework to continue with the next unit test.
        setTimeout(function () {
            equal(visibleFilterCount(), 2, "There should be two filters after clicking the Add Filter button.");
            start();
        }, 200);
    });

    test("Remove Filter removes filter", function () {
        expect(1);
        stop();
        setTimeout(function () {
            var filterRemoveButtons = $('.btn.filter-remove-button');
            filterRemoveButtons[0].click();
            equal(visibleFilterCount(), 0, "There should be zero visible filters after clicking remove.");
            start();
        }, 200);
    });

    test("Column List has correct columns", function () {
        expect(5);
        stop();
        setTimeout(function () {
            var columnList = $('.filter-column select')[0];
            var listOpts = $(columnList).prop("options");
            equal(listOpts.length, 9, "Column list should have 9 options.");
            // First option at [0] says "Choose One". Skip & start at 2nd option.
            equal(listOpts[1].value, 'City', "First column option should have value 'City'");
            equal(listOpts[1].text, 'City', "First column option should have text 'City'");
            equal(listOpts[8].value, 'Test_OrganizationName', "Last column option should have value 'Test_OrganizationName'");
            equal(listOpts[8].text, 'Test Organization Name', "Last column option should have text 'Test Organization Name'");
            start();
        }, 200);
    });


    // test that column change loads correct operators in ops list
    test("Selecting a text column displays correct operators", function () {
        expect(10);
        stop();

        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');  // Select the City column
        $(columnList).change();     // Fire the change event

        setTimeout(function () {
            var operatorsList = $('.filter-op select')[0];
            var listOpts = $(operatorsList).prop("options");
            equal(listOpts.length, 9, "Opertators list should have 9 options for column 'City'.");
            equal(listOpts[0].value, 'Equals', "Operator option #1 should be 'Equals'");
            equal(listOpts[1].value, 'DoesNotEqual', "Operator option #2 should be 'DoesNotEqual'");
            equal(listOpts[2].value, 'StartsWith', "Operator option #3 should be 'StartsWith'");
            equal(listOpts[3].value, 'EndsWith', "Operator option #4 should be 'EndsWith'");
            equal(listOpts[4].value, 'Contains', "Operator option #5 should be 'Contains'");
            equal(listOpts[5].value, 'DoesNotContain', "Operator option #6 should be 'DoesNotContain'");
            equal(listOpts[6].value, 'IsNull', "Operator option #7 should be 'IsNull'");
            equal(listOpts[7].value, 'IsNotNull', "Operator option #8 should be 'IsNotNull'");

            // Text column will have the IsAnyOf operator only if there are a limited
            // number of values in that column in the database. It's fine to list 40
            // options, but not OK to list 10000. In this case, there are only a few
            // distinct values in the city column, so we'll get a select list and the
            // IsAnyOf option in the operators list.
            equal(listOpts[8].value, 'IsAnyOf', "Operator option #9 should be 'IsAnyOf'");
            start();
        }, 250);
    });


    test("Selecting a date column displays correct operators", function () {
        expect(9);
        stop();

        var columnList = $('.filter-column select')[0];
        $(columnList).val('DateOfBirth');  // Select the DateOfBirth column
        $(columnList).change();            // Fire the change event

        setTimeout(function () {
            var operatorsList = $('.filter-op select')[0];
            var listOpts = $(operatorsList).prop("options");
            equal(listOpts.length, 8, "Opertators list should have 8 options for column 'Date Of Birth'.");
            equal(listOpts[0].value, 'Equals', "Operator option #2 should be 'Equals'");
            equal(listOpts[1].value, 'DoesNotEqual', "Operator option #3 should be 'DoesNotEqual'");
            equal(listOpts[2].value, 'GreaterThan', "Operator option #4 should be 'GreaterThan'");
            equal(listOpts[3].value, 'GreaterThanOrEqualTo', "Operator option #5 should be 'GreaterThanOrEqualTo'");
            equal(listOpts[4].value, 'LessThan', "Operator option #6 should be 'LessThan'");
            equal(listOpts[5].value, 'LessThanOrEqualTo', "Operator option #7 should be 'LessThanOrEqualTo'");
            equal(listOpts[6].value, 'IsNull', "Operator option #8 should be 'IsNull'");
            equal(listOpts[7].value, 'IsNotNull', "Operator option #9 should be 'IsNotNull'");
            start();
        }, 250);
    });

    test("Selecting a numeric column displays correct operators", function () {
        expect(9);
        stop();

        var columnList = $('.filter-column select')[0];
        $(columnList).val('HourlyWage');   // Select the HourlyWage column
        $(columnList).change();            // Fire the change event

        setTimeout(function () {
            var operatorsList = $('.filter-op select')[0];
            var listOpts = $(operatorsList).prop("options");
            equal(listOpts.length, 8, "Opertators list should have 8 options for column 'Hourly Wage'.");
            equal(listOpts[0].value, 'Equals', "Operator option #1 should be 'Equals'");
            equal(listOpts[1].value, 'DoesNotEqual', "Operator option #2 should be 'DoesNotEqual'");
            equal(listOpts[2].value, 'GreaterThan', "Operator option #3 should be 'GreaterThan'");
            equal(listOpts[3].value, 'GreaterThanOrEqualTo', "Operator option #4 should be 'GreaterThanOrEqualTo'");
            equal(listOpts[4].value, 'LessThan', "Operator option #5 should be 'LessThan'");
            equal(listOpts[5].value, 'LessThanOrEqualTo', "Operator option #6 should be 'LessThanOrEqualTo'");
            equal(listOpts[6].value, 'IsNull', "Operator option #7 should be 'IsNull'");
            equal(listOpts[7].value, 'IsNotNull', "Operator option #8 should be 'IsNotNull'");
            start();
        }, 250);
    });

    // test that column change loads correct value field type
    // List options don't always appear for text types. See comment above.
    test("Selecting a text column displays a select input with correct options", function () {
        expect(4);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');
        $(columnList).change();
        stop();
        setTimeout(function () {
            var valuesList = $('.filter-value select')[0];
            var listOpts = $(valuesList).prop("options");
            equal(listOpts.length, 4, "Values list should have 4 options for column 'City'.");
            // Skip first empty "Choose One" option
            equal(listOpts[1].value, 'Burbank', "Value option #1 should be 'Burbank'");
            equal(listOpts[2].value, 'Hollywood', "Value option #2 should be 'Hollywood'");
            equal(listOpts[3].value, 'Springfield', "Value option #3 should be 'Springfield'");
            start();
        }, 250);
    });

    test("Selecting a numeric column displays a text input", function () {
        expect(1);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('HourlyWage');
        $(columnList).change();
        stop();
        setTimeout(function () {
            equal($('.filter-value :text').length, 1, "There should be one text input in the values column");
            start();
        }, 250);
    });


    test("Selecting a boolean column displays a select input with correct options", function () {
        expect(3);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('OnLeave');
        $(columnList).change();
        stop();
        setTimeout(function () {
            var valuesList = $('.filter-value select')[0];
            var listOpts = $(valuesList).prop("options");
            equal(listOpts.length, 3, "Values list should have 3 options for column 'OnLeave'.");
            // Skip first empty "Choose One" option
            equal(listOpts[1].value, 'true', "Value option #1 should be 'true'");
            equal(listOpts[2].value, 'false', "Value option #2 should be 'false'");
            start();
        }, 250);
    });


    test("Selecting a date column displays a datepicker", function () {
        expect(2);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('DateOfBirth');
        $(columnList).change();
        stop();
        setTimeout(function () {
            var controls = $('.filter-value :text');
            equal(controls.length, 1, "There should be one text input in the values column");
            equal($(controls[0]).hasClass('hasDatepicker'), true, "The text input in the values column should be a jQuery datepicker.");
            start();
        }, 250);
    });


    // test that op change loads select list where appropriate
    test("Value field shows select list for Equals & Does Not Equal", function () {
        expect(4);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');
        $(columnList).change();
        var operatorsList = $('.filter-op select')[0];
        $(operatorsList).val('Contains'); // Brings up text input
        $(operatorsList).change();
        $(operatorsList).val('DoesNotEqual'); // Brings up select list
        $(operatorsList).change();
        stop();
        setTimeout(function () {
            var valuesList = $('.filter-value select')[0];
            var listOpts = $(valuesList).prop("options");
            equal(listOpts.length, 4, "Values list should have 4 options for column 'City'.");
            // Skip first empty "Choose One" option
            equal(listOpts[1].value, 'Burbank', "Value option #1 should be 'Burbank'");
            equal(listOpts[2].value, 'Hollywood', "Value option #2 should be 'Hollywood'");
            equal(listOpts[3].value, 'Springfield', "Value option #3 should be 'Springfield'");
            start();
        }, 250);
    });


    // test that op change loads textbox where appropriate
    test("Value field shows text input for Contains, StartsWith, EndsWith", function () {
        expect(1);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');
        $(columnList).change();
        var operatorsList = $('.filter-op select')[0];
        $(operatorsList).val('Contains'); // Brings up text input
        $(operatorsList).change();
        stop();
        setTimeout(function () {
            equal($('.filter-value :text').length, 1, "There should be one text input in the values column");
            start();
        }, 250);
    });


    // test that op change loads empty span where appropriate
    test("Value field shows no control (empty span) for IsNull and IsNotNull", function () {
        expect(1);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');
        $(columnList).change();
        var operatorsList = $('.filter-op select')[0];
        $(operatorsList).val('IsNotNull');
        $(operatorsList).change();
        stop();
        setTimeout(function () {
            equal($('.filter-value span').length, 1, "There should be one an empty span in the values column");
            start();
        }, 250);
    });


    test("Value field shows multiple checkboxes for IsAnyOf (Chrome has trouble with this test)", function () {
        expect(4);
        var columnList = $('.filter-column select')[0];
        $(columnList).val('City');
        $(columnList).change();
        var operatorsList = $('.filter-op select')[0];
        $(operatorsList).val('IsAnyOf');
        $(operatorsList).change();
        stop();
        setTimeout(function () {
            var checkboxes = $('.filter-value :checkbox');
            equal(checkboxes.length, 3, "There should be three checboxes in the values column");
            equal(checkboxes[0].value, "Burbank", "Checkbox 1 should have value 'Burbank'.");
            equal(checkboxes[1].value, "Hollywood", "Checkbox 2 should have value 'Hollywood'.");
            equal(checkboxes[2].value, "Springfield", "Checkbox 3 should have value 'Springfield'.");
            start();
        }, 350);
    });


    test("getFilterIds() returns all filter ids", function () {
        expect(1);
        $('#add-filter-button').click();
        $('#add-filter-button').click();
        $('#add-filter-button').click();
        stop();

        setTimeout(function () {
            equal(ssmReporting.getAllFilterIds().length, 4, "getAllFilterIds() should return 4 filter ids.");
            start();
        }, 200);
    });

    test("getFilters() returns all filter objects", function () {
        expect(1);
        $('#add-filter-button').click();
        $('#add-filter-button').click();
        $('#add-filter-button').click();
        stop();

        setTimeout(function () {
            equal(ssmReporting.getAllFilters().length, 4, "getAllFilters() should return 4 filter objects.");
            start();
        }, 800);
    });


    test("getFilters() returns a summary of filter objects", function () {

        expect(7);

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

        stop();

        setTimeout(function () {
            // Need the timeout before we set this...
            var valueControl2 = $('.filter-value select')[0];
            $(valueControl2).val('true').attr('selected', true);

            var filters = ssmReporting.getAllFilters();
            var filterSummary1 = filters[0].summary();
            var filterSummary2 = filters[1].summary();
            equal(filters.length, 2, "getAllFilters() should return 2 filter objects.");
            equal(filterSummary1.column, "City", "Filter summary has correct column value (City)");
            equal(filterSummary1.operator, "Contains", "Filter summary has correct operator (Contains)");
            equal(filterSummary1.value, "xyz900", "Filter summary has correct r-value (xyz900)");
            equal(filterSummary2.column, "OnLeave", "Filter summary has correct column value (OnLeave)");
            equal(filterSummary2.operator, "Equals", "Filter summary has correct operator (Equals)");
            equal(filterSummary2.value, "true", "Filter summary has correct r-value (true)");
            start();
        }, 800);
    });

});

