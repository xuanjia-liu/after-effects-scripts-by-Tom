// ================ ENTRY POINT - SHORTCUT DETECTION ================

// Main entry point with shortcut detection
function main() {
  // Check for modifiers to determine action
  var shiftKey = ScriptUI.environment.keyboardState.shiftKey;
  var ctrlKey = ScriptUI.environment.keyboardState.ctrlKey || ScriptUI.environment.keyboardState.metaKey; // Ctrl on Windows, Cmd on Mac
  var altKey = ScriptUI.environment.keyboardState.altKey;
  
  if (altKey) {
      // Alt/Option key: Open the full UI
      createMarkerUI();
  } else if (ctrlKey) {
      // Ctrl/Cmd key: Delete markers
      quickDeleteMarkers();
  } else if (shiftKey) {
      // Shift key: Add marker to composition
      quickAddMarker("", true);
  } else {
      // No modifiers: Add marker to selected layers
      quickAddMarker("", false);
  }
}

// ================ QUICK FUNCTIONS ================

// Quickly add a marker without UI
function quickAddMarker(commentText, useComp) {
  if (!validateComposition(false)) return;
  
  var thisComp = app.project.activeItem;
  
  app.beginUndoGroup("Add Marker");
  
  try {
      if (useComp) {
          // Add to composition
          var myMarkerVal = new MarkerValue(commentText);
          thisComp.markerProperty.setValueAtTime(thisComp.time, myMarkerVal);
      } else if (thisComp.selectedLayers.length > 0) {
          // Add to selected layers
          for (var i = 0; i < thisComp.selectedLayers.length; i++) {
              var myLayer = thisComp.selectedLayers[i];
              var myMarkerVal = new MarkerValue(commentText);
              myLayer.property("Marker").setValueAtTime(thisComp.time, myMarkerVal);
          }
      } else {
          // No layers selected, add to composition
          var myMarkerVal = new MarkerValue(commentText);
          thisComp.markerProperty.setValueAtTime(thisComp.time, myMarkerVal);
      }
  } catch (error) {
      alert("Error: " + error.toString());
  }
  
  app.endUndoGroup();
}

// Quick delete markers function
function quickDeleteMarkers() {
  if (!validateComposition(false)) return;
  
  var thisComp = app.project.activeItem;
  var useComp = (thisComp.selectedLayers.length === 0);
  
  app.beginUndoGroup("Delete Markers");
  
  try {
      var count = 0;
      
      if (useComp) {
          // Delete composition markers
          var compMarker = thisComp.markerProperty;
          while (compMarker.numKeys > 0) {
              compMarker.removeKey(1);
              count++;
          }
      } else {
          // Delete layer markers
          for (var i = 0; i < thisComp.selectedLayers.length; i++) {
              var layer = thisComp.selectedLayers[i];
              var markerProp = layer.property("Marker");
              
              while (markerProp.numKeys > 0) {
                  markerProp.removeKey(1);
                  count++;
              }
          }
      }
  } catch (error) {
      alert("Error: " + error.toString());
  }
  
  app.endUndoGroup();
}

// ================ MAIN UI AND FUNCTIONALITY ================

// Create the main UI panel
function createMarkerUI() {
  // Close any existing panel
  if (this.markerPalette != null && this.markerPalette instanceof Window) {
      this.markerPalette.close();
  }
  
  // Create new panel
  var win = new Window("palette", "Marker Tools", undefined);
  win.orientation = "column";
  win.spacing = 5;
  win.alignChildren = ["fill", "top"];
  
  // ---- Target Selection Section - MOVED TO TOP ----
  var targetPanel = win.add("panel", undefined, "Target Selection");
  targetPanel.orientation = "column";
  targetPanel.alignChildren = ["fill", "top"];
  
  var targetGroup = targetPanel.add("group");
  targetGroup.orientation = "row";
  var useCompRadio = targetGroup.add("radiobutton", undefined, "Apply to Composition");
  var useLayersRadio = targetGroup.add("radiobutton", undefined, "Apply to Selected Layers");
  useLayersRadio.value = true;
  
  // Function to get current target selection
  win.getUseComp = function() {
      return useCompRadio.value;
  };
  
  // ---- Basic Marker Section ----
  var basicPanel = win.add("panel", undefined, "Basic Markers");
  basicPanel.orientation = "column";
  basicPanel.alignChildren = ["fill", "top"];
  
  var basicGroup = basicPanel.add("group");
  basicGroup.orientation = "row";
  basicGroup.alignChildren = ["fill", "center"];
  
  var commentInput = basicGroup.add("edittext", undefined, "hold");
  commentInput.preferredSize.width = 150;
  
  var addBtn = basicGroup.add("button", undefined, "Add Marker");
  addBtn.preferredSize.width = 100;
  addBtn.onClick = function() {
      addMarker(commentInput.text, win.getUseComp());
  };
  
  // ---- Numbered Markers Section ----
  var numberedPanel = win.add("panel", undefined, "Numbered Markers");
  numberedPanel.orientation = "column";
  numberedPanel.alignChildren = ["fill", "top"];
  
  var prefixGroup = numberedPanel.add("group");
  prefixGroup.orientation = "row";
  prefixGroup.alignChildren = ["left", "center"];
  prefixGroup.add("statictext", undefined, "Prefix:");
  var prefixInput = prefixGroup.add("edittext", undefined, "Shot_");
  prefixInput.preferredSize.width = 80;
  
  var numberGroup = numberedPanel.add("group");
  numberGroup.orientation = "row";
  numberGroup.alignChildren = ["left", "center"];
  
  numberGroup.add("statictext", undefined, "Start #:");
  var startNumInput = numberGroup.add("edittext", undefined, "1");
  startNumInput.preferredSize.width = 40;
  
  numberGroup.add("statictext", undefined, "Padding:");
  var paddingInput = numberGroup.add("edittext", undefined, "2");
  paddingInput.preferredSize.width = 40;
  
  var createNumberedBtn = numberedPanel.add("button", undefined, "Create Numbered Markers");
  createNumberedBtn.onClick = function() {
      var prefix = prefixInput.text;
      var startNum = parseInt(startNumInput.text) || 1;
      var padding = parseInt(paddingInput.text) || 2;
      addNumberedMarkers(prefix, startNum, padding, win.getUseComp());
  };
  
  // ---- Interval Markers Section ----
  var intervalPanel = win.add("panel", undefined, "Interval Markers");
  intervalPanel.orientation = "column";
  intervalPanel.alignChildren = ["fill", "top"];
  
  var intervalGroup = intervalPanel.add("group");
  intervalGroup.orientation = "row";
  intervalGroup.alignChildren = ["left", "center"];
  
  intervalGroup.add("statictext", undefined, "Interval:");
  var intervalInput = intervalGroup.add("edittext", undefined, "1");
  intervalInput.preferredSize.width = 40;
  
  var intervalUnitDropdown = intervalGroup.add("dropdownlist", undefined, ["Seconds", "Frames"]);
  intervalUnitDropdown.selection = 0; // Default to seconds
  
  intervalGroup.add("statictext", undefined, "Prefix:");
  var tcPrefixInput = intervalGroup.add("edittext", undefined, "TC_");
  tcPrefixInput.preferredSize.width = 60;
  
  var createIntervalBtn = intervalPanel.add("button", undefined, "Create Interval Markers");
  createIntervalBtn.onClick = function() {
      var interval = parseFloat(intervalInput.text) || 1;
      var prefix = tcPrefixInput.text;
      var useComp = win.getUseComp();
      var isFrames = (intervalUnitDropdown.selection.index === 1);
      addTimecodeMarkers(interval, prefix, useComp, isFrames);
  };
  
  // ---- Marker Management Section ----
  var managementPanel = win.add("panel", undefined, "Manage Markers");
  managementPanel.orientation = "column";
  managementPanel.alignChildren = ["fill", "top"];
  
  var manageBtnGroup = managementPanel.add("group");
  manageBtnGroup.orientation = "row";
  
  var clearBtn = manageBtnGroup.add("button", undefined, "Clear Markers");
  clearBtn.preferredSize.width = 120;
  clearBtn.onClick = function() {
      clearMarkers(win.getUseComp());
  };
  
  var exportBtn = manageBtnGroup.add("button", undefined, "Export Markers");
  exportBtn.preferredSize.width = 120;
  exportBtn.onClick = function() {
      exportMarkers(win.getUseComp());
  };
  
  // ---- Status Bar ----
  var statusGroup = win.add("group");
  statusGroup.orientation = "row";
  statusGroup.alignment = ["fill", "bottom"];
  var statusText = statusGroup.add("statictext", undefined, "Ready");
  statusText.alignment = ["fill", "center"];
  
  // Light grey color for status text
  statusText.graphics.foregroundColor = statusText.graphics.newPen(
      statusText.graphics.PenType.SOLID_COLOR, [0.6, 0.6, 0.6], 1
  );
  
  // Function to update status instead of showing alerts
  win.updateStatus = function(message, isError) {
      statusText.text = message;
      if (isError) {
          statusText.graphics.foregroundColor = statusText.graphics.newPen(statusText.graphics.PenType.SOLID_COLOR, [1, 0, 0], 1);
      } else {
          // Light grey color (RGB values: 0.6, 0.6, 0.6)
          statusText.graphics.foregroundColor = statusText.graphics.newPen(statusText.graphics.PenType.SOLID_COLOR, [0.6, 0.6, 0.6], 1);
      }
  };
  
  // Store reference to update status
  this.updateMarkerStatus = win.updateStatus;
  
  // Shortcut info
  var helpGroup = win.add("group");
  helpGroup.orientation = "column";
  helpGroup.alignment = ["fill", "bottom"];
  var helpText = helpGroup.add("statictext", undefined, 
      "Shortcuts: Run script directly to add markers, Shift+Run for comp markers,\nCmd/Ctrl+Run to delete markers, Alt/Option+Run for UI", 
      {multiline: true}
  );
  helpText.alignment = ["fill", "center"];
  helpText.graphics.foregroundColor = statusText.graphics.newPen(
      statusText.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1
  );
  
  // Show the window
  win.center();
  win.show();
  this.markerPalette = win;
  
  return win;
}

// ================ MARKER FUNCTIONS ================

// Basic marker adding function
function addMarker(commentText, useComp) {
  if (!validateComposition()) return;
  
  if (!commentText) {
      commentText = "";
  }
  
  app.beginUndoGroup("Create" + (commentText ? " '" + commentText + "'" : "") + " Marker");
  
  try {
      var thisComp = app.project.activeItem;
      var count = 0;
      
      if (useComp) {
          // Add to composition
          var myMarkerVal = new MarkerValue(commentText);
          thisComp.markerProperty.setValueAtTime(thisComp.time, myMarkerVal);
          count = 1;
          updateStatus("Added marker to composition");
      } else {
          // Add to selected layers
          if (thisComp.selectedLayers.length === 0) {
              updateStatus("No layers selected", true);
              return;
          }
          
          for (var i = 0; i < thisComp.selectedLayers.length; i++) {
              var myLayer = thisComp.selectedLayers[i];
              var myMarkerVal = new MarkerValue(commentText);
              myLayer.property("Marker").setValueAtTime(thisComp.time, myMarkerVal);
              count++;
          }
          
          updateStatus(count + " marker(s) added");
      }
  } catch (error) {
      updateStatus("Error: " + error.toString(), true);
  }
  
  app.endUndoGroup();
}

// Add numbered markers (e.g., Shot_01, Shot_02)
function addNumberedMarkers(prefix, startNumber, padding, useComp) {
  if (!validateComposition()) return;
  
  if (!prefix) prefix = "Shot_";
  if (isNaN(startNumber)) startNumber = 1;
  if (isNaN(padding) || padding < 1) padding = 2;
  
  var thisComp = app.project.activeItem;
  
  if (!useComp && thisComp.selectedLayers.length === 0) {
      updateStatus("Please select at least one layer", true);
      return;
  }
  
  app.beginUndoGroup("Add Numbered Markers");
  
  try {
      var count = 0;
      
      if (useComp) {
          // Add a single numbered marker to the composition
          var num = startNumber.toString();
          while (num.length < padding) num = "0" + num;
          
          var markerComment = prefix + num;
          var myMarkerVal = new MarkerValue(markerComment);
          thisComp.markerProperty.setValueAtTime(thisComp.time, myMarkerVal);
          count = 1;
          
          updateStatus("Added numbered marker to composition");
      } else {
          // Add to selected layers
          var layers = thisComp.selectedLayers;
          
          // Sort layers by in-point time for sequential numbering
          layers.sort(function(a, b) {
              return a.inPoint - b.inPoint;
          });
          
          for (var i = 0; i < layers.length; i++) {
              var num = (startNumber + i).toString();
              while (num.length < padding) num = "0" + num;
              
              var markerComment = prefix + num;
              var myMarkerVal = new MarkerValue(markerComment);
              layers[i].property("Marker").setValueAtTime(layers[i].inPoint, myMarkerVal);
              count++;
          }
          
          updateStatus("Added " + count + " numbered markers");
      }
  } catch (error) {
      updateStatus("Error: " + error.toString(), true);
  }
  
  app.endUndoGroup();
}

// Add markers at regular intervals
function addTimecodeMarkers(interval, prefix, useComp, isFrames) {
  if (!validateComposition()) return;
  
  if (isNaN(interval) || interval <= 0) {
      updateStatus("Invalid interval value", true);
      return;
  }
  
  if (!prefix) prefix = "TC_";
  
  var thisComp = app.project.activeItem;
  
  // Convert frame interval to time if needed
  var timeInterval = interval;
  if (isFrames) {
      timeInterval = interval / thisComp.frameRate;
  }
  
  app.beginUndoGroup("Add Interval Markers");
  
  try {
      var count = 0;
      
      // Add markers to composition 
      if (useComp) {
          var compMarker = thisComp.markerProperty;
          
          for (var t = 0; t < thisComp.duration; t += timeInterval) {
              var timeFormatted;
              if (isFrames) {
                  // Show just frame number for frame interval
                  timeFormatted = Math.round(t * thisComp.frameRate);
              } else {
                  // Show seconds:frames for second interval
                  timeFormatted = formatTimecodeSF(t, thisComp.frameRate);
              }
              var markerComment = prefix + timeFormatted;
              var myMarkerVal = new MarkerValue(markerComment);
              compMarker.setValueAtTime(t, myMarkerVal);
              count++;
          }
          
          updateStatus("Added " + count + " markers to composition");
          
      } else {
          // Add markers to selected layers
          if (thisComp.selectedLayers.length === 0) {
              updateStatus("No layers selected", true);
              return;
          }
          
          for (var i = 0; i < thisComp.selectedLayers.length; i++) {
              var layer = thisComp.selectedLayers[i];
              var markerProp = layer.property("Marker");
              
              for (var t = layer.inPoint; t < layer.outPoint; t += timeInterval) {
                  var timeFormatted;
                  if (isFrames) {
                      // Show just frame number for frame interval
                      timeFormatted = Math.round(t * thisComp.frameRate);
                  } else {
                      // Show seconds:frames for second interval
                      timeFormatted = formatTimecodeSF(t, thisComp.frameRate);
                  }
                  var markerComment = prefix + timeFormatted;
                  var myMarkerVal = new MarkerValue(markerComment);
                  markerProp.setValueAtTime(t, myMarkerVal);
                  count++;
              }
          }
          
          updateStatus("Added " + count + " interval markers to layers");
      }
  } catch (error) {
      updateStatus("Error: " + error.toString(), true);
  }
  
  app.endUndoGroup();
}

// Clear all markers from selected layers or composition
function clearMarkers(useComp) {
  if (!validateComposition()) return;
  
  var thisComp = app.project.activeItem;
  
  // If no layers selected and not explicitly targeting comp, show error
  if (!useComp && thisComp.selectedLayers.length === 0) {
      updateStatus("No layers selected", true);
      return;
  }
  
  app.beginUndoGroup("Clear Markers");
  
  try {
      var count = 0;
      
      if (useComp) {
          var compMarker = thisComp.markerProperty;
          while (compMarker.numKeys > 0) {
              compMarker.removeKey(1);
              count++;
          }
          updateStatus("Removed " + count + " markers from composition");
      } else {
          for (var i = 0; i < thisComp.selectedLayers.length; i++) {
              var layer = thisComp.selectedLayers[i];
              var markerProp = layer.property("Marker");
              
              while (markerProp.numKeys > 0) {
                  markerProp.removeKey(1);
                  count++;
              }
          }
          updateStatus("Removed " + count + " markers from layers");
      }
  } catch (error) {
      updateStatus("Error: " + error.toString(), true);
  }
  
  app.endUndoGroup();
}

// Export markers to text file
function exportMarkers(useComp) {
  if (!validateComposition()) return;
  
  var thisComp = app.project.activeItem;
  
  // If no layers selected and not explicitly targeting comp, show error
  if (!useComp && thisComp.selectedLayers.length === 0) {
      updateStatus("No layers selected", true);
      return;
  }
  
  try {
      var outputFile = File.saveDialog("Save marker data as:", "Marker Data:*.txt");
      if (!outputFile) {
          updateStatus("Export cancelled", false);
          return;
      }
      
      outputFile.open("w");
      outputFile.writeln("AFTER EFFECTS MARKER EXPORT");
      outputFile.writeln("Composition: " + thisComp.name);
      outputFile.writeln("Date: " + new Date().toString());
      outputFile.writeln("------------------------------------------------");
      
      var count = 0;
      
      if (useComp) {
          outputFile.writeln("\nCOMPOSITION MARKERS:");
          var compMarker = thisComp.markerProperty;
          
          for (var i = 1; i <= compMarker.numKeys; i++) {
              var time = compMarker.keyTime(i);
              var marker = compMarker.keyValue(i);
              outputFile.writeln(formatTimecode(time, thisComp.frameRate) + "\t" + marker.comment);
              count++;
          }
      } else {
          // Process for all selected layers
          for (var l = 0; l < thisComp.selectedLayers.length; l++) {
              var layer = thisComp.selectedLayers[l];
              outputFile.writeln("\nLAYER: " + layer.name);
              
              var markerProp = layer.property("Marker");
              if (markerProp.numKeys === 0) {
                  outputFile.writeln("  No markers");
                  continue;
              }
              
              for (var i = 1; i <= markerProp.numKeys; i++) {
                  var time = markerProp.keyTime(i);
                  var marker = markerProp.keyValue(i);
                  outputFile.writeln("  " + formatTimecode(time, thisComp.frameRate) + "\t" + marker.comment);
                  count++;
              }
          }
      }
      
      outputFile.close();
      updateStatus("Exported " + count + " markers to file");
      
  } catch (error) {
      updateStatus("Error exporting markers: " + error.toString(), true);
  }
}

// ================ HELPER FUNCTIONS ================

// Validate that an active composition exists
function validateComposition(showAlert) {
  // Default showAlert to true if not specified
  showAlert = (showAlert !== false);
  
  if (!(app.project.activeItem instanceof CompItem)) {
      if (showAlert) {
          updateStatus("Please select a composition first", true);
      } else {
          alert("Please select a composition first.");
      }
      return false;
  }
  return true;
}

// Format a time value as full timecode (hours:minutes:seconds:frames)
function formatTimecode(timeInSeconds, frameRate) {
  var h = Math.floor(timeInSeconds / 3600);
  var m = Math.floor((timeInSeconds % 3600) / 60);
  var s = Math.floor(timeInSeconds % 60);
  var f = Math.floor((timeInSeconds * frameRate) % frameRate);
  
  return padNumber(h, 2) + ":" + 
         padNumber(m, 2) + ":" + 
         padNumber(s, 2) + ":" + 
         padNumber(f, 2);
}

// Format time as seconds:frames
function formatTimecodeSF(timeInSeconds, frameRate) {
  var totalSeconds = Math.floor(timeInSeconds);
  var f = Math.floor((timeInSeconds * frameRate) % frameRate);
  
  return totalSeconds + ":" + padNumber(f, 2);
}

// Pad a number with leading zeros
function padNumber(number, length) {
  var str = number.toString();
  while (str.length < length) {
      str = "0" + str;
  }
  return str;
}

// Update status message (connects to UI)
function updateStatus(message, isError) {
  if (this.updateMarkerStatus) {
      this.updateMarkerStatus(message, isError);
  } else if (isError) {
      // Fall back to alert only for critical errors if UI isn't available
      alert(message);
  }
}

// ================ RUN SCRIPT ================
main();