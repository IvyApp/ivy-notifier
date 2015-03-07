import Ember from 'ember';
import NotifiableMixin from 'ivy-notifier/mixins/notifiable';

export default Ember.ArrayController.extend(NotifiableMixin, {
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
  }
});
