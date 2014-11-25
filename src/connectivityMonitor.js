(function($) {

	var options = {
		slowTimeout: 2000,
		onConnection: $.noop(),
		onSlowConnection: $.noop(),
		onDeadConnection: $.noop()
	};

	var counter = 0;

	var timeStamps = {};

	var methods = {

		init: function(opts) {
			$.extend(options, opts);	
		},

		start: function() {
			$(document).ajaxSend(function(event, xhr, settings) {
				xhr.identifier = ++counter;
				timeStamps[xhr.identifier] = event.timeStamp;
			});

			$(document).ajaxSuccess(function(event, xhr, settings) {
				if (event.timeStamp > timeStamps[xhr.identifier] + options.slowTimeout) {
					options.onSlowConnection(xhr.responseText);
				} else {
					options.onConnection(xhr.responseText);
				}
			});

			$(document).ajaxError(function(event, xhr, settings) {
				if (xhr.statusText == 'timeout') {
					options.onDeadConnection(xhr.statusText);
				}
			});
		},

		stop: function() {

		}
	}

	$.connectivityMonitor = function(methodOrOpts) {
		if (methods[methodOrOpts]) {
			return methods[methodOrOpts].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof methodOrOpts === 'object' || !methodOrOpts) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + methodOrOpts + ' does not exist on jQuery.connectivityMonitor');
		}
	};

})(jQuery);