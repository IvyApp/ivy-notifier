import Ember from 'ember';

var forEach = Ember.EnumerableUtils.forEach;
var isEmpty = Ember.isEmpty;
var keys = Ember.keys;

var RootState = {
  isConnected: false,
  isConnecting: false,
  isUnavailable: false,

  connected: {
    isConnected: true,

    becameConnecting: function(socket) {
      socket.transitionTo('connecting.reconnecting');
    },

    listenerAdded: function(socket, channelName, eventName) {
      socket.pushPendingBind(channelName, eventName);
      socket.flushAllPending();
    },

    listenerRemoved: function(socket, channelName, eventName) {
      socket.pushPendingUnbind(channelName, eventName);
      socket.flushAllPending();
    }
  },

  connecting: {
    isConnecting: true,

    firstTime: {
      becameConnected: function(socket) {
        socket.transitionTo('connected');
      },

      exit: function(socket) {
        socket.flushAllPending();
      },

      listenerAdded: function(socket, channelName, eventName) {
        socket.pushPendingBind(channelName, eventName);
      },

      listenerRemoved: function(socket, channelName, eventName) {
        socket.pushPendingUnbind(channelName, eventName);
      }
    },

    reconnecting: {
      becameDisconnected: function(socket) {
        socket.transitionTo('disconnected.temporary');
      }
    }
  },

  initialized: {
    becameConnected: function(socket) {
      socket.transitionTo('connected');
      socket.flushAllPending();
    },

    becameConnecting: function(socket) {
      socket.transitionTo('connecting.firstTime');
    },

    listenerAdded: function(socket, channelName, eventName) {
      socket.pushPendingBind(channelName, eventName);
    },

    listenerRemoved: function(socket, channelName, eventName) {
      socket.pushPendingUnbind(channelName, eventName);
    }
  },

  disconnected: {
    temporary: {
      becameUnavailable: function(socket) {
        socket.transitionTo('disconnected.unavailable');
      }
    },

    unavailable: {
      isUnavailable: true
    }
  }
};

function wireState(state, parentState, stateName) {
  state = Ember.merge(parentState ? Ember.create(parentState) : {}, state);
  state.parentState = parentState;
  state.stateName = stateName;

  for (var prop in state) {
    if (!state.hasOwnProperty(prop) || prop === 'parentState' || prop === 'stateName') { continue; }
    if (typeof state[prop] === 'object') {
      state[prop] = wireState(state[prop], state, stateName + '.' + prop);
    }
  }

  return state;
}

RootState = wireState(RootState, null, 'root');

var retrieveFromCurrentState = Ember.computed(function(key) {
  return Ember.get(this.get('currentState'), key);
}).property('currentState');

export default Ember.Object.extend({
  init: function() {
    this._super();
    this.listeners = {};
    this.pendingBind = {};
    this.pendingUnbind = {};
    this.pusherSubscriptions = {};
    this.subscriberListeners = {};
    this._setup();
  },

  bind: function(channelName, eventName, fn) {
    var channelListeners = this.listeners[channelName];
    if (!channelListeners) {
      channelListeners = this.listeners[channelName] = {};
    }

    var eventListeners = channelListeners[eventName];
    if (!eventListeners) {
      eventListeners = channelListeners[eventName] = {};
    }

    var guid = Ember.guidFor(fn);
    eventListeners[guid] = fn;

    this.send('listenerAdded', channelName, eventName);
  },

  connected: function() {
    this.send('becameConnected');
  },

  connecting: function() {
    this.send('becameConnecting');
  },

  currentState: RootState.initialized,

  disconnected: function() {
    this.send('becameDisconnected');
  },

  flushAllPending: function() {
    this._flushAllPendingBind();
    this._flushAllPendingUnbind();
  },

  isConnected: retrieveFromCurrentState,
  isConnecting: retrieveFromCurrentState,
  isUnavailable: retrieveFromCurrentState,

  pushPendingBind: function(channelName, eventName) {
    var pendingBinds = this.pendingBind[channelName];
    if (!pendingBinds) {
      pendingBinds = this.pendingBind[channelName] = [];
    }
    pendingBinds.push(eventName);
  },

  pushPendingUnbind: function(channelName, eventName) {
    var pendingUnbinds = this.pendingUnbind[channelName];
    if (!pendingUnbinds) {
      pendingUnbinds = this.pendingUnbind[channelName] = [];
    }
    pendingUnbinds.push(eventName);
  },

  receive: function(channelName, eventName, data) {
    var channelListeners = this.listeners[channelName];
    if (!channelListeners) { return; }

    var eventListeners = channelListeners[eventName];
    if (!eventListeners) { return; }

    forEach(keys(eventListeners), function(guid) {
      eventListeners[guid].call(null, data);
    });
  },

  send: function(name) {
    var currentState = this.get('currentState');

    if (!currentState[name]) {
      throw new Ember.Error('Attempted to handle event "' + name +
                            '" on ' + String(this) + ' while in state ' +
                            currentState.stateName + '.');
    }

    var args = [this].concat(Array.prototype.slice.call(arguments, 1));

    return currentState[name].apply(null, args);
  },

  subscribe: function(subscriber) {
    var subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    subscriptions = subscriptions.pusher;
    if (!subscriptions) { return; }

    var guid = Ember.guidFor(subscriber);
    var subscriberListeners = this.subscriberListeners[guid];
    if (!subscriberListeners) {
      subscriberListeners = this.subscriberListeners[guid] = {};
    }

    forEach(keys(subscriptions), function(channelName) {
      var eventListeners = subscriberListeners[channelName];
      if (!eventListeners) {
        eventListeners = subscriberListeners[channelName] = {};
      }

      var eventBindings = subscriptions[channelName];
      forEach(keys(eventBindings), function(eventName) {
        var listener = eventListeners[eventName];
        if (!listener) {
          listener = eventListeners[eventName] = function(data) {
            subscriber.send(eventBindings[eventName], data);
          };
        }

        this.bind(channelName, eventName, listener);
      }, this);
    }, this);
  },

  transitionTo: function(name) {
    var pivotName = name.split('.').shift();
    var currentState = this.get('currentState');
    var state = currentState;

    do {
      if (state.exit) { state.exit(this); }
      state = state.parentState;
    } while (!state.hasOwnProperty(pivotName));

    var path = name.split('.');

    for (var i = 0; i < path.length; i++) {
      state = state[path[i]];
      if (state.enter) { state.enter(this); }
    }

    this.set('currentState', state);
  },

  unavailable: function() {
    this.send('becameUnavailable');
  },

  unbind: function(channelName, eventName, fn) {
    var channelListeners = this.listeners[channelName];
    if (!channelListeners) { return; }

    var eventListeners = channelListeners[eventName];
    if (!eventListeners) { return; }

    var guid = Ember.guidFor(fn);
    delete eventListeners[guid];

    this.send('listenerRemoved', channelName, eventName);
  },

  unsubscribe: function(subscriber) {
    var subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    subscriptions = subscriptions.pusher;
    if (!subscriptions) { return; }

    var guid = Ember.guidFor(subscriber);
    var subscriberListeners = this.subscriberListeners[guid];
    if (!subscriberListeners) { return; }

    forEach(keys(subscriptions), function(channelName) {
      var eventListeners = subscriberListeners[channelName];
      if (!eventListeners) { return; }

      var eventBindings = subscriptions[channelName];
      forEach(keys(eventBindings), function(eventName) {
        var fn = eventListeners[eventName];
        if (!fn) { return; }

        this.unbind(channelName, eventName, fn);
        delete eventListeners[eventName];
      }, this);

      delete subscriberListeners[channelName];
    }, this);

    delete this.subscriberListeners[guid];
  },

  _bindPusherEvent: function(channelName, eventName) {
    var pusherSubscription = this.pusherSubscriptions[channelName];
    if (!pusherSubscription) {
      pusherSubscription = this.pusherSubscriptions[channelName] = {
        channel: null,
        eventBindings: {}
      };
    }

    var channel = pusherSubscription.channel;
    if (!channel) {
      channel = pusherSubscription.channel = this.get('pusher').subscribe(channelName);
    }

    var eventBinding = pusherSubscription.eventBindings[eventName];
    if (!eventBinding) {
      eventBinding = pusherSubscription.eventBindings[eventName] = {
        listenerCount: 0,
        handlerFunction: Ember.run.bind(this, function(data) {
          this.receive(channelName, eventName, data);
        })
      };

      channel.bind(eventName, eventBinding.handlerFunction);
    }

    eventBinding.listenerCount++;
  },

  _flushAllPendingBind: function() {
    forEach(keys(this.pendingBind), function(channelName) {
      var pendingEvents = this.pendingBind[channelName];

      forEach(pendingEvents, function(eventName) {
        this._bindPusherEvent(channelName, eventName);
      }, this);

      delete this.pendingBind[channelName];
    }, this);
  },

  _flushAllPendingUnbind: function() {
    forEach(keys(this.pendingUnbind), function(channelName) {
      var pendingEvents = this.pendingUnbind[channelName];

      forEach(pendingEvents, function(eventName) {
        this._unbindPusherEvent(channelName, eventName);
      }, this);

      delete this.pendingBind[channelName];
    }, this);
  },

  _setup: function() {
    var pusher = this.get('pusher');

    forEach(['connected', 'connecting', 'disconnected', 'unavailable'], function(eventName) {
      pusher.connection.bind(eventName, Ember.run.bind(this, eventName));
    }, this);
  },

  _unbindPusherEvent: function(channelName, eventName) {
    var pusherSubscription = this.pusherSubscriptions[channelName];
    if (!pusherSubscription) { return; }

    var channel = pusherSubscription.channel;
    if (!channel) { return; } // XXX: can this ever happen?

    var eventBinding = pusherSubscription.eventBindings[eventName];
    if (!eventBinding) { return; }

    eventBinding.listenerCount--;

    if (eventBinding.listenerCount === 0) {
      channel.unbind(eventName, eventBinding.handlerFunction);
      delete pusherSubscription.eventBindings[eventName];
    }

    if (isEmpty(keys(pusherSubscription.eventBindings))) {
      this.get('pusher').unsubscribe(channelName);
      delete this.pusherSubscriptions[channelName];
    }
  }
});
