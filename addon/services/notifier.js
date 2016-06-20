import getOwner from 'ember-getowner-polyfill';
import Service from 'ember-service';

export default Service.extend({
  socketFor(typeName) {
    const socket = getOwner(this).lookup(`socket:${typeName}`);

    if (!socket) {
      throw new Error(`No socket was found for '${typeName}'`);
    }

    return socket;
  },

  subscribe(subscriber) {
    const subscriptions = subscriber.subscriptions;

    if (subscriptions) {
      Object.keys(subscriptions).forEach(function(typeName) {
        this.socketFor(typeName).subscribe(subscriber, subscriptions[typeName]);
      }, this);
    }
  },

  unsubscribe(subscriber) {
    const subscriptions = subscriber.subscriptions;

    if (subscriptions) {
      Object.keys(subscriptions).forEach(function(typeName) {
        this.socketFor(typeName).unsubscribe(subscriber, subscriptions[typeName]);
      }, this);
    }
  }
});
