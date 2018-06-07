const crawler = require('./crawler.js');

test("Module crawler exports a Crawler instance", () => {
    expect(crawler).toBeTruthy()
    expect(crawler).toHaveProperty('stepByStep')
    expect(crawler).toHaveProperty('defaults')
    expect(crawler).toHaveProperty('trick')
});
