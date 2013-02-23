//
// SsmReporting
//
// Returns an object to manage the reporting UI.
//
function SsmReporting() {

    var ssm = {};

    // --------------------------------------------------------------------
    // Reporting globals & functions that manipulate them
    // --------------------------------------------------------------------

    //
    // State variables. These keep track of the current
    // database and table, and descriptions of all the
    // columns in the current table.
    //

    // The database the user is currently interacting with.
    // This is a string. Just the name of the database.
    ssm.currentDB = null;

    // The table the user is currently interactive with.
    // This is an object that contains meta data about
    // the table and its columns.
    ssm.currentTable = null;

    // A hash of column descriptors. The key is column name.
    // The value is an object that contains meta data about
    // the column.
    ssm.columnDescriptors = {}

    // This contains state information for navigating using
    // the browser's forward and back buttons. This app uses
    // the hash component of the URL to store information 
    // about which database and table the user is working with.
    // The var ssm.hashHistory uses the URL hash as a key
    // (for example, '#EmployeeDB/Table1') and stores some
    // UI state information in the value.
    ssm.hashHistory = {};

    // This referns to an instance of Slick.Grid, which displays
    // query results. There will be no more than one instance of 
    // the grid in existence at any given time.
    ssm.resultsTable = null;

    // This contains the results returned from a call to
    // /Report/RunQuery. We add data into this var whenever
    // the user clicks the "Load More Data" button, then 
    // force the grid to render the new rows.
    ssm.gridData = null;

    // This stores the last query the user ran. User must
    // click "Run Query" to set this value. When user clicks
    // "Load More Data", we re-run this same query, fetching
    // one additional batch of rows. (Currently 50 rows per batch).
    ssm.currentQuery = null;


    // This stores the last SavedQuery the user loaded.
    ssm.savedQuery = null;


    // Raw queries return this many results in each batch.
    // User has to click "Load More Data" to get the next batch.
    // Crosstab queries do not have a batch size. They simply
    // return all results (usually ~5-100 rows).
    ssm.resultsBatchSize = 50;


    // This is a cache for list options. When a column has a
    // limited number of values, the filter UI displays a list 
    // of values options. For example, column Gender would have
    // options "Male" and "Female". We load these from the server,
    // but it makes sense to cache them, since the data is small,
    // and the cache reduces the number of requests.
    ssm.listOptionsCache = {};



    // This is a flag to indicate whether events have
    // been attached to a set of UI elements. There is only
    // one instance of these elements, so we want to attach
    // the events only once.
    ssm.eventsAttached = false;


    // This will be set to true when the ssmReporting object
    // has finished its setup work.
    ssm.initialized = false;


    //
    // Mustache templates. These are loaded when the initial page
    // loads. Many of the AJAX functions below render JSON data
    // using these templates. We load them once when the page
    // loads, and we can reuse them repeatedly from then on.
    //
    ssm.tableMetaDataTemplate = $("#table-meta-data").html();
    ssm.filterTemplate = $("#filter-template").html();
    ssm.filterColumnTemplate = $("#filter-column-template").html();
    ssm.filterOpTemplate = $("#filter-op-template").html();
    ssm.filterValueTemplate = $("#filter-value-template").html();
    ssm.isAnyOfTemplate = $("#is-any-of-template").html();
    ssm.queryTemplate = $('#query-template').html();
    ssm.columnListItemTemplate = $('#column-list-item-template').html();


    //
    // Constants
    //
    ssm.JSONDateRegex = /^\/Date.*\/$/;
    ssm.numberCaptureRegex = /(\d+)/;

    // Twitter Bootstrap CSS will not render the menu
    // if window width is below this number of pixels.
    ssm.NAVMENU_MIN_WIDTH = 980;

    //
    // Status codes for filter & query validation.
    //
    ssm.VALID            = 0;
    ssm.INVALID_INT      = 1;
    ssm.INVALID_FLOAT    = 2;
    ssm.INVALID_BOOL     = 3;
    ssm.INVALID_DATE     = 4;
    ssm.MISSING_COLUMN   = 5;
    ssm.MISSING_OPERATOR = 6;
    ssm.MISSING_VALUE    = 7;
    ssm.MISSING_OUTPUT_COLS = 8;
    ssm.MISSING_LOGIC_STRING = 9;
    ssm.LOGIC_STRING_INVALID = 10;
    ssm.MISSING_CROSSTAB_FN = 11;
    ssm.MISSING_CROSSTAB_SUBJECT_VAR = 12;
    ssm.MISSING_CROSSTAB_ROW_VAR = 13;
    ssm.MISSING_CROSSTAB_COLUMN_VAR = 14;

    ssm.validationMessages = [
        'Filter is valid.',
        'Invalid integer. The value should be a whole number.',
        'Invalid decimal number.',
        'Please select a value.',
        'Date is not valid.',
        'You did not specify which column to filter on.',
        'Filter has no operator.',
        'Filter has no value.',
        'Please select one or more result columns.',
        'Custom logic expression is missing.',
        'Custom logic expression is invalid.',
        'Please selecet a crosstab function.',
        'Please selecet a crosstab variable.',
        'Please select a row variable for the crosstab query.',
        'Please select a column variable for the crosstab query.',
    ];


    //
    // buildErrorMessage()
    //
    // Joins all of the string in msgArray (an array of strings)
    // into a <ul> list that can be displayed to the user.
    //
    ssm.buildErrorMessage = function (msgArray) {
        var html = '<p>Please correct the following items:</p><ul>';
        for (var i = 0; i < msgArray.length; i++) {
            var msgNumber = msgArray[i];
            html += '<li>' + ssm.validationMessages[msgNumber] + '</li>';
        }
        html += '</ul>';
        return html;
    }


    //
    // displayError()
    //
    // Displays an error so the user can see it.
    //
    ssm.displayError = function (message) {
        ssm.displayAlert(message, 'error');
    }


    //
    // displaySuccess()
    //
    // Displays a success message so the user can see it.
    //
    ssm.displaySuccess = function (message) {
        ssm.displayAlert(message, 'success');
    }


    //
    // displayAlert()
    //
    // Displays a message so the user can see it.
    //
    ssm.displayAlert = function (message, type) {
        $('#msg-content').html(message);
        $('#msg').removeClass('alert-error');
        $('#msg').removeClass('alert-success');
        if (type == 'error')
            $('#msg').addClass('alert-error');
        else if (type == 'success')
            $('#msg').addClass('alert-success');
        $('#msg').show();
    }

    

    // 
    // resetTableInfo(data)
    //
    // Stores the name of the current table in the currentTable var,
    // and fills the columnDescriptors var with ColumnDescriptors for
    // the current table.
    //
    // Param data is JSON data (parsed into an object) returned from 
    // a call to the URL Report/TableMetaData. 
    // 
    ssm.resetTableInfo = function (data) {
        ssm.currentTable = data;
        ssm.columnDescriptors = {};
        for (var i = 0; i < data.ColumnDescriptors.length; i++)
            ssm.columnDescriptors[data.ColumnDescriptors[i].Name] = data.ColumnDescriptors[i];
        //ssm.log(ssm.columnDescriptors);
    }






    // --------------------------------------------------------------------
    // Menu-related functions 
    // --------------------------------------------------------------------


    ssm.setActiveMenuItem = function (id) {
        var menuItems = ['nav-item-home', 'nav-item-db', 'nav-item-reports', 'nav-item-queries', 'nav-item-admin'];
        for (var i = 0; i < menuItems.length; i++) {
            var itemId = menuItems[i];
            var selector = '#' + itemId;
            if (id == itemId)
                $(selector).addClass('active');
            else
                $(selector).removeClass('active');
        }
    }


    //
    // initDBMenu()
    //
    // Initializes the Databases menu by attaching click events to
    // each menu item. The click events cause the browser to load
    // a list of tables for the database. The list of tables appears
    // under the Reports drop-down on the top nav.
    //
    // This function is only called once, when the page first loads.
    //
    ssm.initDBMenu = function () {
        $.each($('#db-menu-options li a'), function (index, element) {
            $(element).click(function () {
                ssm.setActiveMenuItem('nav-item-db');
                ssm.loadDBDefinition($(element).text())
            });
        });
    }



    //
    // loadTableDefinition(dbName, tableName)
    //
    // This calls an AJAX service to retrieve metadata about the
    // specified table. The metadata includes some info about the
    // table/view, and a lot of useful info about the columns in 
    // the table/view.
    //
    // Once the table metadata is retrieved, this stores the table
    // metadata in the vars currentTable and columnDescriptors, and
    // it sets up one empty filter, so the user can start building
    // queries on the table.
    //
    ssm.loadTableDefinition = function (dbName, tableName) {
        var url = APP_ROOT_URL + 'Report/TableMetaData/' + dbName + '/' + tableName;
        ssm.showBreadCrumbs(dbName, '(Loading table ...)');
        $('#spinner').show();
        return $.getJSON(url, function (data, textStatus, jqXHR) {
            //ssm.log(data);
            ssm.showBreadCrumbs(dbName, data.DisplayName);
            ssm.resetTableInfo(data);
            ssm.resultsTable = null;
            $('#results-table').html('');
            //$('#home-content').html(Mustache.render(ssm.tableMetaDataTemplate, data));
            $('#home-content').hide();

            // Clear this out, since it no longer applies.
            ssm.savedQuery = null;

            data.AvailableOutputColumns = [];
            data.AvailableSortColumns = [];
            data.AvailableGroupingColumns = [];
            data.NumericColumns = ssm.getAggregateTypeColumns();
            for (var i = 0; i < data.ColumnDescriptors.length; i++) {
                var colDesc = data.ColumnDescriptors[i];
                if (colDesc.DisplayInResults) { data.AvailableOutputColumns.push(colDesc); }
                if (colDesc.IsSortable && colDesc.DisplayInResults) { data.AvailableSortColumns.push(colDesc); }
                if (colDesc.IsGroupable && colDesc.DisplayInResults) { data.AvailableGroupingColumns.push(colDesc); }
            }

            // Set up all the lists and whatnot in the query building UI.
            $('#query-container').html(Mustache.render(ssm.queryTemplate, data));
            $('#query-container').show();
            $('#filter-logic-type').change(function () {
                if ($('#filter-logic-type').val() == 'Custom')
                    $('#filter-logic-string').show();
                else
                    $('#filter-logic-string').hide();
            });

            // Force menu to close
            if ($('#reports-menu-options').css('display') != 'none')
                $('#reports-menu').click();

            // Load up the UI with the list of available sort columns,
            // output columns, filters, etc.
            ssm.initQueryUI();
            $('#spinner').hide();

            // Display either the Raw query UI or the crosstab UI,
            // depending on which of the query-type radios is 
            // currently checked.
            ssm.showAppropriateQueryUI();
        });
    }


    //
    // loadDBDefinition(dbName)
    //
    // This calls an AJAX service to get a list of tables and views
    // available in the named database.
    //
    // It renders the list of tables/views in the "Reports" 
    // dropdown on the top nav bar.
    //
    ssm.loadDBDefinition = function (dbName) {
        var url = APP_ROOT_URL + "Database/Details/" + dbName;
        $('#spinner').show();
        $('#dbloading').show();
        // Returns array of table names.
        return $.getJSON(url, function (data, textStatus, jqXHR) {
            if (data.status != 'OK') {
                ssm.displayError('<p>Error requesting page ' + url + ': ' + data['message'] + '</p>');
                return;
            }
            var tables = data['tables'];
            //ssm.log(tables);
            $('#reports-menu-options').empty();
            var menuItems = '';
            for (var i = 0; i < tables.length; i++) {
                menuItems += '<li><a tabindex="' + (i + 1) + '" href="#' + dbName + '/' + tables[i]['TableName'] + '" id="report_menu_' + tables[i]['TableName'] + '">' + tables[i]['DisplayName'] + '</a></li>';
            }
            $('#reports-menu-options').html(menuItems);

            $.each($('#reports-menu-options li a'), function (index, element) {
                var tableName = $(element).attr('id').substr(12);
                $(element).click(function () {
                    ssm.setActiveMenuItem('nav-item-reports');
                    ssm.loadTableDefinition(dbName, tableName);
                });
            });

            ssm.currentDB = dbName;

            $('#spinner').hide();
            $('#dbloading').hide();
            $('#choose-db-message').html('Database ' + dbName + ' is loaded. Choose a report from the Reports menu.');

            // Force menu to close
            if ($('#db-menu-options').css('display') != 'none')
                $('#db-menu').click();
        });
    }



    //
    // goToLocationHash()
    //
    // Initialize the page based on the location hash.
    // This is a single-page app, and all navigation 
    // uses the hash component of the URL, which represents
    // the current database and table. For example, the
    // usually looks something like #MyDB/MyTable. This 
    // function loads the meta data for the DB and Table
    // into the UI so the user can start building a query.
    //
    ssm.goToLocationHash = function () {
        if (ssm.isNullOrEmpty(location.hash)) {
            return false;
        }
        else if (location.hash == '##') {
            $('#breadcrumbs').hide();
            $('#query-container').hide();
            $('#load-more-rows').hide();
            $('#results-count').hide();
            $('#results-table').html('&nbsp;');
            $('#choose-db-message').html('Choose a database first, then choose a report.');
            $('#home-content').show();
            ssm.setActiveMenuItem('nav-item-home');
        }
        else {
            var components = location.hash.split('/');
            var db = components[0].replace('#', '');
            var table = null;
            if (components.length > 1)
                table = components[1];
            ssm.loadDBDefinition(db);
            if (table != null) {
                var dbLoader = setInterval(function () {
                    if ($('#reports-menu-options li a').length > 0) {
                        clearInterval(dbLoader);
                        ssm.loadTableDefinition(db, table);
                    }
                }, 200);
            }
        }
        return true;
    }





    // --------------------------------------------------------------------
    // Filter-related functions 
    // --------------------------------------------------------------------



    //
    // getFilter(filterId)
    //
    // Returns the filter with the specified id.
    // The filter contains several UI elements in the form of jQuery
    // objects. It also includes functions to return the filter's column,
    // operator and value.
    //
    // This function/object is useless unless the UI elements already exist.
    //
    ssm.getFilter = function (filterId) {

        if (ssm.getFilterElement('FilterDiv', filterId) == null)
            throw "No filter exists with id " + filterId;

        var filter = new Object();
        filter.id = filterId;

        // Use functions instead of properties to prevent 
        // from circular references to DOM objects, which
        // will cause memory leaks.
        filter.filterDiv = function () { return ssm.getFilterElement('FilterDiv', filterId); }
        filter.columnList = function () { return ssm.getFilterElement('ColumnList', filterId); }
        filter.operatorList = function () { return ssm.getFilterElement('OperatorList', filterId); }
        filter.valueDiv = function () { return ssm.getFilterElement('ValueDiv', filterId); }
        filter.valueControl = function () { return ssm.getFilterElement('ValueControl', filterId); }
        filter.removeLink = function () { return ssm.getFilterElement('RemoveLink', filterId); }

        filter.column = function () { return filter.columnList().val(); }
        filter.operator = function () { return filter.operatorList().val(); }
        filter.value = function () {
            if (filter.operator() == 'IsAnyOf') {
                return ssm.getCheckedValues('val-div-' + filterId);
            }
            else {
                var value = null;
                try { value = filter.valueControl().val().trim(); }
                catch (ex) { /* Operator changed from IsAnyOf, and checkboxes are still showing */ }
                return value;
            }
        }

        filter.summary = function () { return { 'column': filter.column(), 'operator': filter.operator(), 'value': filter.value() }; }

        filter.validate = function () {
            var summary = filter.summary();
            if (summary.column == null || summary.column.trim() == '') { return ssm.MISSING_COLUMN; }
            if (summary.operator == null || summary.operator.trim() == '') { return ssm.MISSING_OPERATOR; }

            // For IsNull/IsNotNull, we don't need a value.
            if (summary.operator == 'IsNull' || summary.operator == 'IsNotNull')
                return ssm.VALID;

            // No date validation here because the calendar control takes care of that.
            var uiDataType = ssm.columnDescriptors[summary.column].UIDataType;
            var valueIsEmpty = (summary.value == null ||
                                (summary.value instanceof Array && summary.value.length == 0) ||
                                (summary.value.constructor === String && summary.value.trim() == ''));
            if ((uiDataType != 5 && uiDataType != 6) && valueIsEmpty) { return ssm.MISSING_VALUE; }

            //ssm.log(typeof (summary.value.toString()));
            var values = [];
            if (summary.operator == 'IsAnyOf')
                values = summary.value.toString().split(/,/);
            else
                values.push(summary.value);

            //ssm.log(values);

            if (uiDataType == 1) {
                try {
                    for (var i = 0; i < values.length; i++) {
                        //ssm.log("Testing as INT: " + values[i]);
                        if (parseInt(values[i], 10).toString() != values[i].trim()) {
                            return ssm.INVALID_INT;
                        }
                    }
                }
                catch (ex) { return ssm.INVALID_INT; }
            }
            if (uiDataType == 2) {
                try {
                    for (var i = 0; i < values.length; i++) {
                        //ssm.log("Testing as FLOAT: " + values[i]);
                        parseFloat(values[i]);
                    }
                }
                catch (ex) { return ssm.INVALID_INT; }
            }
            return ssm.VALID;
        }

        return filter;
    }




    //
    // getFilterElement(which, filterId)
    //
    // Returns the specified element for the filter with the 
    // given Id. The return value is a jQuery object wrapping
    // a DOM element.
    //
    // Filters are composed of several elements, including:
    //
    // - ColumnList     A select list of column names.
    // - OperatorList   A select list of comparison operators.
    // - ValueDiv       A div that holds the filter's value control.
    // - ValueControl   A textbox, select list or other control holding the filter value.
    //                  ValueControl will be an empty span when operator is IsNull or IsNotNull.
    // - RemoveLink     A link that removes the filter when clicked.
    // - FilterDiv      The div that contains all of the filter elements listed above.
    //
    ssm.getFilterElement = function (which, filterId) {
        switch (which) {
            case 'ColumnList': return $('#col-' + filterId);
            case 'OperatorList': return $('#op-' + filterId);
            case 'ValueDiv': return $('#val-div-' + filterId);
            case 'ValueControl': return $('#val-' + filterId);
            case 'RemoveLink': return $('#remove-' + filterId);
            case 'FilterDiv': return $('#filter-' + filterId);
            default: throw "getFilterElement() doesn't know what Willis is talkin about when he says " + which;
        }
    }




    //
    // loadListOptions(dbName, tableName, columnName, filterId)
    //
    // Loads a set of options (via AJAX) into a filter's value control.
    // That control is an HTML select list.
    //
    // Params dbName, tableName and columnName specify the database
    // column whose values we want to load. 
    //
    // Param filterId specifies the filter in which we should render
    // the select list.
    //
    ssm.loadListOptions = function (dbName, tableName, columnName, listId) {
        var url = APP_ROOT_URL + 'ListOptions/Index/' + dbName + '/' + tableName + '/' + columnName;
        if (ssm.listOptionsCache[url] != null) {
            ssm.log('Using cached options for ' + url);
            if (listId != null)
                ssm.resetListOptions(listId, ssm.listOptionsCache[url]);
            return;
        }
        // When listId is null, we are pre-caching data,
        // do don't use the spinner.
        if (listId != null)
            $('#spinner').show();
        $.getJSON(url, function (data, textStatus, jqXHR) {
            if (data['status'] != 'OK')
                ssm.displayError('<p>Error requesting page ' + url + ': ' + data['message'] + '</p>');
            else {
                ssm.listOptionsCache[url] = data['options'];
                if (listId != null)                     
                    ssm.resetListOptions(listId, data['options']);
            }
            if (listId != null)
                $('#spinner').hide();
        });
    }


    //
    // loadIsAnyOf(dbName, tableName, columnName, filterId)
    //
    // Loads a set of options (via AJAX) into the IsAnyOf value control.
    // That control is a div with a set of checkboxes.
    //
    // Params dbName, tableName and columnName specify the database
    // column whose values we want to load. 
    //
    // Param filterId specifies the filter in which we should render
    // the checkboxes.
    //
    ssm.loadIsAnyOf = function (dbName, tableName, columnName, filterId) {
        var url = APP_ROOT_URL + 'ListOptions/Index/' + dbName + '/' + tableName + '/' + columnName;
        $('#spinner').show();
        $.getJSON(url, function (data, textStatus, jqXHR) {
            if (data['status'] != 'OK') {
                ssm.displayError('<p>Error requesting page ' + url + ': ' + data['message'] + '</p>');
                return;
            }
            var templateData = { 'Items': data['options'], 'FilterId': filterId };
            var filter = ssm.getFilter(filterId);
            filter.valueDiv().empty();
            filter.valueDiv().append(Mustache.render(ssm.isAnyOfTemplate, templateData));
            $('#spinner').hide();
        });
    }




    //
    // addFilter()
    //
    // Adds a new empty filter to the UI. That's the column chooser, 
    // the operator chooser and the value control. Returns the id
    // of the new filter.
    //
    ssm.addFilter = function () {
        var partials = { 'filter_column': ssm.filterColumnTemplate, 'filter_op': ssm.filterOpTemplate, 'filter_value': ssm.filterValueTemplate };
        var filterId = ssm.uuid();
        var data = { 'Table': ssm.currentTable.Table, 'ColumnDescriptors': ssm.currentTable.ColumnDescriptors, 'FilterId': filterId };
        $('#filters').append(Mustache.render(ssm.filterTemplate, data, partials));
        var filter = ssm.getFilter(filterId);
        filter.columnList().change(function () {
            ssm.resetOpsList(filterId, filter.column());
            ssm.resetValueControl(filterId);
            filter.valueControl().val(''); // clear the value in the control
        });
        filter.removeLink().click(function () { ssm.removeFilter(filterId); });
        ssm.resetFilterNumbers();
        return filterId;
    }


    //
    // resetFilterNumbers()
    //
    // Reset the numbers next to the filter definitions.
    // This happens when a filter is added or removed.
    //
    ssm.resetFilterNumbers = function () {
        $.each($('.filter-number'), function (index, el) {
            $(el).html(index + 1);
        });
    };



    //
    // resetOpsList(filterId, columnName)
    //
    // Resets the list of operators with a set of operators
    // suitable for the current column.
    //
    ssm.resetOpsList = function (filterId, columnName) {
        var filter = ssm.getFilter(filterId);
        var selectedColumn = filter.column();
        if (selectedColumn == null || selectedColumn == undefined || selectedColumn == "")
            return; // No item selected. Nothing to do.

        // Remove the old operators from the list, and replace
        // them with the operators that are valid for this column.
        var columnDescriptor = ssm.columnDescriptors[selectedColumn];
        filter.operatorList().attr('disabled', 'disabled');
        var listOpts = filter.operatorList().prop("options");
        while (listOpts.length > 0)
            $(listOpts[0]).remove();
        for (var i = 0; i < columnDescriptor.Operators.length; i++) {
            var op = columnDescriptor.Operators[i];
            listOpts[i] = new Option(op.Label, op.Value, (i == 0), (i == 0));
        }
        filter.operatorList()[0].selectedIndex = 0;
        filter.operatorList().removeAttr('disabled');

        // Attach an event to the operators list so that whenever
        // it changes, we reset the value control to something
        // appropriate for the selected operator.
        filter.operatorList().change(function () {
            var operator = filter.operatorList().val();
            if (operator == 'IsAnyOf' && !ssm.checkboxListIsShowing(filterId))
                ssm.loadIsAnyOf(ssm.currentDB, ssm.currentTable.Name, columnName, filterId)
            else if (((operator == 'Equals' || operator == 'DoesNotEqual') && operator != 'IsAnyOf') && !ssm.selectListIsShowing(filterId))
                ssm.resetValueControl(filterId);
            else if ((operator == 'Contains' || operator == 'DoesNotContain' ||
                      operator == 'StartsWith' || operator == 'EndsWith') && !ssm.textboxIsShowing(filterId))
                ssm.resetValueControl(filterId, 1);
            else if (operator == 'IsNull' || operator == 'IsNotNull')
                ssm.resetValueControl(filterId, -1);
        });
    }




    //
    // selectListIsShowing(filterId)
    //
    // Returns true if the value div contains a select list.
    //
    ssm.selectListIsShowing = function (filterId) {
        var selector = '#val-div-' + filterId + " select";
        var checkboxes = $(selector) || [];
        return checkboxes.length > 1;
    }



    //
    // checkboxListIsShowing(filterId)
    //
    // Returns true if the value div contains more than one checkbox.
    // This indicates whether the IsAnyOf checkbox list is currently showing.
    //
    ssm.checkboxListIsShowing = function (filterId) {
        var selector = '#val-div-' + filterId + " :checkbox";
        var checkboxes = $(selector) || [];
        return checkboxes.length > 1;
    }




    //
    // textboxIsShowing(filterId)
    //
    // Returns true if the value div for the specified
    // filter contains a textbox.
    //
    ssm.textboxIsShowing = function (filterId) {
        var selector = '#val-div-' + filterId + " :text";
        var textboxes = $(selector) || [];
        return textboxes.length > 0;
    }




    //
    // resetValueControl(filterId, resetToType)
    // 
    // Replaces the existing value control with whatever is suitable
    // for the current column and operator.
    // 
    // Param filterId is the id of the filter whose value control
    // you want to change. This function looks at the column and
    // operator that the current filter is using and chooses an
    // appropriate value control. For example, for a date or datetime
    // column, this will usually present a date picker.
    //
    // The operator can make a difference in the type of value control
    // that appears. For example, if the column is a string type with
    // an enumerated list of values, this will present a select list
    // for operators Equals and DoesNotEqual, and will present a 
    // textbox for operators StartsWith, EndsWith, Contains and
    // DoesNotContain.
    //
    // If param resetToType is specified, this will reset the value
    // control to the specified type. Otherwise, it will render the
    // type that makes sense for the column and operator.
    //
    // See the switch statement in buildControl() for control types.
    //
    ssm.resetValueControl = function (filterId, resetToType) {
        var filter = ssm.getFilter(filterId);
        var colDesc = ssm.columnDescriptors[filter.column()];
        resetToType = resetToType || colDesc.ControlType;
        var newControl = ssm.buildControl(resetToType, filter.value());
        if (newControl != null) {
            var newControlId = 'val-' + filterId;
            filter.valueDiv().empty();
            newControl.attr("id", newControlId);
            filter.valueDiv().append(newControl);
            // If new control is select list, load the options.
            if ((resetToType == 5 || resetToType == 6) && colDesc.HasEnumerableOptions) {
                ssm.loadListOptions(ssm.currentDB, ssm.currentTable.Name, colDesc.Name, newControlId)
            }
            if (resetToType == 7)
                $(newControl).datepicker();
        }
    }




    //
    // buildControl(resetToType, filterValue)
    //
    // Returns a new HTML form control, in the form of a jQuery
    // object. 
    //
    // Param controlType specifies the type of control to create.
    // Param filterValue specifies the value of the control, which
    // will be set if possible. In some cases, it's not possible.
    //
    ssm.buildControl = function (controlType, filterValue) {
        filterValue = filterValue || "";
        var control = null;
        switch (controlType) {
            case -1: // empty control for IsNull/IsNotNull
                control = $('<span class="empty-control" value="">&nbsp</span>');
                break;
            case 1: // text
                control = $('<input type="text" value="' + filterValue + '"/>');
                break;
            case 2: // checkbox
                control = $('<input type="checkbox" value=" ' + filterValue + '"/>');
                break;
            case 3: // checkbox group
                control = null;
                break;
            case 4: // radio group
                control = null;
                break;
            case 5: // single select list
                control = $('<select><option value=""></option></select>');
                break;
            case 6: // multi-select list
                control = $('<select multiple="multiple"><option value=""></option></select>');
                break;
            case 7: // datepicker
                control = $('<input type="text" value=" ' + filterValue + '"/>');
                break;
            case 8: // textarea
                control = $('<textarea></textarea>');
                break;
            default:
                break;
        }
        return control;
    }




    //
    // removeFilter(filterId)
    //
    // Removes a filter from the UI. Removes the column list,
    // the operator list, the value control, and the div that
    // contains them.
    //
    // Param filterId is the id of the filter you want to remove.
    //
    ssm.removeFilter = function (filterId) {
        // Get and then remove the entire div that contains the filter controls.
        ssm.getFilterElement('FilterDiv', filterId).remove();
        ssm.resetFilterNumbers();
    }



    //
    // getAllFilterIds
    //
    // Returns a list of ids of all the filters currently displayed.
    //
    ssm.getAllFilterIds = function () {
        var ids = []
        $('.filter').each(function (index, element) {
            ids.push(element.id.replace('filter-', ''));
        });
        return ids;
    }



    // --------------------------------------------------------------------
    // Generic and utility functions 
    // --------------------------------------------------------------------


    //
    // hideBreadCrumbs()
    //
    ssm.hideBreadCrumbs = function () {
        $('#breadcrumbs').hide();
    };


    //
    // showBreadCrumbs()
    //
    ssm.showBreadCrumbs = function (dbName, tableName) {
        $('#breadcrumb-db').html(dbName + '<span class="divider">/</span>');
        $('#breadcrumb-table').html(tableName);
        $('#breadcrumbs').show();
    };


    //
    // resetListOptions(listId, values)
    // 
    // Resets the list options in the list listId with the values
    // specified in values.
    //
    // Param values should be a list in which each item has a 
    // Value property and a Label property, such as the items
    // that com from calls to ListOptions/Index/.
    //
    ssm.resetListOptions = function (listId, values) {
        var selectList = $('#' + listId);
        selectList.attr('disabled', 'disabled');
        var listOpts = selectList.prop("options") || [];
        while (listOpts.length > 0)
            $(listOpts[0]).remove();
        listOpts[0] = new Option("-- Choose One --", "", false, false); 
        for (var i = 0; i < values.length; i++)
            listOpts[i + 1] = new Option(values[i].Label, values[i].Value, false, false);
        selectList[0].selectedIndex = 0;
        selectList.removeAttr('disabled');
    }



    //
    // uuid()
    //
    // Returns a new UUID (version 4) as a string.
    //
    ssm.uuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }


    //
    // log(message)
    //
    // Logs a message to the browser's JavaScript console, if the
    // browser supports that. (Chrome does!)
    //
    ssm.log = function (message) {
        if (typeof console == "object") {
            console.log(message);
        }
    }


    // --------------------------------------------------------------------
    // Query-related functions 
    // --------------------------------------------------------------------


    //
    // validateQuery(query)
    //
    // Validates a query, returning an empty array if the
    // query is valid, or an array of error messages (strings)
    // describing each element of the query that is not valid.
    //
    ssm.validateQuery = function (query) {
        if (query.queryType == 'Raw')
            return ssm.validateQueryRaw(query);
        else
            return ssm.validateQueryCrosstab(query);
    };

    //
    // logicStringValid(query)
    //
    // Returns true or false, indicating whether the custom
    // logic string is valid.
    //
    ssm.logicStringValid = function (query) {
        // TODO: Implement this!
        return true;
    }


    //
    // isNullOrEmpty(s)
    //
    // Returns true of s is null or empty.
    //
    ssm.isNullOrEmpty = function (s) {
        return (s == null || s.toString().trim() == '');
    }



    //
    // validateQueryRaw(query)
    //
    // Validates a raw data query, returning an empty array if the
    // query is valid, or an array of error messages (strings)
    // describing each element of the query that is not valid.
    //
    ssm.validateQueryRaw = function (query) {
        var msgArray = [];
        if (query.outputColumns == null || query.outputColumns.length == 0)
            msgArray.push(ssm.MISSING_OUTPUT_COLS);
        if (query.filterLogicType == 'Custom') {
            if (ssm.isNullOrEmpty(query.filterLogicString))
                msgArray.push(ssm.MISSING_LOGIC_STRING);
            else if (!ssm.logicStringValid(query))
                msgArray.push(ssm.LOGIC_STRING_INVALID);
        }
        return msgArray;
    };



    //
    // validateQueryCrosstab(query)
    //
    // Validates a crosstab query, returning an empty array if the
    // query is valid, or an array of error messages (strings)
    // describing each element of the query that is not valid.
    //
    ssm.validateQueryCrosstab = function (query) {
        var msgArray = [];
        if (ssm.isNullOrEmpty(query.crosstabFunction))
            msgArray.push(ssm.MISSING_CROSSTAB_FN);
        if (ssm.isNullOrEmpty(query.crosstabSubjectVar))
            msgArray.push(ssm.MISSING_CROSSTAB_SUBJECT_VAR);
        if (ssm.isNullOrEmpty(query.crosstabRowVar))
            msgArray.push(ssm.MISSING_CROSSTAB_ROW_VAR);
        if (ssm.isNullOrEmpty(query.crosstabColVar))
            msgArray.push(ssm.MISSING_CROSSTAB_COLUMN_VAR);
        return msgArray;
    };


    //
    // buildQuery()
    // 
    // Builds a representation of the query that we can send to the
    // back end. If any part of the query is not valid, this returns
    // null (so we don't send an invalid query to the back end), and
    // displays an error message describing the problem.
    //
    // The query object this function returns is bound to the UI, and
    // changes to the UI will cause changes to the query attributes.
    //
    // To get a snapshot of the query that will not change even as
    // the user changes the UI, call unboundClone on the object this
    // function returns.
    //
    ssm.buildQuery = function () {
        var query = {};

        // The object being returned is bound to the UI, and will
        // change as the user manipulates the UI.
        query.isBoundToUI = true;

        query.db = ssm.currentDB;
        query.table = ssm.currentTable.Name;
        query.outputColumns = ssm.getAllValues('selected-output-columns');
        query.orderBy = ssm.getAllValues('selected-sort-columns');
        //query.groupBy = ssm.getSelectedColumns('available-group-by-columns');
        query.groupBy = [];
        query.filterLogicType = $('#filter-logic-type').val();
        query.filterLogicString = $('#filter-logic-string').val().trim();
        query.queryType = $('input[name="query-type"]:checked').val();
        query.crosstabFunction = $('#crosstab-function').find(':selected').attr('value');
        query.crosstabSubjectVar = $('#crosstab-var').find(':selected').attr('value');
        query.crosstabRowVar = $('#crosstab-rows').find(':selected').attr('value');
        query.crosstabColVar = $('#crosstab-cols').find(':selected').attr('value');
        query.limit = ssm.resultsBatchSize;
        query.offset = 0;

        // Build the query filters.
        query.filters = [];
        var filters = ssm.getAllFilters();
        for (var i = 0; i < filters.length; i++) {
            var result = filters[i].validate();
            if (result != ssm.VALID) {
                ssm.log("buildQuery(): Filter validation failed. " + ssm.validationMessages[result] + " (Code " + result + ")");
                ssm.displayError("<p>Please correct or remove filter #" + (i + 1) + ": " + ssm.validationMessages[result] + '</p>');
                return null;
            }
            query.filters.push(filters[i].summary());
        }

        // Query vaildation. Note that validateQuery is called
        // when the query is constructed.
        var queryValidationErrors = ssm.validateQuery(query);
        if (queryValidationErrors.length > 0) {
            var errMsg = ssm.buildErrorMessage(queryValidationErrors);
            ssm.log("Query validation failed.");
            ssm.log(errMsg);
            ssm.displayError(errMsg);
            return null;
        }

        // Following functions compare two queries for equality.

        // Check if filters match.
        query.filtersMatch = function (otherQuery) {
            if (query.filters.length != otherQuery.filters.length)
                return false;
            for (var i = 0; i < query.filters.length; i++) {
                var thisFilter = query.filters[i];
                var otherFilter = otherQuery.filters[i];
                var match = (thisFilter.column == otherFilter.column && thisFilter.operator == otherFilter.operator && thisFilter.value == otherFilter.value);
                if (match == false)
                    return false;
            }
            return true;
        };

        // Check whether a set of columns matches.
        query.columnsMatch = function (myColumns, otherColumns) {
            if (myColumns.length != otherColumns.length)
                return false;
            for (var i = 0; i < myColumns.length; i++) {
                if (myColumns[i] != otherColumns[i])
                    return false;
            }
            return true;
        };

        // Check whether the query logic matches.
        // You can have a MatchAny or MatchAll query with a logic string
        // that the user left in, but the logic string will be ignored.
        query.logicMatches = function (otherQuery) {
            if (query.filterLogicType == 'MatchAll' && query.filterLogicType == 'MatchAll')
                return true;
            else if (query.filterLogicType == 'MatchAny' && query.filterLogicType == 'MatchAny')
                return true;
            else // Complex logic                 
                return (query.filterLogicString == otherQuery.filterLogicString);
        };

        // Check to see if query is equal to otherQuery
        query.equals = function (otherQuery) {
            var sameSubject = (query.db == otherQuery.db && query.table == otherQuery.table);
            var sameType = (query.queryType == otherQuery.queryType);
            var sameSlice = (query.offset == otherQuery.offset && query.limit == otherQuery.limit);
            var sameCrosstab = (query.crosstabColVar == otherQuery.crosstabColVar &&
                                query.crosstabFunction == otherQuery.crosstabFunction &&
                                query.crosstabRowVar == otherQuery.crosstabRowVar &&
                                query.crosstabSubjectVar == otherQuery.crosstabSubjectVar);
            var sameFilters = query.filtersMatch(otherQuery);
            var sameLogic = query.logicMatches(otherQuery);
            var sameOutputColumns = query.columnsMatch(query.outputColumns, otherQuery.outputColumns);
            var sameSortColumns = query.columnsMatch(query.orderBy, otherQuery.orderBy);
            if (query.queryType == "Crosstab") {
                return (sameType && sameSubject && sameCrosstab && sameFilters);
            }
            else {
                return (sameType && sameSubject && sameSlice && sameFilters && sameLogic && sameOutputColumns && sameSortColumns);
            }
        };

        // This returns a lightweight representation of the query,
        // with properties only (no functions). The clone is not
        // bound to the UI, and will not be affected by changes to
        // the UI. It's effectively a snapshot of the query's state
        // at a point in time.
        query.unboundClone = function () {
            var clone = JSON.parse(JSON.stringify(query))
            clone.isBoundToUI = false;
            return clone;
        };

        return query;
    }



    //
    // getAllFilters()
    //
    // Returns a list of all the filters currently displayed.
    // Each item in the list is a filter object.
    //
    ssm.getAllFilters = function () {
        var filters = [];
        var ids = ssm.getAllFilterIds();
        for (var i = 0; i < ids.length; i++) {
            filters.push(ssm.getFilter(ids[i]));
        }
        return filters;
    }


    //
    // gridOptions
    //
    // These are the default options for Slick.Grid,
    // which displays our query results.
    // 
    ssm.gridOptions = {
        enableCellNavigation: true,
        enableColumnReorder: true,
        multiColumnSort: false,
        forceFitColumns: false
    };



    // 
    // postQuery()
    //
    // Posts a query to the server. The callback either displays
    // the query results or displays an error message.
    //
    ssm.runQuery = function (query) {
        if (query == null) {
            ssm.log("No query passed in. Building from UI.");
            var boundQueryObject = ssm.buildQuery();
            if (boundQueryObject == null) {
                ssm.log("runQuery(): Nothing to do. buildQuery() returned null.");
                return false;
            }
            query = boundQueryObject.unboundClone();
        }

        ssm.currentQuery = query;
        ssm.log(query);

        // ==============================================
        // TODO: Restore query when user clicks back!
        // ==============================================
        ssm.hashHistory[location.hash] = query;

        $('#msg').hide();
        $('#results-count').hide();
        $('#spinner').show();
        $.post(APP_ROOT_URL + 'Report/RunQuery',
                { "query": JSON.stringify(query) },
                function (data, textStatus, jqXHR) {
                    //ssm.log(data);
                    if (data['status'] == 'OK') {
                        ssm.gridOptions.forceFitColumns = (data.columns != null && data.columns.length <= 10);
                        ssm.gridData = data.results;
                        ssm.resultsTable = new Slick.Grid("#results-table", ssm.gridData, data.columns, ssm.gridOptions);
                        ssm.resultsTable.setSelectionModel(new Slick.RowSelectionModel());
                        $('#results-count').html(data['message']);
                        $('#results-count').show();

                        // For crosstab queries, attach a function to each cell 
                        // that will run a drilldown query.
                        if (query.queryType == "Crosstab") {

                            // We'll need these lists in the cache if user runs a drilldown
                            // query on the crosstab results.
                            ssm.loadListOptions(ssm.currentDB, ssm.currentTable.Name, query.crosstabRowVar, null);
                            ssm.loadListOptions(ssm.currentDB, ssm.currentTable.Name, query.crosstabColVar, null);

                            var originalQuery = null;
                            if (query.isBoundToUI)
                                originalQuery = query.unboundClone();
                            else
                                originalQuery = $.extend(true, {}, query);
                            var colVar = query.crosstabColVar;
                            var rowVar = query.crosstabRowVar;
                            ssm.resultsTable.onClick.subscribe(function (e, args) {
                                // Don't query if user clicked on first cell in row,
                                // because that cell contains a name, not a value
                                // we can query on.
                                if (args.cell == 0) { return; }
                                var valueOfColVar = data.columns[args.cell].field;
                                var valueOfRowVar = ssm.gridData[args.row][rowVar];
                                ssm.drillDown(originalQuery, colVar, valueOfColVar, rowVar, valueOfRowVar);
                            });

                            $.each($('.slick-cell'), function (index, item) {
                                var div = $(item);
                                if (!div.hasClass('l0') && !div.hasClass('r0')) {
                                    div.addClass('clickable');
                                    div.attr('title', 'Click to drill down');
                                }
                            });
                        }

                        if (query.queryType == 'Raw' && data.results.length >= ssm.resultsBatchSize)
                            $('#load-more-rows').show();
                        else
                            $('#load-more-rows').hide();
                    }
                    else {
                        $('#msg-content').html("<p>Error running query: " + data['message']);
                        $('#msg').show();
                    }
                    $('#spinner').hide();
                },
                "json");
        return true;
    };



    ;;;;

    // 
    // exportResults()
    //
    // Posts a query to the server, returns all results in CSV
    // format, which Excel can open.
    //
    ssm.exportResults = function () {
        var boundQueryObject = ssm.buildQuery();
        if (boundQueryObject == null) {
            ssm.log("exportResults(): Nothing to do. buildQuery() returned null.");
            return;
        }

        // boundQueryObject is bound to the current state of
        // the filters UI. We want a light-weight version of
        // this object that is not bound to the UI and will
        // not be affected when the user changes the UI.
        var query = boundQueryObject.unboundClone();

        ssm.currentQuery = query;
        ssm.log(query);
        ssm.hashHistory[location.hash] = query;

        $('#msg').hide();
        $('#results-count').hide();

        var form = $('#queryForm');
        form.action = APP_ROOT_URL + "Report/ExportResults";
        $('#formJsonData').val(JSON.stringify(query));
        form.submit();
    };


    //
    // drillDown()
    //
    // Runs a drilldown query, showing the results in a new window.
    // When a user sees crosstab results, he can click on a number
    // in the results grid to "drill down" and see the raw data 
    // behind the number he clicked on.
    //
    ssm.drillDown = function (originalQuery, colVar, valueOfColVar, rowVar, valueOfRowVar) {

        // Param originalQuery is a snapshot of the query the user
        // defined to produce the crosstab results.
        // We have to clone this object, because because
        // we're going to alter it, and we don't want
        // to apply those changes to the snapshot, which
        // persists in the callback closure. jQuery's extend
        // function returns a clone of whatever you pass into it.
        var drillDownQuery = null;
        drillDownQuery = $.extend(true, {}, originalQuery);
        drillDownQuery.queryType = "Raw";

        // Crosstab query has no output columns defined.
        // So add the minimum set that makes sense.
        // Don't add any columns more than once, or you'll get a SQL error.
        var alreadyAdded = {};
        for (var i = 0; i < ssm.currentTable.ColumnDescriptors.length; i++) {
            var col = ssm.currentTable.ColumnDescriptors[i].Name;
            if (alreadyAdded[col])
                continue;
            drillDownQuery.outputColumns.push(col);
            alreadyAdded[col] = true;
        }


        // Add rowvar and colvar to filters
        // Post to new window.
        var filterCount = drillDownQuery.filters.length
        if (drillDownQuery.filterLogicType == 'MatchAll')
            drillDownQuery.filterLogicString = ssm.buildLogicString(filterCount, 'AND');
        else if (drillDownQuery.filterLogicType == 'MatchAny')
            drillDownQuery.filterLogicString = ssm.buildLogicString(filterCount, 'OR');

        // We're adding conditions to the logic string, 
        // which may result in a mix of and and or, so 
        // we have to set filterLogicType to Custom.
        drillDownQuery.filterLogicType = "Custom";

        var filterIncrement = 1;
        var originalLogic = drillDownQuery.filterLogicString.trim();
        var additionalLogic = "";
        if (valueOfColVar != "Roll Up") {
            additionalLogic += " AND " + (filterCount + filterIncrement);
            drillDownQuery.filters.push({ column: colVar, operator: 'Equals', value: valueOfColVar });
            filterIncrement += 1;
        }
        if (valueOfRowVar != "Roll Up") {
            additionalLogic += " AND " + (filterCount + filterIncrement);
            drillDownQuery.filters.push({ column: rowVar, operator: 'Equals', value: valueOfRowVar });
        }
        if (originalLogic == "")
            drillDownQuery.filterLogicString = additionalLogic.replace(/^ AND /, '');
        else
            drillDownQuery.filterLogicString = "(" + originalLogic + ") " + additionalLogic;

        ssm.log("Original")
        ssm.log(originalQuery);
        ssm.log("Drilldown")
        ssm.log(drillDownQuery);

        // Open a new window. Load the drilldown query in that window & run it.
        var drillDownWindow = window.open(window.location);


        ssm.tryRepeatedly(function () {
            ssm.log("In function");
            if (drillDownWindow.ssmReporting.initialized) {
                ssm.log("Reporting initialized");
                // Pre-load some items, for speed/responsiveness
                // TODO: Object.keys does not work in IE <= 8.
                if (Object.keys(drillDownWindow.ssmReporting.listOptionsCache).length == 0) {
                    drillDownWindow.ssmReporting.currentDB = ssm.currentDB;
                    drillDownWindow.ssmReporting.currentTable = $.extend(true, {}, ssm.currentTable);
                    drillDownWindow.ssmReporting.listOptionsCache = $.extend(true, {}, ssm.listOptionsCache);
                }
                if (drillDownWindow.ssmReporting.loadQuery(drillDownQuery)) {
                    ssm.log("Query loaded");
                    drillDownWindow.ssmReporting.runQuery(drillDownQuery);
                    return true;
                }
            }
            return false;
        }, 200, 20);

        return drillDownWindow;
    };



    //
    // ssm.tryRepeatedly()
    //
    // Tries to execute function fn every interval milliseconds,
    // up to maxTries times. The function must return true when it
    // has managed to execute, or it will continue to execute
    // repeatedly until maxTries is reached!
    ssm.tryRepeatedly = function (fn, interval, maxTries) {
        var tries = 0;
        var timer = setInterval(function () {
            ssm.log("Try #" + tries);
            if (fn()) { clearInterval(timer); } 
            if (tries++ >= maxTries) { clearInterval(timer); }
        }, interval);
    }



    //
    // buildLogicString()
    //
    // Constructs the logic string for MatchAll
    // and MatchAny logic types.
    //
    ssm.buildLogicString = function (filterCount, operator) {
        if (filterCount == 0)
            return "";
        var string = "(";
        for (var i = 1; i <= filterCount; i++) {
            string += i.toString(10);
            if (i != filterCount)
                string += " " + operator + " ";
        }
        string += ")";
        return string;
    };



    //
    // toggleHeaderText(element)
    //
    // Change the text in one of the query header bars.
    // These are the blue header bars that expand/collapse
    // content such as the filters, sort columns, etc.
    //
    ssm.toggleHeaderText = function (element) {
		$(element).text(ssm.toggleText(element.text(), '+', '-'));
	};



    //
    // toggleShowHideTitle(element)
    //
    // Change the tile in one of the query header bars
    // to read either 'show' or 'hide' content.
    //
	ssm.toggleShowHideTitle = function (element) {
		$(element).attr('title', (ssm.toggleText(element.attr('title'), 'show', 'hide')));
	};



    //
    // toggleText(str, substr1, substr2)
    //
    // Swap substr1 and substr2 in str. Replaces whichever
    // substring is present with the other substring.
    //
	ssm.toggleText = function (str, substr1, substr2) {
		if (str.indexOf(substr1) > -1) return str.replace(substr1, substr2);
		return str.replace(substr2, substr1);
	};



    //
    // getCheckedValues(elementId)
    //
    // Returns a list of selected checkbox values within
    // the element specified by elementId.
    //
	ssm.getCheckedValues = function (elementId) {
	    var inputs = $('#' + elementId + ' input:checked'); 
	    var values = [];
	    for (var i = 0; i < inputs.length; i++) {
	        values.push($(inputs[i]).attr('value'));
	    }
	    return values;
	};




    //
    // getAggregateTypeColumns()
    //
    // Returns a list of columns in the current table that support
    // SQL aggregate functions. These include columns with UIDataTypes:
    // 
    // 1 - Integer
    // 2 - Float
    //
	ssm.getAggregateTypeColumns = function () {
	    var colDescs = [];
	    for (var i = 0; i < ssm.currentTable.ColumnDescriptors.length; i++) {
	        var colDesc = ssm.currentTable.ColumnDescriptors[i];
	        if (colDesc.SupportsAggregateFunctions && colDesc.DisplayInFilters) { colDescs.push(colDesc); }
	    }
	    return colDescs;
	};




	//
	// removeAllOptions()
	//
	// Removes all options from the <select> list with
	// the specified id. Note that listId is an ID, not
	// a CSS selector.
    //
	ssm.removeAllOptions = function (listId) {
	    var listOpts = document.getElementById(listId).options || [];
	    while (listOpts.length > 0) {
	        $(listOpts[0]).remove();
	    }
	};


	//
	// removeOptions()
	//
	// Removes the specified list options from the DOM.
    //
	ssm.removeOptions = function (optionsToRemove) {
	    while (options.length > 0) {
	        $(options[0]).remove();
	    }
	};



	//
	// getSelectedOptions(listId)
	//
	// Returns a list of the selected options in the
	// <select> list with the specified ID. This is 
	// useful in multi-select lists, where a user might
	// select many items. Returns a list of <option> 
    // objects, from which you can get the value and label.
    //
	ssm.getSelectedOptions = function (listId) {
	    // jQuery :selected causes Chrome to hang,
	    // so we're doing this the old-fashioned way
	    var listOptions = $('#' + listId).prop('options');
	    var options = [];
	    for (var i = 0; i < listOptions.length; i++) {
	        if (listOptions[i].selected) {
	            options.push(listOptions[i]);
	        }
	    }
	    return options;
	};



	//
	// getAllOptions()
    //
	// Returns a COPY of all the options in a select list.
	// This avoids some iteration problems when moving list options.
    //
	ssm.getAllOptions = function (listId) {
	    var allOpts = document.getElementById(listId).options;
	    var options = [];
	    for (var i = 0; i < allOpts.length; i++) {
	        options.push(allOpts[i]);
	    }
	    return options;
	};



	//
	// getAllValues()
	//
	// Returns a list of all of the option values
	// in a <select> list. The return value is a 
    // list of strings.
    //
	ssm.getAllValues = function (listId) {
	    var options = ssm.getAllOptions(listId);
	    var values = [];
	    $.each(options, function (index, option) {
	        values.push($(option).attr('value'));
	    });
	    return values;
	};




	//
	// getSelectedValues()
	//
	// Returns a list of all of the SELECTED option values
	// in a <select> list. The return value is a 
	// list of strings.
	//
	ssm.getSelectedValues = function (listId) {
	    var options = ssm.getSelectedOptions(listId);
	    var values = [];
	    $.each(options, function (index, option) {
	        values.push($(option).attr('value'));
	    });
	    return values;
	};




	//
	// appendOptionsToList(targetList, options)
	//
	// Appends all of the options in param options to 
	// targetList. Param options should be a list of 
	// <option> objects. Param targetList should be a
	// <select> object. Note that if options currently
	// belong to some other list, they will be deleted
	// from the original list when they are added to the
	// new list. This is the default behavior of the DOM,
	// in which <option> objects can belong only to a 
	// single <select> parent. If you want the options
	// to be present in both lists, append a copy of options
    // to targetList.
    //
	ssm.appendOptionsToList = function (targetList, options) {
	    for (var i = 0; i < options.length; i++) {
	        var option = options[i];
	        if ($.browser.msie) {
	            option = new Option(options[i].text, options[i].value);
	            options[i].parentNode.removeChild(options[i]);
	        }
	        targetList.options.add(option);
	        option.selected = false;
	    }
	};


	//
	// moveAllListItems(fromListId, toListId)
	//
	// Move all the options in fromList over to toList.
	// The options will be deleted from fromList as they
	// are added to toList. The params fromListId and
	// toListId are IDs, not CSS selectors.
    //
	ssm.moveAllListItems = function (fromListId, toListId) {
	    var targetList = document.getElementById(toListId);
	    var optionsToMove = ssm.getAllOptions(fromListId);
	    ssm.appendOptionsToList(targetList, optionsToMove);
	};



	//
	// moveSelectedListItems(fromListId, toListId)
	//
	// Move all the SELECTED options in fromList over to toList.
	// The options will be deleted from fromList as they
	// are added to toList. The params fromListId and
	// toListId are IDs, not CSS selectors.
	//
	ssm.moveSelectedListItems = function (fromListId, toListId) {
	    var targetList = document.getElementById(toListId);
	    var optionsToMove = ssm.getSelectedOptions(fromListId);
	    ssm.appendOptionsToList(targetList, optionsToMove);
	};



	//
	// reorderItemUp(item)
	//
	// Moves an option in a select list up one position,
	// unless it's already in the top position. Param
    // item is an <option> object.
    //
	ssm.reorderItemUp = function (item) {
	    var priorOption = $(item).prev('option')
	    if (priorOption != null && priorOption.length > 0) {
	        priorOption.before(item);
	    }
	    else {
	        $(item).removeAttr("selected");
	    }
	};



	//
	// reorderItemDown(item)
	//
	// Moves an option in a select list down one position,
	// unless it's already in the last position. Param
	// item is an <option> object.
	//
	ssm.reorderItemDown = function (item) {
	    var nextOption = $(item).next('option')
	    if (nextOption != null && nextOption.length > 0) {
	        nextOption.after(item);
	    }
	    else {
	        $(item).removeAttr("selected");
	    }
	};




	//
	// reorderItems(listId, direction)
	//
	// Moves all of the selected options in the <select> list
	// up or down one space. Param listId is the id of the 
	// <select> list to work on. Param direction should be
    // either "up" or "down".
    //
	ssm.reorderItems = function (listId, direction) {
	    var fn = (direction == 'up' ? ssm.reorderItemUp : ssm.reorderItemDown);
	    var selectedItems = ssm.getSelectedOptions(listId);
	    for (var i = 0; i < selectedItems.length; i++) {
	        fn(selectedItems[i]);
	    }
	};




	//
	// showRawQueryUI()
	//
	// Displays the UI for building raw data queries.
    //
	ssm.showRawQueryUI = function () {
        $('#result-columns-container').show();
        $('#sort-columns-container').show();
        $('#crosstab-container').hide();
	};



    //
    // showCrosstabQueryUI()
    //
    // Displays the UI for building crosstab queries.
    //
	ssm.showCrosstabQueryUI = function () {
        $('#result-columns-container').hide();
        $('#sort-columns-container').hide();
        $('#crosstab-container').show();
	};




    //
    // showAppropriateQueryUI()
    //
    // Displays either the Raw or Crosstab query UI, 
    // based on the current value of the 'query-type' radio.
    //
	ssm.showAppropriateQueryUI = function () {
	    var queryType = $('input[name="query-type"]:checked').val() || "Raw";
	    if (queryType == "Raw") {
	        ssm.showRawQueryUI();
	    }
	    else {
	        ssm.showCrosstabQueryUI();
	    }
	};


	//
	// countOptions
	//
	// Options to show in the Crosstab Var <select> list
	// when user selects Count as the crosstab function.
    //
	ssm.countOptions = [{ Label: 'All Matching Records', Value: '*'}];



	//
	// numericColumnOptions()
	// 
	// Returns a list of numeric columns to be displayed
	// when user selects a crosstab function that works
	// on numeric columns (e.g. Min, Max, Avg, Sum).
	// These are objects with Label and Value properties
    // which ssm.resetListOptions understands.
	ssm.numericColumnOptions = function () {
	    var options = [];
	    var aggragateColumnDescriptors = ssm.getAggregateTypeColumns();
	    for (var i = 0; i < aggragateColumnDescriptors.length; i++) {
	        var colDesc = aggragateColumnDescriptors[i];
	        options.push({ Label: colDesc.DisplayName, Value: colDesc.Name });
	    }
	    return options;
	};


    //
    // initQueryUI()
    //
    // Sets up form controls and binds callbacks
    // to the query UI elements so user can build a query.
    //
	ssm.initQueryUI = function () {

	    // ------------------------------------------------------
	    // Get rid of old messages
	    // ------------------------------------------------------	

	    $('#results-count').hide();
	    $('#msg').hide();


	    // ------------------------------------------------------
	    // Set the header bars to show/hide content
	    // ------------------------------------------------------	

	    $('#filters-header-bar').click(function () {
	        $('#filter-container').slideToggle('slow');
	        ssm.toggleHeaderText($('#filters-header-bar'));
	        ssm.toggleShowHideTitle($('#filters-header-bar'));
	    });
	    $('#result-columns-header-bar').click(function () {
	        $('#result-columns').slideToggle('slow');
	        ssm.toggleHeaderText($('#result-columns-header-bar'));
	        ssm.toggleShowHideTitle($('#result-columns-header-bar'));
	    });
	    $('#sort-columns-header-bar').click(function () {
	        $('#sort-columns').slideToggle('slow');
	        ssm.toggleHeaderText($('#sort-columns-header-bar'));
	        ssm.toggleShowHideTitle($('#sort-columns-header-bar'));
	    });
	    $('#crosstab-header-bar').click(function () {
	        $('#crosstab-vars').slideToggle('slow');
	        ssm.toggleHeaderText($('#crosstab-header-bar'));
	        ssm.toggleShowHideTitle($('#crosstab-header-bar'));
	    });

	    // ------------------------------------------------------
	    // Show/Hide group by columns based on query type
	    // ------------------------------------------------------

	    $('#crosstab-function').change(function () {
	        var ctFunc = $('#crosstab-function').find(':selected').attr('value');
	        switch (ctFunc) {
	            case 'Sum':
	            case 'Average':
	            case 'Min':
	            case 'Max':
	            case 'StdDevSample':
	            case 'StdDevPop':
	                var ctVarOpts = $('#crosstab-var').prop('options');
	                if (ctVarOpts != null && ctVarOpts.length > 0 && ctVarOpts[1].value == '*')
	                    ssm.resetListOptions('crosstab-var', ssm.numericColumnOptions());
	                break;
	            default:
	                ssm.resetListOptions('crosstab-var', ssm.countOptions);
	                break;
	        }
	    });


	    $('#output-move-all-right').click(function () {
	        ssm.moveAllListItems('available-output-columns', 'selected-output-columns');
	    });
	    $('#output-move-all-left').click(function () {
	        ssm.moveAllListItems('selected-output-columns', 'available-output-columns');
	    });
	    $('#output-move-selected-right').click(function () {
	        ssm.moveSelectedListItems('available-output-columns', 'selected-output-columns');
	    });
	    $('#output-move-selected-left').click(function () {
	        ssm.moveSelectedListItems('selected-output-columns', 'available-output-columns');
	    });
	    $('#output-move-up').click(function () {
	        ssm.reorderItems('selected-output-columns', 'up');
	    });
	    $('#output-move-down').click(function () {
	        ssm.reorderItems('selected-output-columns', 'down');
	    });


	    $('#sort-move-all-right').click(function () {
	        ssm.moveAllListItems('available-sort-columns', 'selected-sort-columns');
	    });
	    $('#sort-move-all-left').click(function () {
	        ssm.moveAllListItems('selected-sort-columns', 'available-sort-columns');
	    });
	    $('#sort-move-selected-right').click(function () {
	        ssm.moveSelectedListItems('available-sort-columns', 'selected-sort-columns');
	    });
	    $('#sort-move-selected-left').click(function () {
	        ssm.moveSelectedListItems('selected-sort-columns', 'available-sort-columns');
	    });
	    $('#sort-move-up').click(function () {
	        ssm.reorderItems('selected-sort-columns', 'up');
	    });
	    $('#sort-move-down').click(function () {
	        ssm.reorderItems('selected-sort-columns', 'down');
	    });



	    // ------------------------------------------------------
	    // Misc
	    // ------------------------------------------------------

	    $('#add-filter-button').click(ssm.addFilter);
	    $('#run-query-button').click(function () { ssm.runQuery(null); });
	    $('#save-query-button').click(ssmReporting.prepareToSaveQuery);
	    $('#export-results-button').click(ssm.exportResults);

	    if (ssm.eventsAttached == false) {
	        $('#btn-load-more-rows').click(ssm.loadNextBatch);
	        ssm.eventsAttached = true;
	    }

	    $('input[name="query-type"]').change(function () {
	        ssm.showAppropriateQueryUI();
	    });


	    // Start with at least one filter
	    if ($('.filter').length == 0)
	        ssm.addFilter();

	};




	//
	// loadNextBatch()
	//
	// Loads the next batch of up to ssm.resultsBatchSize records into the
    // data grid. 
    //
	ssm.loadNextBatch = function () {
	    ssm.log("Loading next batch...");
	    if (ssm.currentQuery == null) {
	        ssm.displayError("<p>Cannot load more rows. No query specified.</p>", null);
	    }
	    ssm.currentQuery.offset += ssm.resultsBatchSize;
	    //console.log(ssm.currentQuery);
	    $.post(APP_ROOT_URL + 'Report/RunQuery',
               { "query": JSON.stringify(ssm.currentQuery) },
               function (data, textStatus, jqXHR) {
                   //ssm.log(data);
                   if (data['status'] == 'OK') {
                       // Append the new results to the data grid.
                       for (var i = 0; i < data.results.length; i++) {
                           ssm.gridData.push(data.results[i]);
                       }
                       ssm.resultsTable.updateRowCount();
                       ssm.resultsTable.render();
                       if (data.results.length < ssm.resultsBatchSize) {
                           // There's no data left to load.
                           $('#load-more-rows').hide();
                       }
                   }
                   else {
                       $('#msg-content').html("<p>Error running query: " + data['message']);
                       $('#msg').show();
                   }
                   $('#spinner').hide();
               },
               "json");

	    return true;
	};



    //
    // initAjaxErrorHandler()
    //
    // Sets up the AJAX error handler and the div to display
    // error messages.
    //
	ssm.initAjaxErrorHandler = function () {
	    $("#message-container").ajaxError(function (event, request, settings, err) {
	        ssm.displayError('<p>Error requesting page ' + settings.url + ': ' + err + '</p>');
	    });
	};


	//
	// initAjaxRedirectHandler()
	//
	// Sets up an AJAX handler to deal with redirects.
    // A redirect means the user's session has timed out.
	//
	ssm.initAjaxRedirectHandler = function () {
	    $('body').ajaxComplete(function (e, xhr, settings) {
	        ssm.log(xhr);
	        var location = xhr.getResponseHeader("Location");
	        ssm.log("Status = " + xhr.status);
	        ssm.log("Location = " + location);
	        if (xhr.status == 200 && xhr.responseText.indexOf("\r\n<!DOCTYPE html>") == 0) {
	            ssm.log(APP_ROOT_URL + "/Login");
	            window.location = APP_ROOT_URL + "/Login?message=Your+session+has+expired.";
	        }
	    });
	};



	//
	// loadQuery(query)
	//
	// Loads a pre-defined query into the UI.
    //
	ssm.loadQuery = function (query) {
	    if (query.queryType == "Raw") {
	        $('input[name="query-type"][value="Raw"]').click();
	        return ssm.loadRawQuery(query);
	    }
	    else if (query.queryType == "Crosstab") {
	        $('input[name="query-type"][value="Crosstab"]').click();
	        return ssm.loadCrosstabQuery(query);
	    }
	    else {
	        ssm.log("Can't load query when queryType = '" + query.queryType + "'");
	    }
	    return false;
	};



	//
	// loadRawQuery(query)
	//
	// Loads a pre-defined raw data query into the UI.
    // Returns true/false to indicate whether query loaded 
    // successfully.
	//
	ssm.loadRawQuery = function (query) {
	    if (!ssm.queryIsLoadable(query))
	        return false;
	    ssm.loadFilters(query.filters);
	    ssm.loadFilterLogic(query.filterLogicType, query.filterLogicString);
	    ssm.loadOutputColumns(query.outputColumns);
	    ssm.loadSortColumns(query.orderBy);
	    return true;
	};



	//
	// loadCrosstabQuery(query)
	//
	// Loads a pre-defined crosstab query into the UI.
    // Returns true/false to indicate whether query loaded 
    // successfully.
	//
	ssm.loadCrosstabQuery = function (query) {
	    if (!ssm.queryIsLoadable(query))
	        return false;
	    ssm.loadFilters(query.filters);
	    ssm.loadFilterLogic(query.filterLogicType, query.filterLogicString);
	    ssm.loadCrosstabVars(query.crosstabFunction, query.crosstabSubjectVar, query.crosstabRowVar, query.crosstabColVar);
	    return true;
	};




	//
	// loadFilterLogic
	//
	// Loads the filter logic type and string from query
	// into the UI.
    //
	ssm.loadFilterLogic = function (filterLogicType, filterLogicString) {
	    ssm.log("Setting logic type to: " + filterLogicType);
	    $('#filter-logic-type').val(filterLogicType);
	    $('#filter-logic-string').val(filterLogicString);
	};



	//
	// loadFilters(query)
	//
	// Loads the filters defined in query into the UI.
    //
	ssm.loadFilters = function (filters) {
	    var filterDivs = $('.filter');
	    for (var i = 0; i < filterDivs.length; i++)
	        $(filterDivs[i]).remove();
	    for (var i = 0; i < filters.length; i++)
	        ssm.loadFilter(filters[i]);
	    return true;
	};


	//
	// loadFilter(filter)
	//
	// Loads a single filter into the UI.
	// Note that the filter object in param <filter> is different
	// from the one returned by getFilter(filterId). The filter
	// param here is just a hash with three properties:
	// column, operator and value. It does not have all the
	// methods of the filter object returned by getFilter() because
    // it is not yet tied to the UI.
	//
	ssm.loadFilter = function (filter) {
	    var filterId = ssm.addFilter();

	    // Load the new filter we just created with addFilter().
	    // We're loading a filter object here that is tied to
	    // the new filter controls we just created in the UI.
	    // We can access and manipulate those UI controls through
	    // this newFilter object.
	    var newFilter = ssm.getFilter(filterId);

	    // Assign the values from the filter into the UI elements
	    // of newFilter, and fire the change events on those UI objects.
	    // columnList changes causes UI to load value options from the server.
	    $(newFilter.columnList()).val(filter.column);
	    $(newFilter.columnList()).change();

	    $(newFilter.operatorList()).val(filter.operator);
	    $(newFilter.operatorList()).change();

	    ssm.tryRepeatedly(function () {
	        if (filter.operator == 'IsAnyOf') {
	            var valueDiv = newFilter.valueDiv();
	            var cbSelector = 'input[name="val-' + filterId + '"]';
	            var checkboxes = $(cbSelector);
	            var somethingChecked = false;
	            for (var i = 0; i < filter.value.length; i++) {
	                for (var j = 0; j < checkboxes.length; j++) {
	                    if (checkboxes[j].value == filter.value[i]) {
	                        checkboxes[j].checked = true;
	                        somethingChecked = true;
	                    }
	                }
	            }
	            return (checkboxes.length > 0 && somethingChecked);
	        }
	        else {
	            //ssm.log("Trying to set filter value to " + filter.value);
	            $(newFilter.valueControl()).val(filter.value);
	            return ($(newFilter.valueControl()).val() == filter.value);
	        }
	    }, 250, 10);
	    return true;
	};


	//
	// loadOutputColumns(query)
	//
	// Loads the output columns defined in query into the UI.
	//
	ssm.loadOutputColumns = function (outputColumns) {
	    return ssm.loadSelectedCols(outputColumns, 'output');
	};


	//
	// loadSortColumns(query)
	//
	// Loads the sort columns defined in query into the UI.
	//
	ssm.loadSortColumns = function (sortColumns) {
	    return ssm.loadSelectedCols(sortColumns, 'sort');
	};


	//
	// loadSelectedCols()
	//
	// Moves the selected columns from the left (available)
	// column list to the right (selected) column list. This
    // is used for loading pre-defined queries.
    //
	ssm.loadSelectedCols = function (cols, which) {
	    var available = 'available-' + which + '-columns';
	    var selected = 'selected-' + which + '-columns';
	    var selectedOpts = {};
	    for (var i = 0; i < cols.length; i++) {
	        selectedOpts[cols[i]] = true;
	    }
	    ssm.moveAllListItems(selected, available);
	    var availableOpts = ssm.getAllOptions(available);
	    for (var i = 0; i < availableOpts.length; i++) {
	        if (selectedOpts[availableOpts[i].value]) {
	            availableOpts[i].selected = true;
	        }
	    }
	    ssm.moveSelectedListItems(available, selected);
	    return true;
	};



	//
	// loadCrosstabVars(query)
	//
	// Loads the crosstab vars defined in query into the UI.
	//
	ssm.loadCrosstabVars = function (crosstabFunction, crosstabSubjectVar, crosstabRowVar, crosstabColVar) {
	    $('#crosstab-function').val(crosstabFunction);
	    $('#crosstab-function').change();
	    setTimeout(function () {
	        $('#crosstab-var').val(crosstabSubjectVar);
	        $('#crosstab-rows').val(crosstabRowVar);
	        $('#crosstab-cols').val(crosstabColVar);
	    }, 250);
	    return true;
	};    



	//
	// queryIsLoadable(query)
	//
	// Returns true or false, indicating whether query
    // can be loaded into the current UI.
	//
	ssm.queryIsLoadable = function (query) {
	    if (ssm.currentDB == null || ssm.currentTable == null) {
	        ssm.log("Can't load query because current db or table is null.");
	        return false;
	    }
	    if (query.db != ssm.currentDB || query.table != ssm.currentTable.Name) {
	        ssm.log("Can't load query for " + query.db + "." + query.table + " because current db/table is " + ssm.currentDB + "." + ssm.currentTable.Name);
	        return false;
	    }
	    return true;
	};


	//
	// showDataReload()
	// 
	// Display the data reload UI.
    //
	ssm.showDataReload = function () {
	    $(function () {
	        $("#admin-menu").click(); // hide admin menu
	        //ssm.setActiveMenuItem('nav-item-admin');
	        $("#dialog-reload").dialog({
	            resizable: false,
	            height: 325,
	            modal: true,
	            buttons: {
	                Submit: ssm.runDataReload,
	                Cancel: function () {
	                    $(this).dialog("close");
	                }
	            }
	        });
	    });
	}



	//
	// runDataReload()
	//
	// Ask the back end to run the data reload.
    //
	ssm.runDataReload = function () {
	    var password = $('#data-reload-password').val();
	    var db = ssm.currentDB;
	    if (ssm.isNullOrEmpty(db)) {
	        ssm.displayError("<p>Cannot reload data because no database is selected.</p>");
	        return false;
	    }
	    $('#data-is-reloading').show();
	    $('#data-reload-password').val(''); // Clear password, or it stays for duration of session!
	    $.post(APP_ROOT_URL + 'Admin/ReloadData',
                { "password": password, "db": db },
                function (data, textStatus, jqXHR) {
                    $('#data-is-reloading').hide();
                    $("#dialog-reload").dialog('close');
                    if (data['status'] == 'OK')
                        ssm.displaySuccess(data['message']);
                    else
                        ssm.displayError(data['message']);
                },
                'json');
	};


    //
    // prepareToSaveQuery()
    //
    // Figures out what to show when the user 
    // clicks the "Save Query" button.
    //
	ssm.prepareToSaveQuery = function () {
	    // If user has loaded a saved query and is still working
	    // with the same db and table as that of the saved query,
	    // ask if they want to edit that query or save a new one.
	    if (ssm.savedQuery != null &&
             ssm.savedQuery.query.db == ssm.currentDB &&
             ssm.savedQuery.query.table == ssm.currentTable.Name) {
	        ssm.showCreateOrEditDialog();
	    }
	    else {
	        // User did not load a saved query or they are working
	        // with a different DB and table. Save this as a new query.
	        $('#save-query-form')[0].reset();
	        ssm.log($('#save-query-form')[0].reset);
	        ssm.showQuerySaveDialog();
	    }
	};


    //
    // showQuerySaveDialog()
    // 
    // Display the dialog for creating/editing saved queries.
    //
	ssm.showQuerySaveDialog = function () {
	    $("#dialog-save-query").dialog({
	        resizable: false,
	        height: 420,
	        width: 400,
	        modal: true,
	        buttons: {
	            "Save Query": ssm.saveQuery,
	            Cancel: function () {
	                $(this).dialog("close");
	            }
	        }
	    });
	};




	//
	// showCreateOrEditDialog()
	// 
	// Displays a dialog asking whether the user wants
	// to edit the recently-loaded saved query or save
    // an entirely new query.
	//
	ssm.showCreateOrEditDialog = function () {
	    $('#saved-query-name').html(ssm.savedQuery.name);
	    $("#dialog-create-or-edit").dialog({
	        resizable: false,
	        height: 240,
	        width: 460,
	        modal: true,
	        buttons: {
	            "Edit Existing": function () {
	                $(this).dialog("close");
	                ssm.loadSavedQueryIntoForm(ssm.savedQuery);
	                ssm.showQuerySaveDialog();
	            },
	            "Save as New Query": function () {
	                $('#save-query-form')[0].reset();
	                $(this).dialog("close");
	                ssm.showQuerySaveDialog();
	            },
	            Cancel: function () {
	                $(this).dialog("close");
	            }
	        }
	    });
	};


	//
	// saveQuery()
	//
	// Saves the query currently defined in the UI.
    //
	ssm.saveQuery = function () {
	    if ($('#savedQueryName').val().trim() == "") {
	        alert("Please specify a name for this query.");
	        return false;
	    }
	    var query = ssm.buildQuery();
	    if (query == null) {
	        alert($('#msg').text());
	        return false;
	    }

	    // Add a JSON representation of the query to the form.
	    var unboundQuery = query.unboundClone();
	    $('#savedQueryJson').val(JSON.stringify(unboundQuery));
	    $('#savedQueryDb').val(query.db);

	    // Determine if we're creating a new saved query, or editing an existing one.
	    var postUrl = APP_ROOT_URL + 'SavedQuery/Create';
	    var savedQueryId = $('#savedQueryId').val().trim();
	    if (savedQueryId != "")
	        postUrl = APP_ROOT_URL + 'SavedQuery/Edit/' + savedQueryId;

	    var formData = $("#save-query-form").serialize()

	    $.post(postUrl, formData,
                function (data, textStatus, jqXHR) {
                    $("#dialog-save-query").dialog('close');
                    if (data['status'] == 'OK') {
                        ssm.displaySuccess(data['message']);
                        ssm.savedQuery = data['data'];
                    }
                    else
                        ssm.displayError(data['message']);
                },
                'json');
	};



	//
	// listSavedQueries()
	//
	// Displays a list of saved queries that belong
	// to the current user or are shared with the
	// current user.
	//
    ssm.listSavedQueries = function () {
        ssm.setActiveMenuItem('nav-item-queries');
	    $('#query-menu').click(); // force menu to close
	    var url = APP_ROOT_URL + "SavedQuery/Index/" + ssm.currentDB;
	    $.getJSON(url, function (data, textStatus, jqXHR) {
	        if (data['status'] == 'OK') {
	            var html = '';
	            var queries = data['data'];
	            // TODO: Move this to a template.
	            for (var i = 0; i < queries.length; i++) {
	                html += '<div class="saved-query-display" id="sq-' + queries[i].id + '">';
	                html += '<div class="saved-query-run-link">';
	                if (queries[i].userIsOwner) {
	                    html += '<span class="ui-icon ui-icon-closethick little-delete-icon" id="delete-query-' + queries[i].id + '" title="Delete this query">&nbsp;</span>';
	                }
	                else {
	                    html += '<span style="width:30px">&nbsp;</span>';
	                }
	                html += '<a href="javascript:void(0);" id="saved-query-' + queries[i].id + '" title="Run this query">' + queries[i].name + '</a></div>';
	                html += '<div class="saved-query-description">' + queries[i].description + '</div>';
	                html += '</div>';
	            }
	            // Add to DOM, then attach events.
                // Note that "queries" contains SavedQuery objects with the following properties:
                // id - The saved query Id (UUID)
                // name - The name of the saved query
                // description - Description of saved query
                // isShared - True if query is shared
                // userIsOwner - True if current user ownse this query
                // query - The actual query, with db, table, filters, outputColumns, orderBy, etc.
	            $('#list-of-saved-queries').html(html);
	            for (var i = 0; i < queries.length; i++) {
	                var runLinkSelector = '#saved-query-' + queries[i].id;
	                var query = queries[i].query;

	                // Callbacks for running and deleting saved queries
	                // have to build outside the scope of this for loop.
	                // Otherwise, all of the callbacks get tied to the
	                // the last value of queries[i] (the last query in 
                    // the collection.
                    var runSavedQueryCallback = ssm.buildRunSavedQueryCallback(queries[i]);
	                $(runLinkSelector).click(runSavedQueryCallback);
	                var deleteSavedQueryCallback = ssm.buildDeleteQueryCallback(queries[i].id, queries[i].name);
	                var deleteLinkSelector = '#delete-query-' + queries[i].id;
	                $(deleteLinkSelector).click(deleteSavedQueryCallback);
	            }
	            ssm.showSavedQueriesDialog();
	        }
	        else {
	            ssm.displayError(data['message']);
	        }
	    });
	};



	//
	// buildRunSavedQueryCallback()
	//
	// Returns a function to be used as the callback
	// for running a saved query.
	//
	ssm.buildRunSavedQueryCallback = function (savedQuery) {        
	    return function () {
	        $("#dialog-saved-queries").dialog('close');
	        // Load info for the right table, then run the query
	        ssm.savedQuery = savedQuery;
	        $.when(ssm.loadDBDefinition(savedQuery.query.db),
                   ssm.loadTableDefinition(savedQuery.query.db, savedQuery.query.table)).
              then(function () { ssm.runQuery(savedQuery.query); ssm.loadQuery(savedQuery.query); });
	    };
	};




	// loadSavedQueryIntoForm()
	//
	// Loads a saved query into the form for
	// saving and editing saved queries. Does
    // not set the actual query JSON, since that
    // will be overwritten when user clicks save.
    //
	ssm.loadSavedQueryIntoForm = function (savedQuery) {
	    ssm.log("Saved query follows");
	    ssm.log(savedQuery);
	    $('#savedQueryId').val(savedQuery.id);
	    $('#savedQueryUserIsOwner').val(savedQuery.userIsOwner);
	    $('#savedQueryName').val(savedQuery.name);
	    $('#savedQueryDescription').val(savedQuery.description);
	    $('#savedQueryIsShared').prop("checked", savedQuery.isShared);

	    // DB and Table are important for state on the front end,
	    // but are ignored on the back end.
	    $('#savedQueryDb').val(savedQuery.query.db);
	    $('#savedQueryTable').val(savedQuery.query.table);
	};


	//
	// buildDeleteQueryCallback()
	//
	// Returns a function to be used as the callback
	// for deleting a saved query.
    //
	ssm.buildDeleteQueryCallback = function (queryId, queryName) {
	    return function () {
            if(confirm("Do you want to delete the saved query " + queryName + "?"))
    	        ssm.deleteSavedQuery(queryId); 
        };
	};



	//
	// showSavedQueriesDialog()
	//
	// Displays a dialog that lists all of a user's
	// saved queries.
    //
	ssm.showSavedQueriesDialog = function () {
	    $("#dialog-saved-queries").dialog({
	        resizable: false,
	        height: 500,
	        width: 650,
	        modal: true,
	        buttons: {
	            Close: function () {
	                $(this).dialog("close");
	            }
	        }
	    });
	}


	//
	// deleteSavedQuery()
	//
	// Deletes the saved query with the specfied id.
    //
	ssm.deleteSavedQuery = function (queryId) {
	    //alert("Query id = " + queryId + ", but delete is not yet implemented.")
	    var postUrl = APP_ROOT_URL + 'SavedQuery/Delete/' + queryId;
	    $.post(postUrl, { "queryId": queryId },
                function (data, textStatus, jqXHR) {
                    if (data['status'] == 'OK') {
                        var containerSelector = '#sq-' + queryId;
                        $(containerSelector).remove();
                        if (ssm.savedQuery != null && ssm.savedQuery.id == queryId)
                            ssm.savedQuery = null;
                    }
                    else
                        ssm.displayError(data['message']);
                },
                'json');
	    return false;
	}

	ssm.warnMinWidth = function () {
	    ssm.log($(window).width());
	    if ($(window).width() < ssm.NAVMENU_MIN_WIDTH) {
	        $('#min-width-warning').show();
	    }
	    else {
	        $('#min-width-warning').hide();
	    }
	}

	ssm.comingSoon = function () { alert("Coming soon"); }


    // Return the object we just built.    
    return ssm;
}


// Declare the reporting object in the global scope.
var ssmReporting = null;

$(document).ready(function () {

    // Fix string.trim() in IE 7/8
    if (typeof String.prototype.trim !== 'function') {
        String.prototype.trim = function () {
            return this.replace(/^\s+|\s+$/g, '');
        }
    }
    // Fix Object.keys in IE 7/8
    Object.keys = Object.keys || function (o) {
        var result = [];
        for (var name in o) {
            if (o.hasOwnProperty(name))
                result.push(name);
        }
        return result;
    };

    $('#breadcrumbs').hide();
    $('#close-err-msg').click(function () { $('#msg').hide(); });


    // Set up our reporting object & initialize the UI.
    ssmReporting = SsmReporting();
    ssmReporting.initAjaxErrorHandler();
    ssmReporting.initAjaxRedirectHandler();
    ssmReporting.initDBMenu();
    ssmReporting.goToLocationHash();
    $('#admin_menu_reload_data').click(ssmReporting.showDataReload);
    $('#query_menu_show_saved_queries').click(ssmReporting.listSavedQueries);

    window.onresize = ssmReporting.warnMinWidth;

    // Not supported in IE 6 & 7
    window.onhashchange = function () { ssmReporting.goToLocationHash(); };

    ssmReporting.initialized = true;
    ssmReporting.warnMinWidth();
});
