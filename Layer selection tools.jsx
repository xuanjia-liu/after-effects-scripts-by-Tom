(function() {
    // --- Configuration variables - persisted across script runs ---
    var scriptData = {
        applyToLocked: false,
        applyToShy: false
    };

    // Try to load saved settings
    try {
        var settingsFile = new File(File($.fileName).parent.fsName + "/layerTools_settings.json");
        if (settingsFile.exists) {
            settingsFile.open('r');
            var savedData = JSON.parse(settingsFile.read());
            if (savedData) {
                scriptData = savedData;
            }
            settingsFile.close();
        }
    } catch (e) {
        // Silently fail if settings can't be loaded
    }

    // Function to save settings
    function saveSettings() {
        try {
            var settingsFile = new File(File($.fileName).parent.fsName + "/layerTools_settings.json");
            settingsFile.open('w');
            settingsFile.write(JSON.stringify(scriptData));
            settingsFile.close();
        } catch (e) {
            // Silently fail if settings can't be saved
        }
    }

    // --- Helper Functions ---
    function showAlert(message, type) {
        if (type === "error") {
            alert(message);
        }
    }

    function validateActiveComp() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            showAlert("Please select a composition.", "error");
            return null;
        }
        return comp;
    }

    function getTargetLayers(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return null;
        
        var selectedLayers = comp.selectedLayers;
        var layersToProcess = [];
        
        if (selectedLayers.length > 0) {
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                if ((includeLocked || !layer.locked) && (includeShy || !layer.shy)) {
                    layersToProcess.push(layer);
                }
            }
        } else {
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layers[i];
                if ((includeLocked || !layer.locked) && (includeShy || !layer.shy)) {
                    layersToProcess.push(layer);
                }
            }
        }
        
        return layersToProcess;
    }

    // --- Layer Selection Functions ---
    function inverseSelection(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var layers = comp.layers;
        app.beginUndoGroup("Inverse Layer Selection");
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            layer.selected = !layer.selected;
        }
        
        app.endUndoGroup();
    }

    function selectLayersAtFrame(frameInput, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var frame = parseInt(frameInput.text, 10);
        if (isNaN(frame)) {
            // If not a number, default to frame 1 instead of showing an error
            frame = 1;
            frameInput.text = "1";
        }
        
        var time = frame / comp.frameRate;
        
        app.beginUndoGroup("Select Layers at Frame");
        var layers = comp.layers;
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            // Only change the selection if necessary
            var isVisible = (layer.inPoint <= time && layer.outPoint >= time);
            if (layer.selected !== isVisible) {
                layer.selected = isVisible;
            }
        }
        
        app.endUndoGroup();
    }

    function selectOddEvenLayers(selectType, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        app.beginUndoGroup("Select " + (selectType === 'odd' ? "Odd" : "Even") + " Layers");
        var layers = comp.layers;
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            var shouldSelect = (selectType === 'odd') ? (i % 2 !== 0) : (i % 2 === 0);
            if (layer.selected !== shouldSelect) {
                layer.selected = shouldSelect;
            }
        }
        
        app.endUndoGroup();
    }

    function selectEveryNthLayer(nInput, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var n = parseInt(nInput.text, 10);
        if (isNaN(n) || n <= 0) {
            // If not a valid number, default to 2 instead of showing an error
            n = 2;
            nInput.text = "2";
        }
        
        app.beginUndoGroup("Select Every " + n + "th Layer");
        var layers = comp.layers;
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            var shouldSelect = (i % n === 0);
            if (layer.selected !== shouldSelect) {
                layer.selected = shouldSelect;
            }
        }
        
        app.endUndoGroup();
    }

    function randomSelect(ratioSlider, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var ratio = parseFloat(ratioSlider.value);
        app.beginUndoGroup("Random Select Layers");
        var layers = comp.layers;
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            layer.selected = Math.random() < ratio;
        }
        
        app.endUndoGroup();
    }

    function randomDeselect(ratioSlider, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var ratio = parseFloat(ratioSlider.value);
        app.beginUndoGroup("Random Deselect Layers");
        var layers = comp.layers;
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            if (layer.selected) {
                layer.selected = Math.random() >= ratio;
            }
        }
        
        app.endUndoGroup();
    }

    function selectLayersByType(type, scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        app.beginUndoGroup("Select Layers by Type");
        var layers = comp.layers;
        
        // Create a map for more readable type checking
        var typeChecks = {
            "text": function(layer) { return layer instanceof TextLayer; },
            "null": function(layer) { return layer.nullLayer === true; },
            "precomp": function(layer) { return layer instanceof AVLayer && layer.source instanceof CompItem; },
            "shape": function(layer) { return layer instanceof ShapeLayer; },
            "3d": function(layer) { return layer.threeDLayer === true; },
            "guide": function(layer) { return layer.guideLayer === true; },
            "light": function(layer) { return layer instanceof LightLayer; },
            "audio": function(layer) { return layer instanceof AVLayer && layer.hasAudio; },
            "trackMatte": function(layer) { return layer.isTrackMatte === true; },
            "camera": function(layer) { return layer instanceof CameraLayer; }, // New type
            "adjustment": function(layer) { return layer.adjustmentLayer === true; } // New type
        };
        
        var typeCheck = typeChecks[type];
        if (!typeCheck) {
            showAlert("Unknown layer type: " + type, "error");
            app.endUndoGroup();
            return;
        }
        
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (scope === 'selected' && !layer.selected) continue;
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            var shouldSelect = typeCheck(layer);
            if (layer.selected !== shouldSelect) {
                layer.selected = shouldSelect;
            }
        }
        
        app.endUndoGroup();
    }

    function selectParentLayers(scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        app.beginUndoGroup("Select Parent Layers");
        var layers = comp.layers;
        
        // Save current selection
        var selectedLayers = [];
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if ((scope === 'all' || layer.selected) && 
                (includeLocked || !layer.locked) && 
                (includeShy || !layer.shy)) {
                selectedLayers.push(layer);
            }
            // Clear selection
            layer.selected = false;
        }
        
        // Select parents
        for (var i = 0; i < selectedLayers.length; i++) {
            var layer = selectedLayers[i];
            if (layer.parent && 
                (includeLocked || !layer.parent.locked) && 
                (includeShy || !layer.parent.shy)) {
                layer.parent.selected = true;
            }
        }
        
        app.endUndoGroup();
    }

    function selectChildLayers(scope, includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        app.beginUndoGroup("Select Child Layers");
        var layers = comp.layers;
        
        // Save current selection and identify parent layers
        var parentLayers = [];
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if ((scope === 'all' || layer.selected) && 
                (includeLocked || !layer.locked) && 
                (includeShy || !layer.shy)) {
                parentLayers.push(layer);
            }
            // Clear selection
            layer.selected = false;
        }
        
        // Select children
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            if (layer.parent && parentLayers.indexOf(layer.parent) !== -1) {
                layer.selected = true;
            }
        }
        
        app.endUndoGroup();
    }

    function selectCompleteHierarchy(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var selectedLayers = [];
        var layers = comp.layers;
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (layer.selected) {
                selectedLayers.push(layer);
            }
        }
        
        if (selectedLayers.length === 0) return;
        
        app.beginUndoGroup("Select Complete Hierarchy");
        
        // Helper function for recursive selection
        function selectHierarchy(layer, visited) {
            if (!layer || visited[layer.index]) return;
            visited[layer.index] = true;
            
            if (!includeLocked && layer.locked) return;
            if (!includeShy && layer.shy) return;
            
            layer.selected = true;
            
            // Select parent
            if (layer.parent) {
                selectHierarchy(layer.parent, visited);
            }
            
            // Select children
            for (var j = 1; j <= layers.length; j++) {
                var childLayer = layers[j];
                if (childLayer.parent === layer) {
                    selectHierarchy(childLayer, visited);
                }
            }
        }
        
        var visited = {};
        for (var i = 0; i < selectedLayers.length; i++) {
            selectHierarchy(selectedLayers[i], visited);
        }
        
        app.endUndoGroup();
    }

    function selectLayersAbove(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return;
        
        app.beginUndoGroup("Select Layers Above");
        
        var topIndex = comp.numLayers + 1;
        for (var i = 0; i < selectedLayers.length; i++) {
            topIndex = Math.min(topIndex, selectedLayers[i].index);
        }
        
        for (var i = 1; i < topIndex; i++) {
            if (!includeLocked && comp.layers[i].locked) continue;
            if (!includeShy && comp.layers[i].shy) continue;
            comp.layers[i].selected = true;
        }
        
        app.endUndoGroup();
    }

    function selectLayersBelow(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return;
        
        app.beginUndoGroup("Select Layers Below");
        
        var bottomIndex = 0;
        for (var i = 0; i < selectedLayers.length; i++) {
            bottomIndex = Math.max(bottomIndex, selectedLayers[i].index);
        }
        
        for (var i = bottomIndex + 1; i <= comp.numLayers; i++) {
            if (!includeLocked && comp.layers[i].locked) continue;
            if (!includeShy && comp.layers[i].shy) continue;
            comp.layers[i].selected = true;
        }
        
        app.endUndoGroup();
    }

    function selectSameSource(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) return;
        
        app.beginUndoGroup("Select Same Source");
        
        var sourceArr = [];
        for (var i = 0; i < selectedLayers.length; i++) {
            var source = selectedLayers[i].source;
            if (source && sourceArr.indexOf(source) === -1) {
                sourceArr.push(source);
            }
        }
        
        // Clear current selection first
        var layers = comp.layers;
        for (var i = 1; i <= layers.length; i++) {
            if (!includeLocked && layers[i].locked) continue;
            if (!includeShy && layers[i].shy) continue;
            layers[i].selected = false;
        }
        
        // Select layers with matching source
        for (var i = 1; i <= layers.length; i++) {
            var layer = layers[i];
            if (!includeLocked && layer.locked) continue;
            if (!includeShy && layer.shy) continue;
            
            if (layer.source && sourceArr.indexOf(layer.source) !== -1) {
                layer.selected = true;
            }
        }
        
        app.endUndoGroup();
    }

    function selectBottom(includeLocked, includeShy) {
        var comp = validateActiveComp();
        if (!comp) return;
        
        app.beginUndoGroup("Select Bottom Layer");
        
        var keyboardState = ScriptUI.environment.keyboardState;
        var bottomLayer = comp.layer(comp.numLayers);
        
        // Clear selection if shift key is not pressed
        if (!keyboardState.shiftKey) {
            app.executeCommand(2004); // Deselect All
        }
        
        if ((includeLocked || !bottomLayer.locked) && 
            (includeShy || !bottomLayer.shy)) {
            bottomLayer.selected = true;
        }
        
        app.endUndoGroup();
    }

    // --- Layer Reorder Functions ---
    function moveLayer(layer, newIndex) {
        var comp = layer.containingComp;
        layer.moveBefore(comp.layers[newIndex]);
    }

    function reorderSelectionOrder(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reorder by Selection");
        
        for (var i = 0; i < layers.length; i++) {
            moveLayer(layers[i], i + 1);
        }
        
        app.endUndoGroup();
    }

    function reorderReverseOrder(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reverse Layer Order");
        
        var originalIndexes = [];
        for (var i = 0; i < layers.length; i++) {
            originalIndexes.push(layers[i].index);
        }
        
        for (var i = 0; i < layers.length; i++) {
            moveLayer(layers[i], originalIndexes[layers.length - 1 - i]);
        }
        
        app.endUndoGroup();
    }

    function reorderAlphabetical(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reorder Alphabetically");
        
        var originalIndexes = [];
        for (var i = 0; i < layers.length; i++) {
            originalIndexes.push(layers[i].index);
        }
        
        // Sort layers alphabetically
        layers.sort(function(a, b) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        
        // Apply the new order
        for (var i = 0; i < layers.length; i++) {
            moveLayer(layers[i], originalIndexes[i]);
        }
        
        app.endUndoGroup();
    }

    function reorderRandom(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reorder Randomly");
        
        var originalIndexes = [];
        for (var i = 0; i < layers.length; i++) {
            originalIndexes.push(layers[i].index);
        }
        
        // Fisher-Yates shuffle algorithm
        var shuffledLayers = layers.slice();
        for (var i = shuffledLayers.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = shuffledLayers[i];
            shuffledLayers[i] = shuffledLayers[j];
            shuffledLayers[j] = temp;
        }
        
        // Apply the new order
        for (var i = 0; i < shuffledLayers.length; i++) {
            moveLayer(shuffledLayers[i], originalIndexes[i]);
        }
        
        app.endUndoGroup();
    }

    function reorderInPoint(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reorder by In Point");
        
        var originalIndexes = [];
        for (var i = 0; i < layers.length; i++) {
            originalIndexes.push(layers[i].index);
        }
        
        // Sort layers by in point
        layers.sort(function(a, b) {
            return a.inPoint - b.inPoint;
        });
        
        // Apply the new order
        for (var i = 0; i < layers.length; i++) {
            moveLayer(layers[i], originalIndexes[i]);
        }
        
        app.endUndoGroup();
    }

    function reorderOutPoint(layers) {
        if (!layers || layers.length === 0) return;
        
        var comp = layers[0].containingComp;
        app.beginUndoGroup("Reorder by Out Point");
        
        var originalIndexes = [];
        for (var i = 0; i < layers.length; i++) {
            originalIndexes.push(layers[i].index);
        }
        
        // Sort layers by out point
        layers.sort(function(a, b) {
            return a.outPoint - b.outPoint;
        });
        
        // Apply the new order
        for (var i = 0; i < layers.length; i++) {
            moveLayer(layers[i], originalIndexes[i]);
        }
        
        app.endUndoGroup();
    }

    // --- UI Creation Functions ---
    function createButton(group, label, size, onClick) {
        var btn = group.add("button", undefined, label);
        btn.preferredSize = size;
        btn.onClick = onClick;
        return btn;
    }

    function createUI() {
        var win = new Window("palette", "Layer Tools v2.0 - by Jiaxuan Liu", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 5;
        win.margins = 10;
        var panelSpacing = 8;
        var buttonSpacing = 4;
        var btnHeight = 26;
        var smallBtnWidth = 40;
        var mediumBtnWidth = 60;
        var largeBtnWidth = 90;

        // --- Apply to Locked/Shy Options at the top ---
        var applyToOptionsGroupTop = win.add("group");
        applyToOptionsGroupTop.orientation = "column";
        applyToOptionsGroupTop.alignChildren = 'left';
        applyToOptionsGroupTop.spacing = buttonSpacing;
        
        var applyToLockedGroupTop = applyToOptionsGroupTop.add("group");
        applyToLockedGroupTop.orientation = "row";
        applyToLockedGroupTop.alignItems = 'center';
        applyToLockedGroupTop.spacing = buttonSpacing;
        
        var applyToLockedCheckbox = applyToLockedGroupTop.add("checkbox", undefined, "Apply to Locked Layers");
        applyToLockedCheckbox.value = scriptData.applyToLocked;
        applyToLockedCheckbox.onClick = function() {
            scriptData.applyToLocked = this.value;
            saveSettings();
        };
        
        var applyToShyGroupTop = applyToOptionsGroupTop.add("group");
        applyToShyGroupTop.orientation = "row";
        applyToShyGroupTop.alignItems = 'center';
        applyToShyGroupTop.spacing = buttonSpacing;
        
        var applyToShyCheckbox = applyToShyGroupTop.add("checkbox", undefined, "Apply to Shy Layers");
        applyToShyCheckbox.value = scriptData.applyToShy;
        applyToShyCheckbox.onClick = function() {
            scriptData.applyToShy = this.value;
            saveSettings();
        };
        // --- End of top section ---

        // Add tabbed interface
        var tabbedPanel = win.add("tabbedpanel");
        tabbedPanel.alignChildren = "fill";
        
        // --- Selection Tab ---
        var selectionTab = tabbedPanel.add("tab", undefined, "Selection");
        selectionTab.orientation = "column";
        selectionTab.alignChildren = "fill";
        selectionTab.spacing = panelSpacing;
        
        var selectionToolsPanel = selectionTab.add("panel", undefined, "Selection Tools");
        selectionToolsPanel.orientation = "column";
        selectionToolsPanel.alignChildren = "fill";
        selectionToolsPanel.spacing = panelSpacing;

        var topButtonGroup = selectionToolsPanel.add("group");
        topButtonGroup.orientation = "row";
        topButtonGroup.alignChildren = "left";
        topButtonGroup.spacing = buttonSpacing;
        
        createButton(topButtonGroup, "Inverse", [largeBtnWidth, btnHeight], function() {
            inverseSelection(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(topButtonGroup, "Same Source", [largeBtnWidth, btnHeight], function() {
            selectSameSource(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(topButtonGroup, "Bottom Layer", [largeBtnWidth, btnHeight], function() {
            selectBottom(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });

        var aboveBelowGroup = selectionToolsPanel.add("group");
        aboveBelowGroup.orientation = "row";
        aboveBelowGroup.alignChildren = "left";
        aboveBelowGroup.spacing = buttonSpacing;
        
        createButton(aboveBelowGroup, "Select Above", [largeBtnWidth, btnHeight], function() {
            selectLayersAbove(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(aboveBelowGroup, "Select Below", [largeBtnWidth, btnHeight], function() {
            selectLayersBelow(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });

        var scopeGroup = selectionToolsPanel.add("group");
        scopeGroup.orientation = "row";
        scopeGroup.alignChildren = "left";
        scopeGroup.spacing = buttonSpacing;
        
        var scopeLabel = scopeGroup.add("statictext", undefined, "Scope:");
        scopeLabel.preferredSize = [40, 20];
        
        var allLayersRadio = scopeGroup.add("radiobutton", undefined, "All");
        var selectedLayersRadio = scopeGroup.add("radiobutton", undefined, "Selection");
        allLayersRadio.value = true;

        var frameGroup = selectionToolsPanel.add("group");
        frameGroup.orientation = "row";
        frameGroup.alignChildren = "left";
        frameGroup.spacing = buttonSpacing;
        
        createButton(frameGroup, "At Frame", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersAtFrame(frameInput, scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        var frameInput = frameGroup.add("edittext", undefined, "1");
        frameInput.preferredSize = [smallBtnWidth, btnHeight - 4];
        
        // We're removing the key validation that was preventing input
        // frameInput will now accept any input and validate on action

        var oddEvenNthGroup = selectionToolsPanel.add("group");
        oddEvenNthGroup.orientation = "row";
        oddEvenNthGroup.alignChildren = "left";
        oddEvenNthGroup.spacing = buttonSpacing;
        
        createButton(oddEvenNthGroup, "Odd", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectOddEvenLayers('odd', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(oddEvenNthGroup, "Even", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectOddEvenLayers('even', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(oddEvenNthGroup, "Every", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectEveryNthLayer(nthInput, scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        var nthInput = oddEvenNthGroup.add("edittext", undefined, "2");
        nthInput.preferredSize = [smallBtnWidth, btnHeight - 4];
        
        // We're removing the key validation that was preventing input
        // nthInput will now accept any input and validate on action

        // Random selection controls
        var randomGroup = selectionToolsPanel.add("group");
        randomGroup.orientation = "column";
        randomGroup.alignChildren = "fill";
        randomGroup.spacing = buttonSpacing;
        
        var ratioGroup = randomGroup.add("group");
        ratioGroup.orientation = "row";
        ratioGroup.alignItems = 'center';
        ratioGroup.spacing = buttonSpacing;
        
        var ratioLabel = ratioGroup.add("statictext", undefined, "Ratio:");
        ratioLabel.preferredSize = [35, 20];
        
        var ratioSlider = ratioGroup.add("slider", undefined, 0.5, 0, 1);
        ratioSlider.preferredSize = [100, 20];
        
        var ratioIndicator = ratioGroup.add("statictext", undefined, ratioSlider.value.toFixed(2));
        ratioIndicator.preferredSize = [30, 20];
        
        var ratioInput = ratioGroup.add("edittext", undefined, "0.5");
        ratioInput.preferredSize = [smallBtnWidth + 10, btnHeight - 4];
        
        // Update ratio display when slider changes
        ratioSlider.onChanging = function () {
            var value = Math.round(ratioSlider.value * 100) / 100; // Round to 2 decimal places
            ratioIndicator.text = value.toFixed(2);
            ratioInput.text = value.toFixed(2);
        };
        
        // Update slider when input changes
        ratioInput.onChange = function () {
            var ratio = parseFloat(ratioInput.text);
            if (isNaN(ratio) || ratio < 0 || ratio > 1) {
                // If not a valid number, revert to the slider value without showing an error
                ratio = ratioSlider.value;
                ratioInput.text = ratio.toFixed(2);
            } else {
                ratioSlider.value = ratio;
                ratioIndicator.text = ratio.toFixed(2);
            }
        };
        
        // We're removing the key validation that was preventing input
        // ratioInput will now accept any input and validate on action
        
        var randomButtonRow = randomGroup.add("group");
        randomButtonRow.orientation = "row";
        randomButtonRow.alignChildren = "left";
        randomButtonRow.spacing = buttonSpacing;
        
        createButton(randomButtonRow, "Random Select", [largeBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            randomSelect(ratioSlider, scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(randomButtonRow, "Random Deselect", [largeBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            randomDeselect(ratioSlider, scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        // --- Type Selection Panel ---
        var typeSelectionPanel = selectionTab.add("panel", undefined, "Layer Types");
        typeSelectionPanel.orientation = "column";
        typeSelectionPanel.alignChildren = 'fill';
        typeSelectionPanel.spacing = panelSpacing;
        
        var typeButtonRow1 = typeSelectionPanel.add("group");
        typeButtonRow1.orientation = "row";
        typeButtonRow1.alignChildren = 'left';
        typeButtonRow1.spacing = buttonSpacing;
        
        createButton(typeButtonRow1, "Text", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('text', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow1, "Nulls", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('null', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow1, "Precomp", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('precomp', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow1, "Shape", [mediumBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('shape', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        var typeButtonRow2 = typeSelectionPanel.add("group");
        typeButtonRow2.orientation = "row";
        typeButtonRow2.alignChildren = 'left';
        typeButtonRow2.spacing = buttonSpacing;
        
        createButton(typeButtonRow2, "3D", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('3d', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow2, "Guide", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('guide', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow2, "Light", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('light', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow2, "Audio", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('audio', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow2, "Matte", [smallBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('trackMatte', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        // New type buttons
        var typeButtonRow3 = typeSelectionPanel.add("group");
        typeButtonRow3.orientation = "row";
        typeButtonRow3.alignChildren = 'left';
        typeButtonRow3.spacing = buttonSpacing;
        
        createButton(typeButtonRow3, "Camera", [smallBtnWidth + 10, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('camera', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(typeButtonRow3, "Adjustment", [smallBtnWidth + 20, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectLayersByType('adjustment', scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        // --- Parent/Child Panel ---
        var parentChildPanel = selectionTab.add("panel", undefined, "Parent/Child");
        parentChildPanel.orientation = "column";
        parentChildPanel.alignChildren = "fill";
        parentChildPanel.spacing = panelSpacing;
        
        var parentChildGroup = parentChildPanel.add("group");
        parentChildGroup.orientation = "row";
        parentChildGroup.alignChildren = "left";
        parentChildGroup.spacing = buttonSpacing;
        
        createButton(parentChildGroup, "Select Parents", [largeBtnWidth, btnHeight], function() {
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectParentLayers(scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(parentChildGroup, "Select Children", [largeBtnWidth, btnHeight], function(){
            var scope = allLayersRadio.value ? 'all' : 'selected';
            selectChildLayers(scope, applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        createButton(parentChildGroup, "Select Hierarchy", [largeBtnWidth, btnHeight], function() {
            selectCompleteHierarchy(applyToLockedCheckbox.value, applyToShyCheckbox.value);
        });
        
        // --- Reorder Tab ---
        var reorderTab = tabbedPanel.add("tab", undefined, "Reorder");
        reorderTab.orientation = "column";
        reorderTab.alignChildren = "fill";
        reorderTab.spacing = panelSpacing;
        
        var reorderToolsPanel = reorderTab.add("panel", undefined, "Reorder Layers");
        reorderToolsPanel.orientation = "column";
        reorderToolsPanel.alignChildren = "fill";
        reorderToolsPanel.spacing = panelSpacing;
        
        var reorderGroup1 = reorderToolsPanel.add("group");
        reorderGroup1.orientation = "row";
        reorderGroup1.alignChildren = "left";
        reorderGroup1.spacing = buttonSpacing;
        
        var reorderGroup2 = reorderToolsPanel.add("group");
        reorderGroup2.orientation = "row";
        reorderGroup2.alignChildren = "left";
        reorderGroup2.spacing = buttonSpacing;
        
        createButton(reorderGroup1, "Selection", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
                reorderSelectionOrder(layers);
            }
        });
        
        createButton(reorderGroup1, "Reverse", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
                reorderReverseOrder(layers);
            }
        });
        
        createButton(reorderGroup1, "Alphabet", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
               reorderAlphabetical(layers);
            }
        });
        
        createButton(reorderGroup2, "Random", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
                reorderRandom(layers);
            }
        });
        
        createButton(reorderGroup2, "In-Point", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
                reorderInPoint(layers);
            }
        });
        
        createButton(reorderGroup2, "Out-Point", [mediumBtnWidth + 10, btnHeight], function() {
            var layers = getTargetLayers(applyToLockedCheckbox.value, applyToShyCheckbox.value);
            if (layers) {
                reorderOutPoint(layers);
            }
        });
        
        // Set active tab to first tab by default
        tabbedPanel.selection = 0;
        
        // Position and show window
        win.center();
        win.show();
    }

    // Start the script
    createUI();
})();