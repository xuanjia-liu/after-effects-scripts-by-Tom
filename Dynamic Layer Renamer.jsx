#target aftereffects

(function() {
  var scriptName = "Dynamic Universal Renamer";
  var scriptVersion = "3.3";
  var scriptAuthor = "Jiaxuan Liu - Enhanced Version";
  
  // No settings system needed
  
  var win = new Window("palette", scriptName + " v" + scriptVersion, undefined, {resizeable: true});
  win.orientation = "row";
  win.alignChildren = ["fill", "fill"];
  win.spacing = 8;
  win.margins = [10, 4, 10, 10];
  win.onResizing = win.onResize = function() {
    this.layout.resize();
  };
  
  // Left column - Preview panel
  var leftColumn = win.add("group");
  leftColumn.orientation = "column";
  leftColumn.alignChildren = ["fill", "top"];
  leftColumn.spacing = 4;
  leftColumn.alignment = ["left", "fill"];
  leftColumn.preferredSize.width = 160;
  leftColumn.minimumSize = [160, -1];
  leftColumn.maximumSize = [160, 10000];
  
  var previewPanel = leftColumn.add("panel", undefined, "Preview");
  previewPanel.orientation = "column";
  previewPanel.alignChildren = ["fill", "top"];
  previewPanel.spacing = 3;
  previewPanel.margins = [8, 10, 8, 8];
  previewPanel.alignment = ["left", "fill"];
  previewPanel.preferredSize.width = 160;
  previewPanel.minimumSize = [160, -1];
  previewPanel.maximumSize = [160, 10000];
  
  // Right column - Main controls
  var rightColumn = win.add("group");
  rightColumn.orientation = "column";
  rightColumn.alignChildren = ["fill", "top"];
  rightColumn.spacing = 3;
  rightColumn.alignment = ["fill", "top"];

  // Quick Rename operations (Row 1)
  var specialPanel = rightColumn.add("panel", undefined, "Quick Layer Rename");
  specialPanel.orientation = "row";
  specialPanel.alignChildren = ["left", "center"];
  specialPanel.margins = [8, 12, 8, 8];
  specialPanel.spacing = 5;
  specialPanel.alignment = ["fill", "top"];
  
  var fromSourceTextBtn = specialPanel.add("button", undefined, "Text");
  fromSourceTextBtn.preferredSize.width = 48;
  fromSourceTextBtn.preferredSize.height = 22;
  
  var fromFontNameBtn = specialPanel.add("button", undefined, "Font");
  fromFontNameBtn.preferredSize.width = 48;
  fromFontNameBtn.preferredSize.height = 22;
  
  var renameWithEffectBtn = specialPanel.add("button", undefined, "Effect");
  renameWithEffectBtn.preferredSize.width = 48;
  renameWithEffectBtn.preferredSize.height = 22;
  
  var renameWithTypeBtn = specialPanel.add("button", undefined, "Type");
  renameWithTypeBtn.preferredSize.width = 48;
  renameWithTypeBtn.preferredSize.height = 22;
  
  var updateMarkerBtn = specialPanel.add("button", undefined, "Marker");
  updateMarkerBtn.preferredSize.width = 48;
  updateMarkerBtn.preferredSize.height = 22;

  
  // Main controls group (Rows 2-6)
  var mainControlsGroup = rightColumn.add("panel", undefined, "Rename");
  mainControlsGroup.orientation = "column";
  mainControlsGroup.alignChildren = ["fill", "top"];
  mainControlsGroup.spacing = 5;
  mainControlsGroup.alignment = ["fill", "top"];
  mainControlsGroup.margins = [8, 8, 8, 8];
  
  // Target and Template row (Row 2)
  var targetGroup = mainControlsGroup.add("group");
  targetGroup.orientation = "row";
  targetGroup.alignChildren = ["left", "center"];
  targetGroup.spacing = 8;
  
  // Target dropdown
  var targetDropdownLabel = targetGroup.add("statictext", undefined, "Target:");
  targetDropdownLabel.preferredSize.width = 36;
  
  // Auto-detect checkbox
  var autoDetectCheck = targetGroup.add("checkbox", undefined, "Auto");
  autoDetectCheck.value = true;
  autoDetectCheck.preferredSize.width = 50;
  
  var targetDropdown = targetGroup.add("dropdownlist", undefined, [
    "All (Recursive)", 
    "Layers", 
    "Project Items", 
    "Effects", 
    "Text Content", 
    "Markers", 
    "Expressions", 
    "Selected Properties",
    "Shape Properties",
    "Masks",
    "Puppet Pins",
    "Source Comp"
  ]);
  targetDropdown.selection = 0;
  targetDropdown.preferredSize.width = 112;
  targetDropdown.preferredSize.height = 24;
  targetDropdown.enabled = !autoDetectCheck.value;
  
  // Template dropdown
  var templateDropdown = targetGroup.add("dropdownlist");
  templateDropdown.preferredSize.width = 96;
  templateDropdown.preferredSize.height = 24;
  
  // Match field row (Row 3)
  var findGroup = mainControlsGroup.add("group");
  findGroup.orientation = "row";
  findGroup.alignChildren = ["fill", "center"];
  findGroup.spacing = 10;
  
  // Match field
  var findText = findGroup.add("edittext", undefined, "");
  findText.alignment = ["fill", "center"];
  findText.preferredSize.width = 120;
  findText.preferredSize.height = 24;
  findText.text = "";
  findText.helpTip = "Enter text to match (optional)";
  
  findText.graphics.font = ScriptUI.newFont(findText.graphics.font.name, findText.graphics.font.style, findText.graphics.font.size);
  findText.justify = "center";
  
  findText.onActivate = function() {
    if (this.text == "Match (optional)") {
      this.text = "";
    }
    // Refresh preview when field is focused to reflect any selection changes
    updatePreview();
  };
  
  findText.onDeactivate = function() {
    if (this.text == "") {
      this.text = "Match (optional)";
    }
  };
  
  findText.text = "Match (optional)";

  // Match options
  // Make Match options (checkboxes) into a group
  var matchOptionsGroup = findGroup.add("group");
  matchOptionsGroup.orientation = "row";
  matchOptionsGroup.alignChildren = ["left", "center"];
  matchOptionsGroup.spacing = 4;
  matchOptionsGroup.preferredSize.width = 170;
  matchOptionsGroup.preferredSize.height = 24;
  matchOptionsGroup.alignment = ["right", "center"];

  var matchCaseCheck = matchOptionsGroup.add("checkbox", undefined, "Case");
  matchCaseCheck.value = true; // default behavior was case-sensitive
  matchCaseCheck.helpTip = "Match Case";
  var wholeWordCheck = matchOptionsGroup.add("checkbox", undefined, "Word");
  wholeWordCheck.value = false;
  wholeWordCheck.helpTip = "Whole Word only";
  var regexCheck = matchOptionsGroup.add("checkbox", undefined, "Regex");
  regexCheck.value = false;
  regexCheck.helpTip = "Off: Match is plain text. On: Match is a regular expression.";
  matchCaseCheck.onClick = function() { updatePreview(); };
  wholeWordCheck.onClick = function() { updatePreview(); };
  regexCheck.onClick = function() { updatePreview(); };
  
  // Template options
  var templateOptions = {
    layers: ["[T] - Layer Type", "[F] - Frames", "[Sec] - Seconds", "[Sh] - Shy", "[P] - Parent"],
    text: ["[Font] - Font Name", "[Size] - Font Size", "[Color] - Font Color"],
    effects: ["[ET] - Effect Type", "[En] - Enabled State"],
    markers: ["[Time] - Marker Time", "[Dur] - Duration"],
    properties: ["[Path] - Property Path", "[Val] - Property Value"],
    project: ["[Res] - Comp Resolution", "[LenS] - Length in Seconds", "[LenF] - Length in Frames", "[AR] - Aspect Ratio", "[FR] - Frame Rate", "[Date] - Current Date"]
  };
  
  function updateTemplateDropdown() {
    templateDropdown.removeAll();
    
    templateDropdown.add("item", "- Template -");
    
    var selectedTarget = targetDropdown.selection.text;
    var hasTemplates = false;
    
    switch (selectedTarget) {
      case "All (Recursive)":
      case "Layers":
        for (var i = 0; i < templateOptions.layers.length; i++) {
          templateDropdown.add("item", templateOptions.layers[i]);
        }
        hasTemplates = templateOptions.layers.length > 0;
        break;
      case "Text Content":
        for (var i = 0; i < templateOptions.text.length; i++) {
          templateDropdown.add("item", templateOptions.text[i]);
        }
        hasTemplates = templateOptions.text.length > 0;
        break;
      case "Effects":
        for (var i = 0; i < templateOptions.effects.length; i++) {
          templateDropdown.add("item", templateOptions.effects[i]);
        }
        hasTemplates = templateOptions.effects.length > 0;
        break;
      case "Markers":
        for (var i = 0; i < templateOptions.markers.length; i++) {
          templateDropdown.add("item", templateOptions.markers[i]);
        }
        hasTemplates = templateOptions.markers.length > 0;
        break;
      case "Selected Properties":
      case "Masks":
      case "Puppet Pins":
      case "Shape Properties":
        for (var i = 0; i < templateOptions.properties.length; i++) {
          templateDropdown.add("item", templateOptions.properties[i]);
        }
        hasTemplates = templateOptions.properties.length > 0;
        break;
      case "Project Items":
      case "Source Comp":
        for (var i = 0; i < templateOptions.project.length; i++) {
          templateDropdown.add("item", templateOptions.project[i]);
        }
        hasTemplates = templateOptions.project.length > 0;
        break;
    }
    
    if (templateDropdown.items.length > 0) {
      templateDropdown.selection = 0;
      templateDropdown.enabled = true;
    } else {
      templateDropdown.enabled = false;
    }
    
    templateDropdown.hasTemplates = hasTemplates;
    
    win.layout.layout(true);
  }
  
  updateTemplateDropdown();
  
  // No preset management 
  
  // Rename field row (Row 4)
  var renameGroup = mainControlsGroup.add("group");
  renameGroup.orientation = "row";
  renameGroup.alignChildren = ["fill", "center"];
  renameGroup.spacing = 4;
  
  var renameText = renameGroup.add("edittext", undefined, "");
  renameText.alignment = ["fill", "center"];
  renameText.preferredSize.height = 24;
  renameText.text = "";
  renameText.helpTip = "Enter new name";
  
  // Slightly larger font for better vertical centering in taller field
  renameText.graphics.font = ScriptUI.newFont(renameText.graphics.font.name, renameText.graphics.font.style, 14);
  renameText.justify = "center";
  
  renameText.onActivate = function() {
    if (this.text == "Rename to") {
      this.text = "";
    }
    // Refresh preview when field is focused to reflect any selection changes
    updatePreview();
  };
  
  renameText.onDeactivate = function() {
    if (this.text == "") {
      this.text = "Rename to";
    }
  };
  
  // No preview group - we'll move it to the status bar
  
  renameText.text = "Rename to";
  
  // Number options group (Row 5)
  var numberGroup = mainControlsGroup.add("group");
  numberGroup.orientation = "row";
  numberGroup.alignChildren = ["left", "center"];
  numberGroup.spacing = 4;
  
  var currentNameBtn = numberGroup.add("button", undefined, "Current Name");
  currentNameBtn.preferredSize.width = 88;
  currentNameBtn.preferredSize.height = 22;
  
  var numberAscBtn = numberGroup.add("button", undefined, "Num\u2191");
  numberAscBtn.preferredSize.width = 50;
  numberAscBtn.preferredSize.height = 22;
  
  var numberDescBtn = numberGroup.add("button", undefined, "Num\u2193");
  numberDescBtn.preferredSize.width = 50;
  numberDescBtn.preferredSize.height = 22;
  
  var startNumberGroup = numberGroup.add("group");
  startNumberGroup.orientation = "row";
  startNumberGroup.alignChildren = ["right", "center"];
  startNumberGroup.preferredSize.width = 120;
  startNumberGroup.preferredSize.height = 24;
  startNumberGroup.alignment = ["fill", "center"];
  startNumberGroup.spacing = 4;
  
  var startNumberLabel = startNumberGroup.add("statictext", undefined, "Num Start:");
  startNumberLabel.preferredSize.width = 56;
  var startNumber = startNumberGroup.add("edittext", undefined, "1");
  startNumber.characters = 4;
  startNumber.preferredSize.height = 22;
  
  var globalShapeNumberingCheck = numberGroup.add("checkbox", undefined, "Global Seq");
  globalShapeNumberingCheck.value = false;
  globalShapeNumberingCheck.helpTip = "Shape properties: number across all, not per group";
   
  // Button row (Row 6) - Close and Apply buttons at the bottom
  var buttonGroup = rightColumn.add("group");
  buttonGroup.orientation = "row";
  buttonGroup.alignChildren = ["fill", "center"];
  buttonGroup.alignment = ["right", "top"];
  buttonGroup.margins = [0, 8, 0, 0];
  buttonGroup.spacing = 8;
  
  var closeBtn = buttonGroup.add("button", undefined, "Close");
  closeBtn.preferredSize.width = 96;
  closeBtn.preferredSize.height = 28;
  
  var renameBtn = buttonGroup.add("button", undefined, "Apply", {name: "ok"});
  renameBtn.preferredSize.width = 96;
  renameBtn.preferredSize.height = 28; 
  
  
  
  // Preview items storage for dynamic updates
  var previewItems = [];
  
  // Template dropdown handler
  templateDropdown.onChange = function() {
    if (this.selection && this.selection.index > 0) {
      var selectedText = this.selection.text;
      var match = selectedText.match(/\[(.*?)\]/);
      if (match) {
        var template = "[" + match[1] + "]";
        
        // Clear placeholder text if present
        if (renameText.text === "Rename to") {
          renameText.text = "";
        }
        
        // Make rename field active
        renameText.active = true;
        
        // Insert at current cursor position or at end if no selection
        try {
          var startPos = (renameText.textSelection && renameText.textSelection[0] !== undefined) ? 
                          renameText.textSelection[0] : renameText.text.length;
          var endPos = (renameText.textSelection && renameText.textSelection[1] !== undefined) ? 
                        renameText.textSelection[1] : renameText.text.length;
          
          // Insert the template
          var textBefore = renameText.text.substring(0, startPos);
          var textAfter = renameText.text.substring(endPos);
          renameText.text = textBefore + template + textAfter;
          
          // Position cursor after inserted template
          var newPos = startPos + template.length;
          renameText.textSelection = [newPos, newPos];
        } catch (e) {
          // Fallback: just append to the end
          renameText.text += template;
        }
        
        // Update preview
        updatePreview();
      }
      
      // Reset dropdown selection
      this.selection = 0;
    }
  };
  
  targetDropdown.onChange = function() {
    updateTemplateDropdown();
    updatePreview();
  };
  
  // Helper Functions
  function detectActivePanel() {
    try {
      if (!app.project) return null;
      
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length > 0) {
        
        if (app.activeViewer && 
            app.activeViewer.type === ViewerType.VIEWER_EFFECT && 
            app.activeViewer.active) {
          return "effects";
        }
        
        if (typeof effectsPaletteActive !== "undefined" && effectsPaletteActive === true) {
          return "effects";
        }
        
        var focusedEffects = focusedEffectsPanel();
        if (focusedEffects) {
          return "effects";
        }
      }
      
      var projectActive = app.project.selection.length > 0;
      var timelineActive = app.project.activeItem instanceof CompItem && 
                          app.project.activeItem.selectedLayers.length > 0;
      
      if (projectActive && timelineActive) {
        if (lastEffectsSelectionTime > lastProjectSelectionTime && 
            lastEffectsSelectionTime > lastTimelineSelectionTime) {
          return "effects";
        }
        
        if (lastProjectSelectionTime > lastTimelineSelectionTime) {
          return "project";
        } else {
          return "timeline";
        }
      }
      
      if (projectActive) return "project";
      if (timelineActive) return "timeline";
      if (app.project.activeItem instanceof CompItem) return "timeline";
      
      return null;
    } catch (e) {
      return null;
    }
  }
  
  function focusedEffectsPanel() {
    try {
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length === 1) {
        
        var layer = app.project.activeItem.selectedLayers[0];
        
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
          var effectsSelected = false;
          var now = new Date().getTime();
          
          for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
            var effect = layer.property("Effects").property(i);
            
            try {
              if (effect.selected) {
                effectsSelected = true;
                break;
              }
            } catch (e) { dbg("silent", e); }
            
            try {
              if (effect.modified) {
                effectsSelected = true;
                break;
              }
            } catch (e) { dbg("silent", e); }
          }
          
          if (effectsSelected) return true;
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
  
  function updateTargetBasedOnContext() {
    if (!autoDetectCheck.value) return;
    
    var activePanel = detectActivePanel();
    var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
    var shouldUpdate = false;
    var targetIndex = 0;
    
    if (activePanel === "timeline" && currentTarget !== "Layers") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Layers") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === "effects" && currentTarget !== "Effects") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Effects") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === "project" && currentTarget !== "Project Items") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Project Items") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === null && currentTarget !== "All (Recursive)") {
      targetIndex = 0;
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      targetDropdown.selection = targetIndex;
      updateTemplateDropdown();
      updatePreview();
      win.update();
    }
  }
  
  function checkCompAndSelection() {
    if (!(app.project.activeItem instanceof CompItem)) {
      showError("Composition Required", "Please open a composition.");
      return false;
    }
    
    if (app.project.activeItem.selectedLayers.length === 0) {
      showError("Selection Required", "Please select at least one layer.");
      return false;
    }
    
    return true;
  }
  
  // Tracking variables
  var panelOpen = true;
  var pollTaskId = null;
  var lastCheckTime = 0;
  var checkInterval = 250; // ms
  var lastSelectionState = "";
  var lastEffectsState = "";
  var lastExpressionState = "";
  var lastProjectSelectionState = "";
  var lastTimelineSelectionState = "";
  var lastProjectSelectionTime = 0;
  var lastTimelineSelectionTime = 0;
  var lastEffectsSelectionTime = 0;
  
  function checkForSelectionChanges() {
    try {
      var now = new Date().getTime();
      
      // Only perform intensive checks when needed
      if (now - lastCheckTime > checkInterval) {
        lastCheckTime = now;
        
        var currentState = "";
        
        var currentProjectState = "";
        if (app.project && app.project.selection.length > 0) {
          currentProjectState = "project|items:" + app.project.selection.length;
          for (var i = 0; i < Math.min(app.project.selection.length, 5); i++) {
            currentProjectState += "|" + app.project.selection[i].id;
          }
        }
        
        if (currentProjectState !== lastProjectSelectionState) {
          lastProjectSelectionState = currentProjectState;
          if (currentProjectState) {
            lastProjectSelectionTime = now;
          }
        }
        
        var currentTimelineState = "";
        if (app.project && app.project.activeItem instanceof CompItem) {
          var comp = app.project.activeItem;
          var layers = comp.selectedLayers;
          
          currentTimelineState = "comp:" + comp.id + "|layers:" + layers.length;
          for (var i = 0; i < Math.min(layers.length, 5); i++) {
            currentTimelineState += "|" + layers[i].index;
          }
        }
        
        if (currentTimelineState !== lastTimelineSelectionState) {
          lastTimelineSelectionState = currentTimelineState;
          if (currentTimelineState) {
            lastTimelineSelectionTime = now;
          }
        }
        
        currentState = currentProjectState + "||" + currentTimelineState;
        
        if (currentState !== lastSelectionState) {
          lastSelectionState = currentState;
          
          // The layer count in the title bar. checkSelection() used to do this
          // but nothing ever called it, so the title never changed.
          try {
            if (app.project && app.project.activeItem instanceof CompItem) {
              win.text = scriptName + " v" + scriptVersion +
                         " (" + app.project.activeItem.selectedLayers.length + " layers)";
            } else {
              win.text = scriptName + " v" + scriptVersion;
            }
          } catch (e) {
            dbg("window title", e);
          }
          
          if (autoDetectCheck.value) {
            updateTargetBasedOnContext();
          }
          
          // Update the preview when selection changes
          updatePreview();
        }
        
        if (app.project && app.project.activeItem instanceof CompItem && 
            app.project.activeItem.selectedLayers.length === 1) {
          var layer = app.project.activeItem.selectedLayers[0];
          var currentEffectsState = "";
          
          if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
            for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
              var effect = layer.property("Effects").property(i);
              currentEffectsState += effect.name + ":";
              
              try {
                var isActive = false;
                for (var p = 1; p <= effect.numProperties; p++) {
                  if (effect.property(p).selected) {
                    isActive = true;
                    break;
                  }
                }
                currentEffectsState += (isActive ? "1" : "0") + ",";
              } catch (e) {
                currentEffectsState += "u,";
              }
            }
          }
          
          if (currentEffectsState !== lastEffectsState) {
            lastEffectsState = currentEffectsState;
            lastEffectsSelectionTime = now;
            
            if (autoDetectCheck.value && focusedEffectsPanel()) {
              var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
              if (currentTarget !== "Effects") {
                for (var i = 0; i < targetDropdown.items.length; i++) {
                  if (targetDropdown.items[i].text === "Effects") {
                    targetDropdown.selection = i;
                    updateTemplateDropdown();
                    updatePreview();
                    win.update();
                    break;
                  }
                }
              }
            }
          }
        } else {
          lastEffectsState = "";
        }
        
        var currentExpressionState = "";
        if (app.project && app.project.activeItem instanceof CompItem) {
          var hasSelectedExpressions = checkForSelectedExpressions();
          currentExpressionState = hasSelectedExpressions ? "selected" : "";
          
          if (currentExpressionState !== lastExpressionState) {
            lastExpressionState = currentExpressionState;
            
            if (autoDetectCheck.value && hasSelectedExpressions) {
              var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
              if (currentTarget !== "Expressions") {
                for (var i = 0; i < targetDropdown.items.length; i++) {
                  if (targetDropdown.items[i].text === "Expressions") {
                    targetDropdown.selection = i;
                    updateTemplateDropdown();
                    updatePreview();
                    win.update();
                    break;
                  }
                }
              }
            }
          }
        } else {
          lastExpressionState = "";
        }
      }
    } catch (e) {
      dbg("checkForSelectionChanges", e);
    }
    
    // Keep polling only while the palette is open. Without this the chain runs
    // for the rest of the After Effects session, once per time the script is
    // launched, updating a window that no longer exists.
    if (panelOpen) {
      pollTaskId = app.scheduleTask(checkForSelectionChanges, 200, false);
    }
  }
  
  function checkForSelectedExpressions() {
    try {
      if (app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        
        for (var i = 0; i < selectedLayers.length; i++) {
          var hasExpressions = checkLayerForSelectedExpressions(selectedLayers[i]);
          if (hasExpressions) {
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  function checkLayerForSelectedExpressions(layer) {
    try {
      function checkPropertyForExpression(prop) {
        if (!prop) return false;
        
        if (prop.propertyType === PropertyType.PROPERTY) {
          if (prop.selected && prop.expression && prop.expression !== "") {
            return true;
          }
        }
        else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                 prop.propertyType === PropertyType.NAMED_GROUP) {
          for (var i = 1; i <= prop.numProperties; i++) {
            if (checkPropertyForExpression(prop.property(i))) {
              return true;
            }
          }
        }
        return false;
      }
      
      return checkPropertyForExpression(layer);
    } catch (e) {
      return false;
    }
  }
  
  function checkProjectSelection() {
    if (app.project && app.project.selection && app.project.selection.length > 0) {
      return true;
    }
    
    showError("Selection Required", "Please select at least one item in the Project panel.");
    return false;
  }
  
  function updateStatus(message) {
    // Don't update any status text, just show errors if needed
    if (message.indexOf("Error:") === 0) {
      showError("Rename Error", message.substring(7));
    }
  }
  
  function showError(title, message, details) {
    var errorMsg = title + "\n\n" + message;
    if (details) errorMsg += "\n\nDetails: " + details;
    alert(errorMsg);
  }

  // Truncate preview line text to fit a single row and append "..." in the middle
  function truncatePreviewText(text, graphics, availableWidth) {
    try {
      if (!text || !graphics) return "";
      if (graphics.measureString(text)[0] <= availableWidth) {
        return text;
      }
      
      var ellipsis = "...";
      var ellipsisWidth = graphics.measureString(ellipsis)[0];
      var targetWidth = availableWidth - ellipsisWidth;
      var start = "";
      var end = "";

      // Find start text that fits in about half the available space
      for (var i = 1; i < text.length; i++) {
        var tempStart = text.substring(0, i);
        if (graphics.measureString(tempStart)[0] > targetWidth / 2) {
          break;
        }
        start = tempStart;
      }

      // Find end text that fits in about half the available space
      for (var i = text.length - 1; i > 0; i--) {
        var tempEnd = text.substring(i);
        if (graphics.measureString(tempEnd)[0] > targetWidth / 2) {
          break;
        }
        end = tempEnd;
      }
      
      // Ensure the combined text with ellipsis fits, trimming if necessary
      var result = start + ellipsis + end;
      while (graphics.measureString(result)[0] > availableWidth && start.length > 0) {
        start = start.slice(0, -1);
        result = start + ellipsis + end;
      }

      return result;

    } catch (e) {
      // Fallback for safety if measureString fails
      var limit = 24; 
      if (text.length <= limit) return text;
      var half = Math.floor((limit - 3) / 2);
      return text.substring(0, half) + "..." + text.substring(text.length - half);
    }
  }

  // --- Shared helpers -------------------------------------------------------

  var DEBUG = false;
  function dbg(where, e) {
    if (!DEBUG) return;
    try { $.writeln("[" + scriptName + "] " + where + ": " + e); } catch (ignored) {}
  }

  // Start number from the UI. parseInt without a radix reads "010" as octal (8).
  // 0 is a legitimate start number, so only a non-number falls back to 1.
  function startNum() {
    var n = parseInt(startNumber.text, 10);
    return isNaN(n) ? 1 : n;
  }

  function escapeRegex(s) {
    return String(s).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  }

  // "$" in a replacement string is a backreference as far as String.replace is
  // concerned, so "Cost $5" would come out as "Cost ". Double it to keep it.
  function escRepl(s) {
    return String(s).replace(/\$/g, "$$$$");
  }

  // Replace every literal occurrence of token with value, in a single pass.
  // A while/indexOf loop hangs After Effects when value itself contains token.
  function replaceToken(text, token, value) {
    if (String(text).indexOf(token) === -1) return String(text);
    return String(text).replace(new RegExp(escapeRegex(token), "g"), escRepl(value));
  }

  // Replacement text handed to String.replace. With Regex off a "$" is literal;
  // with Regex on, $1 and friends stay live, which is the point of the mode.
  function replText(s) {
    var useRegex = (typeof regexCheck !== "undefined") && regexCheck.value === true;
    return useRegex ? String(s) : escRepl(s);
  }

  // The one place a Match pattern becomes a RegExp, so Case / Word / Regex
  // apply to every target. Returns null only for an empty pattern; a pattern
  // that cannot compile as a regex is treated as plain text rather than
  // silently doing something else.
  function buildRegexFromUI(pattern) {
    if (!pattern || pattern === "") return null;

    var useRegex = (typeof regexCheck !== "undefined") && regexCheck.value === true;
    var flags = (matchCaseCheck && matchCaseCheck.value) ? "g" : "gi";
    var src = useRegex ? pattern : escapeRegex(pattern);

    if (wholeWordCheck && wholeWordCheck.value) {
      // Avoid a double boundary if the user already wrote one
      if (src.indexOf("\\b") === -1) {
        src = "\\b" + src + "\\b";
      }
    }

    try {
      return new RegExp(src, flags);
    } catch (e) {
      dbg("buildRegexFromUI", e);
    }

    // Invalid regex: fall back to matching it literally
    try {
      var literal = escapeRegex(pattern);
      if (wholeWordCheck && wholeWordCheck.value) literal = "\\b" + literal + "\\b";
      return new RegExp(literal, flags);
    } catch (e2) {
      dbg("buildRegexFromUI literal", e2);
      return null;
    }
  }

  // Helper function to collect selected properties with expressions from a layer
  function collectSelectedPropertiesWithExpressions(layer) {
    var result = [];
    
    function checkProperty(prop) {
      if (!prop) return;
      
      try {
        if (prop.propertyType === PropertyType.PROPERTY) {
          if (prop.canSetExpression && prop.expression && prop.expression !== "") {
            try {
              if (prop.selected) {
                result.push(prop);
              }
            } catch (e) { dbg("silent", e); }
          }
        }
        else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                prop.propertyType === PropertyType.NAMED_GROUP) {
          for (var i = 1; i <= prop.numProperties; i++) {
            checkProperty(prop.property(i));
          }
        }
      } catch (e) {
        // Skip properties that cause errors
        dbg("Skip properties that cause errors", e);
      }
    }
    
    try {
      checkProperty(layer);
    } catch (e) { dbg("silent", e); }
    return result;
  }
  
  // Read-only test. After Effects allows setting .name only on a property whose
  // parent is an indexed group - shape group children, masks, effects, pins.
  // The previous version probed by assigning prop.name = prop.name, which wrote
  // to the project from inside the preview on every keystroke.
  function canRenameProperty(prop) {
    try {
      if (!prop || prop.name === undefined) return false;
      var parent = prop.parentProperty;
      if (!parent) return false;
      return parent.propertyType === PropertyType.INDEXED_GROUP;
    } catch (e) {
      dbg("canRenameProperty", e);
      return false;
    }
  }
  
  // --- Shared collectors ----------------------------------------------------
  // Preview and apply call these, so the panel cannot disagree with the result.
  
  function collectEffects(selectedLayers) {
    var result = [];
    
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      var group = layer.property("Effects");
      if (!group || group.numProperties === 0) continue;
      
      for (var e = 1; e <= group.numProperties; e++) {
        var effect = group.property(e);
        var picked = false;
        
        try {
          if (effect.selected) picked = true;
        } catch (err) { dbg("effect.selected", err); }
        
        if (!picked) {
          try {
            for (var pi = 1; pi <= effect.numProperties; pi++) {
              if (effect.property(pi).selected) { picked = true; break; }
            }
          } catch (err2) { dbg("effect child selected", err2); }
        }
        
        if (picked) result.push(effect);
      }
    }
    
    // Nothing explicitly selected: fall back to every effect on the first layer,
    // which is what the Effect Controls panel is showing.
    if (result.length === 0 && selectedLayers.length > 0) {
      var first = selectedLayers[0].property("Effects");
      if (first && first.numProperties > 0) {
        for (var f = 1; f <= first.numProperties; f++) {
          result.push(first.property(f));
        }
      }
    }
    
    return result;
  }
  
  function collectSelectedProps(selectedLayers) {
    var result = [];
    
    function checkProperty(prop) {
      if (!prop) return;
      
      try {
        if (prop.selected && prop.name !== undefined) result.push(prop);
      } catch (e) {
        dbg("prop.selected", e);
      }
      
      if (prop.propertyType === PropertyType.INDEXED_GROUP ||
          prop.propertyType === PropertyType.NAMED_GROUP) {
        for (var i = 1; i <= prop.numProperties; i++) {
          checkProperty(prop.property(i));
        }
      }
    }
    
    for (var i = 0; i < selectedLayers.length; i++) {
      checkProperty(selectedLayers[i]);
    }
    
    return result;
  }
  
  function collectTextLayers(selectedLayers) {
    var result = [];
    for (var i = 0; i < selectedLayers.length; i++) {
      if (selectedLayers[i] instanceof TextLayer) result.push(selectedLayers[i]);
    }
    return result;
  }
  
  function collectLayerMarkers(selectedLayers) {
    var result = [];
    for (var i = 0; i < selectedLayers.length; i++) {
      var layer = selectedLayers[i];
      if (!layer.marker || layer.marker.numKeys === 0) continue;
      for (var j = 1; j <= layer.marker.numKeys; j++) {
        result.push({ prop: layer.marker, key: j });
      }
    }
    return result;
  }
  
  function collectExpressionProps(selectedLayers) {
    var result = [];
    for (var i = 0; i < selectedLayers.length; i++) {
      var props = [];
      try {
        props = collectSelectedPropertiesWithExpressions(selectedLayers[i]) || [];
      } catch (e) {
        dbg("collectExpressionProps", e);
      }
      result = result.concat(props);
    }
    return result;
  }
  
  var PREVIEW_ROWS = 10;
  var previewPool = null;
  
  // The rows are built once and reused. Adding and removing StaticText on every
  // keystroke made ScriptUI churn and the panel feel heavy.
  function ensurePreviewPool() {
    if (previewPool) return previewPool;
    previewPool = [];
    for (var i = 0; i <= PREVIEW_ROWS; i++) {
      // Single-line on purpose: a multiline statictext needs an explicit size in
      // ScriptUI or it collapses, and every message here is one short line.
      var row = previewPanel.add("statictext", undefined, "");
      row.graphics.font = ScriptUI.newFont(row.graphics.font.name, row.graphics.font.style, 10);
      row.visible = false;
      previewPool.push(row);
    }
    previewItems = previewPool;
    return previewPool;
  }
  
  function showPreviewLines(lines, more) {
    var pool = ensurePreviewPool();
    var width = 148; // conservative text width inside the 160px panel
    var n = Math.min(lines.length, PREVIEW_ROWS);
    var i;
    
    for (i = 0; i < n; i++) {
      pool[i].text = truncatePreviewText(String(lines[i]), previewPanel.graphics, width);
      pool[i].visible = true;
    }
    
    if (more) {
      pool[n].text = "...";
      pool[n].visible = true;
      n++;
    }
    
    for (i = n; i < pool.length; i++) {
      pool[i].text = "";
      pool[i].visible = false;
    }
    
    previewPanel.layout.layout(true);
  }
  
  function showPreviewMessage(message) {
    showPreviewLines([message], false);
  }
  
  // Names for the first PREVIEW_ROWS entries of a set, using the same buildName
  // the apply pass uses. extrasFor is optional and receives the entry.
  function previewNames(entries, nameOf, find, template, showCurrent, extrasFor) {
    var lines = [];
    var limit = Math.min(entries.length, PREVIEW_ROWS);
    
    for (var i = 0; i < limit; i++) {
      var entry = entries[i];
      var oldName = "";
      try { oldName = String(nameOf(entry)); } catch (e) { dbg("previewNames", e); }
      
      if (showCurrent) {
        lines.push(oldName);
      } else {
        var extras = extrasFor ? extrasFor(entry) : null;
        lines.push(buildName(find, template, oldName, i, entries.length, extras));
      }
    }
    
    return lines;
  }
  
  function updatePreview() {
    try {
      var selectedTarget = targetDropdown.selection ? targetDropdown.selection.text : "Layers";
      var pattern = findText.text === "Match (optional)" ? "" : findText.text;
      var template = renameText.text === "Rename to" ? "" : renameText.text;
      var showCurrent = (pattern.length === 0 && template.length === 0);
      
      var comp = (app.project && app.project.activeItem instanceof CompItem) ? app.project.activeItem : null;
      var layers = comp ? comp.selectedLayers : [];
      var projectSel = (app.project && app.project.selection) ? app.project.selection : [];
      
      var selectionCount = layers.length > 0 ? layers.length : projectSel.length;
      previewPanel.text = "Preview (" + selectionCount + ")";
      
      // --- Layers -----------------------------------------------------------
      if (layers.length > 0 && (selectedTarget === "Layers" || selectedTarget === "All (Recursive)")) {
        var lines = [];
        var limit = Math.min(layers.length, PREVIEW_ROWS);
        for (var i = 0; i < limit; i++) {
          var layer = layers[i];
          var oldName = layer.name;
          
          if (showCurrent) {
            lines.push(oldName);
          } else {
            lines.push(layerName(pattern, template, oldName, i, layers.length, layer));
          }
        }
        
        showPreviewLines(lines, layers.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Project items ----------------------------------------------------
      if (projectSel.length > 0 && selectedTarget === "Project Items") {
        var items = [];
        for (var pi = 0; pi < projectSel.length; pi++) items.push(projectSel[pi]);
        
        showPreviewLines(
          previewNames(items, function(it) { return it.name; }, pattern, template, showCurrent, itemExtras),
          items.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Effects ----------------------------------------------------------
      if (selectedTarget === "Effects") {
        var effects = comp ? collectEffects(layers) : [];
        if (effects.length === 0) {
          showPreviewMessage("No effects found to preview");
          return;
        }
        showPreviewLines(
          previewNames(effects, function(fx) { return fx.name; }, pattern, template, showCurrent, effectExtras),
          effects.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Text content -----------------------------------------------------
      if (selectedTarget === "Text Content") {
        var textLayers = comp ? collectTextLayers(layers) : [];
        if (textLayers.length === 0) {
          showPreviewMessage("No text layers selected");
          return;
        }
        showPreviewLines(
          previewNames(textLayers,
            function(l) { return l.property("Source Text").value.text; },
            pattern, template, showCurrent,
            function(l) {
              var ex = {};
              try {
                var td = l.property("Source Text").value;
                ex["[Font]"] = td.font;
                ex["[Size]"] = td.fontSize + "px";
              } catch (e) { dbg("text extras", e); }
              return ex;
            }),
          textLayers.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Markers ----------------------------------------------------------
      if (selectedTarget === "Markers") {
        var markers = comp ? collectLayerMarkers(layers) : [];
        if (markers.length === 0) {
          showPreviewMessage("No layer markers to preview");
          return;
        }
        showPreviewLines(
          previewNames(markers,
            function(m) { return m.prop.keyValue(m.key).comment; },
            pattern, template, showCurrent,
            function(m) { return markerExtras(m.prop, m.key, comp); }),
          markers.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Expressions ------------------------------------------------------
      if (selectedTarget === "Expressions") {
        var exprProps = comp ? collectExpressionProps(layers) : [];
        if (exprProps.length === 0) {
          showPreviewMessage("No selected properties with expressions");
          return;
        }
        var exprLines = previewNames(exprProps,
          function(pr) { return pr.expression; }, pattern, template, showCurrent);
        for (var el = 0; el < exprLines.length; el++) {
          exprLines[el] = String(exprLines[el]).replace(/\r?\n|\r/g, " ");
        }
        showPreviewLines(exprLines, exprProps.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Selected properties ----------------------------------------------
      if (selectedTarget === "Selected Properties") {
        var props = comp ? collectSelectedProps(layers) : [];
        if (props.length === 0) {
          showPreviewMessage("No properties selected");
          return;
        }
        showPreviewLines(
          previewNames(props, function(pr) { return pr.name; }, pattern, template, showCurrent, propExtras),
          props.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Shape properties -------------------------------------------------
      if (selectedTarget === "Shape Properties") {
        var shapeLayers = comp ? shapeLayersFrom(layers) : [];
        if (shapeLayers.length === 0) {
          showPreviewMessage("No shape layers selected");
          return;
        }
        
        var useGlobal = (typeof globalShapeNumberingCheck !== "undefined") &&
                        globalShapeNumberingCheck.value === true;
        var entries = numberShapeProps(collectShapeProps(shapeLayers, pattern), useGlobal);
        var findProvided = pattern && pattern.length > 0;
        var shapeLines = [];
        
        for (var si = 0; si < entries.length && shapeLines.length < PREVIEW_ROWS; si++) {
          var entry = entries[si];
          var shapeOld = entry.prop.name;
          
          if (showCurrent) {
            shapeLines.push(shapeOld);
          } else if (findProvided && !entry.matched) {
            continue; // skipped by the apply pass too
          } else {
            shapeLines.push(buildName(pattern, template, shapeOld, entry.index, entry.total));
          }
        }
        
        if (shapeLines.length === 0) {
          showPreviewMessage("No renameable shape properties");
          return;
        }
        showPreviewLines(shapeLines, entries.length > shapeLines.length);
        return;
      }
      
      // --- Masks ------------------------------------------------------------
      if (selectedTarget === "Masks") {
        var masks = [];
        for (var mi = 0; mi < layers.length; mi++) {
          var ml = layers[mi];
          if (!ml.mask || ml.mask.numProperties === 0) continue;
          for (var mj = 1; mj <= ml.mask.numProperties; mj++) {
            masks.push(ml.mask.property(mj));
          }
        }
        if (masks.length === 0) {
          showPreviewMessage("No masks on the selected layers");
          return;
        }
        showPreviewLines(
          previewNames(masks, function(m) { return m.name; }, pattern, template, showCurrent),
          masks.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Source comp ------------------------------------------------------
      if (selectedTarget === "Source Comp") {
        var comps = [];
        for (var ci = 0; ci < layers.length; ci++) {
          var cl = layers[ci];
          if (cl instanceof AVLayer && cl.source instanceof CompItem) {
            var dup = false;
            for (var cd = 0; cd < comps.length; cd++) {
              if (comps[cd] === cl.source) { dup = true; break; }
            }
            if (!dup) comps.push(cl.source);
          }
        }
        if (comps.length === 0) {
          showPreviewMessage("No precomp layers selected");
          return;
        }
        showPreviewLines(
          previewNames(comps, function(c) { return c.name; }, pattern, template, showCurrent, itemExtras),
          comps.length > PREVIEW_ROWS);
        return;
      }
      
      // --- Fallback ---------------------------------------------------------
      if (layers.length > 0) {
        showPreviewMessage("Preview not available for " + selectedTarget);
      } else if (projectSel.length > 0) {
        showPreviewMessage("Project items selected");
      } else {
        showPreviewMessage("Select items to see preview");
      }
      
    } catch (e) {
      dbg("updatePreview", e);
      try {
        showPreviewMessage("Preview error: " + e.toString().substring(0, 60));
      } catch (e2) {
        dbg("updatePreview fallback", e2);
      }
    }
  }
  
  function formatNumber(num, padding) {
    padding = padding || 0;
    var result = num.toString();
    while (result.length < padding) {
      result = "0" + result;
    }
    return result;
  }
  
  // Replace padded number tokens in a template string.
  // Supports [#up], [##up], [###up] and the matching down tokens, where
  function replacePaddedNumberTokens(input, index, totalCount, startVal) {
    try {
      var result = input;
      var startValueLocal = (startVal !== undefined && startVal !== null) ? startVal : (startNum());
      
      // Ascending padded tokens
      result = result.replace(/\[(#+)\u2191\]/g, function(match, hashes) {
        var num = startValueLocal + index;
        return formatNumber(num, hashes.length);
      });
      
      // Descending padded tokens
      result = result.replace(/\[(#+)\u2193\]/g, function(match, hashes) {
        var num = startValueLocal + (totalCount - index - 1);
        return formatNumber(num, hashes.length);
      });
      
      // Default tokens without explicit padding
      result = result.replace(/\[#\u2191\]/g, function() {
        var num = startValueLocal + index;
        return formatNumber(num);
      });
      result = result.replace(/\[#\u2193\]/g, function() {
        var num = startValueLocal + (totalCount - index - 1);
        return formatNumber(num);
      });
      
      return result;
    } catch (e) {
      dbg("replacePaddedNumberTokens", e);
      return input;
    }
  }

  // The one place a per-item name is built from the Rename field. Every target
  // that renames a single named thing goes through here, so Case / Word / Regex,
  // the padded number tokens and $-in-replacement behave the same everywhere.
  //   index  - 0-based position in the set being renamed
  //   total  - size of that set
  //   extras - optional { "[ET]": "Blur", ... } token values for this target
  function propPath(prop) {
    try {
      var current = prop;
      var pathParts = [];
      while (current && current.name) {
        pathParts.unshift(current.name);
        current = current.parentProperty;
      }
      return pathParts.join("/");
    } catch (e) {
      dbg("propPath", e);
      return "Unknown";
    }
  }

  function propValueString(prop) {
    try {
      if (prop.propertyType !== PropertyType.PROPERTY) return "N/A";
      if (prop.value === undefined) return "N/A";
      if (prop.value.length) return "[" + prop.value.join(", ") + "]";
      return prop.value.toString();
    } catch (e) {
      dbg("propValueString", e);
      return "Error";
    }
  }

  // Token values each target can supply. Preview and apply both read from
  // these, so what the panel shows is what gets written.
  function propExtras(prop) {
    return { "[Path]": propPath(prop), "[Val]": propValueString(prop) };
  }

  function effectExtras(effect) {
    var type = effect.matchName;
    try { type = effect.matchName.split("_")[1] || effect.matchName; } catch (e) { dbg("effectExtras", e); }
    return { "[ET]": type, "[En]": effect.enabled ? "On" : "Off" };
  }

  function itemExtras(item) {
    var extras = { "[Date]": formatDate(new Date()) };
    if (item instanceof CompItem) {
      extras["[Res]"]  = item.width + "x" + item.height;
      extras["[LenS]"] = item.duration.toFixed(2) + "s";
      extras["[LenF]"] = Math.round(item.duration * item.frameRate) + "f";
      extras["[AR]"]   = calculateAspectRatio(item.width, item.height);
      extras["[FR]"]   = item.frameRate.toFixed(2) + " fps";
    }
    return extras;
  }

  function formatTime(seconds, frameRate) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * frameRate);

    if (h < 10) h = "0" + h;
    if (m < 10) m = "0" + m;
    if (s < 10) s = "0" + s;
    if (f < 10) f = "0" + f;

    return h + ":" + m + ":" + s + ":" + f;
  }

  function markerExtras(markerProperty, keyIndex, comp) {
    var rate = (comp && comp.frameRate) ? comp.frameRate : 25;
    var extras = {};
    try {
      extras["[Time]"] = formatTime(markerProperty.keyTime(keyIndex), rate);
      extras["[Dur]"]  = formatTime(markerProperty.keyValue(keyIndex).duration || 0, rate);
    } catch (e) {
      dbg("markerExtras", e);
    }
    return extras;
  }

  // Source Text that is keyframed or expression-driven cannot be rewritten with
  // a plain setValue - it would either throw or quietly change one frame only.
  function canWriteSourceText(textProp) {
    try {
      if (!textProp) return false;
      if (textProp.numKeys > 0) return false;
      if (textProp.expressionEnabled) return false;
      return true;
    } catch (e) {
      dbg("canWriteSourceText", e);
      return false;
    }
  }

  function buildName(find, replace, oldName, index, total, extras) {
    var newName = replace;

    if (replace === "[N]") {
      newName = oldName;
    } else if (replace.indexOf("[N]") !== -1) {
      newName = replaceToken(replace, "[N]", oldName);
    }

    newName = replacePaddedNumberTokens(newName, index, total, startNum());

    if (extras) {
      for (var token in extras) {
        if (extras.hasOwnProperty(token)) {
          newName = replaceToken(newName, token, extras[token]);
        }
      }
    }

    if (find && find.length > 0 && find !== "Match (optional)") {
      var regex = buildRegexFromUI(find);
      if (!regex) return newName;

      if (replace === newName) {
        // Template is plain replacement text: substitute it into the old name
        newName = oldName.replace(regex, replText(replace));
      } else {
        // Template carries tokens: put the matched text back where the Match
        // string appears inside the template
        var matches = oldName.match(regex);
        if (matches && matches.length > 0) {
          newName = replaceToken(newName, find, matches[0]);
        }
      }
    }

    return newName;
  }

  function highlightRenamedItems(items) {
    if (!items || items.length === 0) return;
    
    // Remember layers and project items separately. The old version only saved
    // comp layers, so renaming comp sources left the project selection wrong.
    var prevLayers = [];
    var prevItems = [];
    var i;
    
    try {
      if (app.project.activeItem instanceof CompItem) {
        var layers = app.project.activeItem.selectedLayers;
        for (i = 0; i < layers.length; i++) prevLayers.push(layers[i]);
      }
      var sel = app.project.selection;
      for (i = 0; i < sel.length; i++) prevItems.push(sel[i]);
    } catch (e) {
      dbg("highlight save", e);
    }
    
    function setSelected(list, value) {
      for (var k = 0; k < list.length; k++) {
        try { list[k].selected = value; } catch (e) { dbg("setSelected", e); }
      }
    }
    
    try {
      setSelected(prevLayers, false);
      setSelected(prevItems, false);
      setSelected(items, true);
      
      app.scheduleTask(function() {
        try {
          setSelected(items, false);
          setSelected(prevLayers, true);
          setSelected(prevItems, true);
        } catch (e) {
          dbg("highlight restore", e);
        }
      }, 300, false);
    } catch (e) {
      dbg("highlightRenamedItems", e);
    }
  }
  
  // Button Event Handlers
  closeBtn.onClick = function() {
    win.close();
  };
  
  currentNameBtn.onClick = function() {
    insertAtCursor(renameText, "[N]");
  };
  
  numberAscBtn.onClick = function() {
    insertAtCursor(renameText, "[#\u2191]");
  };
  
  numberDescBtn.onClick = function() {
    insertAtCursor(renameText, "[#\u2193]");
  };
  
  function insertAtCursor(textField, textToInsert) {
    // Clear placeholder text if present
    if (textField.text === "Rename to" || textField.text === "Match (optional)") {
      textField.text = "";
      textField.active = true;
      
      // Insert at beginning of empty field
      textField.text = textToInsert;
      // Position cursor after inserted text
      textField.textSelection = [textToInsert.length, textToInsert.length];
      
      // Update preview after insertion
      updatePreview();
      return;
    }
    
    // Ensure text field is active
    textField.active = true;
    
    try {
      // Get cursor position or selection range
      var startPos = (textField.textSelection && textField.textSelection[0] !== undefined) ? 
                      textField.textSelection[0] : textField.text.length;
      var endPos = (textField.textSelection && textField.textSelection[1] !== undefined) ? 
                    textField.textSelection[1] : textField.text.length;
      
      // Insert text at cursor position
      var textBefore = textField.text.substring(0, startPos);
      var textAfter = textField.text.substring(endPos);
      
      // Update text with insertion
      textField.text = textBefore + textToInsert + textAfter;
      
      // Position cursor after inserted text
      var newPosition = startPos + textToInsert.length;
      textField.textSelection = [newPosition, newPosition];
    } catch (e) {
      // Fallback: just append to the end if anything goes wrong
      textField.text += textToInsert;
    }
    
    // Update preview after insertion
    updatePreview();
  }
  
  fromSourceTextBtn.onClick = function() {
    renameLayersSpecial("Source Text");
  };
  
  fromFontNameBtn.onClick = function() {
    renameLayersSpecial("Font Name");
  };
  
  renameWithEffectBtn.onClick = function() {
    renameLayersSpecial("First Effect");
  };
  
  renameWithTypeBtn.onClick = function() {
    renameLayersSpecial("Layer Type");
  };
  
  updateMarkerBtn.onClick = function() {
    renameSelectedLayersFromFirstMarker();
  };
  
  // No preset functions
  
  
  renameBtn.onClick = function() {
    var pattern = findText.text === "Match (optional)" ? "" : findText.text;
    var replacement = renameText.text === "Rename to" ? "" : renameText.text;
    
    // Find text with an empty Rename field means "delete what matched"
    if (pattern.length === 0 && replacement.length === 0) {
      showError("Input Required", "Please enter either a pattern to match or a name to replace with.");
      return;
    }
    
    if (!targetDropdown.selection) return;
    var selectedTarget = targetDropdown.selection.text;
    
    // A bare [#up] / [#down] gets the sequential renamer, which also keeps an
    // exclusively-used source name in step. That only makes sense for layers,
    // so every other target goes through its own renamer as usual.
    var bareNumberToken = (replacement === "[#\u2191]" || replacement === "[#\u2193]");
    var layerTarget = (selectedTarget === "Layers" || selectedTarget === "All (Recursive)");
    
    if (bareNumberToken && layerTarget) {
      renameLayersSequential(replacement === "[#\u2191]");
      updatePreview();
      return;
    }
    
    switch (selectedTarget) {
      case "Layers":
        renameLayers(pattern, replacement);
        break;
      case "Project Items":
        renameProjectItems(pattern, replacement);
        break;
      case "Effects":
        renameEffects(pattern, replacement);
        break;
      case "Text Content":
        updateTextContent(pattern, replacement);
        break;
      case "Markers":
        updateMarkers(pattern, replacement);
        break;
      case "Expressions":
        updateExpressions(pattern, replacement);
        break;
      case "Selected Properties":
        renameProperties(pattern, replacement);
        break;
      case "Shape Properties":
        renameShapeProperties(pattern, replacement);
        break;
      case "Masks":
        renameMasks(pattern, replacement);
        break;
      case "Puppet Pins":
        renamePuppetPins(pattern, replacement);
        break;
      case "Source Comp":
        renameSourceComp(pattern, replacement);
        break;
      case "All (Recursive)":
        renameAll(pattern, replacement);
        break;
    }
    
    updatePreview();
  };
  
  // Rename Functions
  // The one way a layer name is built, used by the preview and by Apply.
  function layerName(find, template, oldName, index, total, layer) {
    var hasTokens = /\[[#A-Za-z0-9\u2191\u2193]+\]/.test(template);
    
    if (!hasTokens) {
      return buildName(find, template, oldName, index, total);
    }
    
    var name = processNameTemplate(template, oldName, index, total, layer);
    
    // Same rule buildName uses: with a Match pattern, drop the matched text
    // back into the template wherever the Match string appears in it.
    if (find && find.length > 0 && find !== "Match (optional)") {
      var regex = buildRegexFromUI(find);
      if (regex) {
        var m = oldName.match(regex);
        if (m && m.length > 0) name = replaceToken(name, find, m[0]);
      }
    }
    
    return name;
  }
  
  function renameLayers(find, replace) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup("Rename Layers");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var oldName = layer.name;
        var newName = layerName(find, replace, oldName, i, selectedLayers.length, layer);
        
        if (oldName !== newName) {
          layer.name = newName;
          renamedLayers.push(layer);
          count++;
        }
      }
      
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      updateStatus("Renamed " + count + " layer(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  // Every token is substituted in one pass. The previous version looped on
  // indexOf until the token was gone, which never terminates when the
  // substituted value contains the token - a layer named "[N]" hung AE.
  function processNameTemplate(template, currentName, index, totalLayers, layerArg) {
    var result = template;
    var startValue = startNum();
    var comp = app.project.activeItem;
    var layer = layerArg || null;

    if (!layer && comp && comp.selectedLayers.length > index) {
      layer = comp.selectedLayers[index];
    }

    result = replaceToken(result, "[N]", currentName);

    // Replace any padded/default number tokens
    result = replacePaddedNumberTokens(result, index, totalLayers, startValue);

    if (layer) {
      result = replaceToken(result, "[T]", getLayerType(layer));

      if (comp) {
        var durationInFrames = Math.round((layer.outPoint - layer.inPoint) * comp.frameRate);
        result = replaceToken(result, "[F]", durationInFrames + "f");
      }

      result = replaceToken(result, "[Sec]", (layer.outPoint - layer.inPoint).toFixed(2) + "s");
      result = replaceToken(result, "[Sh]", layer.shy ? "-Shy" : "");
      result = replaceToken(result, "[P]", layer.parent ? "-" + layer.parent.name : "");
    }

    if (layer instanceof TextLayer) {
      if (result.indexOf("[Font]") !== -1) {
        var fontName = "Unknown";
        try { fontName = layer.property("Source Text").value.font; } catch (e) { dbg("[Font]", e); }
        result = replaceToken(result, "[Font]", fontName);
      }

      if (result.indexOf("[Size]") !== -1) {
        var fontSize = "Unknown";
        try { fontSize = layer.property("Source Text").value.fontSize + "px"; } catch (e) { dbg("[Size]", e); }
        result = replaceToken(result, "[Size]", fontSize);
      }

      if (result.indexOf("[Color]") !== -1) {
        var hex = "Unknown";
        try {
          var color = layer.property("Source Text").value.fillColor;
          hex = rgbToHex(Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255));
        } catch (e) { dbg("[Color]", e); }
        result = replaceToken(result, "[Color]", hex);
      }
    }

    return result;
  }
  
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  function getLayerType(layer) {
    if (layer instanceof TextLayer) {
      return "Text";
    } else if (layer instanceof ShapeLayer) {
      return "Shape";
    } else if (layer instanceof LightLayer) {
      return "Light";
    } else if (layer instanceof CameraLayer) {
      return "Camera";
    } else if (layer instanceof AVLayer) {
      if (layer.source instanceof CompItem) {
        return "Comp";
      } else if (layer.source instanceof FootageItem) {
        if (layer.source.mainSource instanceof SolidSource) {
          return "Solid";
        } else if (layer.source.mainSource instanceof FileSource) {
          return layer.source.mainSource.file.name.split('.').pop().toUpperCase();
        } else {
          return "Footage";
        }
      } else {
        return "AVLayer";
      }
    } else {
      return "Layer";
    }
  }
  
  function renameLayersSequential(ascending) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup('Sequential Rename Layers');
      var curComp = app.project.activeItem;
      
      var basename = renameText.text;
      if (basename === "[#\u2191]" || basename === "[#\u2193]" || basename === "Rename to") {
        basename = "";
      }
      
      var startFrom = startNum();
      var selectedLayers = curComp.selectedLayers;
      var layersInSelectionOrder = [];
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        layersInSelectionOrder.push(selectedLayers[i]);
      }
      
      if (!ascending) {
        layersInSelectionOrder.reverse();
      }
      
      // A source is safe to rename along with its layer only when nothing else
      // in the project points at it. Counting layers in the current comp alone
      // renamed precomps and footage that other comps were still using.
      function sourceIsExclusive(layer) {
        try {
          var src = layer.source;
          if (!src) return false;
          
          var usedIn = src.usedIn; // comps that contain this item
          if (!usedIn || usedIn.length !== 1) return false;
          if (usedIn[0] !== curComp) return false;
          
          var uses = 0;
          for (var j = 1; j <= curComp.numLayers; j++) {
            if (curComp.layer(j).source === src) uses++;
            if (uses > 1) return false;
          }
          return uses === 1;
        } catch (e) {
          dbg("sourceIsExclusive", e);
          return false;
        }
      }
      
      for (i = 0; i < layersInSelectionOrder.length; i++) {
        var currLayer = layersInSelectionOrder[i];
        var formattedNumber = formatNumber(startFrom + i);
        var name = (basename ? basename + ' ' : '') + formattedNumber;
        
        if (sourceIsExclusive(currLayer)) {
          try {
            currLayer.source.name = name;
          } catch (e) {
            dbg("source.name", e);
          }
        }
        
        currLayer.name = name;
        renamedLayers.push(currLayer);
        count++;
      }
      
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      updateStatus("Renamed " + count + " layer(s) sequentially");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  function renameLayersSpecial(mode) {
    if (!checkCompAndSelection()) return;
    
    try {
      var undoName = "Rename Layers - " + mode;
      app.beginUndoGroup(undoName);
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var comp = app.project.activeItem;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var newName = "";
        
        if (mode === "Source Text" && layer instanceof TextLayer) {
          var textProp = layer.property("Source Text");
          if (textProp) {
            var sourceText = textProp.value.toString();
            newName = sourceText.length > 30 ? sourceText.substring(0, 30) + "..." : sourceText;
          }
        } else if (mode === "Font Name" && layer instanceof TextLayer) {
          try {
            newName = layer.property("Source Text").value.font;
          } catch (e) {
            newName = layer.name + " (Font Error)";
          }
        } else if (mode === "First Effect") {
          if (layer.property("Effects") && 
              layer.property("Effects").numProperties > 0) {
            newName = layer.property("Effects").property(1).name;
          }
        } else if (mode === "Layer Type") {
          // Determine the basic layer type first
          var basicType = "";
          if (layer instanceof TextLayer) {
            basicType = "Text";
          } else if (layer instanceof ShapeLayer) {
            basicType = "Shape";
            
            // Get shape group name(s)
            if (layer.property("Contents")) {
              var contents = layer.property("Contents");
              var numGroups = contents.numProperties;
              
              if (numGroups > 0) {
                // Get the first shape group's name
                var firstGroup = contents.property(1);
                var groupName = firstGroup.name;
                
                // Remove a trailing space+number, e.g. "Ellipse 1" becomes "Ellipse"
                groupName = groupName.replace(/\s+\d+$/, "");
                
                // Replace "Ellipse" with "Circle"
                if (groupName === "Ellipse") {
                  groupName = "Circle";
                }
                
                if (numGroups === 1) {
                  // If only one shape group, use its cleaned name
                  basicType = groupName;
                } else {
                  // If multiple groups, show first name + count
                  basicType = groupName + "+" + (numGroups-1);
                }
              }
            }
          } else if (layer instanceof LightLayer) {
            basicType = "Light";
          } else if (layer instanceof CameraLayer) {
            basicType = "Camera";
          } else if (layer instanceof AVLayer) {
            if (layer.source instanceof CompItem) {
              basicType = "Comp";
            } else if (layer.source instanceof FootageItem) {
              if (layer.source.mainSource instanceof SolidSource) {
                basicType = "Solid";
              } else if (layer.source.mainSource instanceof FileSource) {
                basicType = layer.source.mainSource.file.name.split('.').pop().toUpperCase();
              } else {
                basicType = "Footage";
              }
            } else {
              basicType = "AVLayer";
            }
          } else {
            basicType = "Layer";
          }
          
          // Check if it's an adjustment layer
          if (layer.adjustmentLayer) {
            newName = basicType + "-Adjustment";
          } 
          // Check if it's used as a track matte
          else if (isTrackMatte(layer, comp)) {
            newName = basicType + "-Matte";
          } 
          // Use the basic type if no special conditions
          else {
            newName = basicType;
          }
        }
        
        if (newName && newName !== layer.name) {
          layer.name = newName;
          renamedLayers.push(layer);
          count++;
        }
      }
      
      // Highlight renamed layers if any
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      // Only show error if no layers were compatible, not if already correctly named
      if (count === 0 && selectedLayers.length > 0) {
        var hasCompatibleLayers = false;
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          if (mode === "Source Text" && layer instanceof TextLayer) hasCompatibleLayers = true;
          if (mode === "Font Name" && layer instanceof TextLayer) hasCompatibleLayers = true;
          if (mode === "First Effect" && layer.property("Effects") && layer.property("Effects").numProperties > 0) hasCompatibleLayers = true;
          if (mode === "Layer Type") hasCompatibleLayers = true;
        }
        if (!hasCompatibleLayers) {
          showError("No Layers Renamed", "The selected layers aren't compatible with the " + mode + " option");
        } else {
          updateStatus("Renamed " + count + " layer(s) using " + mode);
        }
      } else {
        updateStatus("Renamed " + count + " layer(s) using " + mode);
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  // Helper function to check if a layer is used as a track matte
  function isTrackMatte(layer, comp) {
    // In After Effects, we can check if any layer references this one as a track matte
    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var currentLayer = comp.layer(i);
        
        // Skip checking the layer itself
        if (currentLayer.index === layer.index) {
          continue;
        }
        
        // Check if this layer is using our target layer as a track matte
        try {
          // This is the most direct way to check for track matte relationship
          if (currentLayer.trackMatteLayer !== null && 
              currentLayer.trackMatteLayer.index === layer.index) {
            return true;
          }
        } catch (e) {
          // Some versions of AE might not support trackMatteLayer directly
          
          // Try the traditional way - look at track matte type for adjacent layers
          if (currentLayer.trackMatteType > 0) { // 0=none, 1+=some type of matte
            // Check if this is the layer directly below our target
            if (layer.index === currentLayer.index - 1) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      // If anything goes wrong, default to false
      dbg("If anything goes wrong, default to false", e);
    }
    
    return false;
  }
  
  function renameProjectItems(find, replace) {
    if (!checkProjectSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup("Rename Project Items");
      var selectedItems = app.project.selection;
      
      for (var i = 0; i < selectedItems.length; i++) {
        var item = selectedItems[i];
        var oldName = item.name;
        var newName = buildName(find, replace, oldName, i, selectedItems.length, itemExtras(item));
        
        if (oldName !== newName) {
          try {
            item.name = newName;
            count++;
          } catch (e) {
            dbg("item.name", e);
          }
        }
      }
      
      updateStatus("Renamed " + count + " project item(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  function calculateAspectRatio(width, height) {
    function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    }
    
    var divisor = gcd(width, height);
    return (width / divisor) + ":" + (height / divisor);
  }
  
  function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    
    return year + "-" + month + "-" + day;
  }
  
  function renameEffects(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Effects");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      var selectedEffects = collectEffects(selectedLayers);
      
      if (selectedEffects.length > 0) {
        for (var i = 0; i < selectedEffects.length; i++) {
          var effect = selectedEffects[i];
          var oldName = effect.name;
          var newName = buildName(find, replace, oldName, i, selectedEffects.length, effectExtras(effect));
          
          if (newName === "Rename to") newName = oldName;
          
          if (oldName !== newName) {
            try {
              effect.name = newName;
              count++;
            } catch (err) {
              showError("Effect Rename Error", "Error renaming effect '" + oldName + "'", err.toString());
            }
          }
        }
        
        updateStatus("Renamed " + count + " selected effect(s)");
        if (count === 0) {
          showError("No Effects Renamed", "No effects were renamed. Check your search/replace text.");
        }
      } else {
        updateStatus("No selected effects found.");
        showError("No Effects Selected", "No selected effects found. Please select effects in the Effect Controls panel.");
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function updateTextContent(find, replace) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup("Update Text Content");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var updatedLayers = [];
      var skippedAnimated = 0;
      var textLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        if (selectedLayers[i] instanceof TextLayer) textLayers.push(selectedLayers[i]);
      }
      
      if (textLayers.length === 0) {
        showError("No Text Layers", "None of the selected layers are text layers.");
        return 0;
      }
      
      for (var t = 0; t < textLayers.length; t++) {
        var layer = textLayers[t];
        var textProp = layer.property("Source Text");
        if (!textProp) continue;
        
        // Keyframed or expression-driven Source Text cannot be rewritten with a
        // plain setValue: it would throw, or silently change one frame only.
        if (!canWriteSourceText(textProp)) {
          skippedAnimated++;
          continue;
        }
        
        var textDocument = textProp.value;
        var oldText = textDocument.text;
        var extras = {};
        try { extras["[Font]"] = textDocument.font; } catch (e) { extras["[Font]"] = "Unknown"; }
        try { extras["[Size]"] = textDocument.fontSize + "px"; } catch (e2) { extras["[Size]"] = "Unknown"; }
        
        var newText = buildName(find, replace, oldText, t, textLayers.length, extras);
        
        if (oldText !== newText) {
          textDocument.text = newText;
          textProp.setValue(textDocument);
          updatedLayers.push(layer);
          count++;
        }
      }
      
      if (updatedLayers.length > 0) {
        highlightRenamedItems(updatedLayers);
      }
      
      if (skippedAnimated > 0) {
        showError("Some Text Skipped",
                  skippedAnimated + " text layer(s) have keyframed or expression-driven Source Text and were left alone.",
                  "Updated " + count + " layer(s). Note that rewriting Source Text applies one character style to the whole string.");
      }
      
      updateStatus("Updated " + count + " text layer content(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  function renameSelectedLayersFromFirstMarker() {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Layers From Marker");
      var comp = app.project.activeItem;
      var selectedLayers = comp.selectedLayers;
      var count = 0;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        try {
          if (layer.marker && layer.marker.numKeys > 0) {
            var firstMarker = layer.marker.keyValue(1);
            var comment = (firstMarker && firstMarker.comment) ? firstMarker.comment : "";
            if (comment !== "" && comment !== undefined && comment !== null) {
              if (layer.name !== comment) {
                layer.name = comment;
                renamedLayers.push(layer);
                count++;
              }
            }
          }
        } catch (e) {
          // Skip layers that cause errors
          dbg("Skip layers that cause errors", e);
        }
      }
      
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      } else {
        // Check if layers have markers at all
        var hasMarkersWithComments = false;
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          try {
            if (layer.marker && layer.marker.numKeys > 0) {
              var firstMarker = layer.marker.keyValue(1);
              var comment = (firstMarker && firstMarker.comment) ? firstMarker.comment : "";
              if (comment !== "" && comment !== undefined && comment !== null) {
                hasMarkersWithComments = true;
                break;
              }
            }
          } catch (e) { dbg("silent", e); }
        }
        
        // Only show error if no markers found, not if already correctly named
        if (!hasMarkersWithComments) {
          showError("No Markers Found", "No marker comments found on selected layers.");
        }
      }
      
      updateStatus("Renamed " + count + " layer(s) from marker");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function updateMarkers(find, replace) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup("Update Markers");
      var comp = app.project.activeItem;
      var selectedLayers = comp.selectedLayers;
      
      // Layer markers on the selected layers only. The previous version also
      // rewrote every composition marker, which the preview never showed and
      // the selection never asked for. Composition markers are reachable from
      // the "All (Recursive)" target, which says it reaches that far.
      var markers = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (!layer.marker || layer.marker.numKeys === 0) continue;
        for (var j = 1; j <= layer.marker.numKeys; j++) {
          markers.push({ prop: layer.marker, key: j });
        }
      }
      
      if (markers.length === 0) {
        showError("No Markers Found", "The selected layer(s) have no markers.");
        return 0;
      }
      
      for (var k = 0; k < markers.length; k++) {
        var info = markers[k];
        var marker = info.prop.keyValue(info.key);
        var oldComment = marker.comment;
        var newComment = buildName(find, replace, oldComment, k, markers.length,
                                   markerExtras(info.prop, info.key, comp));
        
        if (oldComment !== newComment) {
          marker.comment = newComment;
          info.prop.setValueAtKey(info.key, marker);
          count++;
        }
      }
      
      updateStatus("Updated " + count + " marker(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  // nested === true: called from renameAll. Do the work and return the count,
  // but leave the undo group to the caller and stay quiet about empty results.
  function updateExpressions(find, replace, nested) {
    if (!checkCompAndSelection()) return 0;

    var count = 0;
    try {
      if (!nested) app.beginUndoGroup("Update Expressions");
      var selectedLayers = app.project.activeItem.selectedLayers;

      var selectedPropertiesWithExpressions = collectExpressionProps(selectedLayers);
      
      if (selectedPropertiesWithExpressions.length > 0) {
        for (var i = 0; i < selectedPropertiesWithExpressions.length; i++) {
          var prop = selectedPropertiesWithExpressions[i];
          var oldExpr = prop.expression;
          var wasEnabled = prop.expressionEnabled;
          var newExpr = buildName(find, replace, oldExpr, i, selectedPropertiesWithExpressions.length);
          
          if (oldExpr !== newExpr) {
            try {
              prop.expression = newExpr;
              prop.expressionEnabled = wasEnabled;
              count++;
            } catch (e) {
              dbg("prop.expression", e);
            }
          }
        }
        
        if (!nested) {
          updateStatus("Updated " + count + " selected property expression(s)");
          if (count === 0) {
            showError("No Expressions Updated", "No expressions were updated. Check your search/replace text or ensure selected properties have expressions.");
          }
        }
      } else if (!nested) {
        updateStatus("No selected properties with expressions found.");
        showError("No Expressions Found", "No selected properties with expressions found. Please select properties in the Timeline panel first.");
      }
    } catch (e) {
      if (nested) { dbg("updateExpressions", e); } else { updateStatus("Error: " + e.toString()); }
    } finally {
      if (!nested) app.endUndoGroup();
    }
    return count;
  }
  
  function renameProperties(find, replace, nested) {
    if (!checkCompAndSelection()) return 0;

    var count = 0;
    try {
      if (!nested) app.beginUndoGroup("Rename Properties");
      var selectedLayers = app.project.activeItem.selectedLayers;

      var selectedProperties = collectSelectedProps(selectedLayers);
      
      if (selectedProperties.length > 0) {
        for (var i = 0; i < selectedProperties.length; i++) {
          var prop = selectedProperties[i];
          
          try {
            var oldName = prop.name;
            var newName = buildName(find, replace, oldName, i, selectedProperties.length, propExtras(prop));
            
            if (oldName !== newName) {
              try {
                prop.name = newName;
                count++;
              } catch (err) {
                dbg("prop.name", err);
              }
            }
          } catch (e) {
            dbg("renameProperties item", e);
          }
        }
        
        if (!nested) {
          updateStatus("Renamed " + count + " selected propert(ies)");
          if (count === 0) {
            showError("No Properties Renamed", "No properties were renamed. Make sure the selected properties allow renaming and check your search/replace text.");
          }
        }
      } else if (!nested) {
        updateStatus("No selected properties found.");
        showError("No Properties Selected", "No selected properties found. Please select properties in the Timeline panel first.");
      }
    } catch (e) {
      if (nested) { dbg("renameProperties", e); } else { updateStatus("Error: " + e.toString()); }
    } finally {
      if (!nested) app.endUndoGroup();
    }
    return count;
  }
  
  function renameMasks(find, replace, nested) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      if (!nested) app.beginUndoGroup("Rename Masks");
      var selectedLayers = app.project.activeItem.selectedLayers;
      
      // Masks that are actually selected, else every mask on the selected
      // layers - but only after the user says so. Silently renaming every mask
      // on a layer because none happened to be selected loses work.
      var masks = [];
      var i, j;
      
      for (i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (!layer.mask || layer.mask.numProperties === 0) continue;
        for (j = 1; j <= layer.mask.numProperties; j++) {
          var m = layer.mask.property(j);
          try {
            if (m.selected) masks.push(m);
          } catch (e) {
            dbg("mask.selected", e);
          }
        }
      }
      
      if (masks.length === 0) {
        var allMasks = [];
        for (i = 0; i < selectedLayers.length; i++) {
          var l2 = selectedLayers[i];
          if (!l2.mask || l2.mask.numProperties === 0) continue;
          for (j = 1; j <= l2.mask.numProperties; j++) {
            allMasks.push(l2.mask.property(j));
          }
        }
        
        if (allMasks.length === 0) {
          if (!nested) showError("No Masks Found", "The selected layers have no masks.");
          return 0;
        }
        
        if (nested) {
          // Rename All never renames unselected masks on its own
          return 0;
        }
        
        if (!confirm("No masks are selected.\n\nRename all " + allMasks.length +
                     " mask(s) on the selected layer(s)?")) {
          return 0;
        }
        masks = allMasks;
      }
      
      for (i = 0; i < masks.length; i++) {
        var mask = masks[i];
        var oldName = mask.name;
        var newName = buildName(find, replace, oldName, i, masks.length);
        
        if (oldName !== newName) {
          try {
            mask.name = newName;
            count++;
          } catch (e) {
            dbg("mask.name", e);
          }
        }
      }
      
      if (!nested) updateStatus("Renamed " + count + " mask(s)");
    } catch (e) {
      if (nested) { dbg("renameMasks", e); } else { updateStatus("Error: " + e.toString()); }
    } finally {
      if (!nested) app.endUndoGroup();
    }
    return count;
  }
  
  function renamePuppetPins(find, replace, nested) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      if (!nested) app.beginUndoGroup("Rename Puppet Pins");
      var selectedLayers = app.project.activeItem.selectedLayers;
      
      function isPuppetPin(prop) {
        try {
          if (prop.matchName === "ADBE FreePin3 PosPin Atom") return true;
          return prop.name.indexOf("Puppet Pin") === 0;
        } catch (e) {
          dbg("isPuppetPin", e);
          return false;
        }
      }
      
      // Collect first, rename second. The old version kept the counter inside
      // the recursive walk, so it reset on every call and every pin got the
      // same number - and [#down] used the ascending expression.
      function collectPins(prop, out) {
        if (!prop) return;
        if (isPuppetPin(prop)) out.push(prop);
        
        var n = 0;
        try { n = prop.numProperties || 0; } catch (e) { dbg("numProperties", e); }
        for (var j = 1; j <= n; j++) {
          try {
            collectPins(prop.property(j), out);
          } catch (e) {
            dbg("collectPins", e);
          }
        }
      }
      
      var pins = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var before = pins.length;
        
        var effects = layer.property("Effects");
        if (effects) {
          for (var e = 1; e <= effects.numProperties; e++) {
            var effect = effects.property(e);
            if (effect.matchName === "ADBE FreePin3 ARAP Group" ||
                effect.matchName === "ADBE FreePin3 IK Group" ||
                effect.name.indexOf("Puppet") !== -1) {
              collectPins(effect, pins);
            }
          }
        }
        
        // Fall back to walking this layer only if its own effects had none
        if (pins.length === before) {
          collectPins(layer, pins);
        }
      }
      
      if (pins.length === 0) {
        if (!nested) showError("No Puppet Pins Found", "No puppet pins found on the selected layer(s).");
        return 0;
      }
      
      for (var k = 0; k < pins.length; k++) {
        var pin = pins[k];
        var oldName = pin.name;
        var newName = buildName(find, replace, oldName, k, pins.length);
        
        if (oldName !== newName) {
          try {
            pin.name = newName;
            count++;
          } catch (e) {
            dbg("pin.name", e);
          }
        }
      }
      
      if (!nested) updateStatus("Renamed " + count + " puppet pin(s)");
    } catch (e) {
      if (nested) { dbg("renamePuppetPins", e); } else { updateStatus("Error: " + e.toString()); }
    } finally {
      if (!nested) app.endUndoGroup();
    }
    return count;
  }
  
  // One walk, used by both the preview and the apply pass, so the numbers the
  // panel shows are the numbers that get written. Only properties AE will let
  // us rename are collected, and only those are numbered.
  function collectShapeProps(shapeLayers, find) {
    var out = [];
    var regex = (find && find.length > 0 && find !== "Match (optional)") ? buildRegexFromUI(find) : null;
    
    function walk(group) {
      for (var g = 1; g <= group.numProperties; g++) {
        var prop = group.property(g);
        
        if (canRenameProperty(prop)) {
          var matched = true;
          if (regex) {
            var m = null;
            try { m = prop.name.match(regex); } catch (e) { dbg("shape match", e); }
            matched = !!(m && m.length > 0);
          }
          out.push({ prop: prop, matched: matched });
        }
        
        if (prop.propertyType === PropertyType.INDEXED_GROUP ||
            prop.propertyType === PropertyType.NAMED_GROUP) {
          walk(prop);
        }
      }
    }
    
    for (var i = 0; i < shapeLayers.length; i++) {
      var layer = shapeLayers[i];
      if (layer instanceof ShapeLayer && layer.property("Contents")) {
        walk(layer.property("Contents"));
      }
    }
    
    return out;
  }
  
  // Index/total each entry should number with. Global Seq numbers across the
  // whole selection; otherwise numbering restarts per parent group.
  function numberShapeProps(entries, global) {
    var i, e;
    
    if (global) {
      var total = 0;
      for (i = 0; i < entries.length; i++) {
        if (entries[i].matched) total++;
      }
      var seen = 0;
      for (i = 0; i < entries.length; i++) {
        e = entries[i];
        e.index = e.matched ? seen : 0;
        e.total = total;
        if (e.matched) seen++;
      }
      return entries;
    }
    
    // Per-group: bucket by parent, so [#down] counts that group's own members
    var buckets = [];
    function bucketFor(parent) {
      for (var b = 0; b < buckets.length; b++) {
        if (buckets[b].parent === parent) return buckets[b];
      }
      var fresh = { parent: parent, items: [] };
      buckets.push(fresh);
      return fresh;
    }
    
    for (i = 0; i < entries.length; i++) {
      var parent = null;
      try { parent = entries[i].prop.parentProperty; } catch (err) { dbg("parentProperty", err); }
      bucketFor(parent).items.push(entries[i]);
    }
    
    for (var b2 = 0; b2 < buckets.length; b2++) {
      var items = buckets[b2].items;
      var bucketTotal = 0;
      for (i = 0; i < items.length; i++) {
        if (items[i].matched) bucketTotal++;
      }
      var n = 0;
      for (i = 0; i < items.length; i++) {
        e = items[i];
        e.index = e.matched ? n : 0;
        e.total = bucketTotal;
        if (e.matched) n++;
      }
    }
    
    return entries;
  }
  
  function shapeLayersFrom(selectedLayers) {
    var out = [];
    for (var i = 0; i < selectedLayers.length; i++) {
      if (selectedLayers[i] instanceof ShapeLayer && selectedLayers[i].property("Contents")) {
        out.push(selectedLayers[i]);
      }
    }
    return out;
  }
  
  function renameShapeProperties(find, replace) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      app.beginUndoGroup("Rename Shape Properties");
      var shapeLayers = shapeLayersFrom(app.project.activeItem.selectedLayers);
      
      if (shapeLayers.length === 0) {
        showError("No Shape Layers", "None of the selected layers are shape layers.");
        return 0;
      }
      
      var useGlobalSeq = (typeof globalShapeNumberingCheck !== "undefined") &&
                         globalShapeNumberingCheck.value === true;
      var entries = numberShapeProps(collectShapeProps(shapeLayers, find), useGlobalSeq);
      var findProvided = find && find.length > 0 && find !== "Match (optional)";
      
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        
        // With a Match pattern, leave non-matching properties alone
        if (findProvided && !entry.matched) continue;
        
        var oldName = entry.prop.name;
        var newName = buildName(find, replace, oldName, entry.index, entry.total);
        
        if (oldName !== newName) {
          try {
            entry.prop.name = newName;
            count++;
          } catch (e) {
            dbg("shape prop.name", e);
          }
        }
      }
      
      updateStatus("Renamed " + count + " shape propert(ies)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
    return count;
  }
  
  function renameSourceComp(find, replace, nested) {
    if (!checkCompAndSelection()) return 0;
    
    var count = 0;
    try {
      if (!nested) app.beginUndoGroup("Rename Comp Sources");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var renamedComps = [];
      
      // One layer can appear twice in a selection pointing at the same precomp;
      // rename each precomp once so the numbering does not double up.
      var seen = [];
      function alreadyDone(item) {
        for (var s = 0; s < seen.length; s++) {
          if (seen[s] === item) return true;
        }
        seen.push(item);
        return false;
      }
      
      var targets = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (layer instanceof AVLayer && layer.source instanceof CompItem) {
          if (!alreadyDone(layer.source)) targets.push(layer.source);
        }
      }
      
      for (var t = 0; t < targets.length; t++) {
        var precomp = targets[t];
        var oldName = precomp.name;
        
        var extras = {
          "[Res]":  precomp.width + "x" + precomp.height,
          "[LenS]": precomp.duration.toFixed(2) + "s",
          "[LenF]": Math.round(precomp.duration * precomp.frameRate) + "f",
          "[AR]":   calculateAspectRatio(precomp.width, precomp.height),
          "[FR]":   precomp.frameRate.toFixed(2) + " fps",
          "[Date]": formatDate(new Date())
        };
        
        var newName = buildName(find, replace, oldName, t, targets.length, extras);
        
        if (oldName !== newName) {
          try {
            precomp.name = newName;
            renamedComps.push(precomp);
            count++;
          } catch (e) {
            dbg("precomp.name", e);
          }
        }
      }
      
      if (!nested) {
        updateStatus("Renamed " + count + " comp source(s)");
        if (renamedComps.length > 0) {
          highlightRenamedItems(renamedComps);
        }
      }
    } catch (e) {
      if (nested) { dbg("renameSourceComp", e); } else { updateStatus("Error: " + e.toString()); }
    } finally {
      if (!nested) app.endUndoGroup();
    }
    return count;
  }
  
  function renameAll(find, replace) {
    try {
      app.beginUndoGroup("Rename All");
      
      var totalCount = 0;
      var results = {};
      var modifiedItems = [];
      var i;
      
      if (checkCompAndSelection()) {
        var comp = app.project.activeItem;
        var layers = comp.selectedLayers;
        
        for (i = 0; i < layers.length; i++) {
          var layer = layers[i];
          var oldName = layer.name;
          var newName;
          
          // Layer name
          newName = layerName(find, replace, oldName, i, layers.length, layer);
          
          if (oldName !== newName) {
            layer.name = newName;
            modifiedItems.push(layer);
            totalCount++;
            results.layers = (results.layers || 0) + 1;
          }
          
          // Source text
          if (layer instanceof TextLayer) {
            var textProp = layer.property("Source Text");
            if (textProp && canWriteSourceText(textProp)) {
              try {
                var textDoc = textProp.value;
                var oldText = textDoc.text;
                var newText = buildName(find, replace, oldText, i, layers.length);
                
                if (oldText !== newText) {
                  textDoc.text = newText;
                  textProp.setValue(textDoc);
                  results.text = (results.text || 0) + 1;
                  totalCount++;
                }
              } catch (err) {
                dbg("renameAll source text", err);
              }
            }
          }
          
          // Effects
          var effects = layer.property("Effects");
          if (effects && effects.numProperties > 0) {
            for (var fx = 1; fx <= effects.numProperties; fx++) {
              var effect = effects.property(fx);
              var oldEffectName = effect.name;
              var newEffectName = buildName(find, replace, oldEffectName, fx - 1, effects.numProperties, effectExtras(effect));
              
              if (oldEffectName !== newEffectName) {
                try {
                  effect.name = newEffectName;
                  results.effects = (results.effects || 0) + 1;
                  totalCount++;
                } catch (err) {
                  dbg("renameAll effect.name", err);
                }
              }
            }
          }
        }
        
        // Composition markers. "All (Recursive)" is the one target that says
        // up front it reaches past the selection, so they belong here - and
        // only here. The Markers target stays on the selected layers.
        if (comp.markerProperty && comp.markerProperty.numKeys > 0) {
          var nKeys = comp.markerProperty.numKeys;
          for (i = 1; i <= nKeys; i++) {
            var marker = comp.markerProperty.keyValue(i);
            var oldComment = marker.comment;
            var newComment = buildName(find, replace, oldComment, i - 1, nKeys,
                                       markerExtras(comp.markerProperty, i, comp));
            
            if (oldComment !== newComment) {
              marker.comment = newComment;
              comp.markerProperty.setValueAtKey(i, marker);
              results.markers = (results.markers || 0) + 1;
              totalCount++;
            }
          }
        }
        
        // These now run inside this undo group and report what they really did
        var expressionCount = updateExpressions(find, replace, true);
        if (expressionCount) { results.expressions = expressionCount; totalCount += expressionCount; }
        
        var propCount = renameProperties(find, replace, true);
        if (propCount) { results.properties = propCount; totalCount += propCount; }
        
        var maskCount = renameMasks(find, replace, true);
        if (maskCount) { results.masks = maskCount; totalCount += maskCount; }
        
        var pinCount = renamePuppetPins(find, replace, true);
        if (pinCount) { results.pins = pinCount; totalCount += pinCount; }
        
        var compCount = renameSourceComp(find, replace, true);
        if (compCount) { results.comps = compCount; totalCount += compCount; }
      }
      
      // Project items
      if (app.project.selection.length > 0) {
        var projectItems = app.project.selection;
        for (i = 0; i < projectItems.length; i++) {
          var item = projectItems[i];
          var oldItemName = item.name;
          var newItemName = buildName(find, replace, oldItemName, i, projectItems.length, itemExtras(item));
          
          if (oldItemName !== newItemName) {
            try {
              item.name = newItemName;
              modifiedItems.push(item);
              results.items = (results.items || 0) + 1;
              totalCount++;
            } catch (err) {
              dbg("renameAll item.name", err);
            }
          }
        }
      }
      
      var statusMsg = "Renamed " + totalCount + " item(s): ";
      var details = [];
      
      if (results.layers) details.push(results.layers + " layer(s)");
      if (results.effects) details.push(results.effects + " effect(s)");
      if (results.text) details.push(results.text + " text content(s)");
      if (results.markers) details.push(results.markers + " marker(s)");
      if (results.expressions) details.push(results.expressions + " expression(s)");
      if (results.properties) details.push(results.properties + " property(s)");
      if (results.masks) details.push(results.masks + " mask(s)");
      if (results.pins) details.push(results.pins + " pin(s)");
      if (results.comps) details.push(results.comps + " comp source(s)");
      if (results.items) details.push(results.items + " project item(s)");
      
      statusMsg += details.join(", ");
      updateStatus(statusMsg);
      
      if (totalCount > 10) {
        alert("Renamed " + totalCount + " item(s):\n\n" + details.join("\n"));
      }
      
      if (modifiedItems.length > 0 && modifiedItems.length <= 10) {
        highlightRenamedItems(modifiedItems);
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
      showError("Rename Error", "An error occurred during renaming.", e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  // Add keyboard shortcuts
  function registerKeyboardShortcuts() {
    // Add keyboard shortcuts (Cmd/Ctrl+Enter to apply)
    win.addEventListener("keydown", function(e) {
      // If Cmd/Ctrl+Enter is pressed
      if ((e.metaKey || e.ctrlKey) && e.keyCode == 13) {
        renameBtn.notify("onClick");
        e.preventDefault();
        return false;
      }
    });
    
    // Tab order adjustment
    findText.addEventListener("keydown", function(e) {
      if (e.keyCode == 9 && !e.shiftKey) { // Tab key without Shift
        renameText.active = true;
        e.preventDefault();
        return false;
      }
    });
    
    renameText.addEventListener("keydown", function(e) {
      if (e.keyCode == 9 && e.shiftKey) { // Shift+Tab
        findText.active = true;
        e.preventDefault();
        return false;
      } else if (e.keyCode == 13) { // Enter key
        renameBtn.notify("onClick");
        e.preventDefault();
        return false;
      }
    });
  }
  
  // No help menu function
  
  // No case conversion buttons
  
  // Set up preview updates when text changes
  renameText.onChanging = function() {
    updatePreview();
  };
  
  findText.onChanging = function() {
    updatePreview();
  };
  
  startNumber.onChanging = function() {
    updatePreview();
  };
  
  // Register keyboard shortcuts
  registerKeyboardShortcuts();
  
  // Initialize the UI
  updatePreview();
  
  // Start periodic checking
  pollTaskId = app.scheduleTask(checkForSelectionChanges, 200, false);
  
  // Set default button
  win.defaultElement = renameBtn;
  
  // Initialize context detection
  updateTargetBasedOnContext();
  
  // Activation handler
  win.onActivate = function() {
    if (autoDetectCheck.value) {
      updateTargetBasedOnContext();
    }
    // Refresh preview when window is activated to reflect any selection changes
    updatePreview();
  };
  
  // Auto-detect checkbox handler
  autoDetectCheck.onClick = function() {
    targetDropdown.enabled = !this.value;
    
    if (this.value) {
      updateTargetBasedOnContext();
    }
    // Refresh preview when toggling auto-detect to reflect any selection changes
    updatePreview();
  };
  
  // Stop the poll when the palette closes
  win.onClose = function() {
    panelOpen = false;
    if (pollTaskId !== null) {
      try { app.cancelTask(pollTaskId); } catch (e) { dbg("cancelTask", e); }
      pollTaskId = null;
    }
    return true;
  };
  
  // Show the window
  win.center();
  win.show();
})();