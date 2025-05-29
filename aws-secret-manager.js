/**
 * AWS Secrets Manager Node for Node-RED
 * 
 * This module provides AWS Secrets Manager operations for Node-RED.
 * It supports flexible credential handling through the aws-secret-manager-config node.
 * 
 * @module node-red-contrib-aws-asm
 */

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

module.exports = function(RED) {
    /**
     * AWS Secrets Manager Node constructor
     * 
     * @param {Object} config - Node configuration
     * @param {string} config.name - Node name
     * @param {string} config.awsConfig - AWS configuration node ID
     * @param {string} config.secretId - Secret ID
     * @param {string} config.secretIdType - Type of secret ID input
     * @param {string} config.storeIn - Where to store the secret
     * @param {string} config.variableName - Variable name for storage
     */
    function AWSSecretManagerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const secretsConfig = RED.nodes.getNode(config.awsConfig);

        if (!secretsConfig) {
            node.error("AWS Secrets Manager configuration not found.");
            return;
        }

        // Store configuration
        this.secretId = config.secretId;
        this.secretIdType = config.secretIdType;
        this.storeIn = config.storeIn;
        this.variableName = config.variableName;

        /**
         * Get value from different input types
         * @param {string} value - Value to get
         * @param {string} type - Type of value (str, msg, flow, global, env)
         * @param {Object} msg - Message object
         * @returns {string|null} Retrieved value
         */
        function getValue(value, type, msg) {
            if (!value) return null;

            try {
                let result;
                switch (type) {
                    case 'msg':
                        result = RED.util.getMessageProperty(msg, value);
                        break;
                    case 'flow':
                        result = node.context().flow.get(value);
                        break;
                    case 'global':
                        result = node.context().global.get(value);
                        break;
                    case 'env':
                        result = process.env[value];
                        break;
                    default:
                        result = value;
                }
                return result;
            } catch (err) {
                throw new Error(`Failed to get value for type: ${type}, value: ${value}. Error: ${err.message}`);
            }
        }

        /**
         * Store secret value based on configuration
         * @param {Object|string} secretValue - Secret value to store
         * @param {string} storeIn - Where to store (global, flow, env, output)
         * @param {string} variableName - Variable name
         * @param {Object} msg - Message object
         */
        function storeSecretValue(secretValue, storeIn, variableName, msg) {
            switch (storeIn) {
                case 'global':
                    node.context().global.set(variableName || 'secret', secretValue);
                    break;
                case 'flow':
                    node.context().flow.set(variableName || 'secret', secretValue);
                    break;
                case 'env':
                    try {
                        if (typeof secretValue === 'object') {
                            Object.entries(secretValue).forEach(([key, value]) => {
                                process.env[key] = String(value);
                            });
                        } else {
                            const envKey = variableName || 'secret';
                            process.env[envKey] = String(secretValue);
                        }
                    } catch (error) {
                        throw new Error("Error setting environment variables: " + error.message);
                    }
                    break;
                case 'output':
                    msg.payload = secretValue;
                    break;
                default:
                    throw new Error(`Unsupported storage type: ${storeIn}`);
            }
        }

        // Handle incoming messages
        node.on('input', async (msg, send, done) => {
            try {
                const client = secretsConfig.getClient(msg, node);
                
                if (!client) {
                    throw new Error("Failed to initialize Secrets Manager client");
                }

                const secretId = getValue(node.secretId, node.secretIdType, msg) || msg.secretId;
                if (!secretId) {
                    throw new Error("Secret ID is required. Provide it in node configuration or msg.secretId");
                }

                node.status({ fill: "blue", shape: "dot", text: "Retrieving secret..." });

                const command = new GetSecretValueCommand({
                    SecretId: secretId
                });

                const response = await client.send(command);
                
                if (!response.SecretString) {
                    throw new Error("Secret value is empty or not found");
                }

                // Parse secret value (JSON or string)
                let secretValue;
                try {
                    secretValue = JSON.parse(response.SecretString);
                } catch (parseError) {
                    secretValue = response.SecretString;
                }

                storeSecretValue(secretValue, node.storeIn, node.variableName, msg);

                node.status({ fill: "green", shape: "dot", text: "Secret retrieved" });
                
                if (node.storeIn === 'output') {
                    send(msg);
                } else {
                    send({ ...msg, payload: { status: "Secret stored successfully", secretId: secretId } });
                }
                done();

            } catch (err) {
                node.error(err.message, msg);
                node.status({ fill: "red", shape: "ring", text: err.message });
                
                msg.payload = { error: err.message };
                send(msg);
                done();
            }
        });

        node.status({});
    }

    RED.nodes.registerType("aws-secret-manager", AWSSecretManagerNode);
}; 