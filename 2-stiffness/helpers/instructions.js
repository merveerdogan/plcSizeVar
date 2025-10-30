/** Merve Erdogan **/
// PLC - stiffness experiment//

/*
===============================================================
EXP-SPECIFIC INSTRUCTION TEXTS
===============================================================
*/

// Welcome text
var welcomeText = [
    '<p>Hello! Thank you for volunteering to help out with our study. Please take a moment to adjust your seating so that you can comfortably watch the monitor and use the keyboard. Feel free to dim the lights as well.</p><p>Close the door or do whatever is necessary to <b>minimize disturbance during the experiment</b>. Please also take a moment to silence your phone so that you are not interrupted by any messages mid-experiment. Do <i>not</i> switch to any other tabs or windows until you are complete.</p><p>We will now go over the instructions.  Please <strong>read these carefully</strong>, as you will not be able to complete this experiment without following them precisely.  <br> <br> A "Next" button will appear at the bottom of the screen on each page. This button will be greyed out at the beginning and will be activated after a few seconds (giving you time to read the instructions on each page). Please read everything on each page carefully before clicking on the "Next" button to continue to the next page.</p>'
];

// Stiffness introduction text
var stiffnessText = [
    'In this experiment, you will see displays of a cloth waving in the wind. Some of these cloths will be <i>stiffer</i> than others. <p>In the two videos below, for example, you may notice that the cloth on the right looks less stiff than the cloth on the left.</p>'
];

// Task explanation text
var taskExplanationText = [
    'In the actual experiment, you\'re going to see one cloth at a time, and your task will just be to use a slider to indicate how stiff it seemed to be. <p>Please click on the "Next" button to try this out.'
];

// PLC explanation text
var plcExplanationText = 'The actual experiment will be just like this, except that the cloths will be drawn differently – with only a few dots moving at a time, as in this movie below:';

// Size variation explanation text
var sizeVariationText = 'In the actual task, the <i><strong>size</strong></i> of the cloth (presented as an arrangement of dots) will vary rapidly, which will make the cloth look like it is \'blinking\' or is a bit jittery, like this:';

// Text after size variant video
var sizeVariationNoteText = 'This may make the task of reporting the stiffness harder, but please just give it your best try.';

// Location shift explanation text
var locationShiftText = 'Finally, one more detail: the <i><strong>location</strong></i> of the cloth may change between frames, so the cloth will move around the screen. Here\'s an example:';

// Text after location shift video
var locationShiftNoteText = 'This may make the task of reporting the stiffness even harder, but again, please just give it your best try.';

// Final instructions text
var finalInstrText = [
    "The experiment will take approximately " + String(estTotalRunTime) + " minutes. <p>Please try to stay focused through the whole experiment and attend carefully to each display, since some displays will involve subtle differences. I can only benefit from your responses if you focus on the displays and try to give responses as carefully as you can. You can start the experiment by pressing any key."
];

// Video comparison page text
var videoComparisonText = 'In this experiment, you will see displays of a cloth waving in the wind. Some of these cloths will be stiffer than others.  In the two videos below, for example, you may notice that the cloth on the right looks less stiff than the cloth on the left:';

// Slider question text
var sliderQuestionText = 'How stiff does this cloth look? Higher values indicate higher stiffness.';

/*
===============================================================
INSTRUCTION PROCEDURES
===============================================================
*/

pathToVideos = 'stimuli/instructions/';
// Welcome page with setup instructions
var welcomePage = {
    type: 'instructions',
    pages: standard_instr_style(welcomeText),
    allow_keys: false,
    show_clickable_nav: true,
    button_delay: delay,
    allow_backward: false,
    data: { trial_category: 'Other' },
};

// Stiffness comparison with two videos side by side
var stiffnessComparisonPage = {
    type: 'html-button-response',
    stimulus: function () {
        var html = '<div style="color: ' + text_color + '; text-align: center; padding: 20px;">' +
            '<p style="margin-bottom: 40px;">' + videoComparisonText + '</p> ' +
            '<div style="display: flex; justify-content: center; align-items: center; gap: 50px; flex-wrap: wrap;">' +
            '<div style="text-align: center;">' +
            '<video id="moreStiff" autoplay loop muted style="width: 500px; height: 375px;">' +
            '<source src="' + pathToVideos + 'instr_cloth_stiff.mp4" type="video/mp4">' +
            '</video>' +
            '</div>' +
            '<div style="text-align: center;">' +
            '<video id="lessStiff" autoplay loop muted style="width: 500px; height: 375px;">' +
            '<source src="' + pathToVideos + 'instr_cloth_soft.mp4" type="video/mp4">' +
            '</video>' +
            '</div>' +
            '</div></div>';

        // Start videos playing after a short delay
        setTimeout(function () {
            var moreStiff = document.getElementById('moreStiff');
            var lessStiff = document.getElementById('lessStiff');
            if (moreStiff) {
                moreStiff.currentTime = 0;
                moreStiff.play().catch(e => console.log('Video play failed:', e));
            }
            if (lessStiff) {
                lessStiff.currentTime = 0;
                lessStiff.play().catch(e => console.log('Video play failed:', e));
            }
        }, 100);

        return html;
    },
    choices: ['Next'],
    prompt: '',
    data: { trial_category: 'stiffness_comparison_page' },
};

// Task explanation page
var taskExplanationPage = {
    type: 'instructions',
    pages: standard_instr_style(taskExplanationText),
    allow_keys: false,
    show_clickable_nav: true,
    button_delay: delay,
    allow_backward: false,
    data: { trial_category: 'Other' },
};

// Generic cursor helpers (reuse everywhere)
var hideCursor = {
    type: 'call-function',
    func: function () {
        document.body.style.cursor = "none";
    }
};

var lessStiffClothVideo = {
    type: 'video-keyboard-response',
    stimulus: [pathToVideos + 'instr_cloth_soft.mp4'],
    trial_ends_after_video: true,
    width: 700,
    height: 525,
    choices: jsPsych.NO_KEYS,
    data: { trial_category: 'less_stiff_cloth_video' },
};

var showCursor = {
    type: 'call-function',
    func: function () {
        document.body.style.cursor = "auto";
    }
};

// Generic stiffness rating slider (reuse for both examples)
var stiffnessRating = {
    type: 'html-slider-response',
    stimulus: "<div style='display: inline-block; margin: 0 auto; color: " + text_color + "; padding: 10px 200px 10px 200px; text-align: left'>" + sliderQuestionText + "</div>",
    require_movement: true,
    labels: ["1", "100"],
    min: 1,
    max: 100,
    data: { trial_category: 'instruction_slider_test' },
}

// (use hideCursor again before next video)

var moreStiffClothVideo = {
    type: 'video-keyboard-response',
    stimulus: [pathToVideos + 'instr_cloth_stiff.mp4'],
    trial_ends_after_video: true,
    width: 700,
    height: 525,
    choices: jsPsych.NO_KEYS,
    data: { trial_category: 'instruction_page4' },
};

// (use showCursor again after video)

// (reuse stiffnessRating for the second example as well)

// PLC (point-light display) explanation with video
var constantSizePlcDisplay = {
    type: 'html-button-response',
    stimulus: function () {
        var html = '<div style="color: ' + text_color + '; text-align: center; padding: 20px;">' +
            '<p style="margin-bottom: 40px;">' + plcExplanationText + '</p> ' +
            '<video id="plcVideo" autoplay loop muted style="width: 700px; height: 525px; display: block; margin: 0 auto;">' +
            '<source src="' + pathToVideos + 'instr_plc.mp4" type="video/mp4">' +
            '</video>' +
            '</div>';

        // Start video playing after a short delay
        setTimeout(function () {
            var plcVideo = document.getElementById('plcVideo');
            if (plcVideo) {
                plcVideo.currentTime = 0;
                plcVideo.play().catch(e => console.log('Video play failed:', e));
            }
        }, 100);

        return html;
    },
    choices: ['Next'],
    prompt: '',
    data: { trial_category: 'constant_size_plc_display' },
}

// PLC display with size variation - text and video
var sizeVariantPlcDisplay = {
    type: 'html-button-response',
    stimulus: function () {
        var html = '<div style="color: ' + text_color + '; text-align: center; padding: 20px;">' +
            '<p style="margin-bottom: 40px;">' + sizeVariationText + '</p> ' +
            '<video id="sizeVarVideo" autoplay loop muted style="width: 700px; height: 525px; display: block; margin: 0 auto; margin-bottom: 40px;">' +
            '<source src="' + pathToVideos + 'instr_plc_sizeVar.mp4" type="video/mp4">' +
            '</video>' +
            '<p>' + sizeVariationNoteText + '</p>' +
            '</div>';

        // Start video playing after a short delay
        setTimeout(function () {
            var sizeVarVideo = document.getElementById('sizeVarVideo');
            if (sizeVarVideo) {
                sizeVarVideo.currentTime = 0;
                sizeVarVideo.play().catch(e => console.log('Video play failed:', e));
            }
        }, 100);

        return html;
    },
    choices: ['Next'],
    prompt: '',
    data: { trial_category: 'size_variant_plc_display' },
}

// PLC display with location movement - text and video
var locationShiftPlcDisplay = {
    type: 'html-button-response',
    stimulus: function () {
        var html = '<div style="color: ' + text_color + '; text-align: center; padding: 20px;">' +
            '<p style="margin-bottom: 40px;">' + locationShiftText + '</p> ' +
            '<video id="locShiftVideo" autoplay loop muted style="width: 700px; height: 525px; display: block; margin: 0 auto;">' +
            '<source src="' + pathToVideos + 'instr_plc_posVar.mp4" type="video/mp4">' +
            '</video>' +
            '</div>';

        // Start video playing after a short delay
        setTimeout(function () {
            var locShiftVideo = document.getElementById('locShiftVideo');
            if (locShiftVideo) {
                locShiftVideo.currentTime = 0;
                locShiftVideo.play().catch(e => console.log('Video play failed:', e));
            }
        }, 100);

        return html;
    },
    choices: ['Next'],
    prompt: '',
    data: { trial_category: 'location_shift_plc_display' },
}

// Final instructions and experiment start
var finalInstructionsPage = {
    type: 'html-keyboard-response',
    stimulus: standard_instr_style(finalInstrText),
    choices: jsPsych.ALL_KEYS,
    data: { trial_category: 'instruction_final' },
}

/*
===============================================================
COMBINE INTO TIMELINE
===============================================================
*/

instructions = [
    welcomePage,                  // Welcome with setup instructions
    stiffnessComparisonPage,      // Two videos side by side stiffness comparison
    taskExplanationPage,          // Explain the task
    hideCursor,                   // Hide cursor before video
    lessStiffClothVideo,          // Show less stiff cloth video demonstration
    showCursor,                   // Show cursor for rating
    stiffnessRating,              // Rate less stiff cloth
    hideCursor,                   // Hide cursor before video
    moreStiffClothVideo,          // Show more stiff cloth video demonstration
    showCursor,                   // Show cursor for rating
    stiffnessRating,              // Rate more stiff cloth
    constantSizePlcDisplay,       // Show PLC with constant size (text + video)
    sizeVariantPlcDisplay,        // Show PLC with size variation (text + video)
    finalInstructionsPage         // Final instructions and start experiment
]

// Conditionally include location movement page if enabled in params
if (typeof expSpecificParams !== 'undefined' && expSpecificParams.locationShiftEnabled) {
    // Insert before final instructions
    instructions.splice(instructions.length - 1, 0, locationShiftPlcDisplay);
}

