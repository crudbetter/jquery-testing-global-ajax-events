Testing jQuery ajax plugins
================================

### Installation
- `git clone https://github.com/crudbetter/jquery-testing-global-ajax-events.git`
- `npm test`

====

How much of your jQuery code is covered with tests?

How much of your jQuery code lives in `$(document).ready()` callbacks?

Do you test jQuery ajax code?

If your answers to these questions are a variation of "not alot", "alot" and "not really" ask yourself a final question:

Do you find your jQuery code easy to maintain?

Answered no? Read on and hopefully this post will help you.

### The benefits of jQuery plugins

jQuery plugins are a great way to encapsulate behaviour and expose a public API that hides any implementation complexity. We should use them to facilitate improved coverage of our jQuery code with tests that are less brittle to future implementation changes.

The contrived example for this post is a simple connectivity monitor of requests made using `$.ajax`. If a request is successful `onConnectionHandler` is called. If a request is successful but takes longer than a configurable period `onSlowConnectionHandler` is called. If a request times out, i.e. exceeds the `$.ajax` timeout property, `onDeadConnectionHandler` is called. No action is taken if a request fails. The monitor exposes three public methods, `init`, `start` and `stop`. Callbacks allow the monitor to be used flexibly as follows:

```javascript
// cache to minimise DOM querying
var $slowConn = $('#slowConn'); // <div>Remember 56k modems?</div>
var $deadConn = $('#deadConn'); // <div>No Internet, the world has ended!</div>

// strictly speaking not a $.fn plugin, but similar concepts apply
$.connectivityMonitor('init', {
    onConnection: function() {
        $slowConn.hide();
        $deadConn.hide();
    },
    onSlowConnection: function() {
        $slowConn.show();
        $deadConn.hide();
    },
    onDeadConnection: function() {
        $slowConn.hide();
        $deadConn.show();
    },
    slowTimeout: 3000 // ideally less than the $.ajax timeout value!
});

// some time later...

$.connectivityMonitor('start');

// some more time later...

$.connectivityMonitor('stop');
```
    

Callbacks also increase the testability of the monitor. With Jasmine we can use spies for the callbacks as follows:

```javascript
describe('connectivityMonitor', function() {
    var slowTimeout = 1500;
    var deadTimeout = 5000;
    // spies to expect against
    var onConnectionHandler = jasmine.createSpy();
    var onSlowConnectionHandler = jasmine.createSpy();
    var onDeadConnectionHandler = jasmine.createSpy();

    // init once for the entire suite
    $.connectivityMonitor('init', {
        onConnection: onConnectionHandler,
        onSlowConnection: onSlowConnectionHandler,
        onDeadConnection: onDeadConnectionHandler,
        slowTimeout: slowTimeout
    });

    beforeEach(function() {
        $.connectivityMonitor('start');
    });

    afterEach(function() {
        $.connectivityMonitor('stop');
    });

    describe('etc', function() {
        // ...
    });

    describe('etc', function() {
        // ...
    });
});
```

## Dont' mock `$.ajax`!

The respected software craftsman Uncle Bob blogged earlier this year ["When to mock"][1]. I strongly recommend adding it to your reading list. One of his principle heuristics for deciding when to mock is as follows:

> Mock across architecturally significant boundaries, but not within those boundaries.

In our example the system boundary is the native `XmlHttpRequest` object and not `$.ajax`.

```javascript
// mock using something like this
window.XMLHttpRequest = {
    onreadystatechange: function () {},
    send: function () {
        this.onreadystatechange();
    },
    respondWith: function () {
        this.onreadystatechange();
    }
};

// rather than something like this
$.ajax = function (params) {
    params.success(/* data */{}, "statusText", /* jqXHR */{});
};
```

As it happens Jasmine has an excellent ajax plugin that does this in a feature complete manner. Let's explore how to use it.

### Using the jasmine-ajax plugin to mock the native `XmlHttpRequest` object

Let's start with the simplest useful test for the monitor, a request succeeds.

In the `beforeEach` callback we now call `jasmine.Ajax.install()` in addition to `$.connectivityMonitor('start')`. The test is as follows:

```javascript
describe('when any ajax request succeeds', function() {

    it('should call onConnection callback', function() {
        $.ajax('/some/url', { timeout: deadTimeout });

        // make the XmlHttpRequest object respond
        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 200,
            "contentType": 'text/plain',
            "responseText": 'success'
        });

        expect(onConnectionHandler).toHaveBeenCalledWith('success');
    });
});
```

### Using the Jasmine Clock to mock the native `Date.now` function

For some reason jQuery caches a local reference to the browsers native `Date.now` function. `$.now` is used by jQuery to generate the `timeStamp` property of `Event` objects created during event triggering. `$.connectivityMonitor` uses the `timeStamp` property.

Installing the Jasmine Clock with additional date mocking capability allows us to deterministically control the return value of `Date.now()`. However it is installed (in `beforeEach`) after jQuery has cached it's local reference.

As a result our `beforeEach` callback is now as follows:

```javascript
beforeEach(function() {
    jasmine.Ajax.install();

    jasmine.clock().install();
    jasmine.clock().mockDate();

    // reset to the mocked version
    $.now = Date.now;

    $.connectivityMonitor('start');
});
```

Continuing with the next most useful test, a request succeeds exceeding the configurable period, introduces a slight increase in complexity. It is as follows:

```javascript
describe('when any ajax request succeeds exceeding lesser limit', function() {

    it('should call onSlowConnection callback', function() {
        $.ajax('/some/url', { timeout: deadTimeout });

        // tick the browser clock 1 millisecond past limit
        jasmine.clock().tick(slowTimeout + 1);

        // then make the XmlHttpRequest object respond
        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 200,
            "contentType": 'text/plain',
            "responseText": 'success'
        });

        expect(onSlowConnectionHandler).toHaveBeenCalledWith('success');
    });
});
```

The last test involves forcing jQuery to call any `ajaxError` callback with the statusText of 'timeout'.

```javascript
describe('when any ajax request times out', function() {

    it('should call onDeadConnection callback', function() {
        $.ajax('/some/url', { timeout: deadTimeout });

        // tick the browser clock 1 millisecond past limit
        jasmine.clock().tick(deadTimeout + 1);

        // no need to make the XmlHttpRequest object respond

        expect(onDeadConnectionHandler).toHaveBeenCalledWith('timeout');
        expect(onDeadConnectionHandler.calls.count()).toEqual(1);
    });
});
```

## Conclusion

In this post I've highlighted the benefit of jQuery plugins from a testing perspective. I then illustrated how to use Jasmine to test ajax based plugins - explaining along the way why you shouldn't mock `$.ajax`.

 [1]: http://blog.8thlight.com/uncle-bob/2014/05/10/WhenToMock.html
