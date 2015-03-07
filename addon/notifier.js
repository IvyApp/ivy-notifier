import Ember from 'ember';

var forEach = Ember.EnumerableUtils.forEach;
var keys = Ember.keys;

export default Ember.Object.extend({
  socketFor: function(typeName) {
    return this.container.lookup('socket:' + typeName);
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
