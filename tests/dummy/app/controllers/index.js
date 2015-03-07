import Ember from 'ember';

export default Ember.ArrayController.extend({
  init: function() {
    this._super();
    this.notifier.subscribe(this);
  },

  actions: {
    pushBuild: function(payload) {
      this.store.pushPayload('build', payload);
    }
  },

  subscriptions: {
    pusher: {
      common: {
        'build:created': 'pushBuild',
        'build:finished': 'pushBuild',
        'build:received': 'pushBuild',
        'build:started': 'pushBuild'
      }
    }
  },

  willDestroy: function() {
    this.notifier.unsubscribe(this);
    this._super();
  }
});
