jest.mock('@actions/core');

const core = require('@actions/core');
const ServerMock = require("mock-http-server");
const { exportSecrets } = require("./action");
const { when } = require('jest-when');

describe('exportSecrets retries', () => {
    var server = new ServerMock({ host: "127.0.0.1", port: 0 });
    var calls = 0;

    beforeEach((done) => {
        calls = 0;
        jest.resetAllMocks();

        when(core.getInput)
            .calledWith('token', expect.anything())
            .mockReturnValueOnce('EXAMPLE');

        when(core.getInput)
            .calledWith('secrets', expect.anything())
            .mockReturnValueOnce("kv/mysecret key");

        server.start(() => {
            expect(server.getHttpPort()).not.toBeNull();
            when(core.getInput)
                .calledWith('url', expect.anything())
                .mockReturnValueOnce('http://127.0.0.1:' + server.getHttpPort());
            done();
        });
    });

    afterEach((done) => {
        server.stop(done);
    });

    function mockStatusCodes(statusCodes) {
        server.on({
            path: '/v1/kv/mysecret',
            reply: {
                status: function() {
                    let status = statusCodes[calls];
                    calls += 1;
                    return status;
                },
                headers: { "content-type": "application/json" },
                body: function() {
                    return JSON.stringify({ data: {"key": "value"} })
                }
            }
        });
    }

    it('retries on 412 status code', (done) => {
        mockStatusCodes([412, 200])
        exportSecrets().then(() => {
            expect(calls).toEqual(2);
            done();
        });
    });

    it('retries on 500 status code', (done) => {
        mockStatusCodes([500, 200])
        exportSecrets().then(() => {
            expect(calls).toEqual(2);
            done();
        });
    });
});

describe('exportSecrets retrieve token retries', () => {
    var server = new ServerMock({ host: "127.0.0.1", port: 0 });
    var calls = 0;

    beforeEach((done) => {
        calls = 0;
        jest.resetAllMocks();

        when(core.getInput)
            .calledWith('token', expect.anything())
            .mockReturnValueOnce('EXAMPLE');

        when(core.getInput)
            .calledWith('secrets', expect.anything())
            .mockReturnValueOnce("kv/mysecret key");

        when(core.getInput)
            .calledWith('method', expect.anything())
            .mockReturnValueOnce('approle')

        when(core.getInput)
            .calledWith('roleId', expect.anything())
            .mockReturnValueOnce('roleId')

        when(core.getInput)
            .calledWith('secretId', expect.anything())
            .mockReturnValueOnce('secretId')

        when(core.getInput)
            .calledWith('retryVaultTokenRetrieval', expect.anything())
            .mockReturnValueOnce('true')

        server.start(() => {
            expect(server.getHttpPort()).not.toBeNull();
            when(core.getInput)
                .calledWith('url', expect.anything())
                .mockReturnValueOnce('http://127.0.0.1:' + server.getHttpPort());
            done();
        });
    });

    afterEach((done) => {
        server.stop(done);
    });

    function mockKvRetrieval() {
        server.on({
            path: '/v1/kv/mysecret',
            reply: {
                status: 200,
                headers: { "content-type": "application/json" },
                body: function() {
                    return JSON.stringify({ data: {"key": "value"} })
                }
            }
        });
    }

    function mockStatusCodes(statusCodes) {
        server.on({
            method: 'POST',
            path: '/v1/auth/approle/login',
            reply: {
                status: function() {
                    let status = statusCodes[calls];
                    calls += 1;
                    return status;
                },
                body: function() {
                    return JSON.stringify({ auth: {"client_token": "token"} });
                }
            }
        });
    }

    it('retries on 500 status code', (done) => {
        mockKvRetrieval()
        mockStatusCodes([500, 201])
        exportSecrets().then(() => {
            expect(calls).toEqual(2);
            done();
        });
    });
});
