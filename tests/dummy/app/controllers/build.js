import Ember from 'ember';

export default Ember.Controller.extend({
  labelClass: Ember.computed(function() {
    var state = this.get('model.state');
    var labelClassMap = this.get('labelClassMap');
    return labelClassMap[state];
  }).property('model.state'),

  labelClassMap: {
    'created': 'label-info',
    'errored': 'label-danger',
    'failed': 'label-danger',
    'passed': 'label-success',
    'received': 'label-default',
    'started': 'label-warning'
  }
});
