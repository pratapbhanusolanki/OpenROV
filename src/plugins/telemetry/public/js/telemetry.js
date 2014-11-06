(function (window, $, undefined) {
    'use strict';

    var Telemetry;

    Telemetry = function Telemetry(cockpit) {
        console.log("Loading Telemetry plugin in the browser.");

        // Instance variables
        this.cockpit = cockpit;
	this.telemetry = new Object();
	this.importantTelemetry = new Object();


        // Add required UI elements
	$("#rov_status_panel").append(
                '<div id="telemetry" class="controller well well-small" >\
		    <ul>\
		       <li id="TelemetryList">\
		       </li>\
		    </ul>\
		</div>');
	$('#keyboardInstructions').append('<p><i>h</i> to cycle text color of telemetry</p>');


	var self = this;
        setInterval(function(){self.displayTelemetry();}, 1000);	
        // Register the various event handlers
        this.listen();

    };
    
    //This pattern will hook events in the cockpit and pull them all back
    //so that the reference to this instance is available for further processing
    Telemetry.prototype.listen = function listen() {
        var self = this;

	this.cockpit.socket.on('status', function(data) {
            self.logStatusData(data);
        });
	
	var textcolor = 0;
	KEYS[72] = {keydown: function(data) {  //h
		textcolor+=5;
		if (textcolor > 255) {
		    textcolor=0;
		}
		$('#TelemetryList')[0].style.color="rgb("+textcolor+","+textcolor+",255)";
	    }
	};
	
	$('#TelemetryList')[0].addEventListener("click", function(e){self.handleDescendantEvent(e)}, true);

    };
    
    Telemetry.prototype.handleDescendantEvent = function handleDescendantEvent(e) {
	if (e.type == "click" && e.eventPhase == Event.CAPTURING_PHASE) {
	   var telemetry_name = e.target.innerText.split(' ')[0];
	   if (this.importantTelemetry[telemetry_name] ===true) {
		this.importantTelemetry[telemetry_name] =false;
	   }else{
	    this.importantTelemetry[telemetry_name] =true;
	   }

	}
    };

    Telemetry.prototype.logStatusData = function logStatusData(data){
	for (var i in data){
	  this.telemetry[i] = data[i];
	};
   };

    Telemetry.prototype.displayTelemetry = function displayTelemetry(){
	var fragment = document.createDocumentFragment();
	
	for (var item in this.telemetry){
	  if (this.telemetry.hasOwnProperty(item)) {
	    var li = document.createElement("LI");
	    li.appendChild(document.createElement("SPAN").appendChild(document.createTextNode(item+" ")));
	    li.appendChild(document.createElement("SPAN").appendChild(document.createTextNode(this.telemetry[item])));
	    //if (this.importantTelemetry.hasOwnProperty(item)) {
	    if (this.importantTelemetry[item]===true) {
		li.setAttribute("class","important");
	    }
	    fragment.appendChild(li);
	  }
	}
	$('#TelemetryList').empty();
	$('#TelemetryList')[0].appendChild(fragment.cloneNode(true));
		
   };

    window.Cockpit.plugins.push(Telemetry);

}(window, jQuery));
