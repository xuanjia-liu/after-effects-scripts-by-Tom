// ScriptManager v3.6
// Author: Jiaxuan Liu

(function ScriptManager(thisObj) {
    // Globals
    var ScriptManagerData = new Object();
    ScriptManagerData.scriptName = "ScriptManager";
    ScriptManagerData.scriptTitle = ScriptManagerData.scriptName + " v3.6";
    ScriptManagerData.scriptPath = "";
    ScriptManagerData.scriptFiles = new Array();
    ScriptManagerData.currentFilter = ""; // Added current filter

    ScriptManagerData.strSourceFolder = "Source Folder...";
    ScriptManagerData.strShowPaths = "Show paths";
    ScriptManagerData.strRefreshList = "Refresh";
    ScriptManagerData.strRun = "Run";
    ScriptManagerData.strOpenFolder = "Open Folder";
    ScriptManagerData.strOpenScript = "Open Script";
    ScriptManagerData.strDeleteScript = "Delete Script";
    ScriptManagerData.strConfirmDelete = "Are you sure you want to delete this script?";
    ScriptManagerData.strErrNoScriptsPath = "Cannot open the palette because the Scripts folder could not be located.";
    ScriptManagerData.strErrMissingFile = "Cannot locate the selected script.";
    ScriptManagerData.strErrOpenScript = "Could not open the script.";
    ScriptManagerData.strErrDeleteScript = "Could not delete the script.";
    ScriptManagerData.strMinAE100 = "This script requires Adobe After Effects CS5 or later.";

    // Filter paths (adjust these to match your folder structure)
    ScriptManagerData.filterPaths = ["SmallTools", "Toolsets", "Duik", "3d", "AR scripts", "scriptsCol2"];

    // Function to open a folder
    function openFolder(folder) {
        folder.execute();
    }

    // Build the user interface
    function ScriptManager_buildUI(thisObj) {
        var positionPal = (app.settings.haveSetting("redefinery", "ScriptManager_frameBounds") && !(thisObj instanceof Panel));
        var bounds = positionPal ? app.settings.getSetting("redefinery", "ScriptManager_frameBounds").split(",").map(Number) : undefined;

        var pal = (thisObj instanceof Panel) ? thisObj : new Window("palette", ScriptManagerData.scriptName, bounds, { resizeable: true });

        if (pal !== null) {
            var res =
                "group { \
                orientation:'column', alignment:['fill','fill'], spacing:3, \
                header: Group { \
                    orientation:'column', alignment:['fill','top'], spacing:3, \
                    filterGroup: Group { \
                        orientation:'row', alignment:'left', spacing:2, \
                    }, \
                    searchGroup: Group { \
                        orientation:'row', alignment:['fill','center'],  \
                        searchLabel: StaticText { text:'Search:', preferredSize:[35, 18], style:'bold' }, \
                        searchBar: EditText { text:'', alignment:['fill','center'], preferredSize:[160, 18] }, \
                    }, \
                }, \
                listBox: ListBox { alignment:['fill','fill'], properties:{items:" + ScriptManagerData.scripts + "} }, \
                buttonGroup: Group { \
                    orientation:'row', alignment:['left','bottom'], spacing:3, \
                    runBtn: Button { text:'" + ScriptManagerData.strRun + "', preferredSize:[65,20], enabled: false }, \
                    openBtn: Button { text:'" + ScriptManagerData.strOpenScript + "', preferredSize:[65,20], enabled: false }, \
                    deleteBtn: Button { text:'" + ScriptManagerData.strDeleteScript + "', preferredSize:[65,20], enabled: false }, \
                }, \
                footer: Group { \
                    alignment:['fill','bottom'], spacing:2, \
                    sourceBtn: Button { text:'" + ScriptManagerData.strSourceFolder + "', alignment:['left','center'], preferredSize:[-1,20] }, \
                    openFolderBtn: Button { text:'" + ScriptManagerData.strOpenFolder + "', alignment:['left','center'], preferredSize:[-1,20] }, \
                    showPaths: Checkbox { text:'" + ScriptManagerData.strShowPaths + "', alignment:['left','bottom'], value:true }, \
                    refresh: Button { text:'" + ScriptManagerData.strRefreshList + "', alignment:['right','center'], preferredSize:[-1,20] }, \
                }, \
            }";
            pal.grp = pal.add(res);

            pal.grp.listBox.preferredSize.height = 250;

            // Add "All" button
            var allBtn = pal.grp.header.filterGroup.add("button", undefined, "All");
            allBtn.preferredSize = [30, 18];
            allBtn.onClick = function() {
                ScriptManagerData.currentFilter = "";
                ScriptManager_buildScriptsList(pal, pal.grp.header.searchGroup.searchBar.text);
                updateButtonStates();
            };

            // Add filter buttons
            for (var i = 0; i < ScriptManagerData.filterPaths.length; i++) {
                var filterName = ScriptManagerData.filterPaths[i];
                var btn = pal.grp.header.filterGroup.add("button", undefined, filterName);
                btn.preferredSize = [60, 18];
                btn.onClick = (function(filter) { // Closure to capture the current filter
                    return function() {
                        ScriptManagerData.currentFilter = filter;
                        ScriptManager_buildScriptsList(pal, pal.grp.header.searchGroup.searchBar.text);
                        updateButtonStates();
                    };
                })(filterName);
            }

            pal.layout.layout(true);
            pal.grp.minimumSize = [pal.grp.size.width, pal.grp.header.size.height + pal.grp.spacing * 5];
            pal.layout.resize();
            pal.onResizing = pal.onResize = function () { this.layout.resize(); }
            pal.grp.footer.sourceBtn.onClick = function () { ScriptManager_doSelectFolder(pal); };
            pal.grp.footer.openFolderBtn.onClick = function () { ScriptManager_doOpenFolder(pal); };
            pal.grp.footer.refresh.onClick = function () { ScriptManager_doRefreshList(pal); };
            pal.grp.listBox.onDoubleClick = function () { ScriptManager_doRun(pal); };

            pal.grp.footer.showPaths.onClick = function () {
                ScriptManager_buildScriptsList(pal, pal.grp.header.searchGroup.searchBar.text);
                updateButtonStates();
            }

            // Button actions
            pal.grp.buttonGroup.runBtn.onClick = function () { ScriptManager_doRun(pal); };
            pal.grp.buttonGroup.openBtn.onClick = function () { ScriptManager_doOpenScript(pal); };
            pal.grp.buttonGroup.deleteBtn.onClick = function () { ScriptManager_doDeleteScript(pal); };

            // Enable/disable buttons based on list selection
            function updateButtonStates() {
                var hasSelection = pal.grp.listBox.selection !== null;
                pal.grp.buttonGroup.runBtn.enabled = hasSelection;
                pal.grp.buttonGroup.openBtn.enabled = hasSelection;
                pal.grp.buttonGroup.deleteBtn.enabled = hasSelection;
            }

            pal.grp.listBox.onChange = updateButtonStates;
            updateButtonStates(); // Initial button state

            // Search bar functionality
            pal.grp.header.searchGroup.searchBar.onChanging = function () {
                ScriptManagerData.currentFilter = ""; // Clear path filter on search
                ScriptManager_buildScriptsList(pal, this.text);
                updateButtonStates();
            };

        }

        return pal;
    }

    // Ask user to locate Scripts folder
    function ScriptManager_doSelectFolder(palette) {
        var folder = Folder.selectDialog("Select AE Scripts folder");
        if (folder !== null) {
            ScriptManagerData.scriptPath = folder;
            app.settings.saveSetting("redefinery", "ScriptManager_scriptPath", folder.fsName);
            ScriptManager_buildScriptsList(palette, palette.grp.header.searchGroup.searchBar.text);
        }
    }

    // Rescan and rebuild the scripts list
    function ScriptManager_doRefreshList(palette) {
        ScriptManager_buildScriptsList(palette, palette.grp.header.searchGroup.searchBar.text);
    }

    // Run the selected script
    function ScriptManager_doRun(palette) {
        var scriptSelected = (palette.grp.listBox.selection !== null);
        if (scriptSelected) {
            // Get the full script path from the list item's data
            var scriptPath = palette.grp.listBox.selection.text; // Use text, as we're not storing data separately in this simple case
            for (var i = 0; i < ScriptManagerData.scriptFiles.length; i++) {
                if (palette.grp.footer.showPaths.value) {
                    var displayName = ScriptManagerData.scriptFiles[i].fsName.substring(ScriptManagerData.scriptPath.fsName.length + 1);
                    if (displayName === scriptPath) {
                        var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                        if (scriptFile.exists)
                            $.evalFile(scriptFile);
                        else
                            alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                        return; // Exit after finding and running
                    }
                } else {
                    if (ScriptManagerData.scriptFiles[i].displayName === scriptPath) {
                        var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                        if (scriptFile.exists)
                            $.evalFile(scriptFile);
                        else
                            alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                        return; // Exit after finding and running
                    }
                }
            }
        }
    }

    // Show the scripts folder in Explorer/Finder
    function ScriptManager_doOpenFolder(palette) {
        if (ScriptManagerData.scriptPath) {
            var scriptsFolder = new Folder(ScriptManagerData.scriptPath);
            openFolder(scriptsFolder);
        } else {
            alert(ScriptManagerData.strErrNoScriptsPath, ScriptManagerData.scriptName);
        }
    }

    // Open the selected script in the default editor
    function ScriptManager_doOpenScript(palette) {
        var scriptSelected = (palette.grp.listBox.selection !== null);
        if (scriptSelected) {
            // Get the full script path from the list item's data
            var scriptPath = palette.grp.listBox.selection.text;
            for (var i = 0; i < ScriptManagerData.scriptFiles.length; i++) {
                if (palette.grp.footer.showPaths.value) {
                    var displayName = ScriptManagerData.scriptFiles[i].fsName.substring(ScriptManagerData.scriptPath.fsName.length + 1);
                    if (displayName === scriptPath) {
                        var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                        if (scriptFile.exists) {
                            try {
                                scriptFile.execute(); // Attempts to open with default associated application
                            } catch (e) {
                                alert(ScriptManagerData.strErrOpenScript + "\n" + e, ScriptManagerData.scriptName);
                            }
                        } else {
                            alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                        }
                        return; // Exit after finding and opening
                    }
                } else {
                    if (ScriptManagerData.scriptFiles[i].displayName === scriptPath) {
                        var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                        if (scriptFile.exists) {
                            try {
                                scriptFile.execute(); // Attempts to open with default associated application
                            } catch (e) {
                                alert(ScriptManagerData.strErrOpenScript + "\n" + e, ScriptManagerData.scriptName);
                            }
                        } else {
                            alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                        }
                        return; // Exit after finding and opening
                    }
                }
            }
        }
    }

    // Delete the selected script
    function ScriptManager_doDeleteScript(palette) {
        var scriptSelected = (palette.grp.listBox.selection !== null);
        if (scriptSelected) {
            if (confirm(ScriptManagerData.strConfirmDelete)) {
                // Get the full script path from the list item's data
                var scriptPath = palette.grp.listBox.selection.text;
                for (var i = 0; i < ScriptManagerData.scriptFiles.length; i++) {
                    if (palette.grp.footer.showPaths.value) {
                        var displayName = ScriptManagerData.scriptFiles[i].fsName.substring(ScriptManagerData.scriptPath.fsName.length + 1);
                        if (displayName === scriptPath) {
                            var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                            if (scriptFile.exists) {
                                try {
                                    if (scriptFile.remove()) {
                                        ScriptManager_buildScriptsList(palette, palette.grp.header.searchGroup.searchBar.text);
                                    } else {
                                        alert(ScriptManagerData.strErrDeleteScript, ScriptManagerData.scriptName);
                                    }
                                } catch (e) {
                                    alert(ScriptManagerData.strErrDeleteScript + "\n" + e, ScriptManagerData.scriptName);
                                }
                            } else {
                                alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                            }
                            return; // Exit after finding and deleting
                        }
                    } else {
                        if (ScriptManagerData.scriptFiles[i].displayName === scriptPath) {
                            var scriptFile = new File(ScriptManagerData.scriptFiles[i].absoluteURI);
                            if (scriptFile.exists) {
                                try {
                                    if (scriptFile.remove()) {
                                        ScriptManager_buildScriptsList(palette, palette.grp.header.searchGroup.searchBar.text);
                                    } else {
                                        alert(ScriptManagerData.strErrDeleteScript, ScriptManagerData.scriptName);
                                    }
                                } catch (e) {
                                    alert(ScriptManagerData.strErrDeleteScript + "\n" + e, ScriptManagerData.scriptName);
                                }
                            } else {
                                alert(ScriptManagerData.strErrMissingFile, ScriptManagerData.scriptName);
                            }
                            return; // Exit after finding and deleting
                        }
                    }
                }
            }
        }
    }

    // Sort File and Folder objects by name
    function ScriptManager_sortByName(a, b) {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0);
    }

    // Retrieve the list of scripts
    function ScriptManager_getAEScripts(path) {
        var pathFiles = path.getFiles();
        var files = [];

        pathFiles.sort(ScriptManager_sortByName);

        for (var i = 0; i < pathFiles.length; i++) {
            var file = pathFiles[i];
            if (file instanceof Folder) {
                if (!file.name.match(/^\(.*\)$/)) {
                    var subfiles = ScriptManager_getAEScripts(file);
                    files.push.apply(files, subfiles); // Append subfiles
                }
            } else if (file.name.match(/\.(js|jsx|jsxbin)$/) && (file.fsName !== File($.fileName).fsName)) {
                files.push(file);
            }
        }
        return files;
    }

    // Build the contents of the scripts list
    function ScriptManager_buildScriptsList(palette, searchText) {
        palette.grp.listBox.removeAll();
        ScriptManagerData.scriptFiles = ScriptManager_getAEScripts(ScriptManagerData.scriptPath);

        for (var i = 0; i < ScriptManagerData.scriptFiles.length; i++) {
            var file = ScriptManagerData.scriptFiles[i];
            var fullName = file.fsName;
            var iconFile = new File(fullName.replace(/.(js|jsx|jsxbin)$/, ".png"));

            var showPath = palette.grp.footer.showPaths.value;
            var displayName = showPath ? fullName.substring(ScriptManagerData.scriptPath.fsName.length + 1) : file.displayName;

            var matchesSearch = !searchText || displayName.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
            var matchesFilter = !ScriptManagerData.currentFilter || fullName.indexOf(ScriptManagerData.currentFilter) !== -1;

            if (matchesSearch && matchesFilter) {
                var item = palette.grp.listBox.add("item", displayName);
                if (iconFile.exists)
                    item.icon = iconFile;
            }
        }
    }

    // Main code
    if (parseFloat(app.version) < 10.0)
        alert(ScriptManagerData.strMinAE100, ScriptManagerData.scriptName);
    else {
        var gotScriptPath = app.settings.haveSetting("redefinery", "ScriptManager_scriptPath");
        if (gotScriptPath) {
            ScriptManagerData.scriptPath = new Folder(app.settings.getSetting("redefinery", "ScriptManager_scriptPath"));
        } else {
            var folder = Folder.selectDialog("Locate AE's Scripts folder");
            if (folder !== null) {
                ScriptManagerData.scriptPath = folder;
                app.settings.saveSetting("redefinery", "ScriptManager_scriptPath", folder.fsName);
            }
        }

        var rdslPal = ScriptManager_buildUI(thisObj);
        if (rdslPal !== null) {
            if (app.settings.haveSetting("redefinery", "ScriptManager_showPaths"))
                rdslPal.grp.footer.showPaths.value = (app.settings.getSetting("redefinery", "ScriptManager_showPaths") === "false") ? false : true;

            if (gotScriptPath)
                ScriptManager_buildScriptsList(rdslPal, rdslPal.grp.header.searchGroup.searchBar.text);
            else
                alert(ScriptManagerData.strErrNoScriptsPath, ScriptManagerData.scriptName);

            rdslPal.onClose = function () {
                app.settings.saveSetting("redefinery", "ScriptManager_showPaths", rdslPal.grp.footer.showPaths.value);
                if (!(rdslPal instanceof Panel))
                    app.settings.saveSetting("redefinery", "ScriptManager_frameBounds", rdslPal.frameBounds.toString());
            }

            if (rdslPal instanceof Window) {
                rdslPal.show();
            } else
                rdslPal.layout.layout(true);
        }
    }
})(this);