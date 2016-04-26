/* global Module */

/* Magic Mirror
 * Module: MMM-FRITZ-Box-Callmonitor
 *
 * By Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

Module.register("MMM-FRITZ-Box-Callmonitor", {

	// Default module config.
	defaults: {
		numberFontSize: 30,
		fritzIP: "192.168.178.1",
		fritzPort: 1012,
		minimumCallLength: 0,
		maximumCallDistance: 60,
		maximumCalls: 5,
		fade: true,
		fadePoint: 0.25,
		addressbookPrio: {
			"MMM-vCard-Addressbook": 10,
			"MMM-iCloud-Client": 5
		}
	},

	// Define required translations.
	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	getScripts: function() {
		return ["moment.js"];
	},

	notificationReceived: function(notification, payload, sender) {
		if (notification === "PHONE_LOOKUP_RESULT") {

			if (payload.resolved == true) {
				// repack payload
				var info = {
					sender: sender,
					name: payload.name,
					label: payload.label,
					number:  payload.request
				};
				// See if Number is known, if it does check where the entry is from
				if (payload.request in this.lookedUpNumbers) {
					if (this.lookedUpNumbers[payload.request].sender === sender) {
						// info is from same source, let's just update our data
						this.lookedUpNumbers[payload.request] = info;
					} else {
						var senderPrio = 0;
						var savedPrio = 0;
						// info is from diffrent source, check prios
						if (sender in this.config.addressbookPrio) {
							senderPrio = this.config.addressbookPrio[sender];
						}
						if (this.lookedUpNumbers[payload.request].sender  in this.config.addressbookPrio) {
							savedPrio = this.config.addressbookPrio[this.lookedUpNumbers[payload.request].sender];
						}
						if (savedPrio < senderPrio) {
							this.lookedUpNumbers[payload.request] = info;
						}
					}
				} else {
					this.lookedUpNumbers[payload.request] = info;
				}
			}

			this.sendNotification("SHOW_ALERT", {
				title: this.translate("title"),
				message: "<span style='font-size:" + this.config.numberFontSize.toString() + "px'>" + this.resolveNumberLocally(payload.request) + "<span>",
				imageFA: "phone"
			});
			//Set active Alert to current call
			this.activeAlert = payload.request;
		}
	},

	resolveNumberLocally: function(number) {
		if (number in this.lookedUpNumbers) {
			return this.lookedUpNumbers[number].name;
		} else {
			return number;
		}
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "call") {
			// Do lookup of number via broadcast
			this.sendNotification("PHONE_LOOKUP", payload.caller);
		}
		if (notification === "connected") {
			//Send notification for currentCall module
			this.sendNotification("CALL_CONNECTED", payload.caller);

			//Remove alert only on connect if it is the current alert shown
			if (this.activeAlert === payload.caller) {
				//Remove alert from UI when call is connected
				this.sendNotification("HIDE_ALERT");
				this.activeAlert = null;
			}
		}
		if (notification === "disconnected") {
			//Send notification for currentCall module
			this.sendNotification("CALL_DISCONNECTED", payload.caller);

			//Add call to callHistory (timestamp and caller) or if minimumCallLength is set only missed calls
			if (payload.duration <= this.config.minimumCallLength) {
				this.callHistory.push({"time": moment(), "caller": payload.caller});
			}
			//Update call list on UI
			this.updateDom(3000);

			//Remove alert only on disconnect if it is the current alert shown
			if (this.activeAlert === payload.caller) {
				//Remove alert from UI when call is connected
				this.sendNotification("HIDE_ALERT");
				this.activeAlert = null;
			}
		}

	},

	start: function() {
		//Create callHistory array
		this.callHistory = [];
		this.lookedUpNumbers = [];
		this.activeAlert = null;
		//Set helper variable this so it is available in the timer
		var self = this;
		//Update doom every minute so that the time of the call updates and calls get removed after a certain time
		setInterval(function() {
			self.updateDom();
		}, 60000);

		//Send config to the node helper
		this.sendSocketNotification("CONFIG", this.config);
		Log.info("Starting module: " + this.name);
	},

	getDom: function() {
		//For each call in callHistory
		for (var i = 0; i < this.callHistory.length; i++) {
			//Check if call is older than maximumCallDistance
			if (moment(moment()).diff(moment(this.callHistory[i].time)) > this.config.maximumCallDistance * 60000) {
				//is older -> remove from list
				this.callHistory.splice(i, 1);
			}
		}
		//get latest x calls configured by maximumCalls
		var calls = this.callHistory.slice(this.callHistory.length - this.config.maximumCalls, this.callHistory.length);

		//Create table
		var wrapper = document.createElement("table");
		//set table style
		wrapper.className = "small";

		//If there are no calls, set "noCall" text.
		if (calls.length === 0) {
			wrapper.innerHTML = this.translate("noCall");
			wrapper.className = "xsmall dimmed";
			return wrapper;
		}

		//For each call in calls
		for (var i = 0; i < calls.length; i++) {

			//Create callWrapper
			var callWrapper = document.createElement("tr");
			callWrapper.className = "normal";

			//Set caller of row
			var caller =  document.createElement("td");
			caller.innerHTML = this.resolveNumberLocally(calls[i].caller);
			caller.className = "title bright";
			callWrapper.appendChild(caller);

			//Set time of row
			var time =  document.createElement("td");
			time.innerHTML = moment(calls[i].time).fromNow();
			time.className = "time light xsmall";
			callWrapper.appendChild(time);

			//Add to wrapper
			wrapper.appendChild(callWrapper);

			// Create fade effect by MichMich (MIT)
			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = calls.length * this.config.fadePoint;
				var steps = calls.length - startingPoint;
				if (i >= startingPoint) {
					var currentStep = i - startingPoint;
					callWrapper.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
			// End Create fade effect by MichMich (MIT)
		}
		return wrapper;
	}

});
