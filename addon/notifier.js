import Ember from 'ember';

var forEach = Ember.EnumerableUtils.forEach;
var keys = Ember.keys;

export default Ember.Object.extend({
  socketFor: function(typeName) {
    var socket = this.container.lookup('socket:' + typeName);
    if (!socket) {
      throw new Ember.Error('No socket was found for "' + typeName + '"');
    }

    return socket;
  },

  subscribe: function(subscriber) {
    var subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    forEach(keys(subscriptions), function(typeName) {
      this.socketFor(typeName).subscribe(subscriber, subscriptions[typeName]);
    }, this);
  },

  unsubscribe: function(subscriber) {
    var subscriptions = subscriber.subscriptions;
    if (!subscriptions) { return; }

    forEach(keys(subscriptions), function(typeName) {
      this.socketFor(typeName).unsubscribe(subscriber, subscriptions[typeName]);
    }, this);
  }
});
