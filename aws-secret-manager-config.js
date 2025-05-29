/**
 * AWS Secrets Manager Configuration Node
 * 
 * This module provides configuration for AWS Secrets Manager operations in Node-RED.
 * It supports both IAM roles and access key authentication with flexible context support.
 * 
 * @module node-red-contrib-aws-asm-config
 */

const { SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");

module.exports = function(RED) {
    /**
     * Helper function to get value from different contexts
     * @param {Object} node - Node instance
     * @param {string} value - Value to get
     * @param {string} type - Type of value (str, flow, global, env)
     * @param {Object} msg - Message object
     * @returns {string} Retrieved value
     */
    function getValueFromContext(node, value, type, msg) {
        if (value === null || value === undefined) return null;

        try {
            let result;
            switch (type) {
                case 'flow':
                    const flowContext = node.context().flow;
                    if (!flowContext) {
                        return null;
                    }
                    result = getNestedValue(flowContext, value);
                    break;
                case 'global':
                    const globalContext = node.context().global;
                    if (!globalContext) {
                        return null;
                    }
                    result = getNestedValue(globalContext, value);
                    break;
                case 'env':
                    result = process.env[value];
                    break;
                case 'msg':
                    result = RED.util.getMessageProperty(msg, value);
                    break;
                default:
                    result = value;
            }

            return result !== undefined ? result : null;
        } catch (err) {
            throw new Error(`Failed to get value for type: ${type}, value: ${value}. Error: ${err.message}`);
        }
    }

    /**
     * Helper function to get nested values like "all_vars.host"
     * @param {Object} context - Context object
     * @param {string} path - Dot-separated path
     * @returns {*} Retrieved value
     */
    function getNestedValue(context, path) {
        if (!context) return undefined;
        
        if (path.includes('.')) {
            const parts = path.split('.');
            let result = context.get(parts[0]);
            for (let i = 1; i < parts.length; i++) {
                if (result && typeof result === 'object') {
                    result = result[parts[i]];
                } else {
                    return undefined;
                }
            }
            return result;
        } else {
            return context.get(path);
        }
    }

    /**
     * AWS Secrets Manager Configuration Node constructor
     * 
     * @param {Object} config - Node configuration
     * @param {string} config.name - Node name
     * @param {boolean} config.useIAMRole - Whether to use IAM role
     */
    function AWSSecretManagerConfigNode(config) {
        RED.nodes.createNode(this, config);
        
        this.name = config.name || "AWS Secrets Manager Config";
        this.region = config.region || process.env.AWS_REGION || "eu-central-1";
        
        // Store credential types and values
        this.useIAMRole = config.useIAMRole === true || config.useIAMRole === "true" || config.useIAMRole === 1;
        this.accessKeyIdType = config.accessKeyIdType || 'str';
        this.secretAccessKeyType = config.secretAccessKeyType || 'str';
        this.accessKeyId = config.accessKeyId;
        this.accessKeyIdContext = config.accessKeyIdContext;
        this.secretAccessKey = config.secretAccessKey;
        this.secretAccessKeyContext = config.secretAccessKeyContext;

        /**
         * Parse credential values based on type
         * @param {string} value - Value to parse
         * @param {string} type - Type of value
         * @param {Object} msg - Message object
         * @param {Object} executingNode - Node executing the request
         * @returns {string|null} Parsed value
         */
        this.parseCredentialValue = function(value, type, msg, executingNode) {
            if (!value) {
                return null;
            }
            
            try {
                let result;
                switch (type) {
                    case 'str':
                        result = value;
                        break;
                    case 'flow':
                        result = getValueFromContext(executingNode || this, value, 'flow', msg);
                        break;
                    case 'global':
                        result = getValueFromContext(executingNode || this, value, 'global', msg);
                        break;
                    case 'env':
                        result = process.env[value] || null;
                        break;
                    default:
                        result = value;
                }
                
                return result;
            } catch (error) {
                if (executingNode) {
                    executingNode.error(`Error parsing credential value: ${error.message}`);
                }
                return null;
            }
        };

        /**
         * Get credentials based on configuration
         * @param {Object} msg - Message object
         * @param {Object} executingNode - Node executing the request
         * @returns {Object} Credentials object
         */
        this.getCredentials = function(msg, executingNode) {
            if (this.useIAMRole) {
                return {
                    useIAMRole: true,
                    region: this.region
                };
            }

            try {
                // Handle Access Key ID
                let accessKeyId;
                if (this.accessKeyIdType === 'str') {
                    accessKeyId = this.credentials?.accessKeyId;
                } else {
                    accessKeyId = this.parseCredentialValue(this.accessKeyIdContext, this.accessKeyIdType, msg, executingNode);
                }

                // Handle Secret Access Key
                let secretAccessKey;
                if (this.secretAccessKeyType === 'str') {
                    secretAccessKey = this.credentials?.secretAccessKey;
                } else {
                    secretAccessKey = this.parseCredentialValue(this.secretAccessKeyContext, this.secretAccessKeyType, msg, executingNode);
                }

                if (!accessKeyId || !secretAccessKey) {
                    const missingFields = [];
                    if (!accessKeyId) missingFields.push('Access Key ID');
                    if (!secretAccessKey) missingFields.push('Secret Access Key');
                    throw new Error(`Missing required credentials: ${missingFields.join(', ')}`);
                }

                return {
                    accessKeyId,
                    secretAccessKey,
                    region: this.region
                };
            } catch (err) {
                throw new Error(`Failed to get AWS credentials: ${err.message}`);
            }
        };

        /**
         * Get AWS Secrets Manager client
         * @param {Object} msg - Message object
         * @param {Object} executingNode - Node executing the request
         * @returns {SecretsManagerClient} AWS Secrets Manager client
         */
        this.getClient = (msg, executingNode) => {
            try {
                if (this.useIAMRole) {
                    return new SecretsManagerClient({
                        region: this.region
                    });
                }

                const credentials = this.getCredentials(msg, executingNode);

                return new SecretsManagerClient({
                    region: this.region,
                    credentials: {
                        accessKeyId: credentials.accessKeyId,
                        secretAccessKey: credentials.secretAccessKey
                    }
                });

            } catch (error) {
                if (executingNode) {
                    executingNode.error(`Failed to create Secrets Manager client: ${error.message}`);
                }
                throw error;
            }
        };
    }

    // Register node type with credentials
    RED.nodes.registerType("aws-secret-manager-config", AWSSecretManagerConfigNode, {
        credentials: {
            accessKeyId: { type: "text" },
            secretAccessKey: { type: "password" }
        },
        defaults: {
            name: { value: "" },
            region: { value: "eu-central-1", required: true },
            useIAMRole: { value: false, required: true },
            accessKeyId: { value: "" },
            accessKeyIdType: { value: "str" },
            accessKeyIdContext: { value: "" },
            secretAccessKey: { value: "" },
            secretAccessKeyType: { value: "str" },
            secretAccessKeyContext: { value: "" }
        }
    });
}; 