(function($) {

	var options = {
		slowTimeout: 2000,
		onConnection: $.noop(),
		onSlowConnection: $.noop(),
		onDeadConnection: $.noop()
	};

	var counter = 0;

	var timeStamps = {};

	var onSend = function(event, xhr, settings) {
		xhr.identifier = ++counter;
		timeStamps[xhr.identifier] = event.timeStamp;
	};

	var onSuccess = function(event, xhr, settings) {
		if (event.timeStamp > timeStamps[xhr.identifier] + options.slowTimeout) {
			options.onSlowConnection(xhr.responseText);
		} else {
			options.onConnection(xhr.responseText);
		}
	};

	var onError = function(event, xhr, settings) {
		if (xhr.statusText == 'timeout') {
			options.onDeadConnection(xhr.statusText);
		}
	};

	var $doc = $(document);

	var methods = {

		init: function(opts) {
			$.extend(options, opts);	
		},

		start: function() {
			$doc.ajaxSend(onSend);

			$doc.ajaxSuccess(onSuccess);

			$doc.ajaxError(onError);
		},

		stop: function() {
			$doc.off('ajaxSend', onSend);
			$doc.off('ajaxSuccess', onSuccess);
			$doc.off('ajaxError', onError);
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