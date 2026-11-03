#target aftereffects

// Author: Jiaxuan Liu
//
// NOTE: After Effects runs ExtendScript (ES3). Array.prototype.forEach / map /
// filter / indexOf and JSON do NOT exist, so everything below uses plain
// for-loops on purpose. Do not "modernise" these into forEach.

function GG_ExpManager(thisObj) {

    // --- Utility Functions ---

    // Function to show alerts
    function showAlert(message) {
        alert(message);
    }

    // Returns an array of .txt files. Folder.getFiles() returns null on error,
    // so this always hands back an array the callers can safely use .length on.
    function getTxtFiles(folder) {
        if (!folder) return [];

        var raw = folder.getFiles('*.txt');
        if (!raw) return [];

        var out = [];
        for (var i = 0; i < raw.length; i++) {
            if (raw[i] instanceof File) out.push(raw[i]);
        }
        return out;
    }

    // Function to create folders and retrieve files
    function createAndRetrieveFiles(subFolderName) {
        var rootFolder = new Folder(Folder.myDocuments.fsName + '/ExpressionLibrary');
        if (!rootFolder.exists && !rootFolder.create()) {
            showAlert('Could not create the ExpressionLibrary folder:\n' + rootFolder.fsName);
            return { folder: rootFolder, files: [], fileCount: 0 };
        }

        var folder = new Folder(rootFolder.fsName + '/' + subFolderName);
        if (!folder.exists && !folder.create()) {
            showAlert('Could not create the preset folder:\n' + folder.fsName);
            return { folder: folder, files: [], fileCount: 0 };
        }

        var files = getTxtFiles(folder);
        return {
            folder: folder,
            files: files,
            fileCount: files.length
        };
    }

    // Reads a preset/help file as UTF-8. Returns null when the file cannot be
    // read, so a failure is never mistaken for file content.
    function readTextFile(filePath) {
        var file = (filePath instanceof File) ? filePath : new File(filePath);
        if (!file.exists) return null;

        var text = null;
        try {
            file.encoding = 'UTF-8'; // presets are always written as UTF-8
            if (!file.open('r')) return null;
            text = file.read();
        } catch (e) {
            text = null;
        } finally {
            try { file.close(); } catch (eClose) {}
        }
        return text;
    }

    // Cached read for search, invalidated by the file's modified time.
    var contentCache = {};

    function readTextFileCached(file) {
        var key = file.fsName;
        var stamp = file.modified ? file.modified.getTime() : 0;

        var hit = contentCache[key];
        if (hit && hit.stamp === stamp) return hit.text;

        var text = readTextFile(file);
        contentCache[key] = { stamp: stamp, text: text };
        return text;
    }

    // Strip the extension first, then decode. On a URIError the extension is
    // still gone (e.g. a preset literally named "Opacity 50%"), and anchoring
    // to the end avoids mangling names like "foo.txtbar.txt".
    function decodeFileName(fileName) {
        var base = fileName.replace(/\.txt$/i, '');
        try {
            return decodeURIComponent(base);
        } catch (e) {
            return base;
        }
    }

    function trim(str) {
        return String(str).replace(/^\s+|\s+$/g, ''); // no String.trim in ES3
    }

    // Illegal on Windows and/or macOS. No /g flag: a global regex keeps
    // lastIndex between .test() calls and gives alternating results.
    var INVALID_NAME_CHARS = /[\\\/:*?"<>|]/;

    // Returns an error message, or null when the name is safe to write.
    function validatePresetName(name) {
        var trimmed = trim(name === null || name === undefined ? '' : name);

        if (trimmed.length === 0) return 'Please enter a preset name.';
        if (INVALID_NAME_CHARS.test(trimmed)) {
            return 'The following characters are not allowed in preset names.\n\\ / : * ? " < > |';
        }
        if (trimmed.charAt(0) === '.') return 'Preset names cannot start with a dot.';
        if (trimmed.indexOf('..') !== -1) return 'Preset names cannot contain "..".';

        // The File/Folder constructors URI-decode their path, and File.name comes
        // back URI-encoded, so a literal '%' silently round-trips to a different
        // name ("100%20off" would come back as "100 off").
        if (trimmed.indexOf('%') !== -1) {
            return 'Preset names cannot contain "%".\nAfter Effects treats it as an escape character in file paths.';
        }
        return null;
    }

    // --- Data Setup ---

    // Configuration for expression categories ('search' is a virtual tab)
    var expConfigs = ['default', 'text', 'Wiggle&loop', 'in&out', 'Parent&index', 'nonanimation', 'search'];

    // Object to store data for each tab
    var tabData = {};
    for (var configIndex = 0; configIndex < expConfigs.length; configIndex++) {
        var setupConfig = expConfigs[configIndex];
        tabData[setupConfig] = (setupConfig === 'search')
            ? { folder: null, files: [], fileCount: 0 }
            : createAndRetrieveFiles(setupConfig);
    }

    // Other variables
    var selectedLayers = [];
    var selectedLayerCount = 0;
    var searchResults = []; // Array to store search results

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
                deleteButton.enabled = false; // nothing is selected yet

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
        for (var t = 0; t < expConfigs.length; t++) {
            var tabConfigName = expConfigs[t];
            tabs[tabConfigName] = createTab(tabbedPanel, getTabName(tabConfigName), tabConfigName === 'search');
        }


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
            } else {
                showAlert('Please access composition');
                selectedLayers = [];
                selectedLayerCount = 0;
            }
        }


        // Modified Delete Selected Expression function
        deleteExpressionButton.onClick = function () {
            updateLayerData();
            if (selectedLayerCount === 0) return; // nothing to do, and no empty undo group

            app.beginUndoGroup('DeleteExpressions');
            try {
                for (var i = 0; i < selectedLayerCount; i++) {
                    var layer = selectedLayers[i];
                    var props = layer.selectedProperties;

                    if (props && props.length > 0) {
                        // If a property is selected, remove expression from it
                        for (var j = 0; j < props.length; j++) {
                            var prop = props[j];
                            try {
                                if (prop.canSetExpression) prop.expression = '';
                            } catch (e) {}
                        }
                    } else {
                        // If a layer is selected, remove all expressions from it
                        removeExpressionsFromLayer(layer);
                    }
                }
            } finally {
                // Always close the group: an open undo group swallows later user actions.
                app.endUndoGroup();
            }
        };


        // Function to recursively remove expressions from all properties of a layer
        function removeExpressionsFromLayer(layer) {
            if (layer == null) return;

            for (var i = 1; i <= layer.numProperties; i++) {
                var prop;
                try {
                    prop = layer.property(i);
                } catch (e) {
                    continue; // some property groups throw when they are unavailable
                }
                if (!prop) continue;

                try {
                    switch (prop.propertyType) {
                        case PropertyType.PROPERTY:
                            if (prop.canSetExpression && prop.expression) prop.expression = '';
                            break;
                        case PropertyType.INDEXED_GROUP:
                        case PropertyType.NAMED_GROUP:
                            removeExpressionsFromLayer(prop);
                            break;
                        default:
                            break;
                    }
                } catch (eProp) {}
            }
        }


        toggleExpressionButton.onClick = function () {
            // Get the active comp
            var activeComp = app.project.activeItem;

            if (!(activeComp && activeComp instanceof CompItem)) {
                showAlert('Please open a composition to use this functionality.');
                return;
            }

            // Get all selected properties
            var selectedProperties = activeComp.selectedProperties;
            if (selectedProperties.length === 0) {
                showAlert('Please select one or more properties to toggle their expressions.');
                return;
            }

            app.beginUndoGroup('ToggleExpressions');
            try {
                // Toggle expressionEnabled property for each selected property
                for (var i = 0; i < selectedProperties.length; i++) {
                    var selectedProperty = selectedProperties[i];
                    try {
                        if (selectedProperty instanceof Property) {
                            selectedProperty.expressionEnabled = !selectedProperty.expressionEnabled;
                        }
                    } catch (e) {}
                }
            } finally {
                app.endUndoGroup();
            }
        };

        // Function to bake expressions to keyframes for the selected properties
        function bakeExpressionsToKeyframes() {
            var myComp = app.project.activeItem;
            if (!(myComp && myComp instanceof CompItem)) {
                showAlert('Please open a composition to use this functionality.');
                return;
            }

            // Looked up by its English name, so it resolves to 0 on a localised UI.
            var cmdId = app.findMenuCommandId('Convert Expression to Keyframes');
            if (!cmdId) {
                showAlert('Could not find the "Convert Expression to Keyframes" menu command.\n\n' +
                    'It is looked up by its English name, so Bake is unavailable when ' +
                    'After Effects is running in another language.');
                return;
            }

            // Snapshot the whole comp selection before anything is touched.
            var selection = myComp.selectedProperties;
            var targets = [];
            for (var s = 0; s < selection.length; s++) {
                try {
                    if (selection[s].canSetExpression &&
                        selection[s].expressionEnabled &&
                        selection[s].expression) {
                        targets.push(selection[s]);
                    }
                } catch (e) {}
            }

            if (targets.length === 0) {
                showAlert('Please select one or more properties that have an active expression.');
                return;
            }

            var baked = 0;
            app.beginUndoGroup('Bake Expressions to Keyframes');
            try {
                // property.selected = true ADDS to the selection, so everything has to
                // be deselected first or the first executeCommand bakes the whole lot.
                for (var d = 0; d < selection.length; d++) {
                    try { selection[d].selected = false; } catch (eDeselect) {}
                }

                for (var i = 0; i < targets.length; i++) {
                    var target = targets[i];
                    try {
                        target.selected = true;
                        app.executeCommand(cmdId);
                        baked++;
                    } catch (eBake) {
                    } finally {
                        try { target.selected = false; } catch (eReset) {}
                    }
                }
            } finally {
                app.endUndoGroup();
            }

            if (baked === targets.length) {
                showAlert('Baked ' + baked + ' propert' + (baked === 1 ? 'y' : 'ies') + '.');
            } else {
                showAlert('Baked ' + baked + ' of ' + targets.length + ' properties.');
            }
        }

        bakeExpressionButton.onClick = function () {
            bakeExpressionsToKeyframes();
        };


        resetButton.onClick = function () {
            presetNameEdit.text = 'PresetName';
            expressionTextEdit.text = 'Expression';
        };

        getExpressionButton.onClick = function () {
            updateLayerData();
            if (selectedLayers.length > 0 && selectedLayers[0].selectedProperties.length > 0) {
                var found = getSelectedExpression();
                if (found) expressionTextEdit.text = found;
            }
        };


        // Function to show help panel with two tabs. Reuses the open window so
        // repeated clicks do not stack palettes.
        var helpWin = null;

        function showHelpPanel() {
            if (helpWin) {
                helpWin.show();
                return;
            }

            helpWin = new Window('palette', 'Help', undefined, {
                resizeable: true,
                dockable: false,
            });
            helpWin.orientation = 'column';
            helpWin.spacing = ObjSM * 0.5;
            helpWin.margins = ObjSM * 0.5;

            var tabGroup = helpWin.add('tabbedpanel');
            tabGroup.alignChildren = ['fill', 'fill'];

            // Tab 1
            var tab1 = tabGroup.add('tab');
            tab1.text = 'Expression Help';

            var expHelpPath = Folder.myDocuments.fsName + '/ExpressionLibrary/expression_help.txt';
            var expHelpText = readTextFile(expHelpPath);
            if (expHelpText === null) expHelpText = 'File not found: ' + expHelpPath;

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

            var shortcutsPath = Folder.myDocuments.fsName + '/ExpressionLibrary/AE_shortcuts.txt';
            var aeShortcutsText = readTextFile(shortcutsPath);
            if (aeShortcutsText === null) aeShortcutsText = 'File not found: ' + shortcutsPath;

            var aeShortcutsEditText = tab2.add('edittext', undefined, aeShortcutsText, {
                multiline: true,
                readOnly: true,
            });
            aeShortcutsEditText.alignment = ['fill', 'fill'];
            aeShortcutsEditText.preferredSize.width = 400;
            aeShortcutsEditText.preferredSize.height = 500;

            var closeBtn = helpWin.add('button', undefined, 'Close');
            closeBtn.alignment = ['fill', 'top'];
            closeBtn.margins = ObjSM * 0.5;
            closeBtn.onClick = function () {
                helpWin.close();
            };

            helpWin.onClose = function () {
                helpWin = null;
                return true;
            };

            helpWin.show();
        }

        // Usage
        helpButton.onClick = function () {
            showHelpPanel();
        };


        // Fills a tab's listbox from tabData[config].files. The handlers index into
        // tabData[config].files at event time rather than a captured snapshot, so a
        // refresh elsewhere can never leave the rows and the files out of step.
        function fillExpressionList(tabElements, config) {
            var presetList = tabElements.presetList;
            if (!presetList) return; // the search tab has no preset list

            presetList.removeAll();

            var files = tabData[config].files;
            for (var i = 0; i < files.length; i++) {
                presetList.add('item', decodeFileName(files[i].name));
            }

            tabElements.deleteButton.enabled = false;

            presetList.onDoubleClick = function () {
                if (!this.selection) return;

                var file = tabData[config].files[this.selection.index];
                if (!file) return;

                var text = readTextFile(file);
                if (text === null) {
                    showAlert('Could not read preset:\n' + file.fsName);
                    return;
                }

                updateLayerData();
                applyExpressionToSelection(text);
            };

            presetList.onChange = function () {
                if (this.selection === null) {
                    tabElements.deleteButton.enabled = false; // Disable delete button when no item is selected
                    return;
                }

                var file = tabData[config].files[this.selection.index];
                if (!file) {
                    tabElements.deleteButton.enabled = false;
                    return;
                }

                var text = readTextFile(file);
                if (text === null) {
                    showAlert('Could not read preset:\n' + file.fsName);
                    return;
                }

                presetNameEdit.text = decodeFileName(file.name);
                expressionTextEdit.text = text;
                tabElements.deleteButton.enabled = true; // Enable delete button when an item is selected
            };
        }


        // Re-reads a tab's folder from disk, keeping tabData[config].files and the
        // visible rows in lockstep. The listbox is only rebuilt when the folder
        // contents actually changed, so a search does not clear the user's selection.
        function refreshTabFromDisk(config) {
            if (config === 'search') return;

            var previous = tabData[config].files;
            var current = getTxtFiles(tabData[config].folder);

            var changed = (previous.length !== current.length);
            if (!changed) {
                for (var i = 0; i < current.length; i++) {
                    if (previous[i].name !== current[i].name) {
                        changed = true;
                        break;
                    }
                }
            }

            tabData[config].files = current;
            tabData[config].fileCount = current.length;

            if (changed) fillExpressionList(tabs[config], config);
        }


        // Function to handle button clicks for a specific tab
        function handleTabButtons(tabElements, tabConfig) {
            var folder = tabData[tabConfig].folder;

            if (tabElements.openFileButton) {
                tabElements.openFileButton.onClick = function () {
                    folder.execute();
                };
            }

            if (tabElements.refreshButton) {
                tabElements.refreshButton.onClick = function () {
                    refreshTabFromDisk(tabConfig);
                };
            }

            if (tabElements.addButton) {
                tabElements.addButton.onClick = function () {
                    var expName = trim(presetNameEdit.text);

                    // Validate here, not just as a warning on the name field: this is
                    // the point where a name actually becomes a file path.
                    var problem = validatePresetName(expName);
                    if (problem) {
                        showAlert(problem);
                        return;
                    }

                    var expFile = new File(folder.fsName + '/' + expName + '.txt');

                    // Belt and braces: confirm the resolved path really is inside this tab's folder.
                    if (!expFile.parent || expFile.parent.fsName !== folder.fsName) {
                        showAlert('That preset name would write outside the preset folder.');
                        return;
                    }

                    if (expFile.exists && !confirm('Do you want to overwrite the preset?')) return;

                    // Read the field directly; a cached copy can lag behind onChange.
                    var textToWrite = expressionTextEdit.text;

                    try {
                        expFile.encoding = 'UTF-8'; // must be set before open()
                        if (!expFile.open('w')) {
                            showAlert('Could not open the file for writing:\n' + expFile.fsName);
                            return;
                        }
                        expFile.write(textToWrite);
                    } catch (e) {
                        showAlert('Error writing to file: ' + e.toString());
                        return;
                    } finally {
                        try { expFile.close(); } catch (eClose) {}
                    }

                    refreshTabFromDisk(tabConfig);
                };
            }

            if (tabElements.deleteButton) {
                tabElements.deleteButton.onClick = function () {
                    var presetList = tabElements.presetList;
                    if (!presetList || presetList.selection === null) {
                        showAlert('Please select an expression from the list to delete.');
                        return;
                    }

                    var file = tabData[tabConfig].files[presetList.selection.index];
                    if (!file) {
                        showAlert('Please select an expression from the list to delete.');
                        return;
                    }

                    // Ask for confirmation before deleting: File.remove() is permanent.
                    if (!confirm('Are you sure you want to delete this expression?\n\n' + decodeFileName(file.name))) return;

                    if (!file.remove()) {
                        showAlert('Could not delete:\n' + file.fsName);
                    }

                    refreshTabFromDisk(tabConfig);
                };
            }
        }

        // --- Search Functionality ---

        // Function to search expressions
        function searchExpressions(searchTerm) {
            searchResults = []; // Clear previous results
            var needle = String(searchTerm).toLowerCase();

            for (var c = 0; c < expConfigs.length; c++) {
                var config = expConfigs[c];
                if (config === 'search') continue; // Skip the search tab itself

                // Re-scan from disk so results can never point at files that were
                // added or removed from another tab earlier in this session.
                refreshTabFromDisk(config);

                var files = tabData[config].files;
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = decodeFileName(file.name);
                    var matched = (needle.length === 0) ||
                        (fileName.toLowerCase().indexOf(needle) !== -1);

                    if (!matched) {
                        // Only pay for a file read when the name itself did not match.
                        var content = readTextFileCached(file);
                        matched = (content !== null && content.toLowerCase().indexOf(needle) !== -1);
                    }

                    if (matched) {
                        // Store the file, not its text: the body is read on demand.
                        searchResults.push({
                            fileName: fileName,
                            file: file,
                            tab: getTabName(config)
                        });
                    }
                }
            }
        }

        // Function to populate the search results listbox
        function populateSearchResultsList() {
            if (!tabs.search.searchResultsList) return;

            tabs.search.searchResultsList.removeAll();
            for (var i = 0; i < searchResults.length; i++) {
                var result = searchResults[i];
                tabs.search.searchResultsList.add('item', result.tab + ' - ' + result.fileName);
            }
        }

        function runSearch(searchTerm) {
            searchExpressions(searchTerm); // an empty term matches everything
            populateSearchResultsList();
        }

        // Search button click handler
        if (tabs.search && tabs.search.searchButton) {
            tabs.search.searchButton.onClick = function () {
                runSearch(tabs.search.searchEdit.text);
            };
        }

        // Search results listbox double-click handler (within the search tab)
        if (tabs.search && tabs.search.searchResultsList) {
            tabs.search.searchResultsList.onDoubleClick = function () {
                if (!this.selection) return;

                var result = searchResults[this.selection.index];
                if (!result) return;

                var text = readTextFileCached(result.file);
                if (text === null) {
                    showAlert('Could not read preset:\n' + result.file.fsName);
                    return;
                }

                expressionTextEdit.text = text;
                presetNameEdit.text = result.fileName; // Set preset name

                // Apply the expression to selected properties
                updateLayerData(); // Ensure layer data is up to date
                applyExpressionToSelection(text);
            };
        }

        // Enter in a regular tab's search field jumps to the search tab
        for (var sc = 0; sc < expConfigs.length; sc++) {
            var searchConfig = expConfigs[sc];
            if (searchConfig !== 'search' && tabs[searchConfig].searchEdit) {
                tabs[searchConfig].searchEdit.onEnterKey = function () {
                    switchToSearchTabAndSearch(this.text);
                };
            }
        }


        // --- Switch to search tab and search function ---
        function switchToSearchTabAndSearch(searchTerm) {
            tabbedPanel.selection = tabs.search.tab;
            tabs.search.searchEdit.text = searchTerm ? searchTerm : '';
            runSearch(tabs.search.searchEdit.text);
        }

        //--- search tab reset btn
        if (tabs.search && tabs.search.resetSearchButton) {
            tabs.search.resetSearchButton.onClick = function () {
                tabs.search.searchEdit.text = ''; // Clear the search input
                runSearch(''); // show all
            };
        }

        //--- search tab enter key
        if (tabs.search && tabs.search.searchEdit) {
            tabs.search.searchEdit.onEnterKey = function () {
                runSearch(this.text);
            };
        }


        // Initialize each tab
        for (var ic = 0; ic < expConfigs.length; ic++) {
            var initConfig = expConfigs[ic];
            if (initConfig === 'search') continue; // the search tab has no preset files of its own

            fillExpressionList(tabs[initConfig], initConfig);
            handleTabButtons(tabs[initConfig], initConfig);
        }

        mainWin.layout.layout(true);
        mainWin.onResizing = mainWin.onResize = function () {
            this.layout.resize();
        };

        return mainWin;
    }

    function getTabName(config) {
        switch (config) {
            case 'default':
                return 'Def';
            case 'text':
                return 'Txt';
            case 'Wiggle&loop':
                return 'Wig/loop';
            case 'in&out':
                return 'I&O';
            case 'Parent&index':
                return '\u7236/Index'; // Parent & Index (escaped: keeps this file pure ASCII)
            case 'nonanimation':
                return 'NonAni';
            case 'search':
                return 'Search';
        }
        return config; // unknown config: label it rather than showing a blank tab
    }


    // --- Expression Logic ---

    function getSelectedExpression() {
        var foundExpression = '';
        var propertyFound = false;

        if (selectedLayers[0]) {
            var props = selectedLayers[0].selectedProperties;
            for (var i = 0; i < props.length; i++) {
                var property = props[i];
                try {
                    if (property.expression && property.expression.length > 0) {
                        foundExpression = property.expression;
                        propertyFound = true;
                        break;
                    }
                } catch (e) {}
            }
        }

        if (!propertyFound) {
            showAlert('No expressions found on the selected properties');
        }

        return foundExpression;
    }


    function applyExpressionToSelection(expression) {
        if (selectedLayerCount === 0) return;

        var applied = 0;
        app.beginUndoGroup('SetExpression');
        try {
            for (var i = 0; i < selectedLayerCount; i++) {
                var props = selectedLayers[i].selectedProperties;
                for (var j = 0; j < props.length; j++) {
                    var property = props[j];
                    try {
                        if (property.canSetExpression) {
                            property.expression = expression;
                            applied++;
                        }
                    } catch (e) {}
                }
            }
        } finally {
            app.endUndoGroup();
        }

        if (applied === 0) {
            showAlert('Please select one or more properties that can take an expression.');
        }
    }


    // --- Initialization ---

    var mainUI = buildUI(thisObj);
    if (!(mainUI instanceof Panel)) mainUI.show();

}

GG_ExpManager(this);
