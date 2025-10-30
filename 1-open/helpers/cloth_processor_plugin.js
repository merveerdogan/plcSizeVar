//***************************//
//    CLOTH PROCESSOR PLUGIN //
//*************************//
// Simple plugin that processes cloth data once and saves it for later use

jsPsych.plugins["clothProcessor"] = (function () {
    var plugin = {};

    plugin.info = {
        name: "clothProcessor",
        parameters: {
            clothType: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Cloth Type',
                default: 0,
                description: 'Cloth type'
            },
            dot_pos: {
                type: jsPsych.plugins.parameterType.OBJECT,
                pretty_name: 'Cloth Data',
                default: undefined,
                description: 'Raw cloth data to process'
            },
            scaleFactor: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'Scale Factor',
                default: 1,
                description: 'Scaling factor for cloth size'
            },
            fps: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'FPS',
                default: 60,
                description: 'Frame rate'
            },
            gridX: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Grid X',
                default: 4,
                description: 'Number of rows in grid'
            },
            gridY: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Grid Y',
                default: 4,
                description: 'Number of columns in grid'
            },
            conversionFactor: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'Conversion Factor',
                default: 1,
                description: 'Conversion factor for coordinates'
            },
            pixelsPerDegree: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'Pixels Per Degree',
                default: 55,
                description: 'Pixels per degree'
            }
        }
    };

    plugin.trial = function (display_element, trial) {
        /*
        ==============================
        SCREEN DIMENSIONS
        ==============================
        */
        var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var screenCenter = [w / 2, h / 2];
        var screenDimensions = { width: w, height: h, diagonal: round(Math.sqrt(w * w + h * h)) };

        /*
        ==============================
        PROCESS RAW CLOTH DATA
        ==============================
        */
        var dot_pos = trial.dot_pos;
        var uniqueFrames = [...new Set(dot_pos.map(d => d.frame))].sort((a, b) => a - b);
        var uniqueDots = [...new Set(dot_pos.map(d => d.id))].sort((a, b) => a - b);
        var dot_posX = [];
        var dot_posY = [];
        for (var d = 0; d < uniqueDots.length; d++) {
            dot_posX[d] = [];
            dot_posY[d] = [];
        }

        for (var f = 0; f < uniqueFrames.length; f++) {
            var frameData = dot_pos.filter(d => d.frame === uniqueFrames[f]);
            for (var d = 0; d < uniqueDots.length; d++) {
                var dotData = frameData.find(dd => dd.id === uniqueDots[d]);
                if (dotData && dotData.X !== undefined && dotData.Y !== undefined) {

                    var scaledCoords = scaleCoordinates(dotData.X, dotData.Y, trial.conversionFactor, trial.pixelsPerDegree, screenDimensions);
                    dot_posX[d].push(scaledCoords.x);
                    dot_posY[d].push(scaledCoords.y);
                } else {
                    dot_posX[d].push(0);
                    dot_posY[d].push(0);
                }
            }
        }

        /*
        ==============================
        SELECT DOTS FOR DOWNSAMPLING
        ==============================
        */
        var clothDimensions = calculateClothDimensions(dot_posX, dot_posY);
        var selectedDotIDs = [];
        var selectedDotPosX = [];
        var selectedDotPosY = [];
        var xbin = clothDimensions.width / trial.gridY;
        var ybin = clothDimensions.height / trial.gridX;

        // Generate target grid centers (evenly spaced)
        const centers = [];
        for (let r = 0; r < trial.gridX; r++) {
            for (let c = 0; c < trial.gridY; c++) {
                const cx = clothDimensions.minX + (c) * xbin;
                const cy = clothDimensions.minY + (r) * ybin;
                centers.push({ r, c, x: cx, y: cy });
            }
        }

        // Build all center–dot distance pairs and greedily assign unique nearest dots
        const pairs = [];
        for (let ci = 0; ci < centers.length; ci++) {
            const { x: cx, y: cy } = centers[ci];
            for (let dotID = 0; dotID < dot_posX.length; dotID++) {
                const dx = dot_posX[dotID][0] - cx;
                const dy = dot_posY[dotID][0] - cy;
                pairs.push({ ci, dotID, d2: dx * dx + dy * dy });
            }
        }
        pairs.sort((a, b) => a.d2 - b.d2);

        const centerAssigned = new Array(centers.length).fill(false);
        const dotUsed = new Array(dot_posX.length).fill(false);
        for (let k = 0; k < pairs.length; k++) {
            const p = pairs[k];
            if (centerAssigned[p.ci]) continue;
            if (dotUsed[p.dotID]) continue;
            centerAssigned[p.ci] = true;
            dotUsed[p.dotID] = true;
            selectedDotIDs.push(p.dotID);
            selectedDotPosX.push(dot_posX[p.dotID]);
            selectedDotPosY.push(dot_posY[p.dotID]);
            if (selectedDotIDs.length === Math.min(centers.length, dot_posX.length)) break;
        }


        /*
        ==============================
        CENTER CLOTH
        ==============================
        */
        var clothDimensions = calculateClothDimensions(selectedDotPosX, selectedDotPosY);
        var deltaX = parseFloat(screenCenter[0]) - parseFloat(clothDimensions.center[0]);
        var deltaY = parseFloat(screenCenter[1]) - parseFloat(clothDimensions.center[1]);

        // Move the cloth to the center of the screen
        for (var i = 0; i < selectedDotPosX.length; i++) {
            for (var j = 0; j < selectedDotPosX[i].length; j++) {
                selectedDotPosX[i][j] += deltaX;
                selectedDotPosY[i][j] += deltaY;
            }
        }
        /*
        ==============================
            CALCULATE SPEED
        ==============================
        */
        var ind_speed = [];
        var all_speed_sumX = 0;
        var all_speed_sumY = 0;


        for (var i = 0; i < selectedDotPosX.length; i++) {
            var tx = selectedDotPosX[i];
            var ty = selectedDotPosY[i];
            var dot_length = tx.length;
            var diff_sumX = 0;
            var diff_sumY = 0;

            for (var ii = 1; ii < dot_length; ii++) {
                var changeX = tx[ii] - tx[ii - 1];
                var changeY = ty[ii] - ty[ii - 1];
                var frameSpeed = Math.sqrt(changeX * changeX + changeY * changeY);
                diff_sumX += frameSpeed;
                diff_sumY += frameSpeed;
            }

            var x_sep = (diff_sumX / (dot_length - 1)) * trial.fps;
            var y_sep = (diff_sumY / (dot_length - 1)) * trial.fps;
            ind_speed[i] = [x_sep, y_sep];
            all_speed_sumX += x_sep;
            all_speed_sumY += y_sep;
        }

        var meanXY_speed = [
            all_speed_sumX / selectedDotPosX.length,
            all_speed_sumY / selectedDotPosY.length
        ];

        var overallSpeed = Math.sqrt(meanXY_speed[0] * meanXY_speed[0] + meanXY_speed[1] * meanXY_speed[1]);

        /*
        ==============================
        SAVE PROCESSED DATA
        ==============================
        */
        var trial_data = {
            clothType: trial.clothType,
            selectedDotPosX: selectedDotPosX,
            selectedDotPosY: selectedDotPosY,
            selectedDotIDs: selectedDotIDs,
            allDotPosX: dot_posX,
            allDotPosY: dot_posY,
            frameNum: uniqueFrames.length,
            dotNum: selectedDotIDs.length,
            overallSpeed: round(overallSpeed, 2),
        };

        /*
        ==============================
            FUNCTIONS
        ==============================
        */
        // Scale coordinates
        function scaleCoordinates(objX, objY, conversionFactor, pixelsPerDegree, screenDimensions) {
            var referenceScreenDiagonal = 1509;
            var pxPerDegreeBasedOnScreenSize = pixelsPerDegree * (screenDimensions.diagonal / referenceScreenDiagonal);
            var scale = pxPerDegreeBasedOnScreenSize * conversionFactor;
            var projectedX = objX * scale + screenCenter[0];
            var projectedY = -objY * scale + screenCenter[1];
            return { x: projectedX, y: projectedY };
        }

        function round(value, decimals = 2) {
            return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
        }


        function calculateClothDimensions(dot_posX, dot_posY) {
            var allX = [];
            var allY = [];
            for (var i = 0; i < dot_posX.length; i++) {
                for (var j = 0; j < dot_posX[i].length; j++) {
                    allX.push(dot_posX[i][j]);
                    allY.push(dot_posY[i][j]);
                }
            }
            var minX = Math.min(...allX);
            var minY = Math.min(...allY);
            var maxX = Math.max(...allX);
            var maxY = Math.max(...allY);
            return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, width: maxX - minX, height: maxY - minY, center: [(minX + maxX) / 2, (minY + maxY) / 2] };
        }

        jsPsych.finishTrial(trial_data);
    };



    return plugin;
})();
