const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

module.exports = function(RED) {
    function AWSSecretManagerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Get the config node
        const awsConfig = RED.nodes.getNode(config.awsConfig);
        if (!awsConfig) {
            node.error("AWS Secret Manager configuration not found.");
            node.status({fill:"red",shape:"ring",text:"No credentials"});
            return;
        }

        // Get value based on type
        function getValue(value, type, msg) {
            if (type === 'msg') {
                return RED.util.getMessageProperty(msg, value);
            } else if (type === 'flow') {
                return node.context().flow.get(value);
            } else if (type === 'global') {
                return node.context().global.get(value);
            } else if (type === 'env') {
                return process.env[value];
            }
            return value;
        }

        // Get credentials based on configuration
        function getCredentials(msg) {
            if (awsConfig.useIAMRole) {
                return undefined;
            }

            const accessKeyId = getValue(awsConfig.accessKeyId, awsConfig.accessKeyIdType, msg);
            const secretAccessKey = getValue(awsConfig.secretAccessKey, awsConfig.secretAccessKeyType, msg);

            return {
                accessKeyId,
                secretAccessKey
            };
        }

        // Create AWS Secrets Manager client
        let client = null;

        // Set initial node status
        updateNodeStatus(node, config);

        node.on('input', async function(msg, send, done) {
            try {
                node.status({fill:"blue",shape:"dot",text:"Processing..."});

                // Create new client for each message to get fresh credentials
                client = new SecretsManagerClient({
                    region: awsConfig.region,
                    credentials: getCredentials(msg)
                });

                const command = new GetSecretValueCommand({
                    SecretId: config.secretId || msg.secretId
                });

                const response = await client.send(command);
                const secretString = response.SecretString;
                const secretValue = JSON.parse(secretString);

                // Store the secret value based on user's choice
                switch (config.storeIn) {
                    case 'global':
                        node.context().global.set(config.variableName || 'secret', secretValue);
                        break;
                    case 'flow':
                        node.context().flow.set(config.variableName || 'secret', secretValue);
                        break;
                    case 'env':
                        try {
                            if (typeof secretValue === 'object') {
                                Object.entries(secretValue).forEach(([key, value]) => {
                                    // Для env сохраняем только ключ и значение без префикса
                                    process.env[key] = String(value);
                                });
                            } else {
                                // Для одиночного значения используем имя переменной
                                const envKey = config.variableName || 'secret';
                                process.env[envKey] = String(secretValue);
                            }
                        } catch (error) {
                            node.error("Error setting environment variables: " + error.message);
                        }
                        break;
                    case 'output':
                        msg.payload = secretValue;
                        break;
                }

                // Send the message
                if (config.storeIn === 'output') {
                    send(msg);
                } else {
                    send({ ...msg, payload: { status: "Secret stored successfully" } });
                }
                done();

                // Update node status
                node.status({fill:"green",shape:"dot",text:"Success"});
            } catch (error) {
                handleError(node, error);
                msg.payload = { error: error.message };
                send(msg);
                done();
            }
        });

        // Cleanup on node removal
        node.on('close', function() {
            if (client) {
                client.destroy();
            }
            node.status({});
        });
    }

    /**
     * Update node status based on configuration
     * 
     * @param {Object} node - Node-RED node instance
     * @param {Object} config - Node configuration
     */
    function updateNodeStatus(node, config) {
        if (!config.secretId) {
            node.status({fill:"yellow",shape:"ring",text:"Secret ID needed in msg.secretId"});
        } else {
            node.status({});
        }
    }

    /**
     * Handle node errors
     * 
     * @param {Object} node - Node-RED node instance
     * @param {Error} error - Error object
     */
    function handleError(node, error) {
        node.error("AWS Secrets Manager Error: " + error.message);
        node.status({fill:"red",shape:"dot",text:error.message});
    }

    RED.nodes.registerType("aws-secret-manager", AWSSecretManagerNode, {
        color: "#b2e2b2",
        icon: "font-awesome/fa-key"
    });
} 