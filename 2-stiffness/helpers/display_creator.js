// Merve Erdogan - 14.10.2025
/*
=======================================================================
MAIN DISPLAY CREATOR PLUGIN FOR ALL PLC SIZE CHANGING EXPERIMENTS
=======================================================================
Table of Contents
1) Parameters (what you can control in html file)
2) Setup (canvas, import cloth data, setup the cloth)
3.1) Optional Grid Selection for downsampling cloth dots
3) Frame-to-frame Size Variation 
4) Frame-to-frame Location Shift (optional for the location shift experiment)
5) Speed adjusment (optional for the stiffness experiment)
6) Display Loop
7) Trial End and Save Data
8) Helpers
===============================================================
*/
jsPsych.plugins["displayCreator"] = (function () {
    var plugin = {};
    plugin.info = {
        name: "displayCreator",
        parameters: {
            //--- General Cloth Setup --- //
            clothData: {
                type: jsPsych.plugins.parameterType.FUNCTION, pretty_name: 'dot_pos', default: 0,
                description: 'function to get the processed cloth data'
            },
            dotSize: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'dotSize', default: 3,
                description: 'dot radius in px'
            },
            fps: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'fps', default: 60,
                description: 'source data frame rate'
            },
            cycleNum: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'cycleNum', default: 1,
                description: 'repeat underlying motion cycles'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'trial_duration',
                default: null,
                description: 'optional hard stop in seconds (affects the total display duration)'
            },
            gridX: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'gridX', default: 4,
                description: 'number of rows in the grid'
            },
            gridY: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'gridY', default: 4,
                description: 'number of columns in the grid'
            },

            //--- Size Variance Parameters --- //
            sizeVariationEnabled: {
                type: jsPsych.plugins.parameterType.BOOL, pretty_name: 'sizeVariation', default: true,
                description: 'enable random-walk size changes'
            },
            sizeChangingScalingFactor: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'Size Step Factor', default: 1.75,
                description: 'how much to change the size by each step (log-step base)'
            },
            frameDur: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'frameDur', default: 100,
                description: 'how long to hold each frame (ms)'
            },
            pixelsPerDegree: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'Pixels Per Degree', default: 55,
                description: 'px/deg conversion for cloth size (kept for backward compatibility)'
            },
            minSizeFactor: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'Min Size (deg)', default: 1.6,
                description: 'Cloth size limits: absolute min diagonal in deg (kept for backward compatibility)'
            },
            maxSizeFactor: {
                type: jsPsych.plugins.parameterType.FLOAT, pretty_name: 'Max Size (deg)', default: 7.3,
                description: 'Cloth size limits: absolute max diagonal in deg (kept for backward compatibility)'
            },

            //--- Location Shift Parameters --- //
            locationShiftEnabled: {
                type: jsPsych.plugins.parameterType.BOOL, pretty_name: 'Location Shift Enabled', default: false, description: 'whether to jitter the center of the cloth each displayed frame'
            },
            minLocationShift: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'Location Shift X Min', default: 10,
                description: 'minimum ±px jitter range in X direction'
            },
            locationShiftAreaRadius: {
                type: jsPsych.plugins.parameterType.INT, pretty_name: 'Location Shift Area Radius', default: 50,
                description: 'radius of the location shift area in px'
            },

            //--- Speed Adjustment Parameters (for the stiffness experiment) --- //
            speedRate: {
                type: jsPsych.plugins.parameterType.FUNCTION, pretty_name: 'speedRate', default: 1,
                description: 'function to get the speed rate'
            },
            equalizeSpeed: {
                type: jsPsych.plugins.parameterType.BOOL, pretty_name: 'Equalize Speed', default: false,
                description: 'whether to equalize the speed of the cloth'
            },

        }
    }

    plugin.trial = function (display_element, trial) {
        trial_startTime = performance.now();

        /* ============================================================
        3) GENERALSETUP (canvas, import, scaling, centering)
        ================================================================ */
        /* ================
        3.1) Canvas Setup
        =================== */
        var html = '<canvas id="myCanvas"></canvas>';
        display_element.innerHTML = html;
        var canvas = document.getElementById('myCanvas');
        var context = canvas.getContext("2d");
        var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var screenCenter = [w / 2, h / 2];
        const screenDiagonal = Math.sqrt(w * w + h * h);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        document.body.style.cursor = 'none';

        /* ======================
        3.2) Variables
        ====================== */
        // Scale based on screen diagonal, as reference, 13.3" laptop (1280x800 - 1509px diagonal)
        let referenceScreenDiagonal = 1509;
        let pxPerDegreeBasedOnScreenSize = trial.pixelsPerDegree * (screenDiagonal / referenceScreenDiagonal);

        //to save display details
        let frameDetails = {
            displayFrameNumber: [], baseSizePx: [], scaledSizePx: [], currentSizeRelativeToInitialSize: [], scaleFactorFrameToFrame: [], clothPos: [], timeInCurrentDisplayFrame: [], locationShiftDistancePx: [],
            scaledSizeRelative: [], dotPosX: [], dotPosY: [],
        };
        let totalFrameCount = 0;
        let lastDisplayedFrameIndex = -1;
        let currentDisplayFrameStartTime = 0;
        let lastRafTime = 0;


        /* ======================
        3.3) Use Pre-processed Cloth Data
        ====================== */
        // Get the processed cloth data from the function parameter
        thisClothData = trial.clothData();
        var selectedDotPosX = thisClothData.selectedDotPosX.slice();
        var selectedDotPosY = thisClothData.selectedDotPosY.slice();
        var originalFrameNum = thisClothData.frameNum;
        for (let c = 1; c < trial.cycleNum; c++) {
            for (let i = 0; i < selectedDotPosX.length; i++) {
                selectedDotPosX[i] = selectedDotPosX[i].concat(thisClothData.selectedDotPosX[i]);
                selectedDotPosY[i] = selectedDotPosY[i].concat(thisClothData.selectedDotPosY[i]);
            }
        }
        totalFrameNum = originalFrameNum * trial.cycleNum;



        /* ============================================================
        4) SIZE VARIATION (USED IN ALL EXPERIMENTS)
        ================================================================ */
        const minAbsPx = trial.minSizeFactor * pxPerDegreeBasedOnScreenSize;
        const maxAbsPx = trial.maxSizeFactor * pxPerDegreeBasedOnScreenSize;

        let initialClothDimensions = calculateClothDimensionsAt(0, selectedDotPosX, selectedDotPosY);
        let clothDiagonal = initialClothDimensions.diagonal;
        let currentSizeFactor = trial.sizeVariationEnabled ? (Math.random() * (maxAbsPx - minAbsPx) + minAbsPx) / clothDiagonal : 1;
        let firstFrameSizePx = round2(clothDiagonal * currentSizeFactor);
        // Fixed base center from the first frame; used to anchor scaling independent of folding/motion
        let initialBaseCenterX = initialClothDimensions.center[0];
        let initialBaseCenterY = initialClothDimensions.center[1];

        function updateSizeFactor(nextFrameIdx) {
            var goUp = Math.random() < 0.5;
            var candidate = currentSizeFactor * (goUp ? trial.sizeChangingScalingFactor : (1 / trial.sizeChangingScalingFactor));
            var baseDiagNext = calculateClothDimensionsAt(nextFrameIdx, selectedDotPosX, selectedDotPosY).diagonal;
            var scaledDiagCandidate = baseDiagNext * candidate;
            if (scaledDiagCandidate > maxAbsPx || scaledDiagCandidate < minAbsPx) {
                // If the chosen direction would exceed limits, reverse the direction
                candidate = currentSizeFactor * (goUp ? (1 / trial.sizeChangingScalingFactor) : trial.sizeChangingScalingFactor);
            } else {

            }
            currentSizeFactor = candidate;
        }

        /*============================================================
        5) OPTIONAL LOCATION SHIFT 
        ================================================================ */
        let prevClothLocation = [screenCenter[0], screenCenter[1]];
        let currentClothLocation = [screenCenter[0], screenCenter[1]];

        function sampleLocationShift() {
            if (!trial.locationShiftEnabled) {
                prevClothLocation = [screenCenter[0], screenCenter[1]];
                currentClothLocation = [screenCenter[0], screenCenter[1]];
                return;
            }

            const cx = screenCenter[0], cy = screenCenter[1];
            // Use last actual center if available; otherwise fall back to previous planned location
            const refPrev = (frameDetails.clothPos.length > 0)
                ? frameDetails.clothPos[frameDetails.clothPos.length - 1]
                : prevClothLocation;
            const px = refPrev[0], py = refPrev[1];
            const R = trial.locationShiftAreaRadius;
            const minStep = trial.minLocationShift;

            let newX, newY;
            while (true) {
                const theta = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * R;
                newX = cx + Math.cos(theta) * r;
                newY = cy + Math.sin(theta) * r;
                if (Math.hypot(newX - px, newY - py) >= minStep) break;
            }
            currentClothLocation = [newX, newY];
        }

        /* ============================================================
        6) SPEED ADJUSTMENT (FOR THE STIFFNESS EXPERIMENT)
        ================================================================ */
        speedRate = typeof trial.speedRate !== 'undefined' ? trial.speedRate() : 1;
        let displayFPS = speedRate * trial.fps;
        let displayDuration = (totalFrameNum / displayFPS)

        /* ============================================================
        7) START DISPLAY LOOP
        ================================================================ */
        let start_time = performance.now();
        let time_elapsed = 0;
        move_disc();

        function move_disc() {
            let current_time = performance.now();
            time_elapsed = (current_time - start_time) / 1000;
            if (time_elapsed < displayDuration) {

                // change size or location only if the displayed frame is proceeding
                if (lastDisplayedFrameIndex === -1) {
                    lastDisplayedFrameIndex = 0;
                    currentDisplayFrameStartTime = 0;
                    lastRafTime = current_time;
                    if (trial.locationShiftEnabled) {
                        sampleLocationShift();
                        // Don't record initial position here - it will be recorded when the first frame is rendered
                    }
                }

                // time bookkeeping to check if the frame duration is met
                if (lastRafTime === 0) lastRafTime = current_time;
                const deltaSinceLast = current_time - lastRafTime; lastRafTime = current_time;
                currentDisplayFrameStartTime += deltaSinceLast;
                const timeInCurrentFrame = currentDisplayFrameStartTime;

                let percent_time = time_elapsed / displayDuration;
                context.clearRect(0, 0, canvas.width, canvas.height);

                // draw current frame every RAF (avoid flicker while holding frame)
                let idx = lastDisplayedFrameIndex;
                let inFrame_x = []; let inFrame_y = [];

                for (let i = 0; i < selectedDotPosX.length; i++) {
                    if (frameDetails.dotPosX[i] === undefined) frameDetails.dotPosX[i] = [];
                    if (frameDetails.dotPosY[i] === undefined) frameDetails.dotPosY[i] = [];

                    let orig = [selectedDotPosX[i][idx], selectedDotPosY[i][idx]];
                    // Scale around the initial frame center, then translate to currentClothLocation
                    let dotPosX = (orig[0] - initialBaseCenterX) * currentSizeFactor + currentClothLocation[0];
                    let dotPosY = (orig[1] - initialBaseCenterY) * currentSizeFactor + currentClothLocation[1];

                    inFrame_x.push(dotPosX); inFrame_y.push(dotPosY);
                    frameDetails.dotPosX[i].push(dotPosX);
                    frameDetails.dotPosY[i].push(dotPosY);
                    drawDots(dotPosX, dotPosY);
                }

                // compute metrics for the currently displayed frame
                let wpx = Math.max(...inFrame_x) - Math.min(...inFrame_x);
                let hpx = Math.max(...inFrame_y) - Math.min(...inFrame_y);

                // Calculate actual cloth center after scaling
                let actualClothCenterX = (Math.min(...inFrame_x) + Math.max(...inFrame_x)) / 2;
                let actualClothCenterY = (Math.min(...inFrame_y) + Math.max(...inFrame_y)) / 2;

                // if frame duration is met, finalize metrics for this frame and advance
                if (timeInCurrentFrame >= trial.frameDur) {
                    const prev = lastDisplayedFrameIndex;
                    let nextIndex = parseInt(percent_time * totalFrameNum);
                    nextIndex = Math.max(0, Math.min(nextIndex, totalFrameNum - 1));
                    if (nextIndex !== prev) {
                        if (trial.sizeVariationEnabled === true) updateSizeFactor(nextIndex);
                        if (trial.locationShiftEnabled) sampleLocationShift();
                        // currentClothLocation is now set directly in sampleLocationShift()
                        lastDisplayedFrameIndex = nextIndex;
                    }
                    currentDisplayFrameStartTime = 0;
                }

                //whenever the frame changes, update the frame details
                if (idx !== lastDisplayedFrameIndex) {
                    frameDetails.displayFrameNumber.push(idx);

                    frameDetails.timeInCurrentDisplayFrame.push(round2(timeInCurrentFrame));

                    frameDetails.baseSizePx.push(round2(calculateClothDimensionsAt(idx, selectedDotPosX, selectedDotPosY).diagonal)); //original cloth size in current frame
                    frameDetails.scaledSizePx.push(round2(Math.sqrt(wpx * wpx + hpx * hpx))); //current cloth size in current frame
                    frameDetails.currentSizeRelativeToInitialSize.push(round2(frameDetails.scaledSizePx[frameDetails.scaledSizePx.length - 1] / frameDetails.baseSizePx[frameDetails.baseSizePx.length - 1])); //current cloth size relative to initial cloth size

                    //scale factor between current frame and previous frame
                    if (frameDetails.currentSizeRelativeToInitialSize.length > 1) { //if there is more than one frame, calculate the scale factor
                        frameDetails.scaleFactorFrameToFrame.push(
                            round2(frameDetails.currentSizeRelativeToInitialSize[frameDetails.currentSizeRelativeToInitialSize.length - 1] /
                                frameDetails.currentSizeRelativeToInitialSize[frameDetails.currentSizeRelativeToInitialSize.length - 2])
                        );
                    }

                    // Calculate shift distance from previous frame (use actual cloth center)
                    if (frameDetails.clothPos.length > 0) {
                        let prevPos = frameDetails.clothPos[frameDetails.clothPos.length - 1];
                        let shiftDistance = Math.hypot(actualClothCenterX - prevPos[0], actualClothCenterY - prevPos[1]);
                        frameDetails.locationShiftDistancePx.push(round2(shiftDistance));
                    }

                    // Record current actual center and update prevClothLocation to actual
                    frameDetails.clothPos.push([actualClothCenterX, actualClothCenterY]);
                    prevClothLocation = [actualClothCenterX, actualClothCenterY];


                }

                totalFrameCount++; //for refresh rate calculation
                requestAnimationFrame(function () { move_disc() })
            } else {
                end_trial();
            }
        }

        /* ============================================================
        8) END TRIAL AND SAVE DATA
        ================================================================ */
        function end_trial() {
            let timeElapsed = performance.now() - start_time;

            /* Calculate Stats From Frame Details */
            var clothDiagPxStats = stats(frameDetails.scaledSizePx);
            var frameDurStats = stats(frameDetails.timeInCurrentDisplayFrame);
            var locationShiftDistancePxStats = stats(frameDetails.locationShiftDistancePx);

            /* Calculate Speed Stats */
            var overallSpeed = calculateClothSpeed(frameDetails.dotPosX, frameDetails.dotPosY);

            /* Save Data */
            var trial_data = {
                clothType: thisClothData.clothType,
                sizeVariationEnabled: trial.sizeVariationEnabled,
                frameDurSet: trial.frameDur,
                frameDurActualizedMin: frameDurStats.min != null ? round2(frameDurStats.min) : null,
                frameDurActualizedMax: frameDurStats.max != null ? round2(frameDurStats.max) : null,
                frameDurActualizedAvg: frameDurStats.avg != null ? round2(frameDurStats.avg) : null,

                scaleFactorSet: trial.sizeChangingScalingFactor,

                // Size parameters
                sizeMinDegreeSet: trial.minSizeFactor,
                sizeMaxDegreeSet: trial.maxSizeFactor,
                pxPerDegreeBasedOnScreenSize: round2(pxPerDegreeBasedOnScreenSize),

                sizeMinPxSet: round2(minAbsPx),
                sizeMaxPxSet: round2(maxAbsPx),
                sizeMinPxActualized: clothDiagPxStats.min != null ? round2(clothDiagPxStats.min) : null,
                sizeMaxPxActualized: clothDiagPxStats.max != null ? round2(clothDiagPxStats.max) : null,
                sizeAvgPxActualized: clothDiagPxStats.avg != null ? round2(clothDiagPxStats.avg) : null,
                firstFrameSizePx: firstFrameSizePx,

                locationShiftEnabled: trial.locationShiftEnabled,
                locationShiftDistancePxMin: locationShiftDistancePxStats.min != null ? round2(locationShiftDistancePxStats.min) : null,
                locationShiftDistancePxMax: locationShiftDistancePxStats.max != null ? round2(locationShiftDistancePxStats.max) : null,
                locationShiftDistancePxAvg: locationShiftDistancePxStats.
                    avg != null ? round2(locationShiftDistancePxStats.avg) : null,

                clothOriginalSpeed: thisClothData.overallSpeed,
                clothSpeedRate: (trial.equalizeSpeed === true) ? 1 : trial.speedRate(),
                clothSpeedEquatedSet: (trial.equalizeSpeed === true) ? null : (round2(thisClothData.overallSpeed * speedRate)),
                clothSpeedActualized: overallSpeed,

                initialClothDimensionsPx: [round2(initialClothDimensions.width), round2(initialClothDimensions.height)],
                dotCount: thisClothData.dotNum,
                displayDurationBeforeSpeedEquating: (trial.equalizeSpeed === true) ? null : round2((totalFrameNum / trial.fps)),
                displayDurationActualized: round2(timeElapsed / 1000),
                cycleNum: trial.cycleNum,

                sizeRelativeToOriginalSize: new Set(frameDetails.currentSizeRelativeToInitialSize),

                dotSizePx: trial.dotSize,

                pxPerDegreeSet: trial.pixelsPerDegree,
                referenceScreenDiagonal: referenceScreenDiagonal,
                participantScreenDiagonal: round2(screenDiagonal),
                participantScreenSize: [w, h],
                participantRefreshRate: round2(totalFrameCount / (timeElapsed / 1000)),
                displayFPSSet: displayFPS
            };

            display_element.innerHTML = '';
            document.body.style.cursor = 'default';
            jsPsych.finishTrial(trial_data);
        };

        /* ============================================================
        9) HELPER FUNCTIONS
        ================================================================ */
        function drawDots(x, y) {
            context.fillStyle = 'white';
            context.beginPath();
            context.arc(x, y, trial.dotSize, 0, 2 * Math.PI);
            context.fill();
            context.lineWidth = '2';
            context.strokeStyle = 'white';
            context.stroke();
        }

        function calculateClothDimensionsAt(frameIdx, dotPosX, dotPosY) {
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (var i = 0; i < dotPosX.length; i++) {
                var x = dotPosX[i][frameIdx];
                var y = dotPosY[i][frameIdx];
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
            var cw = maxX - minX; var ch = maxY - minY;

            return { width: cw, height: ch, center: [minX + cw / 2, minY + ch / 2], minX: minX, minY: minY, maxX: maxX, maxY: maxY, diagonal: Math.sqrt(cw * cw + ch * ch) };
        }


        function stats(vals) { if (!vals || vals.length === 0) return { min: null, max: null, avg: null }; var minV = vals[0], maxV = vals[0], sumV = 0; for (var i = 0; i < vals.length; i++) { var x = vals[i]; if (x < minV) minV = x; if (x > maxV) maxV = x; sumV += x; } return { min: minV, max: maxV, avg: sumV / vals.length }; }
        function round2(n) { return (n === null || n === undefined || isNaN(n)) ? null : Math.round(n * 100) / 100; }

        function calculateClothSpeed(shownDotPosX, shownDotPosY) {
            var ind_speed = [];
            var all_speed_sumX = 0;
            var all_speed_sumY = 0;
            for (var i = 0; i < shownDotPosX.length; i++) {
                var tx = shownDotPosX[i];
                var ty = shownDotPosY[i];
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

                var x_sep = (diff_sumX / (totalFrameNum - 1)) * displayFPS;
                var y_sep = (diff_sumY / (totalFrameNum - 1)) * displayFPS;
                ind_speed[i] = [x_sep, y_sep];
                all_speed_sumX += x_sep;
                all_speed_sumY += y_sep;
            }

            var meanXY_speed = [
                all_speed_sumX / shownDotPosX.length,
                all_speed_sumY / shownDotPosY.length
            ];
            var overallSpeed = Math.sqrt(meanXY_speed[0] * meanXY_speed[0] + meanXY_speed[1] * meanXY_speed[1]);
            return round2(overallSpeed)
        }
    }

    return plugin;
})()