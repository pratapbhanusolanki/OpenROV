(function (window, $, undefined) {
    'use strict';

    var ROVpilot;

    ROVpilot = function ROVpilot(cockpit) {
        console.log("Loading ROVpilot plugin in the browser.");

        // Instance variables
        this.cockpit = cockpit;
        this.power = .1; //default to mid power
        this.vtrim = 0; //default to no trim
        this.ttrim = 0;
        this.tilt = 0;
        this.light = 0;
	this.sendToROVEnabled = true;
        this.positions = {
            throttle: 0,
            yaw: 0,
            lift: 0
        };
        this.sendUpdateEnabled = true;
        var SAMPLE_PERIOD = 1000 / CONFIG.sample_freq; //ms
	var trimHeld = false;

	this.priorControls = {};

        // Add required UI elements
        $("#menu").prepend('<div id="example" class="hidden">[example]</div>');
	$("#footercontent").prepend(
		    '<div class="span1 pull-left"> \
			<h6>Thrust&nbsp;Factor</h6><div class="label badge" id="thrustfactor">&nbsp;</div> \
		    </div>');
	$('#keyboardInstructions').append('<p>press <i>i</i> to toggle lights</p>');
	$('#keyboardInstructions').append('<p>press <i>[</i> to enable ESCs</p>');
    $('#keyboardInstructions').append('<p>press <i>]</i> to disable ESCs</p>');
    $('#keyboardInstructions').append('<p>press <i>m</i> to toggle heading hold (BETA)</p>');
    $('#keyboardInstructions').append('<p>press <i>n</i> to toggle depth hold (BETA)</p>');
    $('#navtoolbar').append('<li><a href="#" id="gamepad" class="hidden"><img id="gamepadPopover" src="themes/OpenROV/img/gamepad.png" rel="popover"></a></li>');

        var self = this;
        setInterval(function() {
            self.sendPilotingData();
        }, SAMPLE_PERIOD);

        this.listen();
	$("#thrustfactor").text(2);

    };

    //This pattern will hook events in the cockpit and pull them all back
    //so that the reference to this instance is available for further processing
    ROVpilot.prototype.listen = function listen() {
        var rov = this;

	cockpitEventEmitter.on("gamepad.connected",function(){
	    $('#gamepad').toggleClass('hidden',false);
	});

	cockpitEventEmitter.on("gamepad.disconnected",function(){
	    $('#gamepad').toggleClass('hidden',true);
	});


	GAMEPAD.DPAD_UP 	= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.adjustLights',.1)} };
	GAMEPAD.DPAD_DOWN	= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.adjustLights',-.1)} };
	GAMEPAD.Y		= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.adjustCameraTilt',.1)} };
	GAMEPAD.B		= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.setCameraTilt',0)} };
	GAMEPAD.A		= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.adjustCameraTilt',-.1)} };
	GAMEPAD.RB		= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.toggleAllTrimHold')} };
	GAMEPAD.START		= {BUTTON_DOWN: function(){cockpitEventEmitter.emit('rovpilot.incrimentPowerLevel')} };

	GAMEPAD.LEFT_STICK_X	= {AXIS_CHANGED: function(v){cockpitEventEmitter.emit('rovpilot.setYaw',v)} };
	GAMEPAD.LEFT_STICK_Y	= {AXIS_CHANGED: function(v){cockpitEventEmitter.emit('rovpilot.setThrottle',-1*v)} };
	GAMEPAD.RIGHT_STICK_Y	= {AXIS_CHANGED: function(v){cockpitEventEmitter.emit('rovpilot.setLift',-1*v)} };

        KEYS[32] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.allStop')}};// space (all-stop)
        KEYS[38] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setThrottle',1)},
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setThrottle',0)}}; // up  (forward)
        KEYS[40] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setThrottle',-1)},
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setThrottle',0)}};  // down (aft)
        KEYS[37] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setYaw',-1)},
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setYaw',0)}};// left (turn left)
        KEYS[39] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setYaw',1)},
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setYaw',0)}};// right (turn right)
        KEYS[16] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setLift',-1)},// shift (lift up)
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setLift',0)}};
        KEYS[17] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setLift',1)}, //ctrl (lift down)
                    keyup:   function(){ cockpitEventEmitter.emit('rovpilot.setLift',0)}};
        KEYS[49] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerLevel',1)}}; //1
        KEYS[50] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerLevel',2)}}; //2
        KEYS[51] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerLevel',3)}}; //3
        KEYS[52] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerLevel',4)}}; //4
        KEYS[53] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerLevel',5)}}; //5
        KEYS[55] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustVerticleTrim',1)}}; //7 (vtrim)
        KEYS[56] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustVerticleTrim',-1)}}; //8 (vttrim)
        KEYS[57] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustThrottleTrim',-1)}}; //9 (ttrim -)
        KEYS[48] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustThrottleTrim',1)}}; //0 (ttrim +)
        KEYS[81] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustCameraTilt',.1)}}; //Q (tilt up)
        KEYS[65] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.setCameraTilt',0)}};  //A (tilt fwd)
        KEYS[90] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustCameraTilt',-.1)}}; //Z (tilt down)
        KEYS[80] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustLights',.1)}}; //p (brightness up)
        KEYS[79] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.adjustLights',-.1)}}; //o (brightness down)
        KEYS[76] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.toggleLasers');}}; //l (laser toggle)
        //KEYS[73] = {keydown: function(){ rov.toggleLights();}}; //i (laser lights)
	KEYS[73] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.toggleLights');}}; //i (laser lights)
	KEYS[219] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerOnESCs');}}; //[
	KEYS[221] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.powerOffESCs');}}; //]
	KEYS[77] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.toggleholdHeading');}};  //m
	KEYS[78] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.toggleholdDepth');}};  //n
    KEYS[83] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.enable_autopilot');}};  //s
    KEYS[80] = {keydown: function(){ cockpitEventEmitter.emit('rovpilot.disable_autopilot');}};  //p

	cockpitEventEmitter.on('rovpilot.allStop',function(){ rov.allStop()});
	cockpitEventEmitter.on('rovpilot.setThrottle',function(v){ rov.setThrottle(v)});
	cockpitEventEmitter.on('rovpilot.setYaw',function(v){ rov.setYaw(v)});
	cockpitEventEmitter.on('rovpilot.setLift',function(v){ rov.setLift(v)});
	cockpitEventEmitter.on('rovpilot.powerLevel',function(v){ rov.powerLevel(v)});
	cockpitEventEmitter.on('rovpilot.adjustVerticleTrim',function(v){ rov.adjustVerticleTrim(v)});
	cockpitEventEmitter.on('rovpilot.adjustThrottleTrim',function(v){ rov.adjustThrottleTrim(v)});
	cockpitEventEmitter.on('rovpilot.adjustCameraTilt',function(v){ rov.adjustCameraTilt(v)});
	cockpitEventEmitter.on('rovpilot.setCameraTilt',function(v){ rov.setCameraTilt(v)});
	cockpitEventEmitter.on('rovpilot.adjustLights',function(v){ rov.adjustLights(v)});
	cockpitEventEmitter.on('rovpilot.toggleLasers',function(v){ rov.toggleLasers()});
	cockpitEventEmitter.on('rovpilot.toggleLights',function(v){ rov.toggleLights()});
	cockpitEventEmitter.on('rovpilot.incrimentPowerLevel', function(){ rov.incrimentPowerLevel()});
	cockpitEventEmitter.on('rovpilot.powerOnESCs', function(){ rov.powerOnESCs()});
	cockpitEventEmitter.on('rovpilot.powerOffESCs', function(){ rov.powerOffESCs()});
	cockpitEventEmitter.on('rovpilot.toggleholdHeading', function(){ rov.toggleholdHeading()});
	cockpitEventEmitter.on('rovpilot.toggleholdDepth', function(){ rov.toggleholdDepth()});
	cockpitEventEmitter.on('rovpilot.manualMotorThrottle', function(p,v,s){ rov.manualMotorThrottle(p,v,s)});
	cockpitEventEmitter.on('rovpilot.disable', function(){rov.disablePilot()});
	cockpitEventEmitter.on('rovpilot.enable', function(){rov.enablePilot()});
    cockpitEventEmitter.on('rovpilot.enable_autopilot', function(){rov.enableAutoPilot()});
    cockpitEventEmitter.on('rovpilot.disable_autopilot', function(){rov.disableAutoPilot()});
    };

    var lastSentManualThrottle = new Object();
    lastSentManualThrottle.port = 0;
    lastSentManualThrottle.vertical = 0;
    lastSentManualThrottle.starbord = 0;

    ROVpilot.prototype.disablePilot = function disablePilot(){
	this.sendToROVEnabled = false;
	console.log("disabled rov pilot.");
    };

    ROVpilot.prototype.enablePilot = function enablePilot(){
	this.sendToROVEnabled = true;
	console.log("enabled rov pilot.");
    };

    ROVpilot.prototype.manualMotorThrottle = function manualMotorThrottle(port,vertical,starbord){
	var maxdiff = 0;
	maxdiff = Math.max(maxdiff,Math.abs(port-lastSentManualThrottle.port));
	maxdiff = Math.max(maxdiff,Math.abs(vertical-lastSentManualThrottle.vertical));
	maxdiff = Math.max(maxdiff,Math.abs(starbord-lastSentManualThrottle.starbord));
	if (vertical < 0) vertical = vertical*2; //make up for async props

	if (maxdiff > .001) {

//	    this.cockpit.socket.emit('motor_test', {
//		port: 1500 + (-port * 500),
//		starbord: 1500 + (-starbord * 500),
//		vertical: 1500 + (vertical * 500)
//	    });

	    this.cockpit.socket.emit('motor_test', {
		port: -port * this.power ,
		starbord: -starbord * this.power,
		vertical: vertical * this.power
	    });

	    lastSentManualThrottle.port = port;
	    lastSentManualThrottle.vertical = vertical;
	    lastSentManualThrottle.starbord = starbord;
	}
    }

    ROVpilot.prototype.setCameraTilt = function setCameraTilt(value){
        this.tilt=value;
        if (this.tilt > 1) this.tilt =1;
        if (this.tilt < -1) this.tilt = -1;
        this.cockpit.socket.emit('tilt_update',this.tilt);
    };

    ROVpilot.prototype.adjustCameraTilt = function adjustCameraTilt(value){
        this.tilt+=value;
        this.setCameraTilt(this.tilt);
    };

    ROVpilot.prototype.setLights = function setLights(value){
	this.light = value;
	if (this.light>1) this.light = 1;
	if (this.light<0) this.light = 0;
        this.cockpit.socket.emit('brightness_update',this.light);
    };

    ROVpilot.prototype.adjustLights = function adjustLights(value){
        if (this.light==0 && value<0){ //this code rounds the horn so to speak by jumping from zero to max and vise versa
	  this.light = 0; //disabled the round the horn feature
	} else if (this.light==1 && value>0){
	  this.light = 1; //disabled the round the horn feature
	} else {
	  this.light += value;
	}
	this.setLights(this.light);
    };

    ROVpilot.prototype.toggleLasers = function toggleLasers(){
        this.cockpit.socket.emit('laser_update');
    };

    ROVpilot.prototype.toggleLights = function toggleLights(){
        if (this.light>0) {
	    this.setLights(0);
	} else {
	    this.setLights(1);
	}
    };

     ROVpilot.prototype.toggleholdHeading = function toggleholdHeading(){
        this.cockpit.socket.emit('holdHeading_toggle');
    };

     ROVpilot.prototype.toggleholdDepth = function toggleholdDepth(){
        this.cockpit.socket.emit('holdDepth_toggle');
    };

    ROVpilot.prototype.enableAutoPilot = function enableAutoPilot(){
        this.cockpit.socket.emit('auto_pilot_on');
    };

    ROVpilot.prototype.disableAutoPilot = function disableAutoPilot(){
        this.cockpit.socket.emit('auto_pilot_off');
    };

    ROVpilot.prototype.powerOnESCs = function powerOnESCs(){
        this.cockpit.socket.emit('escs_poweron');
    };

    ROVpilot.prototype.powerOffESCs = function powerOffESCs(){
        this.cockpit.socket.emit('escs_poweroff');
    };

    ROVpilot.prototype.adjustVerticleTrim = function adjustVerticleTrim(value){
        this.vtrim+=value;
        this.positions.lift = (1/1000)*this.vtrim;
    };

    ROVpilot.prototype.adjustThrottleTrim = function adjustThrottleTrim(value){
        this.ttrim+=value;
        this.positions.throttle = (1/1000)*this.ttrim;
    };

    ROVpilot.prototype.toggleAllTrimHold = function toggleAllTrimHold(){
	trimHeld = !bool;
	if (trimHeld) {
	    this.ttrim=positions.throttle;
	    this.vtrim=positions.throttle;
	}
    };

    ROVpilot.prototype.setThrottle = function setThrottle(value){
        this.positions.throttle = value;
        if (value==0) this.positions.throttle = this.ttrim;
    };

    ROVpilot.prototype.setLift = function setLift(value){
        this.positions.lift = value;
        if (value==0) this.positions.lift = this.vtrim;
    };

    ROVpilot.prototype.setYaw = function setYaw(value){
        this.positions.yaw = value;
    };

    ROVpilot.prototype.incrimentPowerLevel = function incrimentPowerLevel(){
	var currentPowerLevel = $("#thrustfactor").text();
	currentPowerLevel++;
	if (currentPowerLevel>5) currentPowerLevel = 1;
	this.powerLevel(currentPowerLevel);
    }

    ROVpilot.prototype.powerLevel = function powerLevel(value){
        switch(value){
            case 1:
                this.power = .05
            break;
            case 2:
                this.power = .1
            break;
            case 3:
                this.power = .2
            break;
            case 4:
                this.power = .5
            break;
            case 5:
                this.power = 1
            break;
        }
	$("#thrustfactor").text(value);
    };

    ROVpilot.prototype.allStop = function allStop(){
        this.vtrim = 0;
        this.ttrim = 0;
        this.positions.throttle = 0;
        this.positions.yaw = 0;
        this.positions.lift = 0;
    };

    ROVpilot.prototype.sendPilotingData = function sendPilotingData(){
        var positions = this.positions;
	var updateRequired = false;  //Only send if there is a change
        var controls = {};

 	controls.throttle = positions.throttle * this.power;
	controls.yaw = positions.yaw;
	controls.lift = positions.lift * this.power;
        for(var i in positions) {

	    if (controls[i] != this.priorControls[i])
	    {
                updateRequired = true;
	    }
	}

        if((this.sendUpdateEnabled && updateRequired)||(this.sendToROVEnabled==false)){
	    if (this.sendToROVEnabled) {
		this.cockpit.socket.emit('control_update', controls);

	    }
	    cockpitEventEmitter.emit('rovpilot.control_update',controls);
	    this.priorControls = controls;
        };
    }

    window.Cockpit.plugins.push(ROVpilot);

}(window, jQuery));
