/*
===============================================================
PARAMS EXP1 - Dynamic
===============================================================
*/
//Experiment Mode// 
debug = false;
var runInstr = true;
var runIntro = true;
//instruction delays
if (debug == false) {
    delay = true;
} else {
    delay = false;
}
/*
===========================
Screen Features
===========================
*/
var screen_color = "black";
//The coordinate for the center of the screen
var w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
var screenCenter = [w / 2, h / 2];
var text_color = 'white';
/*
===========================
Experiment Params
===========================
*/
expSpecificParams = {
    gridX: 4,
    gridY: 4,
    fps: 60,
    cycleNum: 10,
    minSizeFactor: 1.6,
    maxSizeFactor: 7.3,
    sizeChangingScalingFactor: 1.75,
    pixelsPerDegree: 50,
    frameDur: 100,
}

let estTotalRunTime = 3;
let exp_compensation = "$" + (estTotalRunTime * .14).toFixed(2).toString();
let completion_code = 'C17FAMG9';
let forceFullscreen = true;
let study_title = 'What do you see?'

//date
var path = window.location.pathname;
var page = path.split("/").pop();
expt_name = page.replace(".html", "");
version = 'p4.6';
save_folder_full = 'data/' + version + '';
saveFiltered = false;

var today = new Date();
var exp_date = (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();


