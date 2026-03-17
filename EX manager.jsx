// Author: Jiaxuan Liu
function GG_ExpMane(thisObj) {

    // --- Utility Functions ---

    // Function to create folders and retrieve files
    function createAndRetrieveFiles(subFolderName) {
        var folderPath = Folder.myDocuments.fsName + '/ExpressionLibrary/' + subFolderName;
        var folder = new Folder(folderPath);

        if (!folder.exists) folder.create();

        var files = new Folder(folderPath).getFiles('*.txt');
        return {
            folder: folder,
            files: files,
            fileCount: files.length
        };
    }

    // Function to read text from a file
    function readTextFile(filePath) {
        var file = new File(filePath);
        var text = '';

        if (file.exists) {
            file.open('r');
            text = file.read();
            file.close();
        } else {
            text = 'File not found: ' + filePath;
        }

        return text;
    }


    // Function to show alerts
    function showAlert(message) {
        alert(message);
    }

    // Function to decode URI and remove .txt
    function decodeFileName(fileName) {
        try {
            return decodeURIComponent(fileName.replace('.txt', ''));
        } catch (e) {
            return fileName;
        }
    }

    // --- Data Setup ---

    // Configuration for expression categories
    var expConfigs = ['default', 'text', 'Wiggle&loop', 'in&out', 'Parent&index', 'nonanimation', 'search']; // Added 'search' config

    // Object to store data for each tab
    var tabData = {};
    expConfigs.forEach(function (config, index) {
        tabData[config] = config === 'search' ? { folder: null, files: [], fileCount: 0 } : createAndRetrieveFiles(config);  // Special handling for search tab
        tabData[config].tabIndex = index + 1;
    });

    // Other variables
    var selectedLayers = [];
    var selectedLayerCount = 0;
    var selectedLayerIndex = 1;
    var expressionText = 'Expression';
    var textRow = '#';
    var rowCode = '#g8%r&6s=v0!';
    var searchResults = [];  // Array to store search results
    var activeTab = 'default'; // Keep track of the active tab
    var searchTabActive = false;  //flag for search tab
    // --- UI Building ---

    function buildUI(thisObj) {

        var ObjSM = 12; // Smaller spacing for compactness

        var mainWin = (thisObj instanceof Panel) ? thisObj : new Window('palette', 'EX Manager', undefined, {
            resizeable: true,
            dockable: true,
        });

        mainWin.orientation = 'column';
        mainWin.spacing = ObjSM;
        mainWin.margins = 0;

        // Main Group
        var mainGroup = mainWin.add('group');
        mainGroup.spacing = ObjSM * 0.4;
        mainGroup.margins = ObjSM * 0.5;
        mainGroup.orientation = 'row';
        mainGroup.alignment = ['fill', 'fill'];

        // Left side group (tabbed panel)
        var leftGroup = mainGroup.add('group');
        leftGroup.orientation = 'column';
        leftGroup.spacing = ObjSM * 0.5;
        leftGroup.margins = 0;
        leftGroup.alignChildren = ['fill', 'top'];
        leftGroup.alignment = ['left', 'fill'];

        // Tabbed Panel
        var tabbedPanel = leftGroup.add('tabbedpanel');
        tabbedPanel.spacing = 0;
        tabbedPanel.margins = 0;
        tabbedPanel.alignChildren = ['fill', 'fill'];
        tabbedPanel.alignment = ['left', 'fill'];
        tabbedPanel.preferredSize.width = 280; // Wider left panel


        var tabs = {};

        // Function to create a tab
        function createTab(tabGroup, tabText, isSearchTab) {
            var tab = tabGroup.add('tab');
            tab.text = tabText;

            if (isSearchTab) {
                // Search Tab specific UI
                var searchGroup = tab.add('group');
                searchGroup.orientation = 'column';
                searchGroup.spacing = ObjSM * 0.5;
                searchGroup.margins = 0;
                searchGroup.alignment = ['fill', 'top'];

                var searchInputGroup = searchGroup.add('group');
                searchInputGroup.orientation = 'row';
                searchInputGroup.alignment = ['fill', 'top'];
                searchInputGroup.spacing = ObjSM * 0.4;

                var searchLabel = searchInputGroup.add('statictext', undefined, 'Search:');
                searchLabel.preferredSize.width = 50; // Adjust width as needed
                var searchEdit = searchInputGroup.add('edittext', undefined, '', {
                    placeholderText: '...'
                });
                searchEdit.alignment = ['fill', 'fill'];

                var searchButton = searchInputGroup.add('button', undefined, 'Search');
                searchButton.alignment = ['right', 'fill'];
                searchButton.preferredSize.width = 72;

                var resetSearchButton = searchInputGroup.add('button', undefined, 'Reset');
                resetSearchButton.alignment = ['right', 'fill'];
                resetSearchButton.preferredSize.width = 60;


                var searchResultsList = searchGroup.add('listbox', undefined, [], {
                    multiline: true,
                    wrap: true
                });
                searchResultsList.alignment = ['fill', 'fill'];
                searchResultsList.preferredSize.height = 360;


                // Search tab object
                return {
                    tab: tab,
                    searchEdit: searchEdit,
                    searchButton: searchButton,
                    resetSearchButton: resetSearchButton,
                    searchResultsList: searchResultsList,
                    presetList: null, // No preset list in search tab
                    openFileButton: null,
                    refreshButton: null,
                    addButton: null,
                    deleteButton: null
                };
            } else {
                // Regular Tab UI
                var presetList = tab.add('listbox');
                presetList.alignment = ['fill', 'fill'];
                presetList.preferredSize.width = 360;

                var bottomButtonsGroup = tab.add('group');
                bottomButtonsGroup.spacing = ObjSM * 0.3; // Even Smaller spacing for compactness
                bottomButtonsGroup.margins = 0;
                bottomButtonsGroup.orientation = 'row';
                bottomButtonsGroup.alignment = ['fill', 'bottom'];
                bottomButtonsGroup.preferredSize.height = 32; // Less height for buttons

                var openFileButton = bottomButtonsGroup.add('button', undefined, 'Open Folder');
                openFileButton.alignment = ['fill', 'fill'];

                var refreshButton = bottomButtonsGroup.add('button', undefined, 'Refresh');
                refreshButton.alignment = ['right', 'fill'];
                refreshButton.preferredSize.width = 48;

                var addButton = bottomButtonsGroup.add('button', undefined, '+');
                addButton.alignment = ['right', 'fill'];
                addButton.preferredSize.width = 20; // Slightly smaller buttons
                addButton.preferredSize.height = 20;

                var deleteButton = bottomButtonsGroup.add('button', undefined, '-');
                deleteButton.alignment = ['right', 'fill'];
                deleteButton.preferredSize.width = 20; // Slightly smaller buttons
                deleteButton.preferredSize.height = 20;

                // Add search bar to the regular tabs
                var searchInputGroup = tab.add('group');
                searchInputGroup.orientation = 'row';
                searchInputGroup.alignment = ['fill', 'top'];
                searchInputGroup.spacing = ObjSM * 0.4;

                var tabSearchLabel = searchInputGroup.add('statictext', undefined, 'Search:');
                tabSearchLabel.preferredSize.width = 50;
                var tabSearchEdit = searchInputGroup.add('edittext', undefined, '', {
                    placeholderText: '...'
                });
                tabSearchEdit.alignment = ['fill', 'fill'];


                return {
                    tab: tab,
                    presetList: presetList,
                    openFileButton: openFileButton,
                    refreshButton: refreshButton,
                    addButton: addButton,
                    deleteButton: deleteButton,
                    searchEdit: tabSearchEdit,
                    searchButton: null, // No search button needed here
                    searchResultsList: null
                };
            }
        }


        // Create all tabs, including the search tab
        expConfigs.forEach(function (config) {
            var isSearchTab = config === 'search';
            tabs[config] = createTab(tabbedPanel, getTabName(config), isSearchTab);
        });


        // Right Side (Expression Handling Functions)
        var rightGroup = mainGroup.add('group');
        rightGroup.spacing = ObjSM * 0.5;
        rightGroup.margins = 0;
        rightGroup.orientation = 'column';
        rightGroup.alignment = ['fill', 'fill'];

        var presetContentPanel = rightGroup.add('panel', undefined, 'Expression Preset Content:');
        presetContentPanel.spacing = ObjSM * 0.3; // Reduced spacing
        presetContentPanel.margins = [ObjSM * 0.2, ObjSM * 0.7, ObjSM * 0.2, ObjSM * 0.4];
        presetContentPanel.orientation = 'column';
        presetContentPanel.alignChildren = ['fill', 'top'];
        presetContentPanel.alignment = ['fill', 'fill'];

        var presetTitleGroup = presetContentPanel.add('group');
        presetTitleGroup.spacing = 6; // Reduced spacing
        presetTitleGroup.margins = 0;
        presetTitleGroup.orientation = 'row';
        presetTitleGroup.alignChildren = ['left', 'fill'];
        presetTitleGroup.alignment = ['fill', 'top'];

        var presetNameEdit = presetTitleGroup.add('edittext', undefined, 'PresetName');
        presetNameEdit.alignment = ['fill', 'fill'];

        var resetButton = presetTitleGroup.add('button', undefined, 'Reset');
        resetButton.alignment = ['right', 'fill'];
        resetButton.preferredSize.width = 60; // Reduced width for the button

        var expressionTextEdit = presetContentPanel.add('edittext', undefined, 'Expression', {
            multiline: true,
            wrap: true
        });
        expressionTextEdit.alignment = ['fill', 'fill'];
        expressionTextEdit.preferredSize.height = 280; // Slightly reduced height
        expressionTextEdit.preferredSize.width = 360;

        var otherPanel = rightGroup.add('panel', undefined, 'Extra Expression Tools:');
        otherPanel.spacing = ObjSM * 0.3; // Reduced spacing
        otherPanel.margins = [ObjSM * 0.2, ObjSM * 0.7, ObjSM * 0.2, ObjSM * 0.4];
        otherPanel.orientation = 'column';
        otherPanel.alignment = ['fill', 'bottom'];
        otherPanel.alignChildren = ['fill', 'fill'];

        var otherButtonsRow1 = otherPanel.add('group');
        otherButtonsRow1.spacing = ObjSM * 0.3; // Reduced spacing
        otherButtonsRow1.margins = 0;
        otherButtonsRow1.orientation = 'row';
        otherButtonsRow1.alignment = ['fill', 'top'];
        otherButtonsRow1.alignChildren = ['fill', 'fill'];

        var getExpressionButton = otherButtonsRow1.add('button', undefined, 'Get Expression'); // Shortened label
        getExpressionButton.alignment = ['fill', 'top'];

        var helpButton = otherButtonsRow1.add('button', undefined, '?');
        helpButton.alignment = ['right', 'top'];
        helpButton.preferredSize.width = 20; // Reduced button size

        var otherButtonsRow2 = otherPanel.add('group');
        otherButtonsRow2.spacing = ObjSM * 0.3; // Reduced spacing
        otherButtonsRow2.margins = 0;
        otherButtonsRow2.orientation = 'row';
        otherButtonsRow2.alignment = ['fill', 'top'];
        otherButtonsRow2.alignChildren = ['fill', 'fill'];

        var deleteExpressionButton = otherButtonsRow2.add('button', undefined, 'Delete'); // Shortened label
        deleteExpressionButton.alignment = ['fill', 'fill'];

        var toggleExpressionButton = otherButtonsRow2.add('button', undefined, 'Toggle');
        toggleExpressionButton.alignment = ['right', 'fill'];
        toggleExpressionButton.preferredSize.width = 60; // Reduced button size

        var bakeExpressionButton = otherButtonsRow2.add('button', undefined, 'Bake');
        bakeExpressionButton.alignment = ['right', 'fill'];
        bakeExpressionButton.preferredSize.width = 60; // Reduced button size


        // --- Event Handlers ---

        // Function to update selected layers data
        function updateLayerData() {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                selectedLayers = comp.selectedLayers;
                selectedLayerCount = selectedLayers.length;
                selectedLayerIndex = selectedLayerCount > 0 ? selectedLayers[0].index : 1;
            } else {
                showAlert('Please access composition');
                selectedLayers = [];
                selectedLayerCount = 0;
            }
        }


        // Modified Delete Selected Expression function
        deleteExpressionButton.onClick = function () {
            updateLayerData();
            app.beginUndoGroup("DeleteExpressions");

            if (selectedLayerCount > 0) {
                for (var i = 0; i < selectedLayerCount; i++) {
                    var layer = selectedLayers[i];

                    if (layer.selectedProperties && layer.selectedProperties.length > 0) {
                        // If a property is selected, remove expression from it
                        for (var j = 0; j < layer.selectedProperties.length; j++) {
                            var prop = layer.selectedProperties[j];
                            if (prop.canSetExpression) {
                                prop.expression = "";
                            }
                        }
                    } else {
                        // If a layer is selected, remove all expressions from it
                        removeExpressionsFromLayer(layer);
                    }
                }
            }
            app.endUndoGroup();
        };


        // Function to recursively remove expressions from all properties of a layer
        function removeExpressionsFromLayer(layer) {
            if (layer != null) {
                var prop;
                for (var i = 1; i <= layer.numProperties; i++) {
                    prop = layer.property(i);
                    switch (prop.propertyType) {
                        case PropertyType.PROPERTY:
                            if (prop.canSetExpression && prop.expression) prop.expression = '';
                            break;
                        case PropertyType.INDEXED_GROUP:
                            removeExpressionsFromLayer(prop);
                            break;
                        case PropertyType.NAMED_GROUP:
                            removeExpressionsFromLayer(prop);
                            break;
                        default:
                            break;
                    }
                }
            }

        }


        toggleExpressionButton.onClick = function () {
            // Get the active comp
            var activeComp = app.project.activeItem;

            if (activeComp && activeComp instanceof CompItem) {
                // Get all selected properties
                var selectedProperties = activeComp.selectedProperties;

                if (selectedProperties.length > 0) {
                    // Toggle expressionEnabled property for each selected property
                    for (var i = 0; i < selectedProperties.length; i++) {
                        var selectedProperty = selectedProperties[i];

                        if (selectedProperty instanceof Property) {
                            selectedProperty.expressionEnabled = !selectedProperty.expressionEnabled;
                        }
                    }
                } else {
                    showAlert('Please select one or more properties to toggle their expressions.');
                }
            } else {
                showAlert('Please open a composition to use this functionality.');
            }
        };

        // Function to convert expression to keyframes for selected properties
        function convertToKeyframes(theProperty) {
            if (theProperty.canSetExpression && theProperty.expressionEnabled) {
                theProperty.selected = true;
                app.executeCommand(app.findMenuCommandId("Convert Expression to Keyframes"));
                theProperty.selected = false;
            }
        }

        // Function to bake expressions to keyframes for selected layers and properties
        function bakeExpressionsToKeyframes() {
            var myComp = app.project.activeItem;

            if (myComp && myComp instanceof CompItem) {
                var selectedLayers = myComp.selectedLayers;

                if (selectedLayers.length > 0) {
                    app.beginUndoGroup("Bake Expressions to Keyframes");

                    for (var i = 0; i < selectedLayers.length; i++) {
                        var myLayer = selectedLayers[i];
                        var selectedProperties = myLayer.selectedProperties;

                        for (var j = 0; j < selectedProperties.length; j++) {
                            var myProperty = selectedProperties[j];
                            convertToKeyframes(myProperty);
                        }
                    }

                    app.endUndoGroup();
                    showAlert("Expressions baked!");
                } else {
                    showAlert("Please select at least one layer before clicking 'Bake'.");
                }
            }
        }
        bakeExpressionButton.onClick = function () {
            // Call the function to bake expressions to keyframes
            bakeExpressionsToKeyframes();
        };


        presetNameEdit.onChange = function () {
            var invalidChars = /[\/\:\*\?\"\<\>\|]/g; // Add '\' back
            if (invalidChars.test(presetNameEdit.text)) {
                showAlert('The following characters are not allowed in preset names.\n\\ / : * ? " < > |');
            }
        };

        resetButton.onClick = function () {
            presetNameEdit.text = 'PresetName';
            expressionTextEdit.text = 'Expression';
            expressionText = 'Expression';
        };

        expressionTextEdit.onChange = function () {
            expressionText = expressionTextEdit.text;
        };

        getExpressionButton.onClick = function () {
            updateLayerData();
            if (selectedLayers.length > 0 && selectedLayers[0].selectedProperties.length > 0) {
                expressionTextEdit.text = getSelectedExpression();
                expressionText = expressionTextEdit.text;
            }
        };



        // Function to show help panel with two tabs
        function showHelpPanel() {
            var helpPanel = new Window('palette', 'Help', undefined, {
                resizeable: true,
                dockable: false,
            });
            helpPanel.orientation = 'column';
            helpPanel.spacing = ObjSM * 0.5;
            helpPanel.margins = ObjSM * 0.5;

            var tabGroup = helpPanel.add('tabbedpanel');
            tabGroup.alignChildren = ['fill', 'fill'];

            // Tab 1
            var tab1 = tabGroup.add('tab');
            tab1.text = 'Expression Help';

            var expHelpText = readTextFile(Folder.myDocuments.fsName + '/ExpressionLibrary/expression_help.txt');
            var expHelpEditText = tab1.add('edittext', undefined, expHelpText, {
                multiline: true,
                readOnly: true,
            });
            expHelpEditText.alignment = ['fill', 'fill'];
            expHelpEditText.preferredSize.width = 400;
            expHelpEditText.preferredSize.height = 500;

            // Tab 2
            var tab2 = tabGroup.add('tab');
            tab2.text = 'After Effects Shortcuts';

            var aeShortcutsText = readTextFile(Folder.myDocuments.fsName + '/ExpressionLibrary/AE_shortcuts.txt');
            var aeShortcutsEditText = tab2.add('edittext', undefined, aeShortcutsText, {
                multiline: true,
                readOnly: true,
            });
            aeShortcutsEditText.alignment = ['fill', 'fill'];
            aeShortcutsEditText.preferredSize.width = 400;
            aeShortcutsEditText.preferredSize.height = 500;

            var closeBtn = helpPanel.add('button', undefined, 'Close');
            closeBtn.alignment = ['fill', 'top'];
            closeBtn.margins = ObjSM * 0.5;
            closeBtn.onClick = function () {
                helpPanel.close();
            };

            helpPanel.show();
        }

        // Usage
        helpButton.onClick = function () {
            showHelpPanel();
        };


        // Function to fill the list with saved expressions for a specific tab
        function fillExpressionList(tabElements, files) {
            if (tabElements.presetList) { // Check if presetList exists (not the search tab)
                files.forEach(function (file) {
                    tabElements.presetList.add('item', decodeFileName(file.name));
                });

                tabElements.presetList.onDoubleClick = function () {
                    updateLayerData();
                    if (this.selection) {
                        var selectedFile = files[this.selection.index];
                        if (selectedFile) {
                            selectedFile.open('r');
                            var extext = selectedFile.read();
                            selectedFile.close();
                            applyExpressionToSelection(extext);
                        }
                    }

                };

                tabElements.presetList.onChange = function () {
                    if (this.selection !== null) {
                        var selectedFile = files[this.selection.index];
                        if (selectedFile) {
                            var presetName = decodeFileName(selectedFile.name);
                            presetNameEdit.text = presetName;
                            selectedFile.open('r');
                            var extext = selectedFile.read();
                            selectedFile.close();
                            expressionTextEdit.text = extext;
                            expressionText = extext;
                            tabElements.deleteButton.enabled = true; // Enable delete button when an item is selected
                        }
                    } else {
                        tabElements.deleteButton.enabled = false; // Disable delete button when no item is selected
                    }
                };
            }
        }


        // Function to handle button clicks for a specific tab
        function handleTabButtons(tabElements, tabConfig) {
            if (tabElements.openFileButton) {
                var folder = tabData[tabConfig].folder;
                var files = tabData[tabConfig].files;

                tabElements.openFileButton.onClick = function () {
                    folder.execute();
                };

                tabElements.refreshButton.onClick = function () {
                    files = folder.getFiles('*.txt');
                    tabData[tabConfig].files = files;
                    if (tabElements.presetList) { // Check if presetList exists
                        tabElements.presetList.removeAll();
                        fillExpressionList(tabElements, files);
                    }
                };
            }


            if (tabElements.addButton) { // Check for addButton (only in non-search tabs)
                var folder = tabData[tabConfig].folder;
                var files = tabData[tabConfig].files;

                tabElements.addButton.onClick = function () {
                    var expName = presetNameEdit.text;
                    var expFilePath = folder.fsName + '/' + expName + '.txt'; // Create the full path
                    var expFile = new File(expFilePath);

                    if (!expFile.exists || confirm('Do you want to overwrite the preset?')) {
                        try {
                            expFile.open('w', undefined, 'UTF-8');
                            var textToWrite = expressionText
                                .replace(new RegExp(textRow + textRow + 'n', 'g'), rowCode)
                                .replace(new RegExp(textRow + 'n', 'g'), '\n')
                                .replace(new RegExp(rowCode, 'g'), textRow + 'n');
                            expFile.encoding = "UTF-8";
                            expFile.write(textToWrite);
                            expFile.close();

                        } catch (e) {
                            showAlert('Error writing to file: ' + e);
                            return;
                        }

                        // Update the expFiles array immediately
                        files = folder.getFiles('*.txt');
                        tabData[tabConfig].files = files;

                        // Update the list
                        if (tabElements.presetList) {
                            tabElements.presetList.removeAll();
                            fillExpressionList(tabElements, files);
                        }
                    }
                };
            }

            if (tabElements.deleteButton) {
                var folder = tabData[tabConfig].folder;
                var files = tabData[tabConfig].files;
                tabElements.deleteButton.onClick = function () {
                    var selectedTab = tabElements.presetList;
                    var selectedIndex = selectedTab.selection && selectedTab.selection.index;


                    // Ask for confirmation before deleting
                    if (selectedIndex !== undefined && selectedIndex !== null) {
                        var confirmDelete = confirm("Are you sure you want to delete this expression?");

                        if (confirmDelete) {

                            // Remove the selected item from the array
                            var fileToRemove = files[selectedIndex];
                            if (fileToRemove) {
                                fileToRemove.remove();
                            }

                            // Update the expFiles array
                            files = folder.getFiles('*.txt');
                            tabData[tabConfig].files = files;

                            // Update the list
                            if (tabElements.presetList) {
                                tabElements.presetList.removeAll();
                                fillExpressionList(tabElements, files);
                            }
                        }
                    }
                    else {
                        showAlert("Please select an expression from the list to delete.");
                    }
                };
            }
        }

        // --- Search Functionality ---

        // Function to search expressions
        function searchExpressions(searchTerm) {
            searchResults = [];  // Clear previous results

            for (var config in tabData) {
                if (config !== 'search') { // Skip the search tab itself
                    var files = tabData[config].files;
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        var fileName = decodeFileName(file.name);
                        var fileContent = readTextFile(file.fsName);

                        if (fileName.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1 ||
                            fileContent.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
                            searchResults.push({
                                fileName: fileName,
                                fileContent: fileContent,
                                tab: getTabName(config)
                            });
                        }
                    }
                }
            }
        }

        // Function to populate the search results listbox
        function populateSearchResultsList() {
            if (tabs.search.searchResultsList) {
                tabs.search.searchResultsList.removeAll();
                for (var i = 0; i < searchResults.length; i++) {
                    var result = searchResults[i];
                    tabs.search.searchResultsList.add('item', result.tab + " - " + result.fileName);
                }
            }
        }

        // Search button click handler
        if (tabs.search && tabs.search.searchButton) { // Check if search tab exists
            tabs.search.searchButton.onClick = function () {
                var searchTerm = tabs.search.searchEdit.text;
                if (searchTerm.length > 0) {
                    searchExpressions(searchTerm);
                    populateSearchResultsList();
                } else {
                    // Show all results if the search bar is empty
                    searchExpressions(""); // Search for empty string to show all
                    populateSearchResultsList();
                }
            };
        }

        // Search results listbox double-click handler (within the search tab)
        if (tabs.search && tabs.search.searchResultsList) { // check if search tab exists
            tabs.search.searchResultsList.onDoubleClick = function () {
                if (this.selection) {
                    var selectedResultIndex = this.selection.index;
                    var selectedResult = searchResults[selectedResultIndex];

                    if (selectedResult) {
                        expressionTextEdit.text = selectedResult.fileContent;
                        presetNameEdit.text = selectedResult.fileName; // Set preset name
                        expressionText = selectedResult.fileContent; // Update the expression text

                        // Apply the expression to selected properties
                        updateLayerData(); // Ensure layer data is up to date
                        applyExpressionToSelection(selectedResult.fileContent);
                    }
                }
            };
        }

        // Add Search functionality to regular tabs
        for (var config in tabs) {
            if (config !== 'search' && tabs[config].searchEdit) {
                tabs[config].searchEdit.onChanging = function () {  // Use onChanging to respond as user types.
                    // console.log(this.text); // Check for user Input
                };
                tabs[config].searchEdit.onEnterKey = function () { //Handle pressing Enter
                    switchToSearchTabAndSearch(this.text);
                };
                tabs[config].searchEdit.onBlur = function () {
                    //  console.log("Lost Focus")
                };
                tabs[config].searchEdit.onClick = function () {
                    // console.log("clicked")
                }

            }
        }


        // --- Switch to search tab and search function ---
        function switchToSearchTabAndSearch(searchTerm) {
            //Activate Search Tab
            tabbedPanel.selection = tabs.search.tab;
            activeTab = 'search'; // Update activeTab

            // Trigger Search if needed
            if (searchTerm.length > 0) {
                tabs.search.searchEdit.text = searchTerm; //Set the search text
                searchExpressions(searchTerm);
                populateSearchResultsList();
            } else {
                tabs.search.searchEdit.text = "";  // Clear search text
                searchExpressions("");  //show all
                populateSearchResultsList();

            }
        }

        // --- Tab Selection Change Handler ---
        tabbedPanel.onChange = function () {
            // console.log("tab changed")
            var selectedTab = tabbedPanel.selection;
            for (var config in tabs) {
                if (tabs[config].tab === selectedTab) {
                    activeTab = config;  //update the active tab
                }
            }
            if (activeTab === 'search') {
                searchTabActive = true;
                // Optionally clear search results and input field when switching to search tab.
                // tabs.search.searchEdit.text = '';
                // searchResults = [];
                // populateSearchResultsList();
            }
            else {
                searchTabActive = false;
            }


        };

        //--- search tab reset btn
        if (tabs.search && tabs.search.resetSearchButton) {
            tabs.search.resetSearchButton.onClick = function () {
                tabs.search.searchEdit.text = ""; // Clear the search input
                searchExpressions(""); // Search for empty string to show all
                populateSearchResultsList();
            };
        }

        //--- search tab enter key
        if (tabs.search && tabs.search.searchEdit) {
            tabs.search.searchEdit.onEnterKey = function () {
                var searchTerm = this.text;
                if (searchTerm.length > 0) {
                    searchExpressions(searchTerm);
                    populateSearchResultsList();
                } else {
                    searchExpressions("");
                    populateSearchResultsList();
                }
            }
        }


        // Initialize each tab
        for (var config in tabs) {
            if (config !== 'search') { // Don't fill the search tab list with regular expression files
                fillExpressionList(tabs[config], tabData[config].files);
                handleTabButtons(tabs[config], config);
            } else {
                // Handle the search tab's buttons (if any specific actions)
                // No button to handle on the search tab
            }

        }

        mainWin.layout.layout(true);
        mainWin.onResizing = mainWin.onResize = function () {
            this.layout.resize();
        };

        return mainWin;
    }

    function getTabName(config) {
        switch (config) {
            case "default":
                return "Def";
            case "text":
                return "Txt";
            case "Wiggle&loop":
                return "Wig/loop";
            case "in&out":
                return "I&O";
            case "Parent&index":
                return "\u7236/Index"; // Parent & Index
            case "nonanimation":
                return "NonAni";
            case "search":
                return "Search";
        }
        return "";

    }


    // --- Expression Logic ---


    function getSelectedExpression() {
        var expressionText = "";
        var propertyFound = false;
        if (selectedLayers[0]) {
            for (var i = 0; i < selectedLayers[0].selectedProperties.length; i++) {
                var property = selectedLayers[0].selectedProperties[i];
                if (property.expression && property.expression.length > 0) {
                    expressionText = property.expression;
                    propertyFound = true;
                    break;
                }
            }
        }
        if (!propertyFound) {
            showAlert('No expressions found on the selected properties');
        }

        return expressionText;
    }


    function applyExpressionToSelection(expression) {
        app.beginUndoGroup('SetExpression');
        for (var i = 0; i < selectedLayerCount; i++) {
            if (selectedLayers[i].selectedProperties.length > 0) {
                for (var j = 0; j < selectedLayers[i].selectedProperties.length; j++) {
                    var property = selectedLayers[i].selectedProperties[j];
                    if (property.canSetExpression) {
                        property.expression = expression;
                    }
                }
            }
        }
        app.endUndoGroup();
    }


    // --- Initialization ---

    var mainUI = buildUI(thisObj);
    if (!(mainUI instanceof Panel)) mainUI.show();


}

GG_ExpMane(this);