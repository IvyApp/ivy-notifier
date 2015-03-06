import Ember from 'ember';
import PusherSocket from 'ivy-notifier/sockets/pusher';
import { module } from 'qunit';
import { test } from 'ember-qunit';

function Subscription(channelName) {
  this.channelName = channelName;
  this.bindings = [];
}

Subscription.prototype = {
  bind: function(eventName, callback) {
    this.bindings.push(eventName);
  },

  unbind: function(eventName, callback) {
    for (var i = this.bindings.length; i >= 0; i--) {
      if (this.bindings[i] !== callback) { continue; }
      this.bindings.splice(i, 1);
    }
  }
};

function Connection() {
  this.bindings = {};
}

Connection.prototype = {
  bind: function(eventName, callback) {
    var eventBindings = this.bindings[eventName];
    if (!eventBindings) {
      eventBindings = this.bindings[eventName] = [];
    }

    eventBindings.push(callback);
  },

  trigger: function(eventName) {
    var eventBindings = this.bindings[eventName];
    if (!eventBindings) { return; }
    for (var i = 0; i < eventBindings.length; i++) {
      eventBindings[i].call(null);
    }
  }
};

function Pusher() {
  this.connection = new Connection();
  this.subscriptions = {};
}

Pusher.prototype = {
  subscribe: function(channelName) {
    return this.subscriptions[channelName] = new Subscription(channelName);
  },

  unsubscribe: function(channelName) {
    delete this.subscriptions[channelName];
  }
};

module('unit/sockets/pusher');

test('a listener can be bound to a socket', function(assert) {
  var count = 0;
  var F = function() { count++; };

  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.bind('channel', 'event', F);
  socket.emit('channel', 'event');

  assert.equal(count, 1, 'the event was triggered');

  socket.emit('channel', 'event');

  assert.equal(count, 2, 'the event was triggered');
});

test('a listener can be unbound from a socket', function(assert) {
  var count = 0;
  var F = function() { count++; };

  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.bind('channel', 'event', F);
  socket.unbind('channel', 'event', F);
  socket.emit('channel', 'event');

  assert.equal(count, 0, 'the event was not triggered');
});

test('a subscriber can subscribe to a socket', function(assert) {
  var count = 0;

  var Subscriber = Ember.Controller.extend({
    actions: {
      event: function() { count++; }
    },

    subscriptions: {
      pusher: {
        channel: { event: 'event' }
      }
    }
  });

  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });
  var subscriber = Subscriber.create();

  socket.subscribe(subscriber);
  socket.emit('channel', 'event');

  assert.equal(count, 1, 'the event was triggered');
});

test('a subscriber can unsubscribe from a socket', function(assert) {
  var count = 0;

  var Subscriber = Ember.Controller.extend({
    actions: {
      event: function() { count++; }
    },

    subscriptions: {
      pusher: {
        channel: { event: 'event' }
      }
    }
  });

  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });
  var subscriber = Subscriber.create();

  socket.subscribe(subscriber);
  socket.unsubscribe(subscriber);
  socket.emit('channel', 'event');

  assert.equal(count, 0, 'the event was not triggered');
});

test('should bind to pusher events on connection', function(assert) {
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.bind('channel', 'event', function() {});
  Ember.run(socket, 'connected');

  assert.deepEqual(pusher.subscriptions['channel'].bindings, ['event']);
});

test('should not bind to the same pusher event twice', function(assert) {
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.bind('channel', 'event', function() {});
  socket.bind('channel', 'event', function() {});
  socket.connected();

  assert.deepEqual(pusher.subscriptions['channel'].bindings, ['event']);
});

test('should bind to pusher events after connection', function(assert) {
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.connected();
  socket.bind('channel', 'event', function() {});

  assert.deepEqual(pusher.subscriptions['channel'].bindings, ['event']);
});

test('should unbind from pusher events', function(assert) {
  var F = function() {};
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.bind('channel', 'event', F);
  socket.connected();
  socket.unbind('channel', 'event', F);

  assert.ok(!pusher.subscriptions['channel']);
});

test('should not unbind from pusher events until there are no active listeners', function(assert) {
  var F1 = function() {};
  var F2 = function() {};
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  socket.connected();
  socket.bind('channel', 'event', F1);
  socket.bind('channel', 'event', F2);
  socket.unbind('channel', 'event', F1);

  assert.deepEqual(pusher.subscriptions['channel'].bindings, ['event']);

  socket.unbind('channel', 'event', F2);

  assert.ok(!pusher.subscriptions['channel']);
});

function assertFlags(assert, description, socket, flags) {
  for (var flag in flags) {
    if (!flags.hasOwnProperty(flag)) { continue; }
    assert.equal(socket.get(flag), flags[flag], description + ' - ' + flag);
  }
}

test('should provide properties for connection status', function(assert) {
  var pusher = new Pusher();
  var socket = PusherSocket.create({ pusher: pusher });

  assertFlags(assert, 'initial', socket, {
    isConnected: false,
    isConnecting: false,
    isUnavailable: false
  });

  pusher.connection.trigger('connecting');

  assertFlags(assert, 'connecting', socket, {
    isConnected: false,
    isConnecting: true,
    isUnavailable: false
  });

  pusher.connection.trigger('connected');

  assertFlags(assert, 'connected', socket, {
    isConnected: true,
    isConnecting: false,
    isUnavailable: false
  });

  pusher.connection.trigger('connecting');

  assertFlags(assert, 'reconnecting', socket, {
    isConnected: false,
    isConnecting: true,
    isUnavailable: false
  });

  pusher.connection.trigger('disconnected');

  assertFlags(assert, 'disconnected', socket, {
    isConnected: false,
    isConnecting: false,
    isUnavailable: false
  });

  pusher.connection.trigger('unavailable');

  assertFlags(assert, 'unavailable', socket, {
    isConnected: false,
    isConnecting: false,
    isUnavailable: true
  });
});
