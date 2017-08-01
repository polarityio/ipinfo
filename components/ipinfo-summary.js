'use strict';

polarity.export = PolarityComponent.extend({
    details: Ember.computed.alias('block.data.details'),
    hasGeolocationData: Ember.computed('details.city', 'details.region', 'details.country', function () {
        if (this.get('details.region') ||
            this.get('details.city') ||
            this.get('details.country')) {
            return true;
        }
        return false;
    }),
    geolocation: Ember.computed('details.city', 'details.region', 'details.country', function () {
        return [this.get('details.city'), this.get('details.region'), this.get('details.country')]
            .filter(val => val).join(', ');
    })
});

