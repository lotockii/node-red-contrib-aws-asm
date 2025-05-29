# node-red-contrib-aws-asm

A production-ready Node-RED node for AWS Secrets Manager operations that retrieves secrets and stores them in Node-RED context or environment variables.

## Features

- 🔐 Retrieve secrets from AWS Secrets Manager
- 🏗️ Flexible credential configuration (IAM roles, direct credentials, context variables)
- 📦 Store secrets in flow context, global context, or environment variables
- 🔄 Support for both JSON and string secrets
- 🎯 TypedInput support for dynamic secret IDs
- ⚡ Real-time credential resolution from context
- 🛡️ Production-ready with comprehensive error handling

## Installation

Run the following command in your Node-RED user directory (typically `~/.node-red`):

```bash
npm install node-red-contrib-aws-asm
```

After installation, restart Node-RED to load the new nodes.

## Configuration

### AWS Configuration Node

The module uses a configuration node that supports multiple authentication methods:

#### IAM Role Authentication (Recommended)
- ✅ Use when running on EC2 instances with IAM roles
- ✅ No credentials needed in Node-RED
- ✅ Automatic credential rotation

#### Access Key Authentication
Supports multiple credential sources:

- **String**: Stored securely in Node-RED credentials (encrypted)
- **Flow Context**: Retrieved from flow context variables
- **Global Context**: Retrieved from global context variables  
- **Environment Variables**: Retrieved from environment variables

### Examples

#### Environment-based Configuration
```javascript
// Set environment variables
process.env.AWS_ACCESS_KEY_ID = "your-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "your-secret-key";

// Configure node to use environment variables
Access Key ID: Environment Variable → AWS_ACCESS_KEY_ID
Secret Access Key: Environment Variable → AWS_SECRET_ACCESS_KEY
```

#### Mixed Configuration
```javascript
// Store secret key in global context
global.set("aws_secret", "your-secret-access-key");

// Configure node
Access Key ID: String → stored securely in Node-RED
Secret Access Key: Global Context → aws_secret
```

## Usage

### Basic Usage

1. **Create AWS Configuration**
   - Add an "aws-secret-manager-config" node
   - Configure your AWS region and credentials

2. **Add Secrets Manager Node**
   - Drag "aws-secret-manager" node to your flow
   - Select your AWS configuration
   - Configure secret ID and storage options

3. **Configure Secret ID**
   The Secret ID supports multiple input types:
   - **String**: Direct secret name or ARN
   - **Message**: From `msg.payload.secretId` or `msg.secretId`
   - **Flow Context**: From flow context variable
   - **Global Context**: From global context variable
   - **Environment Variable**: From environment variable

### Storage Options

#### Flow Context
```javascript
// Store in flow context
storeIn: "flow"
variableName: "dbCredentials"

// Access later
const credentials = flow.get("dbCredentials");
```

#### Global Context
```javascript
// Store in global context  
storeIn: "global"
variableName: "dbCredentials"

// Access later
const credentials = global.get("dbCredentials");
```

#### Environment Variables
```javascript
// For JSON secrets like: {"DB_HOST":"localhost","DB_USER":"admin"}
storeIn: "env"
// Each key becomes an environment variable automatically:
// process.env.DB_HOST = "localhost"
// process.env.DB_USER = "admin"
// No Variable Name needed - each JSON key becomes a separate env var
```

#### Output Data
```javascript
// Send secret directly to output
storeIn: "output"
// msg.payload will contain the secret value
```

### Example Flow

```json
[
    {
        "id": "inject-node",
        "type": "inject",
        "payload": "{}",
        "wires": [["secrets-node"]]
    },
    {
        "id": "secrets-node", 
        "type": "aws-secret-manager",
        "awsConfig": "aws-config",
        "secretId": "my-database-secret",
        "secretIdType": "str",
        "storeIn": "global",
        "variableName": "dbCredentials",
        "wires": [["debug-node"]]
    }
]
```

## Input

### Message Properties
- `msg.secretId` (optional): Secret ID if not configured in node

### Example Input
```javascript
msg = {
    secretId: "my-secret-name"
}
```

## Output

### Success Response (when storing in context/env)
```javascript
msg = {
    payload: {
        status: "Secret stored successfully",
        secretId: "my-secret-name"
    }
}
```

### Success Response (when outputting data)
```javascript
msg = {
    payload: {
        username: "admin",
        password: "secret123", 
        host: "database.example.com"
    }
}
```

### Error Response
```javascript
msg = {
    payload: {
        error: "Error message"
    }
}
```

## Security Best Practices

- ✅ Use IAM roles when possible (recommended for EC2 instances)
- ✅ Store credentials in context variables rather than hardcoding
- ✅ Use environment variables for sensitive configuration
- ✅ Rotate access keys regularly
- ✅ Follow the principle of least privilege
- ✅ Enable AWS CloudTrail for audit logging

## Error Handling

The node provides comprehensive error handling:

- **Configuration errors**: Missing or invalid AWS configuration
- **Authentication errors**: Invalid credentials or permissions
- **Secret not found**: Invalid secret ID or insufficient permissions
- **Network errors**: Connection issues with AWS

All errors are logged and sent in the message payload for downstream processing.

## Requirements

- Node.js >= 12.0.0
- Node-RED >= 2.0.0
- AWS account with Secrets Manager access
- Appropriate IAM permissions

## IAM Permissions

Minimum required permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:region:account:secret:*"
        }
    ]
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/lotockii/node-red-contrib-aws-asm/issues) on GitHub. 