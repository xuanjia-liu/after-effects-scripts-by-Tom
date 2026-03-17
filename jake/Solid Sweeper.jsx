/*
╔═╗╔═╗╦  ╦╔╦╗  ╔═╗╦ ╦╔═╗╔═╗╔═╗╔═╗╦═╗
╚═╗║ ║║  ║ ║║  ╚═╗║║║║╣ ║╣ ╠═╝║╣ ╠╦╝
╚═╝╚═╝╩═╝╩═╩╝  ╚═╝╚╩╝╚═╝╚═╝╩  ╚═╝╩╚═

Solid Sweeper v1.0.0
Consolidates duplicate solids and nulls in your project.

Author:   Jake Bartlett (Jake In Motion LLC)
Website:  https://jakeinmotion.com/solid-sweeper
License:  Free for personal/commercial use. No redistribution.
          https://jakeinmotion.com/license
*/

(function(thisObj) {

    //========================
    // CONFIGURATION
    //========================
    
    var CONFIG = {
        name: "Solid Sweeper",
        version: "v1.0.0",
        author: "Jake In Motion",
        year: 2025,
        urls: {
            website: "https://jakeinmotion.com/solid-sweeper",
            codeRunner: "https://jakeinmotion.com/code-runner",
            kbar: "https://aescripts.com/kbar"
        }
    };

    //========================
    // ICON DATA
    //========================

    // Sweeper icon: Check mark with 4 small diamonds above it
    // Converted from SVG with 100x100 viewBox, normalized to 0-1 coordinates
    var ICON_SWEEPER = [
        // Large check mark (bottom)
        [
            [0.7367, 0.4195], [0.5445, 0.6117], [0.5237, 0.6256], [0.5000, 0.6302],
            [0.4763, 0.6256], [0.4555, 0.6117], [0.3073, 0.4635], [0.3073, 0.4635],
            [0.2633, 0.4195], [0.2424, 0.4057], [0.2188, 0.4011], [0.1951, 0.4057],
            [0.1742, 0.4195], [0.1294, 0.4643], [0.1156, 0.4851], [0.1110, 0.5088],
            [0.1156, 0.5325], [0.1294, 0.5534], [0.4555, 0.8794], [0.4763, 0.8932],
            [0.5000, 0.8978], [0.5237, 0.8932], [0.5445, 0.8794], [0.8706, 0.5534],
            [0.8844, 0.5325], [0.8890, 0.5088], [0.8844, 0.4851], [0.8706, 0.4643],
            [0.8258, 0.4195], [0.8049, 0.4057], [0.7812, 0.4011], [0.7576, 0.4057],
            [0.7367, 0.4195], [0.7367, 0.4195]
        ],
        // Top right diamond
        [
            [0.5788, 0.3496], [0.6139, 0.3847], [0.6274, 0.3937], [0.6427, 0.3967],
            [0.6581, 0.3937], [0.6716, 0.3847], [0.7067, 0.3496], [0.7156, 0.3361],
            [0.7186, 0.3208], [0.7156, 0.3054], [0.7067, 0.2919], [0.6716, 0.2568],
            [0.6581, 0.2479], [0.6427, 0.2449], [0.6274, 0.2479], [0.6139, 0.2568],
            [0.5788, 0.2919], [0.5698, 0.3054], [0.5669, 0.3208], [0.5698, 0.3361],
            [0.5788, 0.3496], [0.5788, 0.3496]
        ],
        // Top left diamond
        [
            [0.4212, 0.2919], [0.3861, 0.2568], [0.3726, 0.2479], [0.3573, 0.2449],
            [0.3419, 0.2479], [0.3284, 0.2568], [0.2933, 0.2919], [0.2844, 0.3054],
            [0.2814, 0.3208], [0.2844, 0.3361], [0.2933, 0.3496], [0.3284, 0.3847],
            [0.3419, 0.3937], [0.3573, 0.3967], [0.3726, 0.3937], [0.3861, 0.3847],
            [0.4212, 0.3496], [0.4301, 0.3361], [0.4331, 0.3208], [0.4301, 0.3054],
            [0.4212, 0.2919], [0.4212, 0.2919]
        ],
        // Top center diamond
        [
            [0.5288, 0.2420], [0.5639, 0.2069], [0.5729, 0.1934], [0.5759, 0.1780],
            [0.5729, 0.1627], [0.5639, 0.1492], [0.5288, 0.1141], [0.5153, 0.1051],
            [0.5000, 0.1022], [0.4847, 0.1051], [0.4712, 0.1141], [0.4361, 0.1492],
            [0.4271, 0.1627], [0.4241, 0.1780], [0.4271, 0.1934], [0.4361, 0.2069],
            [0.4712, 0.2420], [0.4847, 0.2509], [0.5000, 0.2539], [0.5153, 0.2509],
            [0.5288, 0.2420], [0.5288, 0.2420]
        ],
        // Center diamond (between check and top diamonds)
        [
            [0.5639, 0.4347], [0.5288, 0.3996], [0.5153, 0.3906], [0.5000, 0.3876],
            [0.4847, 0.3906], [0.4712, 0.3996], [0.4361, 0.4347], [0.4271, 0.4482],
            [0.4241, 0.4635], [0.4271, 0.4789], [0.4361, 0.4924], [0.4712, 0.5275],
            [0.4847, 0.5364], [0.5000, 0.5394], [0.5153, 0.5364], [0.5288, 0.5275],
            [0.5639, 0.4924], [0.5729, 0.4789], [0.5759, 0.4635], [0.5729, 0.4482],
            [0.5639, 0.4347], [0.5639, 0.4347]
        ]
    ];

    //========================
    // COLOR UTILITIES
    //========================

    function hexToRGBA(hexString, alpha) {
        var hex = hexString.replace("#", "");
        var finalAlpha = (alpha !== undefined) ? alpha : 1;

        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        var r = parseInt(hex.slice(0, 2), 16) / 255;
        var g = parseInt(hex.slice(2, 4), 16) / 255;
        var b = parseInt(hex.slice(4, 6), 16) / 255;

        return [r, g, b, finalAlpha];
    }

    //========================
    // ICON UTILITIES
    //========================

    function scaleIconCoordinates(iconData, scaleFactor) {
        var scaledData = [];

        for (var i = 0; i < iconData.length; i++) {
            var segment = iconData[i];
            var scaledSegment = [];

            for (var j = 0; j < segment.length; j++) {
                var point = segment[j];
                var scaledPoint = [
                    point[0] * scaleFactor,
                    point[1] * scaleFactor
                ];
                scaledSegment.push(scaledPoint);
            }

            scaledData.push(scaledSegment);
        }

        return scaledData;
    }

    // Brand colors for hover state
    var BRAND_ORANGE = [0.93, 0.34, 0.19, 1];  // #ee5730
    var BRAND_BLUE = [0.16, 0.56, 0.95, 1];    // #2890f2

    function drawIconButton() {
        var g = this.graphics;
        var w = this.size[0];
        var h = this.size[1];

        g.drawOSControl();

        g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, this.bgColor));
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, this.strokeColor, 1));

        var iconX = (w - this.iconSize) / 2;
        var iconY = (h - this.iconSize) / 2;

        var coords = this.iconCoords;

        // Segment indices: 0=large check/V, 1-4=smaller diamonds
        for (var i = 0; i < coords.length; i++) {
            var segment = coords[i];

            // On hover: large V is blue, small diamonds are orange
            var segmentColor;
            if (this.isHovered) {
                segmentColor = (i === 0) ? BRAND_BLUE : BRAND_ORANGE;
            } else {
                segmentColor = this.currentColor;
            }

            var iconPen = g.newPen(g.PenType.SOLID_COLOR, segmentColor, 2);
            var iconBrush = g.newBrush(g.BrushType.SOLID_COLOR, segmentColor);

            g.newPath();
            g.moveTo(segment[0][0] + iconX, segment[0][1] + iconY);

            for (var j = 1; j < segment.length; j++) {
                g.lineTo(segment[j][0] + iconX, segment[j][1] + iconY);
            }

            // Fill closed paths (solids), stroke open paths (broom, lines)
            if (segment.length > 3 && segment[0][0] === segment[segment.length - 1][0] && segment[0][1] === segment[segment.length - 1][1]) {
                g.fillPath(iconBrush);
            } else {
                g.strokePath(iconPen);
            }
        }
    }

    function handleIconButtonMouseOver() {
        this.isHovered = true;
        this.currentColor = this.hoverColor;
        this.bgColor = this.bgHoverColor;
        this.strokeColor = this.strokeHoverColor;
        this.notify("onDraw");
    }

    function handleIconButtonMouseOut() {
        this.isHovered = false;
        this.currentColor = this.defaultColor;
        this.bgColor = this.bgDefaultColor;
        this.strokeColor = this.strokeDefaultColor;
        this.notify("onDraw");
    }

    function createIconButton(parent, config) {
        var btn = parent.add("button", undefined, "");

        if (config.buttonSize) {
            btn.preferredSize = [config.buttonSize[0], config.buttonSize[1]];
        }

        btn.iconCoords = scaleIconCoordinates(config.iconData, config.iconSize || 24);
        btn.iconSize = config.iconSize || 24;
        btn.currentColor = hexToRGBA(config.defaultColor || "#c4c4c4", 1);
        btn.defaultColor = hexToRGBA(config.defaultColor || "#c4c4c4", 1);
        btn.hoverColor = hexToRGBA(config.hoverColor || config.defaultColor, 1);

        btn.bgColor = config.bgColor || [0.05, 0.05, 0.05, 0.15];
        btn.bgHoverColor = config.bgHoverColor || [1, 1, 1, 0.05];
        btn.bgDefaultColor = btn.bgColor;

        btn.strokeColor = config.strokeColor || [0, 0, 0, 0];
        btn.strokeHoverColor = config.strokeHoverColor || [1, 1, 1, 0.1];
        btn.strokeDefaultColor = btn.strokeColor;

        btn.isHovered = false;

        btn.onDraw = drawIconButton;

        btn.addEventListener("mouseover", handleIconButtonMouseOver);
        btn.addEventListener("mouseout", handleIconButtonMouseOut);

        if (config.onClick) {
            btn.onClick = config.onClick;
        }

        if (config.helpTip) {
            btn.helpTip = config.helpTip;
        }

        return btn;
    }

    //========================
    // STYLES
    //========================
    
    var STYLES = {
        window: {
            margins: [0, 0, 0, 8]
        },
        
        spacing: {
            contentArea: 12,
            footer: 5,
            footerBranding: 2,
            helpDialog: 10,
            helpInstructions: 4,
            helpButtons: 8
        },

        margins: {
            content: 4,
            footer: [8, 0, 8, 4],
            helpDialog: 20,
            helpTitle: [0, 0, 0, 0],
            helpPanel: 12,
            helpInstruction: 0,
            helpButtons: [4, 8, 4, 4]
        },
        
        sizes: {
            button: {
                height: 24
            },
            footer: {
                height: 45,
                brandingWidth: 120,
                brandingMaxWidth: 160,
                helpButton: [25, 25]
            },
            contentArea: {
                minHeight: 43
            },
            helpButton: {
                codeRunner: 100,
                kbar: 80,
                learnMore: 100,
                ok: 80
            }
        },
        
        customLayouts: {
            contentContainer: {
                orientation: "column",
                alignment: ["fill", "fill"],
                alignChildren: ["fill", "bottom"],
                spacing: 0
            },
            contentArea: {
                orientation: "column",
                alignment: ["fill", "fill"],
                alignChildren: ["fill", "fill"]
            },
            footer: {
                orientation: "row",
                alignment: ["fill", "bottom"],
                alignChildren: ["left", "bottom"]
            },
            footerBranding: {
                orientation: "column",
                alignChildren: ["left", "bottom"]
            }
        }
    };

    //========================
    // CONTENT
    //========================
    
    var CONTENT = {
        buttons: {
            action: "Solid Sweeper",
            getCodeRunner: "Get Code Runner",
            getKbar: "Get Kbar",
            learnMore: "Learn More",
            ok: "OK"
        },
        errors: {
            noProject: "Please open a project first.",
            noSolids: "No solids or null objects found in project.",
            actionFailed: "Error during consolidation:\n\n"
        },
        help: {
            title: "How to Use ",
            instructions: [
                "• Removes unused solids and consolidates duplicates",
                "• Matches by dimensions, color, and type",
                "• Works great with Code Runner and Kbar"
            ]
        },
        stats: {
            // Personality messages based on consolidation percentage
            messages: {
                none: "Your project was already squeaky clean!",
                low: "Every little bit helps!",
                medium: "Nice work - that's some solid consolidation!",
                high: "Fantastic! Your project panel thanks you!",
                perfect: "Flawless victory! All duplicates eliminated!"
            }
        }
    };

    //========================
    // UTILITY FUNCTIONS
    //========================
    
    function applyLayout(element, layout) {
        for (var key in layout) {
            if (layout.hasOwnProperty(key)) {
                element[key] = layout[key];
            }
        }
    }
    
    function showAlert(title, message) {
        var alertWindow = new Window("dialog", title);
        alertWindow.orientation = "column";
        alertWindow.alignChildren = ["fill", "top"];
        alertWindow.spacing = 10;
        alertWindow.margins = 16;

        alertWindow.add("statictext", undefined, message, {multiline: true});

        var buttonRow = alertWindow.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignment = ["center", "center"];
        buttonRow.alignChildren = ["center", "center"];
        buttonRow.spacing = 8;
        buttonRow.margins = 4;

        var okButton = buttonRow.add("button", undefined, "OK");
        okButton.preferredSize = [80, 26];

        function handleAlertOk() {
            alertWindow.close(1);
        }
        okButton.onClick = handleAlertOk;

        alertWindow.show();
    }
    
    function colorToString(colorArray) {
        var r = colorArray[0].toFixed(6);
        var g = colorArray[1].toFixed(6);
        var b = colorArray[2].toFixed(6);
        return r + "," + g + "," + b;
    }
    
    function createSignature(width, height, color) {
        return width + "x" + height + "_" + color;
    }
    
    function isNullByName(itemName) {
        return itemName.toLowerCase().indexOf("null") !== -1;
    }

    function isSolidByName(itemName) {
        // Treat anything that's not a null as a solid (includes adjustment layers)
        return !isNullByName(itemName);
    }
    
    function sortAlphabetically(solidArray) {
        solidArray.sort(function(a, b) {
            var nameA = a.item.name.toLowerCase();
            var nameB = b.item.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    }
    
    function removeUnusedSolids() {
        var removedItems = [];
        
        // Loop backwards to safely remove items
        for (var i = app.project.numItems; i >= 1; i--) {
            var item = app.project.item(i);
            
            if (item instanceof FootageItem && item.mainSource instanceof SolidSource) {
                if (item.usedIn.length === 0) {
                    // Store info before removal
                    var color = colorToString(item.mainSource.color);
                    removedItems.push({
                        width: item.width,
                        height: item.height,
                        color: color,
                        isNull: isNullByName(item.name),
                        isSolid: isSolidByName(item.name)
                    });
                    item.remove();
                }
            }
        }
        
        return removedItems;
    }
    
    function countConsolidatedFromRemoved(removedItems, remainingSolids) {
        // Count how many removed items had matching duplicates
        var consolidated = 0;
        var signatures = {};
        
        // Build signature map from remaining solids
        for (var i = 0; i < remainingSolids.length; i++) {
            var solid = remainingSolids[i];
            var sig = createSignature(solid.width, solid.height, solid.color);
            signatures[sig] = true;
        }
        
        // Check removed items for matches with remaining
        for (var j = 0; j < removedItems.length; j++) {
            var removed = removedItems[j];
            var sig = createSignature(removed.width, removed.height, removed.color);
            
            if (signatures[sig]) {
                // This removed item was a duplicate of something still in project
                consolidated++;
            }
        }
        
        return consolidated;
    }

    //========================
    // CORE FUNCTIONALITY
    //========================
    
    var ToolEngine = {
        executeAction: function() {
            // Collect all solids from entire project FIRST
            var allSolids = this.collectAllSolids();
            if (allSolids.length === 0) {
                showAlert(CONFIG.name, CONTENT.errors.noSolids);
                return false;
            }
            
            // Track starting count BEFORE cleanup
            var startingCount = allSolids.length;
            
            // Pre-cleanup: Remove unused solids and track what was removed
            var removedItems = removeUnusedSolids();
            
            // Collect remaining solids after cleanup
            var solids = this.collectAllSolids();
            
            // Count how many removed items were duplicates
            var preCleanupConsolidated = countConsolidatedFromRemoved(removedItems, solids);
            
            if (solids.length === 0) {
                // All solids were unused
                var message = "Cleanup Complete!\n\n";
                message += "All " + removedItems.length + " solids were unused and have been removed.\n\n";
                if (preCleanupConsolidated > 0) {
                    message += preCleanupConsolidated + " of those were duplicates.\n\n";
                }
                message += CONTENT.stats.messages.perfect;
                showAlert(CONFIG.name, message);
                return true;
            }
            
            var nullResults = this.consolidateSolidsByType(
                solids,
                "Null",
                function(solid) { return solid.isNull; }
            );
            
            var solidResults = this.consolidateSolidsByType(
                solids,
                "Solid",
                function(solid) { return solid.isSolid; }
            );
            
            this.showReport(nullResults, solidResults, startingCount, removedItems.length, preCleanupConsolidated);
            return true;
        },
        
        collectAllSolids: function() {
            var solids = [];
            
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                
                if (!(item instanceof FootageItem)) continue;
                if (!item.mainSource) continue;
                if (!(item.mainSource instanceof SolidSource)) continue;
                
                var color = colorToString(item.mainSource.color);
                
                solids.push({
                    item: item,
                    width: item.width,
                    height: item.height,
                    color: color,
                    isNull: isNullByName(item.name),
                    isSolid: isSolidByName(item.name)
                });
            }
            
            return solids;
        },
        
        groupBySignature: function(solids, filterFunc) {
            var groups = {};
            
            for (var i = 0; i < solids.length; i++) {
                var solid = solids[i];
                
                if (!filterFunc(solid)) continue;
                
                var sig = createSignature(solid.width, solid.height, solid.color);
                
                if (!groups[sig]) {
                    groups[sig] = [];
                }
                
                groups[sig].push(solid);
            }
            
            return groups;
        },
        
        findDuplicateGroups: function(groups) {
            var duplicates = [];
            
            for (var sig in groups) {
                if (!groups.hasOwnProperty(sig)) continue;
                
                if (groups[sig].length > 1) {
                    sortAlphabetically(groups[sig]);
                    duplicates.push({
                        signature: sig,
                        keeper: groups[sig][0],
                        duplicates: groups[sig].slice(1)
                    });
                }
            }
            
            return duplicates;
        },
        
        replaceSolidInProject: function(oldItem, newItem) {
            var replacedLayers = 0;
            
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                
                if (!(item instanceof CompItem)) continue;
                
                for (var j = 1; j <= item.numLayers; j++) {
                    var layer = item.layer(j);
                    
                    if (layer.source && layer.source === oldItem) {
                        try {
                            layer.replaceSource(newItem, false);
                            replacedLayers++;
                        } catch (e) {
                            // Skip if replacement fails
                        }
                    }
                }
            }
            
            return replacedLayers;
        },
        
        consolidateGroup: function(group) {
            var keeper = group.keeper;
            var duplicates = group.duplicates;
            var totalReplaced = 0;
            var itemsRemoved = 0;
            
            for (var i = 0; i < duplicates.length; i++) {
                var dup = duplicates[i];
                var replaced = this.replaceSolidInProject(dup.item, keeper.item);
                totalReplaced += replaced;
                
                try {
                    dup.item.remove();
                    itemsRemoved++;
                } catch (e) {
                    // Skip if removal fails
                }
            }
            
            return {
                keeper: keeper.item.name,
                removed: itemsRemoved,
                layersUpdated: totalReplaced
            };
        },
        
        consolidateSolidsByType: function(solids, typeName, filterFunc) {
            var groups = this.groupBySignature(solids, filterFunc);
            var duplicateGroups = this.findDuplicateGroups(groups);
            
            if (duplicateGroups.length === 0) {
                return {
                    processed: false,
                    message: "No duplicate " + typeName + "s found."
                };
            }
            
            var totalRemoved = 0;
            var totalLayersUpdated = 0;
            
            for (var i = 0; i < duplicateGroups.length; i++) {
                var result = this.consolidateGroup(duplicateGroups[i]);
                totalRemoved += result.removed;
                totalLayersUpdated += result.layersUpdated;
            }
            
            return {
                processed: true,
                typeName: typeName,
                groupsConsolidated: duplicateGroups.length,
                itemsRemoved: totalRemoved,
                layersUpdated: totalLayersUpdated
            };
        },
        
        showReport: function(nullResults, solidResults, startingCount, unusedRemoved, preCleanupConsolidated) {
            var consolidationPhaseRemoved = 0;
            
            if (nullResults.processed) {
                consolidationPhaseRemoved += nullResults.itemsRemoved;
            }
            
            if (solidResults.processed) {
                consolidationPhaseRemoved += solidResults.itemsRemoved;
            }
            
            // Total consolidated = duplicates from pre-cleanup + consolidation phase
            var totalConsolidated = preCleanupConsolidated + consolidationPhaseRemoved;
            
            // Calculate ending count (current solids in project)
            var endingCount = 0;
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (item instanceof FootageItem && item.mainSource instanceof SolidSource) {
                    endingCount++;
                }
            }
            
            // Calculate consolidation percentage
            var consolidatedPercent = 0;
            if (startingCount > 0) {
                consolidatedPercent = Math.round(100 - (endingCount / startingCount * 100));
            }
            
            // Get personality message based on percentage
            var personalityMsg = "";
            if (consolidatedPercent === 0) {
                personalityMsg = CONTENT.stats.messages.none;
            } else if (consolidatedPercent > 0 && consolidatedPercent < 25) {
                personalityMsg = CONTENT.stats.messages.low;
            } else if (consolidatedPercent >= 25 && consolidatedPercent < 75) {
                personalityMsg = CONTENT.stats.messages.medium;
            } else if (consolidatedPercent >= 75 && consolidatedPercent < 100) {
                personalityMsg = CONTENT.stats.messages.high;
            } else if (consolidatedPercent === 100) {
                personalityMsg = CONTENT.stats.messages.perfect;
            }
            
            // Build report message
            var message = "Consolidation Complete!\n\n";
            message += "Stats:\n";
            if (unusedRemoved > 0) {
                message += "• Unused items removed: " + unusedRemoved + "\n";
            }
            message += "• Starting total: " + startingCount + "\n";
            message += "• Ending total: " + endingCount + "\n";
            message += "• Items consolidated: " + totalConsolidated + "\n";
            message += "• Consolidation rate: " + consolidatedPercent + "%\n\n";
            message += personalityMsg;
            
            showAlert(CONFIG.name, message);
        }
    };

    //========================
    // VALIDATION
    //========================
    
    var ValidationManager = {
        validateEnvironment: function() {
            if (!app.project) {
                return {
                    success: false,
                    message: CONTENT.errors.noProject
                };
            }

            return {
                success: true
            };
        }
    };

    //========================
    // STANDALONE EXECUTION
    //========================
    
    function executeStandalone() {
        var validation = ValidationManager.validateEnvironment();
        if (!validation.success) {
            showAlert(CONFIG.name, validation.message);
            return;
        }

        app.beginUndoGroup(CONFIG.name);
        try {
            ToolEngine.executeAction();
        } catch (error) {
            showAlert(CONFIG.name, CONTENT.errors.actionFailed + error.message);
        } finally {
            app.endUndoGroup();
        }
    }

    //========================
    // EVENT HANDLERS
    //========================
    
    function actionButtonHandler() {
        var validation = ValidationManager.validateEnvironment();
        if (!validation.success) {
            showAlert(CONFIG.name, validation.message);
            return;
        }

        app.beginUndoGroup(CONFIG.name);
        try {
            ToolEngine.executeAction();
        } catch (error) {
            showAlert(CONFIG.name, CONTENT.errors.actionFailed + error.message);
        } finally {
            app.endUndoGroup();
        }
    }

    //========================
    // FOOTER SYSTEM
    //========================
    
    function createFooter(parentWindow) {
        var contentContainer = parentWindow.add("group");
        applyLayout(contentContainer, STYLES.customLayouts.contentContainer);
        contentContainer.spacing = 0;
        contentContainer.margins = 0;
        
        var contentArea = contentContainer.add("group");
        applyLayout(contentArea, STYLES.customLayouts.contentArea);
        contentArea.spacing = STYLES.spacing.contentArea;
        contentArea.margins = STYLES.margins.content;
        contentArea.minimumSize.height = STYLES.sizes.contentArea.minHeight;
        
        var footer = contentContainer.add("group");
        applyLayout(footer, STYLES.customLayouts.footer);
        footer.spacing = STYLES.spacing.footer;
        footer.margins = STYLES.margins.footer;
        footer.maximumSize.height = STYLES.sizes.footer.height;
        
        var branding = footer.add("group");
        applyLayout(branding, STYLES.customLayouts.footerBranding);
        branding.spacing = STYLES.spacing.footerBranding;
        branding.minimumSize.width = STYLES.sizes.footer.brandingWidth;
        
        var titleText = branding.add("statictext", undefined, 
            CONFIG.name + " - " + CONFIG.version);
        titleText.maximumSize.width = STYLES.sizes.footer.brandingMaxWidth;
        
        var currentYear = new Date().getFullYear();
        var copyrightYear = currentYear > CONFIG.year ? 
            CONFIG.year + "-" + currentYear : String(CONFIG.year);
        var copyrightText = branding.add("statictext", undefined, 
            "\u00A9" + copyrightYear + " " + CONFIG.author);
        copyrightText.maximumSize.width = STYLES.sizes.footer.brandingMaxWidth;
        
        var spacer = footer.add("group");
        spacer.alignment = ["fill", "center"];
        
        var helpBtn = footer.add("button", undefined, "?");
        helpBtn.alignment = ["right", "bottom"];
        helpBtn.preferredSize = STYLES.sizes.footer.helpButton;
        helpBtn.minimumSize = STYLES.sizes.footer.helpButton;
        helpBtn.maximumSize = STYLES.sizes.footer.helpButton;
        
        return {
            contentArea: contentArea,
            helpButton: helpBtn
        };
    }

    //========================
    // HELP SYSTEM
    //========================
    
    function showHelpDialog() {
        var helpDialog = new Window("dialog", "Help - " + CONFIG.name);
        helpDialog.orientation = "column";
        helpDialog.alignChildren = ["fill", "top"];
        helpDialog.spacing = STYLES.spacing.helpDialog;
        helpDialog.margins = STYLES.margins.helpDialog;

        var titleText = helpDialog.add("statictext", undefined,
            CONTENT.help.title + CONFIG.name);
        titleText.alignment = ["center", "top"];

        var instructionsPanel = helpDialog.add("panel", undefined, "Usage");
        instructionsPanel.orientation = "column";
        instructionsPanel.alignChildren = ["fill", "top"];
        instructionsPanel.spacing = STYLES.spacing.helpInstructions;
        instructionsPanel.margins = STYLES.margins.helpPanel;

        instructionsPanel.add("statictext", undefined, "Removes unused solids and consolidates duplicates.");
        instructionsPanel.add("statictext", undefined, "Matches by dimensions, color, and type.");

        var toolsText = helpDialog.add("statictext", undefined, "Works great with tools like KBar and Code Runner.");
        toolsText.alignment = ["center", "top"];

        var buttonGroup = helpDialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = ["center", "top"];
        buttonGroup.alignChildren = ["center", "center"];
        buttonGroup.spacing = STYLES.spacing.helpButtons;
        buttonGroup.margins = STYLES.margins.helpButtons;

        var codeRunnerBtn = buttonGroup.add("button", undefined, CONTENT.buttons.getCodeRunner);
        var kbarBtn = buttonGroup.add("button", undefined, CONTENT.buttons.getKbar);
        var learnMoreBtn = buttonGroup.add("button", undefined, CONTENT.buttons.learnMore);
        var okBtn = buttonGroup.add("button", undefined, CONTENT.buttons.ok);

        codeRunnerBtn.preferredSize.width = STYLES.sizes.helpButton.codeRunner;
        kbarBtn.preferredSize.width = STYLES.sizes.helpButton.kbar;
        learnMoreBtn.preferredSize.width = STYLES.sizes.helpButton.learnMore;
        okBtn.preferredSize.width = STYLES.sizes.helpButton.ok;

        function handleCodeRunnerClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.codeRunner);
                } else {
                    system.callSystem("open " + CONFIG.urls.codeRunner);
                }
            } catch (error) {
                alert("Cannot open URL automatically. Please visit:\n" + CONFIG.urls.codeRunner);
            }
        }

        function handleKbarClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.kbar);
                } else {
                    system.callSystem("open " + CONFIG.urls.kbar);
                }
            } catch (error) {
                alert("Cannot open URL automatically. Please visit:\n" + CONFIG.urls.kbar);
            }
        }

        function handleLearnMoreClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.website);
                } else {
                    system.callSystem("open " + CONFIG.urls.website);
                }
            } catch (error) {
                alert("Cannot open URL automatically. Please visit:\n" + CONFIG.urls.website);
            }
        }

        function handleHelpOkClick() {
            helpDialog.close();
        }

        codeRunnerBtn.onClick = handleCodeRunnerClick;
        kbarBtn.onClick = handleKbarClick;
        learnMoreBtn.onClick = handleLearnMoreClick;
        okBtn.onClick = handleHelpOkClick;

        helpDialog.show();
    }

    //========================
    // DOCKABILITY DETECTION
    //========================
    
    function createWindowWithFallback(thisObj, title) {
        if (thisObj instanceof Panel) {
            return thisObj;
        }
        try {
            var win = new Window("palette", title, undefined);
            if (win.frameBounds) {
                return win;
            } else {
                win.close();
                return new Window("dialog", title, undefined);
            }
        } catch (e) {
            return new Window("dialog", title, undefined);
        }
    }

    //========================
    // PANEL RESIZE
    //========================

    function setupPanelResize(panel) {
        function handleResize() {
            this.layout.resize();
        }
        panel.onResizing = handleResize;
        panel.onResize = handleResize;
    }

    //========================
    // UI CONSTRUCTION
    //========================

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", CONFIG.name, undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 4;
        win.margins = 4;

        // Button constants
        var BUTTON_HEIGHT = 34;

        // Button container
        var buttonRow = win.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignChildren = ["fill", "center"];
        buttonRow.spacing = 0;
        buttonRow.margins = 0;
        buttonRow.alignment = ["fill", "top"];

        // Create icon button
        var applyBtn = createIconButton(buttonRow, {
            iconData: ICON_SWEEPER,
            iconSize: 24,
            buttonSize: [BUTTON_HEIGHT, BUTTON_HEIGHT],
            defaultColor: "#c4c4c4",
            hoverColor: "#2196F3",
            helpTip: "Solid Sweeper - Consolidate duplicate solids\n\n" +
                     "Removes unused solids first\n" +
                     "Then consolidates duplicates by size and color\n" +
                     "Separates Nulls from Solids automatically",
            onClick: actionButtonHandler
        });
        applyBtn.alignment = ["fill", "center"];

        // Footer
        var footer = win.add("group");
        footer.orientation = "row";
        footer.alignment = ["fill", "bottom"];
        footer.alignChildren = ["left", "bottom"];
        footer.spacing = 5;
        footer.margins = 4;

        var branding = footer.add("group");
        branding.orientation = "column";
        branding.alignChildren = ["left", "bottom"];
        branding.spacing = 2;
        branding.margins = 0;

        var titleText = branding.add("statictext", undefined,
            CONFIG.name + " - " + CONFIG.version);

        var currentYear = new Date().getFullYear();
        var copyrightYear = currentYear > CONFIG.year ?
            CONFIG.year + "-" + currentYear : String(CONFIG.year);
        var copyrightText = branding.add("statictext", undefined,
            "\u00A9" + copyrightYear + " " + CONFIG.author);

        var spacer = footer.add("group");
        spacer.alignment = ["fill", "center"];

        var helpBtn = footer.add("button", undefined, "?");
        helpBtn.alignment = ["right", "bottom"];
        helpBtn.preferredSize = [25, 25];
        helpBtn.minimumSize = [25, 25];
        helpBtn.maximumSize = [25, 25];
        helpBtn.onClick = showHelpDialog;

        // Resize handler
        function handleResize() {
            if (win.layout) {
                win.layout.resize();
            }
        }
        win.onResizing = handleResize;
        win.onResize = handleResize;

        win.layout.layout(true);

        return win;
    }

    //========================
    // CONTEXT DETECTION
    //========================

    function detectExecutionContext() {
        // Context 1: Dockable panel (Window menu)
        if (thisObj instanceof Panel) {
            return "panel";
        }

        // Context 2: KBar
        if (typeof kbar !== "undefined" && kbar.button) {
            return "kbar";
        }

        // Context 3 & 4: File > Scripts menu or Code Runner
        return "standalone";
    }

    //========================
    // INITIALIZATION
    //========================

    var context = detectExecutionContext();

    if (context === "panel") {
        // Dockable panel - build full UI
        var mainUIWindow = buildUI(thisObj);

        if (mainUIWindow instanceof Window) {
            mainUIWindow.center();
            mainUIWindow.show();
        }
    } else {
        // All other contexts - execute immediately
        executeStandalone();
    }

})(this);