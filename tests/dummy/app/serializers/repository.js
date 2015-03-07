import ApplicationSerializer from './application';

export default ApplicationSerializer.extend({
  normalize: function(type, hash) {
    delete hash['description'];
    delete hash['github_language'];
    delete hash['last_build_duration'];
    delete hash['last_build_finished_at'];
    delete hash['last_build_id'];
    delete hash['last_build_language'];
    delete hash['last_build_number'];
    delete hash['last_build_started_at'];
    delete hash['last_build_state'];
    delete hash['private'];

    return this._super(type, hash);
  }
});
