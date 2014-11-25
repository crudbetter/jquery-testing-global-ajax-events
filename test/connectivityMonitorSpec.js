describe('connectivityMonitor', function() {
	var slowTimeout = 1500;
	var deadTimeout = 5000;
	var onConnectionHandler = jasmine.createSpy();
	var onSlowConnectionHandler = jasmine.createSpy();
	var onDeadConnectionHandler = jasmine.createSpy();

	$.connectivityMonitor('init', {
		onConnection: onConnectionHandler,
		onSlowConnection: onSlowConnectionHandler,
		onDeadConnection: onDeadConnectionHandler,
		slowTimeout: slowTimeout
	});

	beforeEach(function() {
		jasmine.Ajax.install();
		
		jasmine.clock().install();
		jasmine.clock().mockDate();

		// jQuery caches a local copy of Date.now which we need to reset
		$.now = Date.now;

		onConnectionHandler.calls.reset();
		onSlowConnectionHandler.calls.reset();
		onDeadConnectionHandler.calls.reset();

		$.connectivityMonitor('start');
	});

	afterEach(function() {
		jasmine.Ajax.uninstall();

		jasmine.clock().uninstall();

		$.connectivityMonitor('stop');
	});

	describe('when any ajax request succeeds', function() {

		it('should call onConnection callback', function() {
			$.ajax('/some/url', { timeout: deadTimeout });

			jasmine.Ajax.requests.mostRecent().respondWith({
				"status": 200,
				"contentType": 'text/plain',
				"responseText": 'success'
			});

			expect(onConnectionHandler).toHaveBeenCalledWith('success');
			expect(onConnectionHandler.calls.count()).toEqual(1);
		});
	});

	describe('when any ajax request succeeds exceeding lesser limit', function() {

		it('should call onSlowConnection callback', function() {
			$.ajax('/some/url', { timeout: deadTimeout });
			
			jasmine.clock().tick(slowTimeout + 1);

			jasmine.Ajax.requests.mostRecent().respondWith({
				"status": 200,
				"contentType": 'text/plain',
				"responseText": 'success'
			});

			expect(onSlowConnectionHandler).toHaveBeenCalledWith('success');
			expect(onSlowConnectionHandler.calls.count()).toEqual(1);
		});
	});

	describe('when any ajax request times out', function() {

		it('should call onDeadConnection callback', function() {
			$.ajax('/some/url', { timeout: deadTimeout });

			jasmine.clock().tick(deadTimeout + 1);

			expect(onDeadConnectionHandler).toHaveBeenCalledWith('timeout');
			expect(onDeadConnectionHandler.calls.count()).toEqual(1);
		});
	});

	describe('when any ajax request fails', function() {

		it('should not call any callback', function() {
			$.ajax('/some/url', { timout: deadTimeout });

			jasmine.Ajax.requests.mostRecent().respondWith({
				"status": 500
			});

			expect(onConnectionHandler).not.toHaveBeenCalled();
			expect(onSlowConnectionHandler).not.toHaveBeenCalled();
			expect(onDeadConnectionHandler).not.toHaveBeenCalled();
		});
	});
});