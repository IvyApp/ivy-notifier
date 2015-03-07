import Ember from 'ember';

export default Ember.Mixin.create({
  init: function() {
    this._super();
    this.notifier.subscribe(this);
  },

  willDestroy: function() {
    this.notifier.unsubscribe(this);
    this._super();
  }
});
