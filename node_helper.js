"use strict";
const NodeHelper = require("node_helper");
const CallMonitor = require("node-fritzbox-callmonitor");

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function() {
		this.started = false;
		console.log("Starting module: " + this.name);
	},

	socketNotificationReceived: function(notification, payload) {
		//Received config from client
		if (notification === "CONFIG") {
			//set config to config send by client
			this.config = payload;
			//if monitor has not been started before (makes sure it does not get started again if the web interface is reloaded)
			if (!this.started) {
				//set started to true, so it won"t start again
				this.started = true;
				console.log("Received config for " + this.name);
				//helper variable so that the module-this is available inside our monitor
				var self = this;
				//Set up CallMonitor with config received from client
				var monitor = new CallMonitor(this.config.fritzIP, this.config.fritzPort);

				//Incoming call
				monitor.on("inbound", function(call) {
					//If caller is not empty
					if (call.caller != "") {
						self.sendSocketNotification("call", {"caller": call.caller});
					};
				});

				//Call accepted
				monitor.on("connected", function(call) {
					self.sendSocketNotification("connected", {"caller": call.caller});
				});

				//Caller disconnected
				monitor.on("disconnected", function(call) {
					//send clear command to interface
					self.sendSocketNotification("disconnected", {"caller": call.caller, "duration": call.duration});
				});
				console.log(this.name + " is waiting for incoming calls.");
			};
		};
	}
});
