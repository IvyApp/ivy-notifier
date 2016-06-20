import Mixin from 'ember-metal/mixin';
import injectService from 'ember-service/inject';

export default Mixin.create({
  init() {
    this._super(...arguments);
    this.get('notifier').subscribe(this);
  },

  notifier: injectService(),

  willDestroy() {
    this.get('notifier').unsubscribe(this);
    this._super(...arguments);
  }
});
