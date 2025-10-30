
/** Merve Erdogan **/
// Point-light cloths //
/*

/*
===============================================================
INSTRUCTIONS
===============================================================
*/
function loadInstrContentStart() {
    var instrContentStart = [/* ind0 */ '<p>Hello! Thank you for volunteering to help out with our study. Please take a moment to adjust your seating so that you can comfortably watch the monitor and use the keyboard. Feel free to dim the lights as well.</p><p>Close the door or do whatever is necessary to <b>minimize disturbance during the experiment</b>. Please also take a moment to silence your phone so that you are not interrupted by any messages mid-experiment. Do <i>not</i> switch to any other tabs or windows until you are complete.</p><p>We will now go over the instructions. Please <strong>read these carefully</strong>, as you will not be able to complete this experiment without following them precisely.  <br> <br> A “Next” button will appear at the bottom of the screen on each page. This button will be greyed out at the beginning and will be activated after a few seconds (giving you time to read the instructions on each page). Please read everything on each page carefully before clicking on the "Next" button to continue to the next page.</p>',
        /* ind1 */ 'This experiment will be especially short and simple. We will show you a short movie (of approximately 30 seconds) containing a bunch of white dots moving on a black background, after which we will ask you some questions about what you saw. We are just interested in what the display looks like to you, so you don’t need to do anything except to watch the movie carefully. Once you click on the “Next” button below, the movie will immediately start playing. So, please be ready before you click the “Next” button.</p>',
    ]

    for (var i = 0; i < instrContentStart.length; i++) {
        instrContentStart[i] = "<div style='display: inline-block; margin: 0 auto; color: " + text_color + "; padding: 10px 200px 10px 200px; text-align: left'>" + instrContentStart[i] + "</div>"
    }
    return instrContentStart
}

var open_q = {
    type: 'survey-html-form',
    html: description_question(),
    data: { trial_category: 'description_question' },
    on_finish: function (data) {
        data.open_response = data.response.description;
    }

}

var prev_exposure_q = {
    type: 'survey-html-form',
    html: prev_exposure_check(),
    data: { trial_category: 'prev_exposure_check' },
    on_finish: function (data) {
        data.prev_exposure = data.response.prev_exposure;
    }
}


function description_question() {
    var question = "<div style='color:" + text_color + "; display: flex;  width: 100vh; justify-content: center; align-items: center; height: 100vh;'>" +
        '<div style="text-align: center;">' +
        'What did the display look like?<p>The movie you just saw contained a bunch of white dots moving on a black background. As we mentioned earlier, we are interested in <strong>what the display looked like to you</strong>. Please describe what the display looked like in <strong>one or two sentences</strong>, so that another person could readily imagine it.<p>Once you are done with writing, please press the "Enter" key to proceed.</p><input name="description" type="text" size="50" style="width: 100%; border-radius: 4px; padding: 10px; border: 1px solid #ccc; font-size: 15px; margin: 8px 0;" required></div></div > ';
    return question;
}

function prev_exposure_check() {
    var question = "<div style='color:" + text_color + "; display: flex;  width: 100vh; justify-content: center; align-items: center; height: 100vh;'>" +
        '<div style="text-align: center;">' +
        'Did you participate in any study with a display like this one (with white dots on a black background maybe forming an object moving or a person walking) before? <p>Once you are done with writing, please press the "Enter" key to proceed. </p><input name="prev_exposure" type="text" size="50" style="width: 100%; border-radius: 4px; padding: 10px; border: 1px solid #ccc; font-size: 15px; margin: 8px 0;" required></div></div>';
    return question;
}

/*===============================================================
               INSTRUCTION PROCEDURE
===============================================================
*/


var instrContentStart = loadInstrContentStart();
var instr_start = {
    type: 'instructions',
    pages: instrContentStart,
    allow_keys: false,
    show_clickable_nav: true,
    button_delay: delay,
    allow_backward: false,
    data: { trial_category: 'Other' },
};



