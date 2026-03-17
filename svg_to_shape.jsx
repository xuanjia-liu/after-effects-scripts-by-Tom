/**
 * svg_to_shape.jsx
 *
 * This script converts SVG files selected from local storage into shape layers in After Effects.
 * It parses <path> data using a multi-phase approach inspired by svg-path-parser:
 * 1. Parse raw commands (relative/absolute preserved).
 * 2. Normalize commands to absolute coordinates with explicit start/end points.
 * 3. Convert normalized commands to an After Effects Shape object.
 * Handles multiple <path> elements within a single SVG file.
 */

(function() {

    // --- Phase 1: Parse Raw Commands ---
    /**
     * Parses the raw SVG path string into an array of command objects.
     * Preserves relative/absolute status.
     * @param {string} pathData - The SVG path data string.
     * @return {Array<object> | null} - Array of command objects or null on failure.
     */
    function parseRawCommands(pathData) {
        var tokens = tokenizePath(pathData);
        if (!tokens || tokens.length === 0) return null;

        var commands = [];
        var i = 0;
        var lastCmdCode = ''; // Track last command code for implicit commands

        while (i < tokens.length) {
            var commandCode = tokens[i];
            var commandData = {};
            var isImplicit = !/[A-Za-z]/.test(commandCode);

            if (isImplicit) {
                 if (!lastCmdCode) {
                    // alert("Warning: Implicit command used before any explicit command. Skipping token: " + commandCode);
                    i++; // Skip this potentially numeric token
                    continue;
                }
                // Re-use the last command code, the current token is the first parameter
                commandCode = lastCmdCode;
                // Don't increment i here
            } else {
                lastCmdCode = commandCode; // Store the new explicit command code
                i++; // Consume the command code token
            }

            commandData.code = commandCode;
            var cmdUpper = commandCode.toUpperCase();
            commandData.relative = commandCode !== cmdUpper;

            // Parameter parsing logic based on command type
            var params = [];
            var expectedParams = 0;
            var collectsPairs = false;

            switch (cmdUpper) {
                case 'M': case 'L': case 'T': expectedParams = 2; collectsPairs = true; break;
                case 'H': case 'V': expectedParams = 1; collectsPairs = true; break;
                case 'S': case 'Q': expectedParams = 4; collectsPairs = true; break;
                case 'C': expectedParams = 6; collectsPairs = true; break;
                case 'A': expectedParams = 7; collectsPairs = false; break; // Arc collects a fixed set, not pairs
                case 'Z': expectedParams = 0; break;
                default:
                    // alert("Warning: Unsupported command code '" + commandCode + "'. Skipping.");
                    // Skip parameters until the next command or end
                    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) { i++; }
                    continue; // Skip to next command
            }

             commandData.command = getCommandName(commandCode); // Get descriptive name

             // Special case: Implicit command after M/m becomes L/l
             if (isImplicit && lastCmdCode.toUpperCase() === 'M') {
                 cmdUpper = 'L';
                 commandCode = commandData.relative ? 'l' : 'L';
                 commandData.code = commandCode;
                 commandData.command = getCommandName(commandCode);
                 expectedParams = 2;
                 collectsPairs = true;
             }


            // Collect parameters
             var collectedSets = 0;
             while (params.length < expectedParams && i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
                  var num = parseFloat(tokens[i]);
                  if (!isNaN(num)) {
                      params.push(num);
                  } else {
                     // alert("Warning: Skipping non-numeric parameter '" + tokens[i] + "'");
                  }
                  i++;
             }
             
            // Add the first command instance if parameters are sufficient
            if (params.length === expectedParams) {
                addCommandInstance(commandData, params, commands);
                 collectedSets++;
                params = []; // Reset for next potential set
            } else if (cmdUpper !== 'Z') {
                // alert("Warning: Insufficient parameters for command '" + commandCode + "'. Expected " + expectedParams + ", got " + params.length + ". Command skipped.");
                // Skip remaining potential params for this command attempt
                while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) { i++; }
                continue; // Skip to next command
            } else if (cmdUpper === 'Z') {
                 addCommandInstance(commandData, [], commands); // Z takes no params
            }


            // Handle subsequent parameter sets for commands that collect pairs (L, H, V, T, S, Q, C)
            if (collectsPairs) {
                while (true) {
                    params = []; // Reset for next set
                     while (params.length < expectedParams && i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
                        var num = parseFloat(tokens[i]);
                        if (!isNaN(num)) {
                            params.push(num);
                        } else {
                            // alert("Warning: Skipping non-numeric parameter '" + tokens[i] + "' in sequence.");
                        }
                        i++;
                    }
                     if (params.length === expectedParams) {
                         addCommandInstance(commandData, params, commands);
                         collectedSets++;
                     } else {
                         // Not enough params for another full set, break the inner loop
                         // Put back the unused tokens if any? No, parseFloat loop handles this.
                         break;
                     }
                }
            }
            // For Arc (A/a), only one set of 7 parameters is expected per command letter.
        }

        return commands;
    }

    /** Helper to add a command instance with its parameters to the list */
    function addCommandInstance(baseCommandData, params, commandList) {
         var instance = {};
         // Copy base properties
         for (var key in baseCommandData) {
             if (baseCommandData.hasOwnProperty(key)) {
                 instance[key] = baseCommandData[key];
             }
         }
        // Assign specific parameters based on command type
         var cmdUpper = instance.code.toUpperCase();
         switch (cmdUpper) {
             case 'M': case 'L': case 'T': instance.x = params[0]; instance.y = params[1]; break;
             case 'H': instance.x = params[0]; break;
             case 'V': instance.y = params[0]; break;
             case 'S': instance.x2 = params[0]; instance.y2 = params[1]; instance.x = params[2]; instance.y = params[3]; break;
             case 'Q': instance.x1 = params[0]; instance.y1 = params[1]; instance.x = params[2]; instance.y = params[3]; break;
             case 'C': instance.x1 = params[0]; instance.y1 = params[1]; instance.x2 = params[2]; instance.y2 = params[3]; instance.x = params[4]; instance.y = params[5]; break;
             case 'A': instance.rx = params[0]; instance.ry = params[1]; instance.xAxisRotation = params[2]; instance.largeArc = params[3] !== 0; instance.sweep = params[4] !== 0; instance.x = params[5]; instance.y = params[6]; break;
             case 'Z': break; // No params
         }
         commandList.push(instance);
    }

     /** Helper to get descriptive command name */
     function getCommandName(code) {
        switch (code.toUpperCase()) {
             case 'M': return 'moveto';
             case 'L': return 'lineto';
             case 'H': return 'horizontal lineto';
             case 'V': return 'vertical lineto';
             case 'C': return 'curveto';
             case 'S': return 'smooth curveto';
             case 'Q': return 'quadratic curveto';
             case 'T': return 'smooth quadratic curveto';
             case 'A': return 'elliptical arc';
             case 'Z': return 'closepath';
             default: return 'unknown';
         }
     }

    // --- Phase 2: Normalize to Absolute Commands ---
    /**
     * Converts raw command objects to absolute coordinates and adds x0, y0, x, y to each.
     * Mutates the command objects in place.
     * @param {Array<object>} commands - Array of raw command objects from parseRawCommands.
     * @return {Array<object>} - The mutated array of absolute command objects.
     */
    function makeCommandsAbsolute(commands) {
        var currentX = 0, currentY = 0;
        var startX = 0, startY = 0;
        var lastCmd = null;

        for (var i = 0; i < commands.length; i++) {
            var cmd = commands[i];
            var cmdUpper = cmd.code.toUpperCase();

            // Store start point
            cmd.x0 = currentX;
            cmd.y0 = currentY;

            // Handle relative coordinates
            if (cmd.relative) {
                switch (cmdUpper) {
                    case 'M': case 'L': case 'T':
                        cmd.x += currentX; cmd.y += currentY; break;
                    case 'H': cmd.x += currentX; break;
                    case 'V': cmd.y += currentY; break;
                    case 'S': case 'Q': case 'C':
                        if (cmd.x1 !== undefined) cmd.x1 += currentX;
                        if (cmd.y1 !== undefined) cmd.y1 += currentY;
                        if (cmd.x2 !== undefined) cmd.x2 += currentX;
                        if (cmd.y2 !== undefined) cmd.y2 += currentY;
                        cmd.x += currentX; cmd.y += currentY;
                        break;
                    case 'A':
                        cmd.x += currentX; cmd.y += currentY; break;
                    // Z is already absolute implicitly
                }
                cmd.relative = false; // Mark as processed
                cmd.code = cmdUpper; // Change code to uppercase
            }

            // Calculate absolute end point (x, y) for all commands
            switch (cmdUpper) {
                case 'M':
                    currentX = cmd.x; currentY = cmd.y;
                    startX = currentX; startY = currentY; // New subpath starts here
                    break;
                case 'L': case 'C': case 'S': case 'Q': case 'T': case 'A':
                    currentX = cmd.x; currentY = cmd.y;
                    break;
                case 'H':
                    cmd.y = currentY; // Add missing y coordinate
                    currentX = cmd.x;
                    break;
                case 'V':
                    cmd.x = currentX; // Add missing x coordinate
                    currentY = cmd.y;
                    break;
                case 'Z':
                    // Z's end point is the start point of the current subpath
                    cmd.x = startX;
                    cmd.y = startY;
                    currentX = startX; // Move "cursor" back to start
                    currentY = startY;
                    break;
            }
            // Store absolute end point explicitly if not already set (e.g., for H, V, Z)
             if (cmd.x === undefined) cmd.x = currentX;
             if (cmd.y === undefined) cmd.y = currentY;


            // Store control points needed for S/T reflection *after* making them absolute
            // These are stored directly on the cmd object now.
            cmd.lastCtrlX = null; // For S/T reflection logic in next phase
             cmd.lastCtrlY = null;
            if (lastCmd) { // Store reflection info from previous command if needed
                if (lastCmd.code === 'C' || lastCmd.code === 'S') {
                    cmd.lastCtrlX = lastCmd.x2; // Use absolute x2 from previous C/S
                    cmd.lastCtrlY = lastCmd.y2;
                } else if (lastCmd.code === 'Q' || lastCmd.code === 'T') {
                    cmd.lastCtrlX = lastCmd.x1; // Use absolute x1 from previous Q/T
                    cmd.lastCtrlY = lastCmd.y1;
                 }
            }

            lastCmd = cmd; // Store reference to current command for next iteration's reflection check
        }
        return commands;
    }

    // --- Phase 3: Convert Absolute Commands to AE Shape ---
    /**
     * Converts an array of absolute command objects into an array of After Effects Shape objects,
     * splitting the path data into sub-paths based on M and Z commands.
     * @param {Array<object>} commands - Array of absolute command objects from makeCommandsAbsolute.
     * @return {Array<Shape> | null} - Array of AE shape objects (one per sub-path) or null on failure.
     */
    function commandsToShape(commands) {
        if (!commands || commands.length === 0) return null;

        var subPathShapes = []; // Array to hold Shape objects for each sub-path
        var currentVertices = [];
        var currentInTangents = [];
        var currentOutTangents = [];
        var currentClosed = false;

        // Helper function to finalize and store the current sub-path
        function finalizeSubPath() {
            if (currentVertices.length === 0 || (currentVertices.length === 1 && !currentClosed)) {
                 // Invalid subpath (0 points, or 1 point and not closed) - discard
            } else {
                var shape = new Shape();
                shape.vertices = currentVertices;
                shape.inTangents = currentInTangents;
                shape.outTangents = currentOutTangents;
                shape.closed = currentClosed;
                subPathShapes.push(shape);
            }
            // Reset for the next sub-path
            currentVertices = [];
            currentInTangents = [];
            currentOutTangents = [];
            currentClosed = false;
        }

        for (var i = 0; i < commands.length; i++) {
            var cmd = commands[i];
            var prevVertexIndex = currentVertices.length - 1;
            var prevX = cmd.x0; // Start point of this segment (absolute)
            var prevY = cmd.y0;

            switch (cmd.code) {
                case 'M':
                     // If we have vertices accumulated, finalize the previous sub-path (it must be open)
                     if (currentVertices.length > 0) {
                         finalizeSubPath(); // Will set currentClosed = false implicitly
                     }
                     // Start new sub-path
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([0, 0]);
                     currentOutTangents.push([0, 0]); // Placeholder
                    break;

                 case 'L': case 'H': case 'V':
                     if (currentVertices.length === 0) continue; // Should not happen if path starts with M
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([0, 0]);
                     currentOutTangents.push([0, 0]);
                    break;

                case 'C':
                     if (currentVertices.length === 0) continue;
                     var outTanX = cmd.x1 - prevX;
                     var outTanY = cmd.y1 - prevY;
                     var inTanX = cmd.x2 - cmd.x;
                     var inTanY = cmd.y2 - cmd.y;
                     currentOutTangents[prevVertexIndex] = [outTanX, outTanY];
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([inTanX, inTanY]);
                     currentOutTangents.push([0, 0]);
                    break;

                case 'S':
                     if (currentVertices.length === 0) continue;
                     var x1_abs, y1_abs;
                     if (cmd.lastCtrlX === null) { x1_abs = prevX; y1_abs = prevY; }
                     else { x1_abs = prevX + (prevX - cmd.lastCtrlX); y1_abs = prevY + (prevY - cmd.lastCtrlY); }
                     var outTanX_s = x1_abs - prevX;
                     var outTanY_s = y1_abs - prevY;
                     var inTanX_s = cmd.x2 - cmd.x;
                     var inTanY_s = cmd.y2 - cmd.y;
                     currentOutTangents[prevVertexIndex] = [outTanX_s, outTanY_s];
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([inTanX_s, inTanY_s]);
                     currentOutTangents.push([0, 0]);
                    break;

                case 'Q':
                     if (currentVertices.length === 0) continue;
                     var cubic_x1 = prevX + 2/3 * (cmd.x1 - prevX);
                     var cubic_y1 = prevY + 2/3 * (cmd.y1 - prevY);
                     var cubic_x2 = cmd.x + 2/3 * (cmd.x1 - cmd.x);
                     var cubic_y2 = cmd.y + 2/3 * (cmd.y1 - cmd.y);
                     var outTanX_q = cubic_x1 - prevX;
                     var outTanY_q = cubic_y1 - prevY;
                     var inTanX_q = cubic_x2 - cmd.x;
                     var inTanY_q = cubic_y2 - cmd.y;
                     currentOutTangents[prevVertexIndex] = [outTanX_q, outTanY_q];
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([inTanX_q, inTanY_q]);
                     currentOutTangents.push([0, 0]);
                    break;

                case 'T':
                     if (currentVertices.length === 0) continue;
                     var x1_abs_t;
                     if (cmd.lastCtrlX === null) { x1_abs_t = prevX; y1_abs_t = prevY; }
                     else { x1_abs_t = prevX + (prevX - cmd.lastCtrlX); y1_abs_t = prevY + (prevY - cmd.lastCtrlY); }
                     var cubic_x1_t = prevX + 2/3 * (x1_abs_t - prevX);
                     var cubic_y1_t = prevY + 2/3 * (y1_abs_t - prevY);
                     var cubic_x2_t = cmd.x + 2/3 * (x1_abs_t - cmd.x);
                     var cubic_y2_t = cmd.y + 2/3 * (y1_abs_t - cmd.y);
                     var outTanX_t = cubic_x1_t - prevX;
                     var outTanY_t = cubic_y1_t - prevY;
                     var inTanX_t = cubic_x2_t - cmd.x;
                     var inTanY_t = cubic_y2_t - cmd.y;
                     currentOutTangents[prevVertexIndex] = [outTanX_t, outTanY_t];
                     currentVertices.push([cmd.x, cmd.y]);
                     currentInTangents.push([inTanX_t, inTanY_t]);
                     currentOutTangents.push([0, 0]);
                    break;

                case 'A':
                    if (currentVertices.length === 0) continue;
                     var curves = arcToBeziers(prevX, prevY, cmd.x, cmd.y, cmd.rx, cmd.ry, cmd.xAxisRotation, cmd.largeArc, cmd.sweep);
                     var arcPrevX = prevX;
                     var arcPrevY = prevY;
                     for (var k = 0; k < curves.length; k++) {
                         var curve = curves[k]; // [cp1x, cp1y, cp2x, cp2y, endX, endY]
                         var cp1x = curve[0], cp1y = curve[1], cp2x = curve[2], cp2y = curve[3], endX = curve[4], endY = curve[5];
                         var outTanX_a = cp1x - arcPrevX;
                         var outTanY_a = cp1y - arcPrevY;
                         var inTanX_a = cp2x - endX;
                         var inTanY_a = cp2y - endY;
                         // Apply out-tangent to the *current* previous vertex
                         currentOutTangents[currentVertices.length - 1] = [outTanX_a, outTanY_a];
                         // Add the new vertex
                         currentVertices.push([endX, endY]);
                         currentInTangents.push([inTanX_a, inTanY_a]);
                         currentOutTangents.push([0, 0]);
                         arcPrevX = endX; arcPrevY = endY;
                     }
                    break;

                case 'Z':
                     if (currentVertices.length === 0) continue; // Cannot close an empty path
                     currentClosed = true;
                     finalizeSubPath(); // Finalize and store the closed path
                    break;
            }
        }

        // Finalize any remaining open path after the loop finishes
        if (currentVertices.length > 0) {
             finalizeSubPath();
        }

        // Return the array of shapes, or null if none were valid
        return subPathShapes.length > 0 ? subPathShapes : null;
    }


    // --- Tokenizer and Arc Conversion (Mostly unchanged) ---
    /**
     * Tokenize SVG path data string into an array of commands and coordinates.
     * @param {string} pathData - The SVG path data string.
     * @return {Array<string> | null} - Array of tokens, or null if input is invalid.
     */
    function tokenizePath(pathData) {
        if (!pathData || typeof pathData !== 'string') return null;
        var tokens = pathData.match(/[A-Za-z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
        return tokens || [];
    }

    function arcToBeziers(x1, y1, x2, y2, rx, ry, angle, largeArcFlag, sweepFlag) {
        var PI = Math.PI;
        var TAU = PI * 2;
        
        // Input validation and handling degenerate cases
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        
        // Handle degenerate case where arc is actually a line
        if (rx === 0 || ry === 0) {
            return [[x1, y1, x1, y1, x2, y2]]; // Return a straight line
        }
        
        // Handle the case where start and end points are identical
        if (Math.abs(x1 - x2) < 1e-9 && Math.abs(y1 - y2) < 1e-9) {
            return [[x1, y1, x1, y1, x2, y2]]; // Degenerate arc becomes a point
        }

        // Convert angle from degrees to radians
        var phi = angle * PI / 180;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);
        
        // Step 1: Transform to origin and rotate to align with coordinate axes
        var x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2;
        var y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2;
        
        // Step 2: Ensure radii are large enough
        var lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
        if (lambda > 1) {
            var lambda_sqrt = Math.sqrt(lambda);
            rx *= lambda_sqrt;
            ry *= lambda_sqrt;
        }
        
        // Step 3: Compute center point
        var rxSq = rx * rx;
        var rySq = ry * ry;
        var x1pSq = x1p * x1p;
        var y1pSq = y1p * y1p;
        
        var numerator = (rxSq * rySq) - (rxSq * y1pSq) - (rySq * x1pSq);
        var denominator = (rxSq * y1pSq) + (rySq * x1pSq);
        
        // Ensure numerical stability
        var radicand = Math.max(0, numerator / denominator);
        var sign = (largeArcFlag === sweepFlag) ? -1 : 1;
        var coef = sign * Math.sqrt(radicand);
        
        var cxp = coef * (rx * y1p / ry);
        var cyp = coef * -(ry * x1p / rx);
        
        // Step 4: Transform center back to original coordinate system
        var sx = (x1 + x2) / 2;
        var sy = (y1 + y2) / 2;
        var cx = sx + (cosPhi * cxp - sinPhi * cyp);
        var cy = sy + (sinPhi * cxp + cosPhi * cyp);
        
        // Step 5: Calculate start and sweep angles
        var ux = (x1p - cxp) / rx;
        var uy = (y1p - cyp) / ry;
        var vx = (-x1p - cxp) / rx;
        var vy = (-y1p - cyp) / ry;
        
        // Improved vector angle calculation
        function angleBetweenVectors(u, v) {
            var dot = u[0] * v[0] + u[1] * v[1];
            var lenSqU = u[0]*u[0] + u[1]*u[1];
            var lenSqV = v[0]*v[0] + v[1]*v[1];
            
            // Handle zero-length vectors with better precision
            if (lenSqU < 1e-9 || lenSqV < 1e-9) return 0;
            
            var len = Math.sqrt(lenSqU * lenSqV);
            // Ensure dot/len is within valid acos range to prevent NaN
            var cosAngle = Math.max(-1, Math.min(1, dot / len));
            var angleRad = Math.acos(cosAngle);
            
            // Determine sign using cross product
            if ((u[0]*v[1] - u[1]*v[0]) < 0) {
                angleRad = -angleRad;
            }
            return angleRad;
        }
        
        var theta1 = angleBetweenVectors([1, 0], [ux, uy]);
        var deltaTheta = angleBetweenVectors([ux, uy], [vx, vy]);
        
        // Adjust deltaTheta based on sweep flag
        if (!sweepFlag && deltaTheta > 0) {
            deltaTheta -= TAU;
        } else if (sweepFlag && deltaTheta < 0) {
            deltaTheta += TAU;
        }
        
        // Step 6: Split the arc into segments of at most 180 degrees
        var segments = Math.max(Math.ceil(Math.abs(deltaTheta) / PI), 1);
        var segmentDeltaTheta = deltaTheta / segments;
        
        // Step 7: Approximate each segment with a cubic Bezier curve
        var curves = [];
        var currentTheta = theta1;
        var startX_segment = x1;
        var startY_segment = y1;
        
        for (var i = 0; i < segments; i++) {
            var endTheta = currentTheta + segmentDeltaTheta;
            var cosCurrentTheta = Math.cos(currentTheta);
            var sinCurrentTheta = Math.sin(currentTheta);
            var cosEndTheta = Math.cos(endTheta);
            var sinEndTheta = Math.sin(endTheta);
            
            // Calculate endpoint of this segment
            var endX_segment, endY_segment;
            if (i === segments - 1) {
                // Use exact end point for the last segment to avoid rounding errors
                endX_segment = x2;
                endY_segment = y2;
            } else {
                endX_segment = cx + cosPhi * (rx * cosEndTheta) - sinPhi * (ry * sinEndTheta);
                endY_segment = cy + sinPhi * (rx * cosEndTheta) + cosPhi * (ry * sinEndTheta);
            }
            
            // Calculate tangent vectors
            var t1x = -rx * sinCurrentTheta;
            var t1y = ry * cosCurrentTheta;
            var t2x = -rx * sinEndTheta;
            var t2y = ry * cosEndTheta;
            
            // Rotate tangent vectors back to original coordinate system
            var rt1x = cosPhi * t1x - sinPhi * t1y;
            var rt1y = sinPhi * t1x + cosPhi * t1y;
            var rt2x = cosPhi * t2x - sinPhi * t2y;
            var rt2y = sinPhi * t2x + cosPhi * t2y;
            
            // Calculate control points for the cubic Bezier
            var alpha = (4 / 3) * Math.tan(segmentDeltaTheta / 4); // Improved tangent calculation
            var cp1x = startX_segment + alpha * rt1x;
            var cp1y = startY_segment + alpha * rt1y;
            var cp2x = endX_segment - alpha * rt2x;
            var cp2y = endY_segment - alpha * rt2y;
            
            curves.push([cp1x, cp1y, cp2x, cp2y, endX_segment, endY_segment]);
            
            // Update for next segment
            currentTheta = endTheta;
            startX_segment = endX_segment;
            startY_segment = endY_segment;
        }
        
        return curves;
    }

    /**
     * Calculates the tangent vector at a point on a Bezier curve.
     * Useful for path point operations and animations.
     * @param {number} t - Parameter value between 0 and 1.
     * @param {Array} points - Array of control points [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y].
     * @return {Array} - [x, y] unit tangent vector at point t.
     */
    function calculateCurveTangent(t, points) {
        // For cubic Bezier: P'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
        var mt = 1 - t;
        var mt2 = mt * mt;
        var t2 = t * t;
        
        // Extract control points
        var p0x = points[0], p0y = points[1];
        var p1x = points[2], p1y = points[3];
        var p2x = points[4], p2y = points[5];
        var p3x = points[6], p3y = points[7];
        
        // Calculate derivative components
        var tx = 3 * mt2 * (p1x - p0x) + 6 * mt * t * (p2x - p1x) + 3 * t2 * (p3x - p2x);
        var ty = 3 * mt2 * (p1y - p0y) + 6 * mt * t * (p2y - p1y) + 3 * t2 * (p3y - p2y);
        
        // Normalize to get unit tangent vector
        var len = Math.sqrt(tx * tx + ty * ty);
        if (len < 1e-9) return [0, 0]; // Handle zero-length tangent
        
        return [tx / len, ty / len];
    }

    /**
     * Calculates the point at parameter t on a cubic Bezier curve.
     * @param {number} t - Parameter value between 0 and 1.
     * @param {Array} points - Array of control points [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y].
     * @return {Array} - [x, y] point at parameter t.
     */
    function calculateCurvePoint(t, points) {
        var mt = 1 - t;
        var mt2 = mt * mt;
        var mt3 = mt2 * mt;
        var t2 = t * t;
        var t3 = t2 * t;
        
        // Extract control points
        var p0x = points[0], p0y = points[1];
        var p1x = points[2], p1y = points[3];
        var p2x = points[4], p2y = points[5];
        var p3x = points[6], p3y = points[7];
        
        // Calculate point using cubic Bezier formula
        var x = mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x;
        var y = mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y;
        
        return [x, y];
    }

    // --- Helper Functions for Attribute Parsing ---

    /**
     * Extracts the value of a specific attribute from an XML/HTML tag string.
     * Handles single or double quotes. Returns null if attribute not found.
     * @param {string} tagString - The string containing the tag (e.g., "<path ...>").
     * @param {string} attributeName - The name of the attribute to extract (e.g., "fill").
     * @return {string | null} - The attribute value or null.
     */
    function extractAttribute(tagString, attributeName) {
        // Case-insensitive attribute name matching, handles different quote styles
        var regex = new RegExp(attributeName + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i');
        var match = tagString.match(regex);
        if (match) {
            // Return the captured group that is not undefined (either double or single quotes)
            return match[1] !== undefined ? match[1] : match[2];
        }
        return null; // Attribute not found
    }


    /**
     * Parses various SVG color formats into an AE-compatible [R, G, B, A] array (0-1 range).
     * Handles hex (#rgb, #rrggbb), rgb(r,g,b), and basic color names. Defaults alpha to 1.
     * Returns the color array, "none", or null if parsing fails.
     * @param {string | null} colorString - The color string from SVG attribute.
     * @return {Array<number> | "none" | null} - [R, G, B, A] array, "none", or null.
     */
     function parseColor(colorString) {
        if (!colorString) return null;
        colorString = colorString.toLowerCase().trim();
        if (colorString === 'none') return "none";
        if (colorString === 'transparent') return [0, 0, 0, 0]; // Special case

        // Basic Color Names (add more as needed)
        var colorNames = {
            "black": [0, 0, 0], "white": [1, 1, 1], "red": [1, 0, 0], "green": [0, 1, 0], "blue": [0, 0, 1],
            "yellow": [1, 1, 0], "cyan": [0, 1, 1], "magenta": [1, 0, 1], "gray": [0.5, 0.5, 0.5], "grey": [0.5, 0.5, 0.5]
            // Often defaults to black if attribute is present but invalid/unspecified
        };
        if (colorNames[colorString]) return colorNames[colorString].concat(1); // Add alpha = 1

        // Hex Colors (#rrggbb or #rgb)
        if (colorString.charAt(0) === '#') {
            var hex = colorString.substring(1);
            if (hex.length === 3) { // Expand #rgb to #rrggbb
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            if (hex.length === 6) {
                var r = parseInt(hex.substring(0, 2), 16) / 255;
                var g = parseInt(hex.substring(2, 4), 16) / 255;
                var b = parseInt(hex.substring(4, 6), 16) / 255;
                return [r, g, b, 1]; // Add alpha = 1
            }
        }

        // RGB Colors (rgb(r, g, b)) - Ignores rgba for simplicity now
        var rgbMatch = colorString.match(/^rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
        if (rgbMatch) {
            var r = parseInt(rgbMatch[1]) / 255;
            var g = parseInt(rgbMatch[2]) / 255;
            var b = parseInt(rgbMatch[3]) / 255;
            return [r, g, b, 1]; // Add alpha = 1
        }

        // Default/Fallback: Could return black [0,0,0,1] or null to signify parse failure
         // Returning null might be better to differentiate from explicitly black
        return null;
    }


    /**
     * Parses a string into a floating-point number. Returns a default value if parsing fails or input is invalid.
     * @param {string | null} numberString - The string to parse.
     * @param {number} defaultValue - The value to return if parsing fails.
     * @return {number} - The parsed number or the default value.
     */
    function parseNumber(numberString, defaultValue) {
        if (numberString === null || numberString === undefined) return defaultValue;
        var num = parseFloat(numberString);
        return isNaN(num) ? defaultValue : num;
    }


    // --- Main Script Logic (Entry Point) ---
     function processSVG() {
        app.beginUndoGroup("SVG to Shape Layer(s)");
        var createdLayer = null;
        var pathsAdded = 0;
        var allVertices = []; // Store vertices from all paths for bounding box calculation
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        try {
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) {
    alert("Please select or open a composition first.");
    return;
}

            var svgFile = File.openDialog("Select an SVG file", "SVG Files:*.svg", false);
            if (svgFile == null || !svgFile.exists) {
                 if (svgFile == null) alert("No file selected.");
                 else alert("SVG file does not exist: " + svgFile.fsName);
    return;
}

    svgFile.open("r");
    var svgContent = svgFile.read();
    svgFile.close();

            // Match the entire path tag now, to extract other attributes
            var pathTagRegex = /<path[^>]*>/gi; // Find full <path ...> tags
            var pathMatches = svgContent.match(pathTagRegex);

            if (!pathMatches || pathMatches.length === 0) {
                alert("No <path> elements found in the file."); // Adjusted message
        return;
    }

            createdLayer = comp.layers.addShape();
            createdLayer.name = svgFile.name.replace(/\.svg$/i, '') || "SVG Shapes";
            var rootContents = createdLayer.property("ADBE Root Vectors Group");

            for (var p = 0; p < pathMatches.length; p++) {
                 var pathTag = pathMatches[p]; // The full tag string

                // Extract d attribute first
                var dMatch = pathTag.match(/d\s*=\s*[\'\"]([^\'\"]+)[\'\"]/i);
                if (!dMatch || dMatch.length < 2) continue; // Skip if no 'd' attribute
                var pathData = dMatch[1].trim();
                if (!pathData) continue; // Skip if 'd' is empty

                // --- Execute the 3 Parsing Phases for Path Data ---
                var rawCmds = parseRawCommands(pathData);
                if (!rawCmds) continue; // Skip on phase 1 fail
                var absCmds = makeCommandsAbsolute(rawCmds);
                if (!absCmds) continue; // Skip on phase 2 fail
                var shapeDataArray = commandsToShape(absCmds);
                 if (!shapeDataArray) continue; // Skip on phase 3 fail
                // --- End Path Data Parsing ---

                // --- Store vertices and update bounds ---
                if (shapeDataArray && shapeDataArray.length > 0) {
                     // Iterate through each sub-shape in the array
                     for (var s = 0; s < shapeDataArray.length; s++) {
                         var subShapeData = shapeDataArray[s];
                         if (subShapeData.vertices && subShapeData.vertices.length > 0) {
                             // Store all vertices for bounding box
                             for (var v = 0; v < subShapeData.vertices.length; v++) {
                                 var vert = subShapeData.vertices[v];
                                 minX = Math.min(minX, vert[0]);
                                 minY = Math.min(minY, vert[1]);
                                 maxX = Math.max(maxX, vert[0]);
                                 maxY = Math.max(maxY, vert[1]);
                             }
                             // We don't store allVertices anymore, just update bounds
                         }
                     }
                } else {
                     // No valid shapes returned, skip bounds update
                    continue;
                }

                 // --- Extract Style Attributes ---
                 var fillColorAttr = extractAttribute(pathTag, "fill");
                 var strokeColorAttr = extractAttribute(pathTag, "stroke");
                 var strokeWidthAttr = extractAttribute(pathTag, "stroke-width");
                 // var transformAttr = extractAttribute(pathTag, "transform"); // Keep for future use

                 // --- Parse Style Attributes ---
                 var fillColor = parseColor(fillColorAttr); // Returns [r,g,b,a], "none", or null
                 var strokeColor = parseColor(strokeColorAttr); // Returns [r,g,b,a], "none", or null
                 var strokeWidth = parseNumber(strokeWidthAttr, 1); // Default stroke width is 1 in SVG

                 // --- Add AE Group and potentially Merge Paths ---
                 var pathGroup = rootContents.addProperty("ADBE Vector Group");
                 pathGroup.name = "Path " + (p + 1);
                 var pathContents = pathGroup.property("ADBE Vectors Group");

                // Add each sub-path as a separate shape group
                for (var s = 0; s < shapeDataArray.length; s++) {
                    var subShapeData = shapeDataArray[s];
                    try {
                        var shapePathGroup = pathContents.addProperty("ADBE Vector Shape - Group");
                         // Note: Naming the sub-shape groups can be useful for debugging
                         // shapePathGroup.name = "Sub-Path " + (s + 1);
                        var shapeProperty = shapePathGroup.property("ADBE Vector Shape");
                        shapeProperty.setValue(subShapeData);
                    } catch (e) {
                         alert("Error setting shape data for Sub-Path #" + (s + 1) + " of Path #" + (p + 1) + ". Skipping sub-path.\nError: " + e.toString());
                         // Don't remove the main pathGroup, just skip this sub-shape
                    }
                }

                 // If there were multiple sub-paths, add a Merge Paths operator
                 if (shapeDataArray.length > 1) {
                     try {
                         pathContents.addProperty("ADBE Vector Filter - Merge");
                         // Default merge mode is usually sufficient for compound paths
                     } catch (e) {
                         alert("Error adding Merge Paths operator for Path #" + (p + 1) + ".\nError: " + e.toString());
                     }
                 }

                 // --- Apply Parsed Styles to the MAIN GROUP ---
                 // Styles apply *after* shapes are potentially merged

                // Apply Fill
                var hasFill = true; // SVG default fill is black unless specified otherwise
                var aeFillColor = [0, 0, 0, 1]; // Default black
                 if (fillColor === "none") {
                     hasFill = false;
                 } else if (fillColor !== null) { // Parsed a valid color
                     aeFillColor = fillColor;
                 } else if (fillColorAttr !== null) {
                     // Attribute exists but wasn't parsed (e.g., "url(#gradient)") - treat as no fill for now
                     // Or could default to black? Let's default to black as SVG does.
                     aeFillColor = [0, 0, 0, 1];
                     // alert("Note: Unsupported fill value '" + fillColorAttr + "' on path " + (p+1) + ". Using black.");
                 } // else: fillColorAttr is null, so use SVG default black (aeFillColor already set)

                 if (hasFill) {
                     var fill = pathContents.addProperty("ADBE Vector Graphic - Fill");
                     fill.property("ADBE Vector Fill Color").setValue(aeFillColor);
                     // Consider fill-opacity later if needed
                 }

                // Apply Stroke
                var hasStroke = false;
                var aeStrokeColor = [0, 0, 0, 1]; // Default (but only used if stroke is applied)

                if (strokeColor === "none") {
                    hasStroke = false;
                } else if (strokeColor !== null) { // Parsed a valid color
                    aeStrokeColor = strokeColor;
                    hasStroke = true; // Has a color, assume stroke unless width is 0
                } else if (strokeColorAttr !== null) {
                    // Attribute exists but wasn't parsed - treat as no stroke for now
                    // alert("Note: Unsupported stroke value '" + strokeColorAttr + "' on path " + (p+1) + ". Stroke ignored.");
                    hasStroke = false;
                 } // else: strokeColorAttr is null, SVG default is "none"

                 // Stroke width must be positive
                 if (strokeWidth <= 0) {
                     hasStroke = false;
                 }

                 if (hasStroke) {
                     var stroke = pathContents.addProperty("ADBE Vector Graphic - Stroke");
                     stroke.property("ADBE Vector Stroke Color").setValue(aeStrokeColor);
                     stroke.property("ADBE Vector Stroke Width").setValue(strokeWidth);
                     // Consider stroke-opacity, linecap, linejoin later if needed
                 }

                 // TODO: Apply transformAttr if/when transform parsing is added

                pathsAdded++;
            }

            // --- Center Anchor Point after adding all paths ---
            if (pathsAdded > 0 && isFinite(minX)) { // Check if bounds are valid
                var centerX = minX + (maxX - minX) / 2;
                var centerY = minY + (maxY - minY) / 2;

                var transformGroup = createdLayer.property("ADBE Transform Group");
                var anchorPointProp = transformGroup.property("ADBE Anchor Point");
                var positionProp = transformGroup.property("ADBE Position");

                var currentPosition = positionProp.value;

                // Set anchor point to the calculated center
                anchorPointProp.setValue([centerX, centerY]);

                // Adjust position to compensate for anchor point shift
                positionProp.setValue([currentPosition[0] + centerX, currentPosition[1] + centerY]);

                 // Optional: Reset scale and rotation if needed, though typically not desired
                 // transformGroup.property("ADBE Scale").setValue([100, 100]);
                 // transformGroup.property("ADBE Rotate Z").setValue(0);
            }

            if (pathsAdded === 0) {
                 // alert("No valid paths could be parsed and added from the SVG file."); // Removed feedback popup
                 if (createdLayer) try { createdLayer.remove(); } catch(remErr) {}
                 createdLayer = null; // Ensure undo group isn't ended if nothing changed
} else {
                 // alert(pathsAdded + " path(s) converted to shape layer '" + createdLayer.name + "' successfully."); // Removed feedback popup
}

        } catch (e) {
            alert("An critical error occurred: " + e.toString() + (e.line ? " (approx line " + e.line + ")" : ""));
        } finally {
             if (createdLayer !== null || pathsAdded > 0) { // Only end if changes were potentially made
app.endUndoGroup();
             }
        }
    }

    // --- Run the script ---
     processSVG();

})(); // End of IIFE
