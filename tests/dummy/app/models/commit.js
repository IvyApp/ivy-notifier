import DS from 'ember-data';
import Ember from 'ember';

export default DS.Model.extend({
  branch: DS.attr('string'),
  committerName: DS.attr('string'),
  compareURL: DS.attr('string'),
  message: DS.attr('string'),
  sha: DS.attr('string'),

  shortSha: Ember.computed(function() {
    return this.get('sha').slice(0, 7);
  }).property('sha')
});
