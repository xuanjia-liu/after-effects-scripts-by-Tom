(function () {
    var scriptName = "Layer Parenting Tools";
    var scriptVersion = "1.2";

    // Define Icons as string values representing a unicode icon character
    var iconParentAbove = "\u2191";    // Up Arrow
    var iconParentFirst = "1︎⃣";   // Number 1 with Combining Enclosing Keycap
    var iconParentOrder = "⇶";   // Right Arrow With Circle
    var iconBreakParents = "\u2716";  // Multiplication Sign
    var iconReverseParents = "⇵"; // Up Down Arrow
    var iconFindParent = "🔍";  // Magnifying Glass
    
    // Status message display handling
    var statusText;
    function updateStatus(message) {
        if (statusText) {
            statusText.text = message;
            // Create a timer to clear the message after 3 seconds
            var timer = $.setTimeout(function() {
                statusText.text = "Press 'X' to scroll to layer. Alt+click for alternates. Shift+click to move & parent.";
            }, 3000);
        }
    }

    // Utility functions
    function getCompOrAlert() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return null;
        }
        return comp;
    }

    function ensureSelection(comp, minLayers) {
        minLayers = minLayers || 1;
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length < minLayers) {
            alert("Select at least " + minLayers + " layer" + (minLayers > 1 ? "s" : "") + ".");
            return null;
        }
        return selectedLayers;
    }
    
    // Enhanced logging that updates UI
    function logParentResults(actionName, count) {
        var message = actionName + ": " + (count > 0 ? 
            count + " layer" + (count !== 1 ? "s" : "") + " processed successfully!" : 
            "No layers were processed.");
        
        // Update UI status if UI is open
        updateStatus(message);
        
        // Also log to console
        $.writeln(scriptName + " " + message);
    }

    //Parent Functions
    function parentSelectedToAbove(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        var isParentBelow = ScriptUI.environment.keyboardState.altKey;
        app.beginUndoGroup(scriptName + " Parent to " + (isParentBelow ? "Below" : "Above"));
        
        var parentedCount = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            var curLayer = selectedLayers[i];
            var parentLayerIndex = curLayer.index + (isParentBelow ? 1 : -1);

            if (parentLayerIndex <= 0 || parentLayerIndex > comp.numLayers) {
                continue;
            }

            var parentLayer = comp.layer(parentLayerIndex);
            curLayer.parent = parentLayer;
            parentedCount++;
        }
        
        app.endUndoGroup();
        logParentResults("Parent to " + (isParentBelow ? "Below" : "Above"), parentedCount);
    }

    function parentSelectedToFirst(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp, 2);
        if (!selectedLayers) return;

        var isParentLast = ScriptUI.environment.keyboardState.altKey;
        app.beginUndoGroup(scriptName + " Parent to " + (isParentLast ? "Last" : "First"));

        var parentedCount = 0;
        var allLayers = comp.layers;
        var firstLayer = null;
        var lastLayer = null;
        
        // Find first and last selected layers based on selection order
        for (var i = 1; i <= allLayers.length; i++) {
            var curLayer = allLayers[i];
            if (curLayer.selected === true) {
                if (!firstLayer) {
                    firstLayer = curLayer;
                }
                lastLayer = curLayer;
            }
        }
        
        var parentLayer = isParentLast ? lastLayer : firstLayer;
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var curLayer = selectedLayers[i];
            if (curLayer === parentLayer) {
                continue;
            }
            curLayer.parent = parentLayer;
            parentedCount++;
        }
        
        app.endUndoGroup();
        logParentResults("Parent to " + (isParentLast ? "Last" : "First"), parentedCount);
    }
    
    function parentSelectedInOrder(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp, 2);
        if (!selectedLayers) return;
        
        var isReverseOrder = ScriptUI.environment.keyboardState.altKey;
        app.beginUndoGroup(scriptName + " Parent In " + (isReverseOrder ? "Reverse Order" : "Order"));
        
        var parentedCount = 0;
        
        if (isReverseOrder) {
            for (var i = 1; i < selectedLayers.length; i++) {
                var curLayer = selectedLayers[i];
                var parentLayer = selectedLayers[i - 1];
                if (parentLayer && curLayer) {
                    curLayer.parent = parentLayer;
                    parentedCount++;
                }
            }
        } else {
            for (var i = selectedLayers.length - 2; i >= 0; i--) {
                var curLayer = selectedLayers[i];
                var parentLayer = selectedLayers[i + 1];
                if (parentLayer && curLayer) {
                    curLayer.parent = parentLayer;
                    parentedCount++;
                }
            }
        }

        app.endUndoGroup();
        logParentResults("Parent In " + (isReverseOrder ? "Reverse Order" : "Order"), parentedCount);
    }
    
    function reverseParents(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        var isReverseBack = ScriptUI.environment.keyboardState.altKey;
        app.beginUndoGroup(scriptName + " " + (isReverseBack ? "Reverse Back Parents" : "Reverse Parents"));
        
        var reversedCount = 0;

        for (var i = 0; i < selectedLayers.length; i++) {
            var curLayer = selectedLayers[i];
            if (curLayer.parent) {
                var oldParent = curLayer.parent;
                var oldChild = curLayer;
                
                if (isReverseBack) {
                    oldParent.parent = null;
                    oldChild.parent = oldParent;
                } else {
                    curLayer.parent = null; // Unparent the child
                    oldParent.parent = curLayer; // Make the child the parent of the previous parent
                }
                reversedCount++;
            }
        }

        app.endUndoGroup();
        logParentResults((isReverseBack ? "Reverse Back Parents" : "Reverse Parents"), reversedCount);
    }
    
    //Find Parent Function
    function findParent(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        var isFindChild = ScriptUI.environment.keyboardState.altKey;
        app.beginUndoGroup(scriptName + " Find " + (isFindChild ? "Child" : "Parent"));
        
        var foundCount = 0;

        // Deselect all current layers
        for (var i = 0; i < selectedLayers.length; i++) {
            selectedLayers[i].selected = false;
        }

        if (isFindChild) {
            for (var i = 0; i < selectedLayers.length; i++) {
                var curLayer = selectedLayers[i];
                for (var j = 1; j <= comp.numLayers; j++) {
                    var potentialChild = comp.layer(j);
                    if (potentialChild.parent === curLayer) {
                        potentialChild.selected = true;
                        foundCount++;
                    }
                }
            }
        } else {
            for (var i = 0; i < selectedLayers.length; i++) {
                var curLayer = selectedLayers[i];
                if (curLayer.parent) {
                    curLayer.parent.selected = true;
                    foundCount++;
                }
            }
        }
        
        if (foundCount === 0) {
            alert("No " + (isFindChild ? "child" : "parent") + " layer(s) found for the selected layer(s).");
        }
        
        app.endUndoGroup();
        logParentResults("Find " + (isFindChild ? "Child" : "Parent"), foundCount);
    }
    
    // Find all descendants/children recursively
    function findAllChildren(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        app.beginUndoGroup(scriptName + " Find All Children");
        
        var foundCount = 0;
        var layersToCheck = [];
        
        // Store original selection
        for (var i = 0; i < selectedLayers.length; i++) {
            layersToCheck.push(selectedLayers[i]);
        }
        
        // Deselect all current layers
        for (var i = 0; i < selectedLayers.length; i++) {
            selectedLayers[i].selected = false;
        }
        
        // Use a recursive approach to find all descendants
        while (layersToCheck.length > 0) {
            var currentLayer = layersToCheck.shift();
            
            // Find direct children
            for (var j = 1; j <= comp.numLayers; j++) {
                var potentialChild = comp.layer(j);
                if (potentialChild.parent === currentLayer) {
                    potentialChild.selected = true;
                    foundCount++;
                    // Add this child to the check queue to find its children
                    layersToCheck.push(potentialChild);
                }
            }
        }
        
        if (foundCount === 0) {
            alert("No child layers found in the hierarchy.");
        }
        
        app.endUndoGroup();
        logParentResults("Find All Children", foundCount);
    }

    // Detach Parent - simpler version that just detaches selected layers
    function detachParent(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        var isBreakAll = ScriptUI.environment.keyboardState.altKey;
        var confirmBreak = true;
        
        if (isBreakAll) {
            confirmBreak = confirm("This will clear the parent hierarchies of all layers in the composition.\nDo you wish to proceed?");
        }

        if (confirmBreak) {
            app.beginUndoGroup(scriptName + " " + (isBreakAll ? "Clear All Parents" : "Detach Parent"));

            var detachedCount = 0;
            
            if (isBreakAll) {
                // In After Effects, layer collections are 1-based, not 0-based
                for (var i = 1; i <= comp.numLayers; i++) {
                    var curLayer = comp.layer(i);
                    if (curLayer.parent) {
                        curLayer.parent = null;
                        detachedCount++;
                    }
                }
            } else {
                // For selected layers, the selectedLayers array is 0-based
                for (var i = 0; i < selectedLayers.length; i++) {
                    var curLayer = selectedLayers[i];
                    if (curLayer.parent) {
                        curLayer.parent = null;
                        detachedCount++;
                    }
                }
            }

            app.endUndoGroup();
            logParentResults((isBreakAll ? "Clear All Parents" : "Detach Parent"), detachedCount);
        }
    }
    
    // Keep the old function for compatibility
    function breakAllParents(event) {
        detachParent(event);
    }
    
    // New function to select entire parent hierarchy up to the root
    function selectParentHierarchy(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        app.beginUndoGroup(scriptName + " Select Parent Hierarchy");
        
        var foundCount = 0;
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var currentLayer = selectedLayers[i];
            var parent = currentLayer.parent;
            
            // Travel up the parent hierarchy
            while (parent) {
                parent.selected = true;
                foundCount++;
                parent = parent.parent;
            }
        }
        
        if (foundCount === 0) {
            alert("No parent layers found in the hierarchy.");
        }
        
        app.endUndoGroup();
        logParentResults("Select Parent Hierarchy", foundCount);
    }
    
    // Function to extract potential name patterns from selected layers
    function extractNamePatterns() {
        var comp = getCompOrAlert();
        if (!comp) return [];
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return [];
        
        var patterns = {};
        
        for (var i = 0; i < selectedLayers.length; i++) {
            var layerName = selectedLayers[i].name;
            
            // Split by common separators and look for patterns before numbers
            var parts = layerName.split(/[_\-\s\.]/);
            
            for (var j = 0; j < parts.length; j++) {
                var part = parts[j].trim();
                
                // Skip empty parts and pure numbers
                if (part.length === 0 || /^\d+$/.test(part)) continue;
                
                // Look for parts that have text followed by numbers or are followed by parts with numbers
                var hasNumbers = /\d/.test(part);
                var nextPartHasNumbers = (j + 1 < parts.length) && /\d/.test(parts[j + 1]);
                
                if (hasNumbers || nextPartHasNumbers || j < parts.length - 1) {
                    // Extract the text part before any numbers
                    var textPart = part.replace(/\d+.*$/, '').trim();
                    if (textPart.length > 0) {
                        patterns[textPart] = true;
                    }
                }
            }
            
            // Also try to extract whole words that appear before numbers in the full name
            var regex = /([a-zA-Z]+)(?:[_\-\s]*\d+)/g;
            var match;
            while ((match = regex.exec(layerName)) !== null) {
                patterns[match[1]] = true;
            }
        }
        
        // Convert to sorted array
        var patternArray = [];
        for (var pattern in patterns) {
            patternArray.push(pattern);
        }
        patternArray.sort();
        
        return patternArray;
    }

    // Auto parent by name pattern function
    function autoParentByName(nameA, nameB, makeAParent, moveToParent) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp);
        if (!selectedLayers) return;

        app.beginUndoGroup(scriptName + " Auto Parent by Name");
        
        var processedCount = 0;
        var layerGroups = {}; // Store layers grouped by number
        
        // Parse all selected layers and group by number
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            var layerName = layer.name;
            
            // Check for nameA pattern
            var regexA = new RegExp(nameA + ".*?(\\d+)", "i");
            var matchA = layerName.match(regexA);
            
            // Check for nameB pattern  
            var regexB = new RegExp(nameB + ".*?(\\d+)", "i");
            var matchB = layerName.match(regexB);
            
            if (matchA) {
                var number = matchA[1];
                if (!layerGroups[number]) layerGroups[number] = {};
                layerGroups[number].layerA = layer;
            }
            
            if (matchB) {
                var number = matchB[1];
                if (!layerGroups[number]) layerGroups[number] = {};
                layerGroups[number].layerB = layer;
            }
        }
        
        // Get the current time in the composition
        var currentTime = comp.time;
        
        // Parent layers with matching numbers
        for (var number in layerGroups) {
            var group = layerGroups[number];
            if (group.layerA && group.layerB) {
                var parentLayer = makeAParent ? group.layerA : group.layerB;
                var childLayer = makeAParent ? group.layerB : group.layerA;
                
                // Move child to parent position if checkbox is checked
                if (moveToParent) {
                    var parentPosition = parentLayer.transform.position.value;
                    childLayer.transform.position.setValueAtTime(currentTime, parentPosition);
                }
                
                childLayer.parent = parentLayer;
                processedCount++;
            }
        }
        
        app.endUndoGroup();
        logParentResults("Auto Parent by Name", processedCount);
    }

    // New function to move selected layer to target position and parent to target
    function moveAndParentToTarget(event) {
        var comp = getCompOrAlert();
        if (!comp) return;
        
        var selectedLayers = ensureSelection(comp, 2);
        if (!selectedLayers) return;

        app.beginUndoGroup(scriptName + " Move and Parent to Target");
        
        var processedCount = 0;
        
        // Use the last selected layer (last in selection order) as target parent
        // This works correctly for both composition panel and layer panel selections
        var targetLayer = selectedLayers[selectedLayers.length - 1];
        
        if (!targetLayer) {
            alert("Could not determine target layer.");
            app.endUndoGroup();
            return;
        }
        
        // Get the current time in the composition
        var currentTime = comp.time;
        
        // Get the target layer's position (anchor point position)
        var targetPosition = targetLayer.transform.position.value;
        
        // Move all other selected layers to target position and parent them
        for (var i = 0; i < selectedLayers.length; i++) {
            var curLayer = selectedLayers[i];
            
            // Skip the target layer itself
            if (curLayer === targetLayer) {
                continue;
            }
            
            // Move the current layer's anchor point to match the target layer's anchor point position
            curLayer.transform.position.setValueAtTime(currentTime, targetPosition);
            
            // Parent the current layer to the target layer
            curLayer.parent = targetLayer;
            
            processedCount++;
        }
        
        app.endUndoGroup();
        logParentResults("Move and Parent to Target", processedCount);
    }
    
    // Key handler for the window
    function setupKeyboardHandler(win) {
        win.addEventListener('keydown', function(e) {
            // X key to scroll to selected layers
            if (e.keyName === 'X') {
                var comp = app.project.activeItem;
                if (comp && comp instanceof CompItem && comp.selectedLayers.length > 0) {
                    // This will force AE to scroll to the selected layers
                    comp.selectedLayers[0].selected = false;
                    comp.selectedLayers[0].selected = true;
                }
            }
        });
    }

    // Help popup function
    function showHelpPopup() {
        var helpWin = new Window("dialog", "Quick Help - " + scriptName);
        helpWin.orientation = "column";
        helpWin.alignChildren = "fill";
        helpWin.spacing = 12;
        helpWin.margins = 16;
        helpWin.preferredSize.width = 400;

        var helpContent = helpWin.add("statictext", undefined, 
            "KEYBOARD SHORTCUTS:\n" +
            "• Normal click: Execute function\n" +
            "• Alt+click: Alternative function\n" +
            "• Shift+click: Move & parent to target\n" +
            "• Press 'X': Scroll to selected layer\n\n" +
            "BASIC PARENTING:\n" +
            "• Above: Parent to layer above/below\n" +
            "• Move & Parent: Move to target and parent\n" +
            "• First: Parent all to first/last selected\n" +
            "• In Order: Parent in selection order\n\n" +
            "ADVANCED TOOLS:\n" +
            "• Reverse: Reverse parent-child relationships\n" +
            "• Detach: Remove parent relationships\n" +
            "• Find: Find parent/child layers\n" +
            "• Hierarchy: Select parent hierarchy\n\n" +
            "AUTO PARENT BY NAME:\n" +
            "1. Select layers with patterns (e.g., Ctrl_01, Icon_01)\n" +
            "2. Click 'Scan Names' to detect patterns\n" +
            "3. Choose patterns and execute",
            {multiline: true}
        );
        helpContent.preferredSize.height = 280;

        var closeBtn = helpWin.add("button", undefined, "Got it!");
        closeBtn.onClick = function() { helpWin.close(); };

        helpWin.center();
        helpWin.show();
    }

    // UI
    function createUI() {
        var win = new Window("palette", scriptName + " v" + scriptVersion, undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 8;
        win.margins = 12;
        win.preferredSize.width = 320;

        // Title bar with help button
        var titleBar = win.add("group");
        titleBar.orientation = "row";
        titleBar.alignChildren = "center";
        
        var titleText = titleBar.add("statictext", undefined, "Layer Parenting Tools");
        titleText.alignment = "fill";
        
        var helpBtn = titleBar.add("button", undefined, "?");
        helpBtn.preferredSize = [24, 24];
        helpBtn.helpTip = "Click for help and keyboard shortcuts";
        helpBtn.onClick = showHelpPopup;

        // Basic Parenting Panel
        var basicPanel = win.add("panel", undefined, "Basic Parenting");
        basicPanel.orientation = "column";
        basicPanel.alignChildren = "fill";
        basicPanel.margins = 8;
        basicPanel.spacing = 6;

        // Grid layout for basic buttons (2x2)
        var basicRow1 = basicPanel.add("group");
        basicRow1.orientation = "row";
        basicRow1.alignChildren = "fill";
        basicRow1.spacing = 6;

        var btnParentAbove = basicRow1.add("button", undefined, iconParentAbove + " Above");
        btnParentAbove.helpTip = "Parent to layer above (Alt: Parent to layer below)";
        btnParentAbove.onClick = parentSelectedToAbove;
        btnParentAbove.preferredSize = [145, 36];

        var btnMoveParent = basicRow1.add("button", undefined, "📍 Move & Parent");
        btnMoveParent.helpTip = "Move selected layers to target and parent them";
        btnMoveParent.onClick = moveAndParentToTarget;
        btnMoveParent.preferredSize = [145, 36];

        var basicRow2 = basicPanel.add("group");
        basicRow2.orientation = "row";
        basicRow2.alignChildren = "fill";
        basicRow2.spacing = 6;

        var btnParentFirst = basicRow2.add("button", undefined, iconParentFirst + " First");
        btnParentFirst.helpTip = "Parent all to first selected (Alt: Parent to last selected)";
        btnParentFirst.onClick = parentSelectedToFirst;
        btnParentFirst.preferredSize = [145, 36];

        var btnParentOrder = basicRow2.add("button", undefined, iconParentOrder + " In Order");
        btnParentOrder.helpTip = "Parent layers in selection order (Alt: Reverse order)";
        btnParentOrder.onClick = parentSelectedInOrder;
        btnParentOrder.preferredSize = [145, 36];

        // Advanced Tools Panel
        var advancedPanel = win.add("panel", undefined, "Advanced Tools");
        advancedPanel.orientation = "column";
        advancedPanel.alignChildren = "fill";
        advancedPanel.margins = 8;
        advancedPanel.spacing = 6;

        // Grid layout for advanced buttons (2x2)
        var advRow1 = advancedPanel.add("group");
        advRow1.orientation = "row";
        advRow1.alignChildren = "fill";
        advRow1.spacing = 6;

        var btnReverse = advRow1.add("button", undefined, iconReverseParents + " Reverse");
        btnReverse.helpTip = "Reverse parent-child relationship (Alt: Reverse back)";
        btnReverse.onClick = reverseParents;
        btnReverse.preferredSize = [145, 36];

        var btnDetach = advRow1.add("button", undefined, iconBreakParents + " Detach");
        btnDetach.helpTip = "Remove parent relationship (Alt: Clear all in comp)";
        btnDetach.onClick = detachParent;
        btnDetach.preferredSize = [145, 36];

        var advRow2 = advancedPanel.add("group");
        advRow2.orientation = "row";
        advRow2.alignChildren = "fill";
        advRow2.spacing = 6;

        var btnFindParent = advRow2.add("button", undefined, iconFindParent + " Find");
        btnFindParent.helpTip = "Find parent layers (Alt: Find children)";
        btnFindParent.onClick = findParent;
        btnFindParent.preferredSize = [145, 36];

        var btnHierarchy = advRow2.add("button", undefined, "🔝 Hierarchy");
        btnHierarchy.helpTip = "Select entire parent hierarchy";
        btnHierarchy.onClick = selectParentHierarchy;
        btnHierarchy.preferredSize = [145, 36];

        // Auto Parent by Name Panel
        var autoPanel = win.add("panel", undefined, "Auto Parent by Name Pattern");
        autoPanel.orientation = "column";
        autoPanel.alignChildren = "fill";
        autoPanel.margins = 8;
        autoPanel.spacing = 8;
        
        // Instructions
        var instructText = autoPanel.add("statictext", undefined, "1. Select layers with naming patterns (e.g., Ctrl_01, Icon_01)");
        instructText.alignment = "left";
        
        // Name selection row
        var nameRow = autoPanel.add("group");
        nameRow.orientation = "row";
        nameRow.alignChildren = "center";
        nameRow.spacing = 8;
        
        var refreshBtn = nameRow.add("button", undefined, "🔄 Scan Names");
        refreshBtn.preferredSize.width = 100;
        refreshBtn.helpTip = "Analyze selected layers for name patterns";
        
        // Dropdowns group
        var dropGroup = nameRow.add("group");
        dropGroup.orientation = "column";
        dropGroup.spacing = 4;
        
        var dropRow1 = dropGroup.add("group");
        dropRow1.spacing = 4;
        dropRow1.add("statictext", undefined, "Name A:");
        var nameADropdown = dropRow1.add("dropdownlist", undefined, ["Click 'Scan Names' first"]);
        nameADropdown.preferredSize.width = 100;
        
        var dropRow2 = dropGroup.add("group");
        dropRow2.spacing = 4;
        dropRow2.add("statictext", undefined, "Name B:");
        var nameBDropdown = dropRow2.add("dropdownlist", undefined, ["Click 'Scan Names' first"]);
        nameBDropdown.preferredSize.width = 100;
        
        // Options row
        var optionsRow = autoPanel.add("group");
        optionsRow.orientation = "row";
        optionsRow.alignChildren = "center";
        optionsRow.spacing = 8;
        
        optionsRow.add("statictext", undefined, "Make parent:");
        var parentChoice = optionsRow.add("dropdownlist", undefined, ["Name A", "Name B"]);
        parentChoice.selection = 0;
        parentChoice.preferredSize.width = 80;
        
        var moveCheckbox = optionsRow.add("checkbox", undefined, "Move to parent position");
        moveCheckbox.value = false;
        
        // Execute button
        var executeBtn = autoPanel.add("button", undefined, "▶ Execute Auto Parent");
        executeBtn.preferredSize.height = 30;
        executeBtn.helpTip = "Parent layers with matching name patterns and numbers";
        
        // Function to update dropdowns with current selection
        function updateNameDropdowns() {
            var patterns = extractNamePatterns();
            
            // Clear existing items
            nameADropdown.removeAll();
            nameBDropdown.removeAll();
            
            if (patterns.length === 0) {
                nameADropdown.add("item", "No patterns found");
                nameBDropdown.add("item", "No patterns found");
                executeBtn.enabled = false;
            } else {
                // Add patterns to both dropdowns
                for (var i = 0; i < patterns.length; i++) {
                    nameADropdown.add("item", patterns[i]);
                    nameBDropdown.add("item", patterns[i]);
                }
                executeBtn.enabled = true;
                
                // Set default selections
                nameADropdown.selection = 0;
                nameBDropdown.selection = patterns.length > 1 ? 1 : 0;
                
                // Update instruction text
                instructText.text = "2. Choose name patterns and click 'Execute Auto Parent'";
            }
        }
        
        // Event handlers
        refreshBtn.onClick = function() {
            updateNameDropdowns();
            if (nameADropdown.items.length > 0 && nameADropdown.items[0].text !== "No patterns found") {
                updateStatus("Found " + nameADropdown.items.length + " name patterns in selection");
            } else {
                updateStatus("No name patterns found. Check your layer names have text+numbers.");
            }
        };
        
        executeBtn.onClick = function() {
            var nameA = nameADropdown.selection ? nameADropdown.selection.text : "";
            var nameB = nameBDropdown.selection ? nameBDropdown.selection.text : "";
            
            if (!nameA || !nameB || nameA === "No patterns found" || nameB === "No patterns found") {
                alert("Please click 'Scan Names' first and select valid name patterns.");
                return;
            }
            
            if (nameA === nameB) {
                alert("Name A and Name B must be different patterns.");
                return;
            }
            
            var makeAParent = (parentChoice.selection.index === 0);
            var moveToParent = moveCheckbox.value;
            autoParentByName(nameA, nameB, makeAParent, moveToParent);
        };
        
        // Initialize
        executeBtn.enabled = false;

        // Status area
        var statusPanel = win.add("panel", undefined, "Status");
        statusPanel.margins = 8;
        statusText = statusPanel.add("statictext", undefined, "Ready. Select layers and use the tools above.");
        statusText.alignment = 'center';
        statusText.preferredSize.width = 280;

        // Set up keyboard handler
        setupKeyboardHandler(win);

        win.center();
        win.show();
    }
    
    // Check keyboard modifiers at script startup
    if (ScriptUI.environment.keyboardState.shiftKey) {
        // Move and parent to target when Shift is pressed
        moveAndParentToTarget();
    } else if (ScriptUI.environment.keyboardState.altKey) {
        // Show UI when Alt is pressed
        createUI();
    } else {
        // Run parent in order function directly when script is run normally
        parentSelectedInOrder();
    }
})();