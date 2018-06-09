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

test("Crawler.stepByStep forks when step returns an Array.", async () => {
    var crawl = crawler.stepByStep([
        (result) => [1, 2, 3, 4],
        (result) => 10 + result
    ])

    var result = await crawl()
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining([11, 12, 13, 14]))
})
