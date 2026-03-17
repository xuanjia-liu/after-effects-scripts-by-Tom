// Get the selected properties
var selectedProps = app.project.activeItem.selectedProperties;

// Create a ScriptUI window
var win = new Window("dialog", "Enter expression");
win.alignChildren = "fill";

// Add a multiline text input area to the window
var input = win.add("edittext", undefined, "", {multiline: true, scrolling: true});
input.size = [300, 200];

// Add OK and Cancel buttons to the window
var btnGroup = win.add("group");
btnGroup.alignment = "center";
var okBtn = btnGroup.add("button", undefined, "OK");
var cancelBtn = btnGroup.add("button", undefined, "Cancel");

// Define the OK button's behavior
okBtn.onClick = function() {
    // Get the expression from the input area
    var expression = input.text;

    // Loop through each selected property
    for (var i = 0; i < selectedProps.length; i++) {
        // Check if the property is a property group
        if (selectedProps[i] instanceof PropertyGroup) {
            // Loop through each property in the group
            for (var j = 0; j < selectedProps[i].numProperties; j++) {
                // Apply the expression to the property
                selectedProps[i].property(j).expression = expression;
            }
        } else {
            // Apply the expression to the property
            selectedProps[i].expression = expression;
        }
    }

    // Close the window
    win.close();
};

// Define the Cancel button's behavior
cancelBtn.onClick = function() {
    // Close the window
    win.close();
};

// Show the window
win.show();
