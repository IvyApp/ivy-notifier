import Socket from './socket';
import StatefulMixin from 'ivy-stateful/mixins/stateful';
import computed from 'ember-computed';
import get from 'ember-metal/get';
import { bind } from 'ember-runloop';
import { guidFor } from 'ember-metal/utils';
import { isEmpty } from 'ember-utils';

const retrieveFromCurrentState = computed(function(key) {
  return get(this.get('currentState'), key);
}).property('currentState');

export default Socket.extend(StatefulMixin, {
  init() {
    this._super();
    this.listeners = {};
    this.pendingBind = {};
    this.pendingUnbind = {};
    this.pusherSubscriptions = {};
    this.subscriberListeners = {};
    this._setup();
  },

  bind(channelName, eventName, fn) {
    let channelListeners = this.listeners[channelName];
    if (!channelListeners) {
      channelListeners = this.listeners[channelName] = {};
    }

    let eventListeners = channelListeners[eventName];
    if (!eventListeners) {
      eventListeners = channelListeners[eventName] = {};
    }

    const guid = guidFor(fn);
    eventListeners[guid] = fn;

    this.send('listenerAdded', channelName, eventName);
  },

  connected() {
    this.send('becameConnected');
  },

  connecting() {
    this.send('becameConnecting');
  },

  disconnected() {
    this.send('becameDisconnected');
  },

  emit(channelName, eventName, data) {
    const channelListeners = this.listeners[channelName];
    if (!channelListeners) { return; }

    const eventListeners = channelListeners[eventName];
    if (!eventListeners) { return; }

    Object.keys(eventListeners).forEach(function(guid) {
      eventListeners[guid].call(null, data);
    });
  },

  flushAllPending() {
    this._flushAllPendingBind();
    this._flushAllPendingUnbind();
  },

  initialState: 'initialized',

  isConnected: retrieveFromCurrentState,
  isConnecting: retrieveFromCurrentState,
  isUnavailable: retrieveFromCurrentState,

  pushPendingBind(channelName, eventName) {
    let pendingBinds = this.pendingBind[channelName];
    if (!pendingBinds) {
      pendingBinds = this.pendingBind[channelName] = [];
    }
    pendingBinds.push(eventName);
  },

  pushPendingUnbind(channelName, eventName) {
    let pendingUnbinds = this.pendingUnbind[channelName];
    if (!pendingUnbinds) {
      pendingUnbinds = this.pendingUnbind[channelName] = [];
    }
    pendingUnbinds.push(eventName);
  },

  rootState: {
    isConnected: false,
    isConnecting: false,
    isUnavailable: false,

    connected: {
      isConnected: true,

      becameConnecting(socket) {
        socket.transitionTo('connecting.reconnecting');
      },

      listenerAdded(socket, channelName, eventName) {
        socket.pushPendingBind(channelName, eventName);
        socket.flushAllPending();
      },

      listenerRemoved(socket, channelName, eventName) {
        socket.pushPendingUnbind(channelName, eventName);
        socket.flushAllPending();
      }
    },

    connecting: {
      isConnecting: true,

      firstTime: {
        becameConnected(socket) {
          socket.transitionTo('connected');
        },

        exit(socket) {
          socket.flushAllPending();
        },

        listenerAdded(socket, channelName, eventName) {
          socket.pushPendingBind(channelName, eventName);
        },

        listenerRemoved(socket, channelName, eventName) {
          socket.pushPendingUnbind(channelName, eventName);
        }
      },

      reconnecting: {
        becameDisconnected(socket) {
          socket.transitionTo('disconnected.temporary');
        }
      }
    },

    initialized: {
      becameConnected(socket) {
        socket.transitionTo('connected');
        socket.flushAllPending();
      },

      becameConnecting(socket) {
        socket.transitionTo('connecting.firstTime');
      },

      listenerAdded(socket, channelName, eventName) {
        socket.pushPendingBind(channelName, eventName);
      },

      listenerRemoved(socket, channelName, eventName) {
        socket.pushPendingUnbind(channelName, eventName);
      }
    },

    disconnected: {
      temporary: {
        becameUnavailable(socket) {
          socket.transitionTo('disconnected.unavailable');
        }
      },

      unavailable: {
        isUnavailable: true
      }
    }
  },

  subscribe(subscriber) {
    let subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    subscriptions = subscriptions.pusher;
    if (!subscriptions) { return; }

    const guid = guidFor(subscriber);
    let subscriberListeners = this.subscriberListeners[guid];
    if (!subscriberListeners) {
      subscriberListeners = this.subscriberListeners[guid] = {};
    }

    Object.keys(subscriptions).forEach(function(channelName) {
      let eventListeners = subscriberListeners[channelName];
      if (!eventListeners) {
        eventListeners = subscriberListeners[channelName] = {};
      }

      const eventBindings = subscriptions[channelName];
      Object.keys(eventBindings).forEach(function(eventName) {
        let listener = eventListeners[eventName];
        if (!listener) {
          listener = eventListeners[eventName] = function(data) {
            subscriber.send(eventBindings[eventName], data);
          };
        }

        this.bind(channelName, eventName, listener);
      }, this);
    }, this);
  },

  unavailable() {
    this.send('becameUnavailable');
  },

  unbind(channelName, eventName, fn) {
    const channelListeners = this.listeners[channelName];
    if (!channelListeners) { return; }

    const eventListeners = channelListeners[eventName];
    if (!eventListeners) { return; }

    const guid = guidFor(fn);
    delete eventListeners[guid];

    this.send('listenerRemoved', channelName, eventName);
  },

  unsubscribe(subscriber) {
    let subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    subscriptions = subscriptions.pusher;
    if (!subscriptions) { return; }

    const guid = guidFor(subscriber);
    const subscriberListeners = this.subscriberListeners[guid];
    if (!subscriberListeners) { return; }

    Object.keys(subscriptions).forEach(function(channelName) {
      const eventListeners = subscriberListeners[channelName];
      if (!eventListeners) { return; }

      const eventBindings = subscriptions[channelName];
      Object.keys(eventBindings).forEach(function(eventName) {
        const fn = eventListeners[eventName];
        if (!fn) { return; }

        this.unbind(channelName, eventName, fn);
        delete eventListeners[eventName];
      }, this);

      delete subscriberListeners[channelName];
    }, this);

    delete this.subscriberListeners[guid];
  },

  _bindPusherEvent(channelName, eventName) {
    let pusherSubscription = this.pusherSubscriptions[channelName];
    if (!pusherSubscription) {
      pusherSubscription = this.pusherSubscriptions[channelName] = {
        channel: null,
        eventBindings: {}
      };
    }

    let channel = pusherSubscription.channel;
    if (!channel) {
      channel = pusherSubscription.channel = this.get('pusher').subscribe(channelName);
    }

    let eventBinding = pusherSubscription.eventBindings[eventName];
    if (!eventBinding) {
      eventBinding = pusherSubscription.eventBindings[eventName] = {
        listenerCount: 0,
        handlerFunction: bind(this, function(data) {
          this.emit(channelName, eventName, data);
        })
      };

      channel.bind(eventName, eventBinding.handlerFunction);
    }

    eventBinding.listenerCount++;
  },

  _flushAllPendingBind() {
    Object.keys(this.pendingBind).forEach(function(channelName) {
      const pendingEvents = this.pendingBind[channelName];

      pendingEvents.forEach(function(eventName) {
        this._bindPusherEvent(channelName, eventName);
      }, this);

      delete this.pendingBind[channelName];
    }, this);
  },

  _flushAllPendingUnbind() {
    Object.keys(this.pendingUnbind).forEach(function(channelName) {
      const pendingEvents = this.pendingUnbind[channelName];

      pendingEvents.forEach(function(eventName) {
        this._unbindPusherEvent(channelName, eventName);
      }, this);

      delete this.pendingBind[channelName];
    }, this);
  },

  _setup() {
    const pusher = this.get('pusher');

    ['connected', 'connecting', 'disconnected', 'unavailable'].forEach(function(eventName) {
      pusher.connection.bind(eventName, bind(this, eventName));
    }, this);
  },

  _unbindPusherEvent(channelName, eventName) {
    const pusherSubscription = this.pusherSubscriptions[channelName];
    if (!pusherSubscription) { return; }

    const channel = pusherSubscription.channel;
    if (!channel) { return; } // XXX: can this ever happen?

    const eventBinding = pusherSubscription.eventBindings[eventName];
    if (!eventBinding) { return; }

    eventBinding.listenerCount--;

    if (eventBinding.listenerCount === 0) {
      channel.unbind(eventName, eventBinding.handlerFunction);
      delete pusherSubscription.eventBindings[eventName];
    }

    if (isEmpty(Object.keys(pusherSubscription.eventBindings))) {
      this.get('pusher').unsubscribe(channelName);
      delete this.pusherSubscriptions[channelName];
    }
  }
});
