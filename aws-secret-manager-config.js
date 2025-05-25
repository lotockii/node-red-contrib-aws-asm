module.exports = function(RED) {
    function AWSSecretManagerConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.region = config.region;
        this.useIAMRole = config.useIAMRole;
        
        // Only set credentials if not using IAM role
        if (!this.useIAMRole) {
            this.accessKeyId = config.accessKeyId;
            this.secretAccessKey = config.secretAccessKey;
        }

        // Create AWS Secrets Manager client
        const { SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");

        // Configure AWS client
        const awsConfig = {
            region: this.region
        };

        // Only add credentials if not using IAM role
        if (!this.useIAMRole && this.accessKeyId && this.secretAccessKey) {
            awsConfig.credentials = {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey
            };
        }

        // Create the client
        this.client = new SecretsManagerClient(awsConfig);
    }

    RED.nodes.registerType("aws-secret-manager-config", AWSSecretManagerConfigNode);
} 