//
// QUnit tests for the top nav menu
//
// Because jQuery queues the document.ready() functions,
// you must be sure to load reporting.js before any test
// files in the document head. These tests assume that
// reporting.js has already done it's setup work.
//

$(document).ready(function () {

    module("Menu Tests");


    test("Database menu has entry for 7SM_Reporting", function () {
        expect(1);
        var menuItem = $('#db_menu_7SM_Reporting');
        equal(menuItem.text(), "7SM_Reporting", "7SM_Reporting database is present in the Databases menu");
    });

    test("7SM_Reporting tables appear in the Reports menu", function () {
        expect(8);
        var menuItem = $('#db_menu_7SM_Reporting');
        menuItem.click();
        stop();
        setTimeout(function () {
            $('#db-menu').click(); // Force DB menu to close.
            equal($('#report_menu_CustomColumnConfig').text(), "Column Configuration", "Custom Configuration appears with correct name in the Reports menu");
            equal($('#report_menu_CustomConfig').text(), "Custom Config", "Custom Config appears with correct name in the Reports menu");
            equal($('#report_menu_Databases').text(), "Database Configuration", "Database Configuration appears with correct name in the Reports menu");
            equal($('#report_menu_EnumValues').text(), "Enum Values", "Enum Values appears with correct name in the Reports menu");
            equal($('#report_menu_CustomTableConfig').text(), "Table Configuration", "Table Configuration appears with correct name in the Reports menu");
            equal($('#report_menu_Test_Employee').text(), "Test Employee", "Test Employee appears with correct name in the Reports menu");
            equal($('#report_menu_Test_EmployeeView').text(), "Test Employee View", "Test Employee View appears with correct name in the Reports menu");
            equal($('#report_menu_Test_Organization').text(), "Test Organization", "Test Organization appears with correct name in the Reports menu");
            start();
        }, 1000);
    });


});