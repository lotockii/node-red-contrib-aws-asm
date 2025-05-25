# node-red-contrib-aws-asm

A Node-RED node for AWS Secrets Manager operations. This module provides a simple way to retrieve and manage secrets from AWS Secrets Manager directly from your Node-RED flows.

**Developed by Andrii Lototskyi**

## Installation

Run the following command in your Node-RED user directory (typically `~/.node-red`):

```bash
npm install node-red-contrib-aws-asm
```

After installation, restart Node-RED to load the new nodes.

## Features

This node provides the following AWS Secrets Manager operations:

- **Get Secret**: Retrieve secrets from AWS Secrets Manager
- **Store Secrets**: Store secrets in different contexts:
  - Flow Context
  - Global Context
  - Environment Variables
  - Output Data

### Supported Storage Options

1. **Flow Context**
   - Stores secret in flow context
   - Access using `flow.get("variableName")`
   - Persists for the duration of the flow

2. **Global Context**
   - Stores secret in global context
   - Access using `global.get("variableName")`
   - Persists across all flows

3. **Environment Variables**
   - Stores secret as environment variables
   - Access using `env.get("key")` in function nodes
   - For object secrets, each key becomes a separate environment variable

4. **Output Data**
   - Sends secret directly to the output
   - Access via `msg.payload` in the next node

## Configuration

### AWS Credentials

1. Add a new AWS Secrets Manager Config node
2. Choose an authentication method:
   - IAM Role (recommended for EC2 instances)
   - Access Key and Secret Key

### Node Configuration

1. Add an AWS Secrets Manager node to your flow
2. Configure the node with:
   - AWS credentials (select the config node)
   - Region (e.g., eu-central-1)
   - Secret ID (ARN or name of the secret)
   - Storage location (Flow, Global, Environment Variables, or Output)
   - Variable name (for Flow, Global, and Environment Variables storage)

## Examples

### Basic Secret Retrieval Flow

```json
[
    {
        "id": "aws-secret-manager",
        "type": "aws-secret-manager",
        "name": "Get Secret",
        "awsConfig": "aws-credentials",
        "secretId": "arn:aws:secretsmanager:eu-central-1:123456789012:secret:my-secret",
        "storeIn": "flow",
        "variableName": "mySecret"
    }
]
```

### Environment Variables Flow

```json
[
    {
        "id": "aws-secret-manager",
        "type": "aws-secret-manager",
        "name": "Store as Environment Variables",
        "awsConfig": "aws-credentials",
        "secretId": "arn:aws:secretsmanager:eu-central-1:123456789012:secret:my-secret",
        "storeIn": "env",
        "variableName": "MY_SECRET"
    }
]
```

### Output Data Flow

```json
[
    {
        "id": "aws-secret-manager",
        "type": "aws-secret-manager",
        "name": "Output Secret",
        "awsConfig": "aws-credentials",
        "secretId": "arn:aws:secretsmanager:eu-central-1:123456789012:secret:my-secret",
        "storeIn": "output"
    }
]
```

## Best Practices

1. **Security**
   - Use IAM roles when possible
   - Rotate access keys regularly
   - Follow the principle of least privilege
   - Use environment variables for sensitive data

2. **Performance**
   - Cache secrets when appropriate
   - Consider regional placement of secrets
   - Use appropriate storage options for your use case

3. **Error Handling**
   - Always handle secret retrieval errors
   - Implement retry logic for transient failures
   - Log security-related events

## Troubleshooting

### Common Issues

1. **"Secret ID required" Error**
   - Ensure the Secret ID is set in node config or msg.secretId
   - Verify the Secret ID format (should be a valid AWS Secrets Manager ARN or name)

2. **"Could not load credentials" Error**
   - Check AWS credentials configuration
   - Verify IAM role permissions
   - Ensure environment variables are set correctly

3. **"Invalid region" Error**
   - Verify the region format (e.g., eu-central-1)
   - Ensure the region is supported by AWS Secrets Manager

4. **"Secret not found" Error**
   - Verify the secret exists in AWS Secrets Manager
   - Check if you have permissions to access the secret
   - Ensure the secret ID is correct

### Debugging

1. Enable Node-RED debug output
2. Check AWS CloudWatch logs
3. Verify IAM permissions
4. Test with AWS CLI first

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/lotockii/node-red-contrib-aws-asm/issues). 