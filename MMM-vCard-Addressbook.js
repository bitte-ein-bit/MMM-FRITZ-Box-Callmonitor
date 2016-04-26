/* global Module */

/* Magic Mirror
 * Module: MMM-vCard-Addressbook
 *
 * By Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

Module.register("MMM-vCard-Addressbook", {

	// Default module config.
	defaults: {
		vCard: false
	},

	notificationReceived: function(notification, payload, sender) {
		if (notification === "PHONE_LOOKUP") {
			this.sendSocketNotification("PHONE_LOOKUP", {number: payload.number, reason: payload.reason, sender: sender.name});
		}
	},

	// Override socket notification handler.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "PHONE_LOOKUP_RESULT") {
			this.sendNotification("PHONE_LOOKUP_RESULT", payload);
		}
	},

	start: function() {
		//Send config to the node helper
		this.sendSocketNotification("CONFIG", this.config);
		Log.info("Starting module: " + this.name);
	},

});
