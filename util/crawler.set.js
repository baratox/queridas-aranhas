'use strict';

const crawler = require('./crawler.js');

const DEBUG = process.env.DEBUG == 1 || false;

/**
 * Updates the context with the enumerable properties of `fields`. If a field
 * is a Promise, the resolved value is used for the field.
 *
 * Returns a Promise that resolves after all fields are resolved.
 */
module.exports = crawler.trick('set', function(fields, resolution) {
    var promises = [];
    let context = this;
    Object.keys(fields).forEach(field => {
        promises.push(Promise.resolve(fields[field]).then((val) => {
            if (DEBUG) { console.log("Set context." + field); }
            // Saves the evaluated field to current context.
            context[field] = val;
        }));
    })

    // Returns the original resolution, after all evaluating promises resolve.
    return Promise.all(promises).then(() => resolution);
});
