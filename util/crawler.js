'use strict';

const _ = require('lodash');

const DEBUG = process.env.DEBUG == 1 || false;

function Crawler(inheritedTricks = {}) {
    // Deep clone all tricks
    var tricks = _.cloneDeep(inheritedTricks);

    function trick(name, executor, defaults = {}) {
        if (arguments.length === 1) {
            if (tricks[name]) {
                return tricks[name];
            } else {
                throw TypeError("Unknown trick '" + name + "'");
            }

        } else if (arguments.length > 1) {
            var trick = tricks[name];
            if (trick === undefined) {
                trick = {
                    'name': name,
                    'defaults': {}
                }

                tricks[name] = trick;
            }

            // Sets or updates the executor function
            if (executor && typeof executor === 'function') {
                trick['execute'] = function(context, options, resolution, overridenOptions) {
                    // console.log("Executing trick", this.name, Object.keys(options));
                    if (typeof options === 'function') {
                        options = options.call(context, resolution);
                    }

                    options = options ? options : {};

                    var instances = options.constructor === Array ? options : [options];
                    instances = instances.map(instanceOptions => {
                        // Apply default options to each execution
                        instanceOptions = Object.assign({}, this.defaults, instanceOptions, overridenOptions);
                        // console.log("Performing trick (keys:", JSON.stringify(Object.keys(instanceOptions)),
                        //     "values:", JSON.stringify(instanceOptions));
                        return executor.call(context, instanceOptions, resolution);
                    });

                    return instances.length === 1 ? instances[0] : instances;
                }
            }

            if (arguments.length >= 3) {
                trick['defaults'] = defaults;
            }

            return trick;
        }
    }

    // Returns a copy of this crawler with the given options applied as defaults to each step.
    function defaults(options) {
        var clone = new Crawler(tricks);
        if (options && typeof options === 'object') {
            Object.keys(options).forEach(trick => {
                // Updates defaults for each step that have a corresponding set
                // of options in the arguments object.
                clone.trick(trick, null,
                    Object.assign({}, clone.trick(trick).defaults, options[trick]));
            });
        }

        return clone;
    }

    /**
     * Takes a single `step`. Steps may be defined as:
     * a) A function, to be called with the previous' step `resolution` as argument.
     * b) An object with a single property with the name of a trick to be executed
     *    with two arguments: the value of the property and `resolution`.
     *    If the value is a function, it's evaluated before executing the trick.
     */
    function takeStep(step, resolution, options) {
        this.history = (this.history ? this.history + '-->' : '')
            + (Math.random()*0xFF<<0).toString(16);

        let result = undefined;
        try {
            if (typeof step === 'function') {
                if (DEBUG) {
                    console.log("\nApplying function ", step.name, "(", typeof resolution,
                        ") to\n    context:", "(" + this.stepsTaken + ")", this.history, Object.keys(this));
                }
                result = step.call(this, resolution);

            } else if (typeof step === 'object') {
                var keys = Object.keys(step);
                if (keys.length === 1) {
                    if (DEBUG) {
                        console.log("\nApplying trick '", keys[0], "' (",
                            resolution && resolution.constructor ? resolution.constructor.name : typeof resolution,
                            ") to\n- context:", "(" + this.stepsTaken + ")", this.history, JSON.stringify(Object.keys(this)));
                    }

                    var t = trick(keys[0]);
                    result = t.execute(this, step[keys[0]], resolution, options);

                    if (DEBUG) {
                        console.log("\nTrick '", keys[0], "' returned:", result.constructor.name ,
                            " to\n- context:", "(" + this.stepsTaken + ")", this.history, JSON.stringify(Object.keys(this)));
                    }

                } else {
                    throw TypeError("Invalid trick step object.");
                }

            } else {
                console.log(this);
                throw TypeError("Steps must be either a 'function' or an 'object', not " + typeof step);
            }

        } catch(error) {
            result = error;
        }

        let context = this;
        if (result !== undefined) {
            result = Promise.resolve(result).catch(error => error);
        } else {
            result = Promise.resolve(new Error("Step didn't complete."));
        }

        return result.then(finalResult => {
            if (_.isError(finalResult)) {
                context.alive = false;
                context.error = finalResult;
            } else {
                context.alive = true;
            }

            return finalResult;
        });
    }

    function walkOneStep(context, step = 0, resolution, options) {
        if (context.steps.length === 0) {
            return Promise.resolve();
        }

        if (!_.get(context, 'alive', true)) {
            if (DEBUG) {
                console.error("Previous step resolved to an Error:", resolution.message);
            }
            return resolution;
        }

        // console.log("Walking after ...", JSON.stringify(result));
        context = Object.assign({}, context);
        context.step = {
            'index': step,
            'definition': context.steps[step]
        }
        context.stepsTaken = step;

        if (resolution && _.isArray(resolution)) {
            return Promise.all(resolution.map(res => {
                return Promise.resolve(res).then(val =>
                    walkOneStep(context, step, val, options)
                )
            }))
        } else {
            var result = takeStep.call(context, context.step.definition, resolution, options);

            if (result && result.constructor === Array) {
                if (step + 1 < context.steps.length) {
                    result = result.map(n =>
                        Promise.resolve(n).then(r =>
                            walkOneStep(context, step + 1, r)));
                }

                return Promise.all(result);

            } else {
                if (step + 1 < context.steps.length) {
                    result = Promise.resolve(result).then(r =>
                        walkOneStep(context, step + 1, r));
                }

                return Promise.resolve(result);
            }
        }
    }

    function crawlStepByStep(steps) {
        // Ensure steps is an Array
        steps = steps.constructor == Array ? steps : [steps];

        var context = { 'steps': steps };
        context.root = context;
        return () => walkOneStep(context);
    }

    return {
        stepByStep: crawlStepByStep,
        trick: trick,
        defaults: defaults
    }
}

var crawler = Crawler();
module.exports = crawler;

// Load and install default tricks to the main crawler instance
require('./crawler.set.js');
require('./crawler.request.js');
require('./crawler.scrape.js');
require('./crawler.createOrUpdate.js');
