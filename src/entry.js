const core = require('@actions/core');
const { exportSecrets } = require('./action');

(async () => {
    try {
        await core.group('Get Vault Secrets', exportSecrets);
    } catch (error) {
        core.setOutput("errormessage", error?.message);
        core.setFailed(error?.message);
        throw error;
    }
})();
