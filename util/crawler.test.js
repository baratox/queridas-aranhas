const crawler = require('./crawler.js');

test("Module crawler exports a Crawler instance", () => {
    expect(crawler).toBeTruthy()
    expect(crawler).toHaveProperty('stepByStep')
    expect(crawler).toHaveProperty('defaults')
    expect(crawler).toHaveProperty('trick')
});

test("Crawler.stepByStep resolves to undefined when there are no steps.", () => {
    var crawl = crawler.stepByStep([]);
    return expect(crawl()).resolves.toBe(undefined)
})

test("Crawler.stepByStep supports function steps.", () => {
    var crawl = crawler.stepByStep([
        (result) => "Result",
        (result) => "Final " + result
    ])

    return expect(crawl()).resolves.toBe("Final Result")
})

// To fork means the next step will be executed once for each element in the returned Array
test("Crawler.stepByStep forks when step returns an Array.", async () => {
    var crawl = crawler.stepByStep([
        (result) => [1, 2, 3, 4],
        (result) => 10 + result
    ])

    var result = await crawl()
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining([11, 12, 13, 14]))
})

test("Crawler.stepByStep recursively forks with Array results.", async () => {
    var crawl = crawler.stepByStep([
        (result) => "the ",
        (result) => ["moon", "sun", "planet"].map(a => result + a),
        (result) => result + " is ",
        (result) => ["alive", "flying"].map(a => result + a)
    ])

    var result = await crawl()
    expect(result).toHaveLength(3)
    expect(result).toEqual(expect.arrayContaining([
        ["the moon is alive", "the moon is flying"],
        ["the sun is alive", "the sun is flying"],
        ["the planet is alive", "the planet is flying"]
    ]))
})

// Returns a Promise that resolves to `resolution` after waiting for `wait` ms.
function promise(resolution, wait) {
    return new Promise(resolve => setTimeout(() => resolve(resolution), wait))
}

test("Crawler must wait for Promise before taking next step", async () => {
    var crawl = crawler.stepByStep([
        (result) => promise(["here", "present"], 50),
        (result) => "be " + result
    ])

    var result = await crawl()
    expect(result).toHaveLength(2)
    expect(result).toEqual(expect.arrayContaining(["be here", "be present"]))
})

test("Crawler must wait for each Promise in Array before taking next step", async () => {
    var crawl = crawler.stepByStep([
        (result) => ["here", promise("present", 50), Promise.resolve("happy")],
        (result) => "be " + result
    ])

    var result = await crawl()
    expect(result).toHaveLength(3)
    expect(result).toEqual(expect.arrayContaining(["be here", "be present", "be happy"]))
})

test("Crawler must wait for nested Promises to resolve before next step is taken", async () => {
    var crawl = crawler.stepByStep([
        (result) => ["here", promise([ "present", promise("happy", 50) ], 50)],
        (result) => "be " + result
    ])

    var result = await crawl()
    expect(result).toHaveLength(2)
    expect(result).toEqual(expect.arrayContaining(["be here", ["be present", "be happy"]]))
})
