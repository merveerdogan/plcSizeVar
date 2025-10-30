/** Merve Erdogan **/
// Point-light cloths//
condNum = 4;
block_num = 1;

/*===============================================================
          EXPERIMENT MODE CONFIGURATION
===============================================================*/
var debugMode = true;  // Set to false for full experiment run

if (debugMode) {
    // Debug mode: shorter experiment for testing
    condNum = 1;
    var runIntro = false;
    var runInstr = false;
    var delay = false;  // No delay on buttons for faster testing
} else {
    // Production mode: full experiment run
    condNum = 4;
    var runIntro = true;
    var runInstr = true;
    var delay = true;  // Delay on buttons to ensure reading time
}
/*===============================================================
          SCREEN FEATURES
===============================================================*/
//The coordinate for the center of the screen
var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
var screenCenter = [w / 2, h / 2];
var text_color = 'white';


/*===============================================================
          EXPERIMENT-SPECIFIC PARAMETERS & FUNCTIONS
===============================================================*/
let estTotalRunTime = 3;
let exp_compensation = "$" + (estTotalRunTime * .14).toFixed(2).toString();
let completion_code = 'C17FAMG9';
let study_title = 'Waving Clothes'
let forceFullscreen = true;
var screen_color = "black";


clothNames = [wind_m1_s00078125, wind_m1_s003125, wind_m1_s0125];
clothTypes = [];
for (c = 0; c < clothNames.length; c++) {
    clothTypes.push(getVariableName(clothNames[c]));
}

conditions = [];
for (c = 0; c < condNum; c++) {
    for (s = 0; s < clothNames.length; s++) {
        conditions.push(s)
    }
}
conditions = shuffle(conditions);

// Determine location shift based on HTML file version
var path = window.location.pathname;
var page = path.split("/").pop();
var isV1 = page.includes('v1.html'); //only size variation
var isV2 = page.includes('v2.html'); //size variation and location shift

expSpecificParams = {
    conversionFactor: 3,
    gridX: 4,
    gridY: 4,
    fps: 60,
    cycleNum: 3,
    minSizeFactor: 1.6,
    maxSizeFactor: 7.3,
    sizeChangingScalingFactor: 1.75,
    referenceScreenDiagonal: 1509,
    pixelsPerDegree: 50,
    frameDur: 100,
    dotSize: 3,
    sizeVariationEnabled: true,
    locationShiftEnabled: isV2,
    locationShiftAreaRadius: 200,
    minLocationShift: 20,
}

/*=====================
DATE & FOLDER NAMES
=====================*/
expt_name = page.replace(".html", "");
version = 'p1.3';
save_folder_full = 'data/full/' + expt_name + '';
save_folder_filtered = 'data/filtered/' + expt_name + '';


var today = new Date();
var exp_date = (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();








/*===============================================================
FUNCTIONS
===============================================================*/
function shuffle(array) {
    // Create a copy of the original array
    let shuffledArray = array.slice();
    // Iterate over the array in reverse order
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        // Generate a random index from 0 to i
        const randomIndex = Math.floor(Math.random() * (i + 1));
        // Swap elements at randomIndex and i
        [shuffledArray[i], shuffledArray[randomIndex]] = [shuffledArray[randomIndex], shuffledArray[i]];
    }
    return shuffledArray;
}

// Function to get the variable name based on its value
function getVariableName(value) {
    for (const key in window) {
        if (window[key] === value) {
            return key;
        }
    }
    return null;
}


