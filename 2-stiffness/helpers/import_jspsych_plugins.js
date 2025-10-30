//this file adds plugins from possible folders
var loc = window.location.pathname, //get current directory
    foldernames = loc.split('/'); //get folder name (mac)
if (foldernames == 'undefined') { //pc
    foldernames = src.split('\\');
}
//check the location from one folder name  
for (f = 0; f < foldernames.length; f++) {
    if (foldernames[f] == 'Users') { //local
        //if the file is in merve's local folder, this retracts plugins from the local folder
        // root = "/Users/merve/OneDrive - Yale University/JS_Experiments/jspsych/plugins/"
        root = "/Users/merve/OneDrive - Yale University/Projects/Studies/99-jspsych/plugins/"
    } else if (foldernames[f] == 'ME') { //online 
        //if the file is in the server, this retracts plugins from the server folder
        root = "/ME/jspsych/plugins/"
    }
}


//Modified plugins
makeScriptName('me-instructions', 'me-instructions.js', root)
makeScriptName('video-resp', 'me-jspsych-video-keyboard-response.js', root)
makeScriptName('dot_disp_cl', 'special_plugins/SL_Cl/cloth_dots_display.js', root)

//Plugins  
makeScriptName('preload', 'jspsych-preload.js', root)
makeScriptName('keyResp', 'jspsych-html-keyboard-response.js', root)
makeScriptName('call-function', 'jspsych-call-function.js', root)
makeScriptName('buttonResp', 'jspsych-html-button-response.js', root)
makeScriptName('survey', 'jspsych-survey-html-form.js', root)
makeScriptName('fullScreen', 'jspsych-fullscreen.js', root)
makeScriptName('slider', 'me-html-slider-response.js', root)

function makeScriptName(script_name, plugin, root) {
    source = root + plugin;
    script_name = document.createElement("script")

    //Set src attribute
    script_name.setAttribute("src", source)
    //Append to DOM
    document.head.appendChild(script_name)
}

