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

    function withinFolder(file, folder) {
        return !!file.parent && file.parent.fsName === folder.fsName;
    }

    // --- Persisted Settings ---

    var SETTINGS_SECTION = 'GG_ExpManager';

    function loadSetting(key, fallback) {
        try {
            if (app.settings.haveSetting(SETTINGS_SECTION, key)) {
                return app.settings.getSetting(SETTINGS_SECTION, key);
            }
        } catch (e) {}
        return fallback;
    }

    function saveSetting(key, value) {
        try {
            app.settings.saveSetting(SETTINGS_SECTION, key, String(value));
        } catch (e) {}
    }

    // --- Clipboard ---

    // ScriptUI has no clipboard API, so this routes through the OS. The text goes
    // via a temp file rather than being interpolated into the command line, so
    // quotes and newlines in an expression survive intact.
    function copyToClipboard(text) {
        var tmp = new File(Folder.temp.fsName + '/gg_expmanager_clip.txt');

        try {
            tmp.encoding = 'UTF-8';
            if (!tmp.open('w')) return false;
            tmp.write(text);
        } catch (e) {
            return false;
        } finally {
            try { tmp.close(); } catch (eClose) {}
        }

        var command = ($.os.indexOf('Windows') !== -1)
            ? 'cmd /c clip < "' + tmp.fsName + '"'
            : '/bin/sh -c "cat \'' + tmp.fsName + '\' | pbcopy"';

        try {
            system.callSystem(command);
        } catch (eCall) {
            return false;
        } finally {
            try { tmp.remove(); } catch (eRemove) {}
        }
        return true;
    }

    // --- Backups ---

    var MAX_BACKUPS_PER_PRESET = 10;

    function twoDigits(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function timeStamp() {
        var d = new Date();
        return d.getFullYear() + '-' + twoDigits(d.getMonth() + 1) + '-' + twoDigits(d.getDate()) +
            '_' + twoDigits(d.getHours()) + '-' + twoDigits(d.getMinutes()) + '-' + twoDigits(d.getSeconds());
    }

    // Copies a preset into <category>/.backups before it is overwritten. The folder
    // starts with a dot and holds .txt files, but getTxtFiles() never recurses, so
    // backups stay out of the lists.
    function backupPreset(file) {
        if (!file || !file.exists) return;

        var backupFolder = new Folder(file.parent.fsName + '/.backups');
        if (!backupFolder.exists && !backupFolder.create()) return;

        var base = decodeFileName(file.name);
        var copy = new File(backupFolder.fsName + '/' + base + '__' + timeStamp() + '.txt');

        try {
            file.copy(copy.fsName);
        } catch (e) {
            return; // a failed backup must never block the save itself
        }

        prunePresetBackups(backupFolder, base);
    }

    function prunePresetBackups(backupFolder, base) {
        var all = getTxtFiles(backupFolder);
        var mine = [];

        for (var i = 0; i < all.length; i++) {
            if (decodeFileName(all[i].name).indexOf(base + '__') === 0) mine.push(all[i]);
        }
        if (mine.length <= MAX_BACKUPS_PER_PRESET) return;

        // The names carry a zero-padded timestamp, so lexical order is chronological.
        mine.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });

        var excess = mine.length - MAX_BACKUPS_PER_PRESET;
        for (var d = 0; d < excess; d++) {
            try { mine[d].remove(); } catch (e) {}
        }
    }

    // --- Apply Modes ---
    //
    //   replace : overwrite whatever is on the property (the original behaviour)
    //   append  : keep the existing expression and add the preset below it
    //   wrap    : substitute $PREV in the preset with the existing expression
    var APPLY_MODES = ['replace', 'append', 'wrap'];
    var PREV_TOKEN = '$PREV';
    var applyMode = 'replace';

    // Literal replace-all. String.replace with a string pattern only swaps the
    // first hit, and '$' in either the pattern or the replacement has special
    // meaning to replace() - split/join sidesteps both problems.
    function replaceAllLiteral(haystack, needle, replacement) {
        return haystack.split(needle).join(replacement);
    }

    // Returns { text: <string>, note: <string|null> }
    function composeExpression(preset, existing, mode) {
        var previous = existing ? existing : '';

        if (mode === 'append') {
            return { text: (previous === '') ? preset : previous + '\n\n' + preset, note: null };
        }

        if (mode === 'wrap') {
            if (preset.indexOf(PREV_TOKEN) === -1) {
                return {
                    text: preset,
                    note: 'Wrap needs a ' + PREV_TOKEN + ' placeholder in the preset - applied as Replace'
                };
            }
            var substitute = (previous === '') ? 'value' : previous;
            return { text: replaceAllLiteral(preset, PREV_TOKEN, substitute), note: null };
        }

        return { text: preset, note: null };
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

        // Applicability filter. ScriptUI gets no callback when the AE selection
        // changes, so this re-evaluates when you toggle it, switch tabs, or Refresh.
        var filterGroup = leftGroup.add('group');
        filterGroup.orientation = 'row';
        filterGroup.margins = 0;
        filterGroup.spacing = ObjSM * 0.4;
        filterGroup.alignment = ['fill', 'bottom'];

        var applicableCheck = filterGroup.add('checkbox', undefined, 'Applicable to selection');
        applicableCheck.alignment = ['fill', 'center'];
        applicableCheck.helpTip = 'Hide presets whose @target property does not exist on the ' +
            'selected layers.\n\nPresets with no declared target are always shown, since they ' +
            'follow your property selection.\n\nRe-checked when you toggle this, switch tabs, or press Refresh.';

        // The preset the right-hand pane is currently showing.
        var currentPresetFile = null;
        var currentPresetConfig = null;

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
                    deleteButton: null,
                    renameButton: null,
                    duplicateButton: null,
                    moveButton: null
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

                // Preset file management. All three act on the selected list row and
                // stay disabled until there is one.
                var manageGroup = tab.add('group');
                manageGroup.spacing = ObjSM * 0.3;
                manageGroup.margins = 0;
                manageGroup.orientation = 'row';
                manageGroup.alignment = ['fill', 'bottom'];

                var renameButton = manageGroup.add('button', undefined, 'Rename');
                renameButton.alignment = ['fill', 'fill'];
                renameButton.enabled = false;

                var duplicateButton = manageGroup.add('button', undefined, 'Duplicate');
                duplicateButton.alignment = ['fill', 'fill'];
                duplicateButton.enabled = false;

                var moveButton = manageGroup.add('button', undefined, 'Move...');
                moveButton.alignment = ['fill', 'fill'];
                moveButton.enabled = false;

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
                    renameButton: renameButton,
                    duplicateButton: duplicateButton,
                    moveButton: moveButton,
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

        // Target readout: what the preset declares AND whether it resolves on the
        // current selection, so you can see where it lands before committing.
        var targetGroup = presetContentPanel.add('group');
        targetGroup.orientation = 'row';
        targetGroup.margins = 0;
        targetGroup.spacing = 6;
        targetGroup.alignment = ['fill', 'top'];

        var targetLabel = targetGroup.add('statictext', undefined, '', { truncate: 'end' });
        targetLabel.alignment = ['fill', 'center'];
        targetLabel.helpTip = 'Property this preset targets, from its "// @target" header or its ' +
            '"Name_Property" file name, followed by where it resolves on the current selection.';

        var setTargetButton = targetGroup.add('button', undefined, 'Set @target...');
        setTargetButton.alignment = ['right', 'center'];
        setTargetButton.preferredSize.width = 100;
        setTargetButton.helpTip = 'Write a "// @target" header into the selected preset file.';

        var copyButton = targetGroup.add('button', undefined, 'Copy');
        copyButton.alignment = ['right', 'center'];
        copyButton.preferredSize.width = 52;
        copyButton.helpTip = 'Copy the expression below to the clipboard.';

        function updateTargetLabel(text, presetName) {
            var described = describeTargetResolution(text, presetName);
            targetLabel.text = described.target
                ? '\u2192 ' + described.target + '    ' + described.info
                : described.info;
        }

        var expressionTextEdit = presetContentPanel.add('edittext', undefined, 'Expression', {
            multiline: true,
            wrap: true
        });
        expressionTextEdit.alignment = ['fill', 'fill'];
        expressionTextEdit.preferredSize.height = 280; // Slightly reduced height
        expressionTextEdit.preferredSize.width = 360;

        // Monospace so indentation and brackets line up. ScriptUI edittext has no
        // styled-run support, so this is as far as editor formatting can go.
        try {
            expressionTextEdit.graphics.font =
                ScriptUI.newFont('Courier New', ScriptUI.FontStyle.REGULAR, 12);
        } catch (eFont) {}

        var applyModeGroup = presetContentPanel.add('group');
        applyModeGroup.orientation = 'row';
        applyModeGroup.margins = 0;
        applyModeGroup.spacing = 6;
        applyModeGroup.alignment = ['fill', 'bottom'];

        var applyModeLabel = applyModeGroup.add('statictext', undefined, 'Apply as:');
        applyModeLabel.preferredSize.width = 56;

        var applyModeDropdown = applyModeGroup.add('dropdownlist', undefined,
            ['Replace', 'Append', 'Wrap ($PREV)']);
        applyModeDropdown.alignment = ['fill', 'center'];
        applyModeDropdown.helpTip = 'Replace: overwrite the property\'s expression.\n' +
            'Append: keep the existing expression and add the preset below it.\n' +
            'Wrap: substitute $PREV in the preset with the existing expression ' +
            '(or with "value" when there is none).';

        var applyButton = applyModeGroup.add('button', undefined, 'Apply');
        applyButton.alignment = ['right', 'center'];
        applyButton.preferredSize.width = 84;
        applyButton.helpTip = 'Apply whatever is in the editor above, without saving it as a preset first.\n\n' +
            'Uses the same targeting and error reporting as double-clicking a preset.';

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
            targetLabel.text = '';
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


        function currentLayerSelection() {
            var comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) return comp.selectedLayers;
            return [];
        }

        function setPresetActionsEnabled(tabElements, on) {
            if (tabElements.deleteButton) tabElements.deleteButton.enabled = on;
            if (tabElements.renameButton) tabElements.renameButton.enabled = on;
            if (tabElements.duplicateButton) tabElements.duplicateButton.enabled = on;
            if (tabElements.moveButton) tabElements.moveButton.enabled = on;
        }

        // Recomputes tabData[config].visible (the filtered subset of .files) and
        // refills the listbox from it. Every handler indexes into .visible at event
        // time, so filtered rows and files can never drift apart.
        function fillExpressionList(tabElements, config) {
            var presetList = tabElements.presetList;
            if (!presetList) return; // the search tab has no preset list

            var files = tabData[config].files;
            var visible = [];

            if (applicableCheck.value) {
                resetApplicabilityCache(); // the selection may have moved since last time
                var selection = currentLayerSelection();
                for (var f = 0; f < files.length; f++) {
                    if (presetAppliesToSelection(files[f], selection)) visible.push(files[f]);
                }
            } else {
                for (var g = 0; g < files.length; g++) visible.push(files[g]);
            }

            tabData[config].visible = visible;

            presetList.removeAll();
            for (var i = 0; i < visible.length; i++) {
                presetList.add('item', decodeFileName(visible[i].name));
            }

            setPresetActionsEnabled(tabElements, false);

            presetList.onDoubleClick = function () {
                if (!this.selection) return;

                var file = (tabData[config].visible || [])[this.selection.index];
                if (!file) return;

                var text = readTextFile(file);
                if (text === null) {
                    showAlert('Could not read preset:\n' + file.fsName);
                    return;
                }

                updateLayerData();
                applyExpressionToSelection(text, decodeFileName(file.name));
            };

            presetList.onChange = function () {
                if (this.selection === null) {
                    setPresetActionsEnabled(tabElements, false);
                    currentPresetFile = null;
                    currentPresetConfig = null;
                    return;
                }

                var file = (tabData[config].visible || [])[this.selection.index];
                if (!file) {
                    setPresetActionsEnabled(tabElements, false);
                    currentPresetFile = null;
                    currentPresetConfig = null;
                    return;
                }

                var text = readTextFile(file);
                if (text === null) {
                    showAlert('Could not read preset:\n' + file.fsName);
                    return;
                }

                var presetName = decodeFileName(file.name);
                presetNameEdit.text = presetName;
                expressionTextEdit.text = text;
                updateTargetLabel(text, presetName);

                currentPresetFile = file;
                currentPresetConfig = config;
                setPresetActionsEnabled(tabElements, true);
            };
        }

        function rebuildAllTabLists() {
            for (var i = 0; i < expConfigs.length; i++) {
                if (expConfigs[i] === 'search') continue;
                fillExpressionList(tabs[expConfigs[i]], expConfigs[i]);
            }
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

            if (changed || !tabData[config].visible) fillExpressionList(tabs[config], config);
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
                    // Refresh always refills, so it doubles as "re-check the filter".
                    tabData[tabConfig].files = getTxtFiles(folder);
                    tabData[tabConfig].fileCount = tabData[tabConfig].files.length;
                    fillExpressionList(tabElements, tabConfig);
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

                    if (expFile.exists) {
                        if (!confirm('Do you want to overwrite the preset?')) return;
                        backupPreset(expFile); // keep the version being replaced
                    }

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
                    var file = selectedPresetFile(tabElements, tabConfig);
                    if (!file) return;

                    // Ask for confirmation before deleting: File.remove() is permanent.
                    if (!confirm('Are you sure you want to delete this expression?\n\n' + decodeFileName(file.name))) return;

                    // A copy lands in .backups first, so a misclick is recoverable.
                    backupPreset(file);

                    if (!file.remove()) {
                        showAlert('Could not delete:\n' + file.fsName);
                    }

                    refreshTabFromDisk(tabConfig);
                };
            }

            if (tabElements.renameButton) {
                tabElements.renameButton.onClick = function () {
                    var file = selectedPresetFile(tabElements, tabConfig);
                    if (!file) return;

                    var oldName = decodeFileName(file.name);
                    var input = prompt('Rename preset:', oldName, 'Rename');
                    if (input === null) return;

                    var newName = trim(input);
                    if (newName === oldName) return;

                    var problem = validatePresetName(newName);
                    if (problem) {
                        showAlert(problem);
                        return;
                    }

                    var dest = new File(folder.fsName + '/' + newName + '.txt');
                    if (!withinFolder(dest, folder)) {
                        showAlert('That name would move the preset outside its folder.');
                        return;
                    }
                    if (dest.exists) {
                        showAlert('A preset named "' + newName + '" already exists in this category.');
                        return;
                    }

                    if (!file.rename(newName + '.txt')) {
                        showAlert('Could not rename:\n' + file.fsName);
                    }

                    refreshTabFromDisk(tabConfig);
                };
            }

            if (tabElements.duplicateButton) {
                tabElements.duplicateButton.onClick = function () {
                    var file = selectedPresetFile(tabElements, tabConfig);
                    if (!file) return;

                    var oldName = decodeFileName(file.name);
                    var input = prompt('Duplicate as:', oldName + ' copy', 'Duplicate');
                    if (input === null) return;

                    var newName = trim(input);
                    var problem = validatePresetName(newName);
                    if (problem) {
                        showAlert(problem);
                        return;
                    }

                    var dest = new File(folder.fsName + '/' + newName + '.txt');
                    if (!withinFolder(dest, folder)) {
                        showAlert('That name would write outside the preset folder.');
                        return;
                    }
                    if (dest.exists) {
                        showAlert('A preset named "' + newName + '" already exists in this category.');
                        return;
                    }

                    var copied = false;
                    try {
                        copied = file.copy(dest.fsName);
                    } catch (e) {
                        copied = false;
                    }
                    if (!copied) {
                        showAlert('Could not duplicate:\n' + file.fsName);
                        return;
                    }

                    refreshTabFromDisk(tabConfig);
                };
            }

            if (tabElements.moveButton) {
                tabElements.moveButton.onClick = function () {
                    var file = selectedPresetFile(tabElements, tabConfig);
                    if (!file) return;

                    var destConfig = chooseCategory(tabConfig);
                    if (!destConfig) return;

                    var destFolder = tabData[destConfig].folder;
                    if (!destFolder) {
                        showAlert('That category has no folder on disk.');
                        return;
                    }

                    // file.name is URI-encoded and the File constructor decodes it,
                    // so non-ASCII names round-trip correctly here.
                    var dest = new File(destFolder.fsName + '/' + file.name);
                    if (dest.exists) {
                        showAlert('A preset with that name already exists in "' +
                            getTabName(destConfig) + '".');
                        return;
                    }

                    var copied = false;
                    try {
                        copied = file.copy(dest.fsName);
                    } catch (e) {
                        copied = false;
                    }
                    if (!copied) {
                        showAlert('Could not move:\n' + file.fsName);
                        return;
                    }

                    // Copy-then-delete: if the delete fails the preset still exists.
                    if (!file.remove()) {
                        showAlert('Copied to "' + getTabName(destConfig) +
                            '" but could not remove the original:\n' + file.fsName);
                    }

                    refreshTabFromDisk(tabConfig);
                    refreshTabFromDisk(destConfig);
                };
            }
        }

        function selectedPresetFile(tabElements, config) {
            var presetList = tabElements.presetList;
            if (!presetList || presetList.selection === null) {
                showAlert('Please select a preset from the list first.');
                return null;
            }

            var file = (tabData[config].visible || [])[presetList.selection.index];
            if (!file) {
                showAlert('Please select a preset from the list first.');
                return null;
            }
            return file;
        }

        // Small modal category picker used by Move.
        function chooseCategory(excludeConfig) {
            var options = [];
            for (var i = 0; i < expConfigs.length; i++) {
                var cfg = expConfigs[i];
                if (cfg === 'search' || cfg === excludeConfig) continue;
                options.push(cfg);
            }
            if (options.length === 0) return null;

            var dlg = new Window('dialog', 'Move preset');
            dlg.orientation = 'column';
            dlg.spacing = 10;
            dlg.margins = 16;
            dlg.alignChildren = ['fill', 'top'];

            dlg.add('statictext', undefined, 'Move to category:');

            var labels = [];
            for (var k = 0; k < options.length; k++) labels.push(options[k]);

            var picker = dlg.add('dropdownlist', undefined, labels);
            picker.selection = 0;
            picker.preferredSize.width = 200;

            var buttons = dlg.add('group');
            buttons.alignment = ['right', 'top'];
            var cancelBtn = buttons.add('button', undefined, 'Cancel', { name: 'cancel' });
            var okBtn = buttons.add('button', undefined, 'Move', { name: 'ok' });

            var chosen = null;
            okBtn.onClick = function () {
                if (picker.selection) chosen = options[picker.selection.index];
                dlg.close();
            };
            cancelBtn.onClick = function () {
                dlg.close();
            };

            dlg.show();
            return chosen;
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
                    var matched = false;
                    var reason = null;

                    if (needle.length === 0) {
                        matched = true;
                    } else if (fileName.toLowerCase().indexOf(needle) !== -1) {
                        matched = true;
                        reason = 'name';
                    } else {
                        // Only pay for a file read when the name itself did not match.
                        var content = readTextFileCached(file);
                        if (content !== null && content.toLowerCase().indexOf(needle) !== -1) {
                            matched = true;
                            reason = 'body';
                        }
                    }

                    if (matched) {
                        // Store the file, not its text: the body is read on demand.
                        searchResults.push({
                            fileName: fileName,
                            file: file,
                            tab: getTabName(config),
                            reason: reason
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
                // Mark body-only hits: otherwise a content match looks identical to
                // a name match and it is not obvious why the row is there.
                var suffix = (result.reason === 'body') ? '   [in body]' : '';
                tabs.search.searchResultsList.add('item', result.tab + ' - ' + result.fileName + suffix);
            }
        }

        function runSearch(searchTerm) {
            searchExpressions(searchTerm); // an empty term matches everything
            populateSearchResultsList();
        }

        // Search-as-you-type. ScriptUI has no timers, so debouncing goes through
        // app.scheduleTask, which evaluates a string later - hence the $.global hook.
        var SEARCH_DEBOUNCE_MS = 350;
        var searchTaskId = null;
        var pendingSearchTerm = '';

        $.global.GG_EXP_RUN_PENDING_SEARCH = function () {
            searchTaskId = null;
            try { runSearch(pendingSearchTerm); } catch (e) {}
        };

        function scheduleSearch(term) {
            pendingSearchTerm = term;

            if (searchTaskId !== null) {
                try { app.cancelTask(searchTaskId); } catch (e) {}
                searchTaskId = null;
            }

            try {
                searchTaskId = app.scheduleTask('GG_EXP_RUN_PENDING_SEARCH()', SEARCH_DEBOUNCE_MS, false);
            } catch (eSchedule) {
                runSearch(term); // no scheduler available: just search immediately
            }
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
                updateTargetLabel(text, result.fileName);

                // Apply the expression to selected properties
                updateLayerData(); // Ensure layer data is up to date
                applyExpressionToSelection(text, result.fileName);
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

        //--- search tab enter key + search-as-you-type
        if (tabs.search && tabs.search.searchEdit) {
            tabs.search.searchEdit.onEnterKey = function () {
                runSearch(this.text); // Enter searches now, no debounce
            };
            tabs.search.searchEdit.onChanging = function () {
                scheduleSearch(this.text);
            };
        }


        // --- @target migration helper ---

        // A curated shortlist rather than every alias key, so the dropdown stays useful.
        var COMMON_TARGETS = ['Position', 'Scale', 'Rotation', 'Orientation', 'Opacity',
            'Anchor Point', 'sourceText', 'TimeRemapping', 'Path', 'Shape Path', 'Mask Path'];

        // Returns { target: <string|null>, migrateTab: <bool> } or null when cancelled.
        // A null target means "remove the header".
        function promptForTarget(presetName, currentTarget) {
            var dlg = new Window('dialog', 'Set @target');
            dlg.orientation = 'column';
            dlg.spacing = 10;
            dlg.margins = 16;
            dlg.alignChildren = ['fill', 'top'];

            dlg.add('statictext', undefined, 'Preset:  ' + presetName);

            var pickerRow = dlg.add('group');
            pickerRow.orientation = 'row';
            pickerRow.alignChildren = ['left', 'center'];
            pickerRow.add('statictext', undefined, 'Common:');

            var picker = pickerRow.add('dropdownlist', undefined, COMMON_TARGETS);
            picker.preferredSize.width = 190;

            var customRow = dlg.add('group');
            customRow.orientation = 'row';
            customRow.alignChildren = ['left', 'center'];
            customRow.add('statictext', undefined, 'Target: ');

            var customEdit = customRow.add('edittext', undefined, currentTarget ? currentTarget : '');
            customEdit.preferredSize.width = 190;

            picker.onChange = function () {
                if (picker.selection) customEdit.text = picker.selection.text;
            };

            var note = dlg.add('statictext', undefined,
                'Written as "// @target ..." on the first line of the preset file. ' +
                'A backup is kept in .backups first.', { multiline: true });
            note.preferredSize.height = 30;

            var migrateCheck = dlg.add('checkbox', undefined,
                'Also write headers for every preset in this tab whose file name implies one');

            var buttons = dlg.add('group');
            buttons.alignment = ['right', 'top'];
            var removeBtn = buttons.add('button', undefined, 'Remove header');
            var cancelBtn = buttons.add('button', undefined, 'Cancel', { name: 'cancel' });
            var okBtn = buttons.add('button', undefined, 'Write', { name: 'ok' });

            var outcome = null;

            okBtn.onClick = function () {
                var value = trim(customEdit.text);
                if (value === '') {
                    alert('Enter a target, or use "Remove header".');
                    return;
                }
                outcome = { target: value, migrateTab: migrateCheck.value };
                dlg.close();
            };

            removeBtn.onClick = function () {
                outcome = { target: null, migrateTab: migrateCheck.value };
                dlg.close();
            };

            cancelBtn.onClick = function () {
                dlg.close();
            };

            dlg.show();
            return outcome;
        }

        // Writes explicit headers for presets whose file name already implies a
        // target, so the metadata survives a later rename.
        function migrateTabHeaders(config) {
            var files = tabData[config].files;
            var written = 0;
            var failed = 0;

            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var text = readTextFile(file);
                if (text === null) continue;

                if (parseHeader(text).target) continue; // already explicit

                var derived = getPresetTarget(text, decodeFileName(file.name));
                if (!derived) continue; // nothing derivable from the file name

                if (writeTargetHeader(file, derived)) failed++;
                else written++;
            }

            showAlert('Wrote @target headers for ' + written + ' preset' +
                (written === 1 ? '' : 's') + ' in "' + getTabName(config) + '".' +
                (failed > 0 ? '\n\nFailed on ' + failed + '.' : ''));
        }

        setTargetButton.onClick = function () {
            if (!currentPresetFile || !currentPresetConfig) {
                showAlert('Select a preset from one of the category lists first.');
                return;
            }

            var file = currentPresetFile;
            var config = currentPresetConfig;
            var presetName = decodeFileName(file.name);

            var text = readTextFile(file);
            if (text === null) {
                showAlert('Could not read preset:\n' + file.fsName);
                return;
            }

            var result = promptForTarget(presetName, getPresetTarget(text, presetName));
            if (!result) return;

            var problem = writeTargetHeader(file, result.target);
            if (problem) {
                showAlert(problem);
                return;
            }

            if (result.migrateTab) migrateTabHeaders(config);

            // Names did not change, so force a refill: the new target may change
            // whether this preset passes the applicability filter.
            fillExpressionList(tabs[config], config);

            var updated = readTextFile(file);
            if (updated !== null) {
                expressionTextEdit.text = updated;
                updateTargetLabel(updated, presetName);
            }
        };

        copyButton.onClick = function () {
            // No confirmation on success: the clipboard is its own feedback.
            if (!copyToClipboard(expressionTextEdit.text)) {
                showAlert('Could not copy to the clipboard.');
            }
        };

        // The name field feeds @target's file-name fallback and the undo group
        // label, but the untouched placeholder is not a real name.
        function editorPresetName() {
            var name = trim(presetNameEdit.text);
            if (name === '' || name === 'PresetName') return null;
            return name;
        }

        applyButton.onClick = function () {
            var text = expressionTextEdit.text;

            if (trim(text) === '' || trim(text) === 'Expression') {
                showAlert('There is no expression in the editor to apply.');
                return;
            }

            updateLayerData(); // alerts on its own when there is no active comp

            var comp = app.project.activeItem;
            if (comp instanceof CompItem && selectedLayerCount === 0) {
                showAlert('Select one or more layers, or a property, to apply to.');
                return;
            }

            applyExpressionToSelection(text, editorPresetName());
        };


        // --- Restore persisted state (before the lists are built: the filter reads it) ---

        applicableCheck.value = (loadSetting('onlyApplicable', 'false') === 'true');

        applyMode = loadSetting('applyMode', 'replace');
        var modeIndex = 0;
        for (var am = 0; am < APPLY_MODES.length; am++) {
            if (APPLY_MODES[am] === applyMode) modeIndex = am;
        }
        applyMode = APPLY_MODES[modeIndex]; // guard against a stale settings value
        applyModeDropdown.selection = modeIndex;

        applicableCheck.onClick = function () {
            saveSetting('onlyApplicable', applicableCheck.value ? 'true' : 'false');
            rebuildAllTabLists();
        };

        applyModeDropdown.onChange = function () {
            if (!applyModeDropdown.selection) return;
            applyMode = APPLY_MODES[applyModeDropdown.selection.index];
            saveSetting('applyMode', applyMode);
        };

        tabbedPanel.onChange = function () {
            var selected = tabbedPanel.selection;
            for (var i = 0; i < expConfigs.length; i++) {
                var cfg = expConfigs[i];
                if (tabs[cfg].tab !== selected) continue;

                saveSetting('activeTab', cfg);
                // Re-check applicability against whatever is selected now.
                if (cfg !== 'search' && applicableCheck.value) {
                    fillExpressionList(tabs[cfg], cfg);
                }
                break;
            }
        };


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

        var savedTab = loadSetting('activeTab', 'default');
        if (tabs[savedTab] && tabs[savedTab].tab) {
            try { tabbedPanel.selection = tabs[savedTab].tab; } catch (eTab) {}
        }

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


    // --- Preset Metadata (@target) ---
    //
    // A preset can declare which property it belongs on:
    //
    //     // @target Rotation
    //     // @desc   Bouncy overshoot
    //
    // These are ordinary JS comments, so they stay in the expression and cost
    // nothing in After Effects. When no header is present the old
    // "Name_Property.txt" filename convention is used as a fallback.

    function normalizeTarget(value) {
        if (value === null || value === undefined) return '';
        return String(value).toLowerCase().replace(/[\s_\-]+/g, '');
    }

    // Known targets. 'chains' resolve by matchName from the layer down, which is
    // exact and unambiguous. 'matchNames' are for properties that sit at an
    // unpredictable depth (mask and shape paths) and need a tree search.
    var TARGET_ALIASES = {
        'position':      { chains: [['ADBE Transform Group', 'ADBE Position']] },
        '3dposition':    { chains: [['ADBE Transform Group', 'ADBE Position']] },
        'scale':         { chains: [['ADBE Transform Group', 'ADBE Scale']] },
        'rotation':      { chains: [['ADBE Transform Group', 'ADBE Rotate Z']] },
        'zrotation':     { chains: [['ADBE Transform Group', 'ADBE Rotate Z']] },
        'xrotation':     { chains: [['ADBE Transform Group', 'ADBE Rotate X']] },
        'yrotation':     { chains: [['ADBE Transform Group', 'ADBE Rotate Y']] },
        'orientation':   { chains: [['ADBE Transform Group', 'ADBE Orientation']] },
        'opacity':       { chains: [['ADBE Transform Group', 'ADBE Opacity']] },
        'anchorpoint':   { chains: [['ADBE Transform Group', 'ADBE Anchor Point']] },
        'sourcetext':    { chains: [['ADBE Text Properties', 'ADBE Text Document']] },
        'timeremapping': { chains: [['ADBE Time Remapping']] },
        'timeremap':     { chains: [['ADBE Time Remapping']] },
        'path':          { matchNames: ['ADBE Vector Shape', 'ADBE Mask Shape'] },
        'shapepath':     { matchNames: ['ADBE Vector Shape'] },
        'maskpath':      { matchNames: ['ADBE Mask Shape'] }
    };

    function lookupAlias(key) {
        // hasOwnProperty guard: without it, a target named "constructor" or
        // "toString" would pick up an inherited Object.prototype member.
        return TARGET_ALIASES.hasOwnProperty(key) ? TARGET_ALIASES[key] : null;
    }

    // Reads "// @key value" lines from the top of a preset.
    function parseHeader(text) {
        var result = { target: null, desc: null };
        if (!text) return result;

        var lines = String(text).split(/\r\n|\r|\n/);
        var limit = (lines.length < 20) ? lines.length : 20;

        for (var i = 0; i < limit; i++) {
            var match = lines[i].match(/^\s*\/\/\s*@(\w+)\s+(.+)$/);
            if (!match) continue;

            var key = match[1].toLowerCase();
            var value = trim(match[2]);

            if (key === 'target' && !result.target) result.target = value;
            else if (key === 'desc' && !result.desc) result.desc = value;
        }
        return result;
    }

    // The header wins. Otherwise fall back to the "Name_Property" filename
    // convention, but only for suffixes that are actually known property names:
    // the library also carries suffixes like "_400", "_true" and "_simple".
    function getPresetTarget(text, presetName) {
        var header = parseHeader(text);
        if (header.target) return header.target;

        if (!presetName) return null;

        var cut = presetName.lastIndexOf('_');
        if (cut === -1) return null;

        var suffix = trim(presetName.substring(cut + 1));
        if (suffix === '') return null;

        return lookupAlias(normalizeTarget(suffix)) ? suffix : null;
    }

    // Walks a matchName chain from the layer down. Returns a Property or null.
    function resolveChain(layer, chain) {
        var node = layer;
        for (var i = 0; i < chain.length; i++) {
            try {
                node = node.property(chain[i]);
            } catch (e) {
                return null;
            }
            if (!node) return null;
        }
        try {
            if (node.propertyType !== PropertyType.PROPERTY) return null;
        } catch (eType) {
            return null;
        }
        return node;
    }

    // Breadth-first search that returns every match at the shallowest depth where
    // any match occurs, so "Opacity" finds Transform > Opacity rather than the
    // opacity buried inside a shape layer's fill.
    function findShallowestProperties(root, predicate, maxDepth) {
        var queue = [{ node: root, depth: 0 }];
        var found = [];
        var foundDepth = -1;
        var visited = 0;

        while (queue.length > 0) {
            var entry = queue.shift();
            var node = entry.node;
            var depth = entry.depth;

            if (foundDepth !== -1 && depth > foundDepth) break;
            if (++visited > 4000) break; // guard against very large shape trees

            if (depth > 0) {
                var isMatch = false;
                try { isMatch = predicate(node); } catch (e) { isMatch = false; }
                if (isMatch) {
                    found.push(node);
                    foundDepth = depth;
                    continue; // never descend into a match
                }
            }

            if (depth >= maxDepth) continue;

            var count = 0;
            try { count = node.numProperties || 0; } catch (eCount) { count = 0; }

            for (var i = 1; i <= count; i++) {
                try {
                    var child = node.property(i);
                    if (child) queue.push({ node: child, depth: depth + 1 });
                } catch (eChild) {}
            }
        }
        return found;
    }

    function makeMatchNameMatcher(matchNames) {
        return function (prop) {
            if (prop.propertyType !== PropertyType.PROPERTY) return false;
            for (var i = 0; i < matchNames.length; i++) {
                if (prop.matchName === matchNames[i]) return true;
            }
            return false;
        };
    }

    function makeNameMatcher(target) {
        var needle = normalizeTarget(target);
        return function (prop) {
            if (prop.propertyType !== PropertyType.PROPERTY) return false;
            if (!prop.canSetExpression) return false;
            return normalizeTarget(prop.name) === needle ||
                normalizeTarget(prop.matchName) === needle;
        };
    }

    // Returns { props: [...], ambiguous: [names] | null }. An ambiguous result
    // applies nothing on purpose: guessing between six shape paths is worse than
    // asking the user to select the one they meant.
    function resolveTarget(layer, target) {
        var key = normalizeTarget(target);
        if (key === '' || key === 'any' || key === 'all') return { props: [], ambiguous: null };

        var alias = lookupAlias(key);

        if (alias && alias.chains) {
            for (var c = 0; c < alias.chains.length; c++) {
                var prop = resolveChain(layer, alias.chains[c]);
                if (prop) return { props: [prop], ambiguous: null };
            }
        }

        var hits = [];
        if (alias && alias.matchNames) {
            hits = findShallowestProperties(layer, makeMatchNameMatcher(alias.matchNames), 12);
        }
        if (hits.length === 0) {
            hits = findShallowestProperties(layer, makeNameMatcher(target), 8);
        }

        if (hits.length === 1) return { props: hits, ambiguous: null };
        if (hits.length > 1) {
            var names = [];
            for (var h = 0; h < hits.length && h < 6; h++) names.push(hits[h].name);
            if (hits.length > 6) names.push('...');
            return { props: [], ambiguous: names };
        }
        return { props: [], ambiguous: null };
    }

    // True when at least one of the given properties is the declared target.
    function selectionMatchesTarget(props, target) {
        var key = normalizeTarget(target);
        var alias = lookupAlias(key);

        // Accept the target itself plus whatever matchNames the alias resolves to.
        var wanted = { '@': true };
        wanted['@' + key] = true;

        if (alias && alias.chains) {
            for (var c = 0; c < alias.chains.length; c++) {
                var chain = alias.chains[c];
                wanted['@' + normalizeTarget(chain[chain.length - 1])] = true;
            }
        }
        if (alias && alias.matchNames) {
            for (var m = 0; m < alias.matchNames.length; m++) {
                wanted['@' + normalizeTarget(alias.matchNames[m])] = true;
            }
        }

        for (var i = 0; i < props.length; i++) {
            try {
                if (wanted['@' + normalizeTarget(props[i].name)] === true) return true;
                if (wanted['@' + normalizeTarget(props[i].matchName)] === true) return true;
            } catch (e) {}
        }
        return false;
    }


    // Writes or replaces the "// @target ..." line at the top of a preset file.
    // Pass null as the target to remove the line. Returns an error string, or null
    // on success.
    function writeTargetHeader(file, target) {
        var text = readTextFile(file);
        if (text === null) return 'Could not read ' + file.fsName;

        var lines = text.split(/\r\n|\r|\n/);
        var headerLine = (target === null) ? null : '// @target ' + target;
        var limit = (lines.length < 20) ? lines.length : 20;
        var replacedAt = -1;

        for (var i = 0; i < limit; i++) {
            if (/^\s*\/\/\s*@target\s+/.test(lines[i])) {
                replacedAt = i;
                break;
            }
        }

        if (replacedAt !== -1) {
            if (headerLine === null) lines.splice(replacedAt, 1);
            else lines[replacedAt] = headerLine;
        } else if (headerLine !== null) {
            lines.unshift(headerLine);
        } else {
            return null; // asked to remove a header that was not there
        }

        backupPreset(file);

        try {
            file.encoding = 'UTF-8';
            if (!file.open('w')) return 'Could not write ' + file.fsName;
            file.write(lines.join('\n'));
        } catch (e) {
            return 'Error writing ' + file.fsName + ': ' + e.toString();
        } finally {
            try { file.close(); } catch (eClose) {}
        }

        return null;
    }

    // Builds "Transform > Rotation" for the resolution preview.
    function propertyDisplayPath(property) {
        var parts = [];
        var node = property;
        var depth = 0;

        while (node && depth < 8) {
            var name = null;
            try { name = node.name; } catch (e) { name = null; }
            if (!name) break;

            parts.unshift(name);
            try { node = node.parentProperty; } catch (eParent) { node = null; }
            depth++;
        }

        return (parts.length > 0) ? parts.join(' > ') : '?';
    }

    // Human-readable answer to "will this preset actually land somewhere?"
    function describeTargetResolution(text, presetName) {
        var target = getPresetTarget(text, presetName);
        if (!target) return { target: null, info: 'no declared target - uses the selected properties' };

        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) {
            return { target: target, info: 'no active composition' };
        }

        var layers = comp.selectedLayers;
        if (layers.length === 0) {
            return { target: target, info: 'select layers to preview where this lands' };
        }

        var resolved = 0;
        var ambiguous = 0;
        var missing = 0;
        var samplePath = null;

        for (var i = 0; i < layers.length; i++) {
            var r = resolveTarget(layers[i], target);
            if (r.ambiguous) { ambiguous++; continue; }
            if (r.props.length === 0) { missing++; continue; }

            resolved++;
            if (!samplePath) samplePath = propertyDisplayPath(r.props[0]);
        }

        var parts = [];
        if (resolved > 0) {
            parts.push(samplePath + ' on ' + resolved + ' of ' + layers.length +
                ' layer' + (layers.length === 1 ? '' : 's'));
        }
        if (ambiguous > 0) parts.push(ambiguous + ' ambiguous');
        if (missing > 0) parts.push(missing + ' not found');

        return {
            target: target,
            info: (parts.length > 0) ? parts.join(', ') : 'not found on the selection'
        };
    }

    // Distinct targets repeat heavily across a category (nine presets all target
    // "Path"), and a tree search is not free, so resolution is memoised for the
    // duration of one filter pass. Reset it whenever the selection may have moved.
    var applicabilityCache = {};

    function resetApplicabilityCache() {
        applicabilityCache = {};
    }

    function targetResolvesInSelection(target, selection) {
        var key = '@' + normalizeTarget(target);
        if (applicabilityCache.hasOwnProperty(key)) return applicabilityCache[key];

        var result = false;
        for (var i = 0; i < selection.length; i++) {
            if (resolveTarget(selection[i], target).props.length > 0) {
                result = true;
                break;
            }
        }

        applicabilityCache[key] = result;
        return result;
    }

    // Is this preset usable on the current layer selection? Presets with no declared
    // target are always kept: they follow the property selection, so there is
    // nothing to test them against.
    function presetAppliesToSelection(file, selection) {
        if (selection.length === 0) return true;

        var text = readTextFileCached(file);
        if (text === null) return true;

        var target = getPresetTarget(text, decodeFileName(file.name));
        if (!target) return true;

        return targetResolvesInSelection(target, selection);
    }


    // --- Applying Expressions ---

    function layerLabel(layer) {
        try { return layer.name; } catch (e) { return 'layer'; }
    }

    function timeRemapHint(layer, target) {
        var key = normalizeTarget(target);
        if (key !== 'timeremapping' && key !== 'timeremap') return '';
        try {
            if (layer.timeRemapEnabled === false) return ' (Time Remapping is not enabled)';
        } catch (e) {}
        return '';
    }

    function noteOnce(report, message) {
        for (var i = 0; i < report.notes.length; i++) {
            if (report.notes[i] === message) return;
        }
        report.notes.push(message);
    }

    function applyToProperty(layer, property, preset, report) {
        var where = layerLabel(layer) + ' > ';
        try {
            where += property.name;
        } catch (eName) {
            where += '?';
        }

        try {
            if (!property.canSetExpression) {
                report.skipped.push(where + ': cannot take an expression');
                return;
            }

            var existing = '';
            try { existing = property.expression || ''; } catch (eGet) { existing = ''; }

            var composed = composeExpression(preset, existing, applyMode);
            if (composed.note) noteOnce(report, composed.note);

            property.expression = composed.text;

            // After Effects accepts the assignment and then quietly disables a
            // broken expression, so reading the error back is the only way to
            // know whether it actually took.
            var err = '';
            try { err = property.expressionError; } catch (eErr) { err = ''; }

            if (err) {
                report.errors.push({ where: where, message: err });
            } else {
                report.applied++;
            }
        } catch (e) {
            report.errors.push({ where: where, message: e.toString() });
        }
    }

    function reportApplyResult(presetName, target, report) {
        var lines = [];

        if (report.errors.length > 0) {
            lines.push('Applied to ' + report.applied + ', failed on ' + report.errors.length + '.');
            for (var e = 0; e < report.errors.length; e++) {
                lines.push('');
                lines.push('ERROR   ' + report.errors[e].where);
                lines.push('        ' + report.errors[e].message);
            }
        } else if (report.applied === 0) {
            lines.push('Nothing was applied.');
        }

        if (report.skipped.length > 0) {
            if (lines.length > 0) lines.push('');
            for (var s = 0; s < report.skipped.length; s++) {
                lines.push('SKIPPED ' + report.skipped[s]);
            }
        }

        if (report.notes.length > 0) {
            if (lines.length > 0) lines.push('');
            for (var n = 0; n < report.notes.length; n++) {
                lines.push('NOTE    ' + report.notes[n]);
            }
        }

        // Stay silent on a clean apply.
        if (lines.length === 0) return;

        var header = presetName ? presetName : 'Expression';
        if (target) header += '   [target: ' + target + ']';

        showAlert(header + '\n\n' + lines.join('\n'));
    }

    // Applies an expression to the explicitly selected properties when there are
    // any, and otherwise to the property the preset declares via @target. An
    // explicit selection always wins; a disagreement is reported, not overridden.
    function applyExpressionToSelection(expression, presetName) {
        if (selectedLayerCount === 0) return;

        var target = getPresetTarget(expression, presetName);
        var report = { applied: 0, errors: [], skipped: [], notes: [] };

        app.beginUndoGroup(presetName ? 'Apply: ' + presetName : 'SetExpression');
        try {
            for (var i = 0; i < selectedLayerCount; i++) {
                var layer = selectedLayers[i];

                var props = [];
                try { props = layer.selectedProperties || []; } catch (eSel) { props = []; }
                var explicit = (props.length > 0);

                if (!explicit) {
                    if (!target) {
                        report.skipped.push(layerLabel(layer) +
                            ': no property selected, and this preset does not declare a target');
                        continue;
                    }

                    var resolved = resolveTarget(layer, target);
                    if (resolved.ambiguous) {
                        report.skipped.push(layerLabel(layer) + ': "' + target + '" is ambiguous (' +
                            resolved.ambiguous.join(', ') + ') - select the one you want');
                        continue;
                    }
                    if (resolved.props.length === 0) {
                        report.skipped.push(layerLabel(layer) + ': no "' + target + '" property found' +
                            timeRemapHint(layer, target));
                        continue;
                    }
                    props = resolved.props;
                }

                for (var j = 0; j < props.length; j++) {
                    applyToProperty(layer, props[j], expression, report);
                }

                if (explicit && target && !selectionMatchesTarget(props, target)) {
                    report.notes.push(layerLabel(layer) + ': used the selected propert' +
                        (props.length === 1 ? 'y' : 'ies') +
                        ', but this preset targets "' + target + '"');
                }
            }
        } finally {
            app.endUndoGroup();
        }

        reportApplyResult(presetName, target, report);
    }


    // --- Initialization ---

    var mainUI = buildUI(thisObj);
    if (!(mainUI instanceof Panel)) mainUI.show();

}

GG_ExpManager(this);
