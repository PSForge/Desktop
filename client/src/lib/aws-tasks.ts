import { escapePowerShellString, toPowerShellBoolean } from './powershell-utils';

export interface AWSTaskParameter {
  id: string;
  label: string;
  type: 'text' | 'email' | 'path' | 'number' | 'boolean' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[] | { value: string; label: string }[];
  defaultValue?: any;
}

export interface AWSTask {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: AWSTaskParameter[];
  scriptTemplate: (params: Record<string, any>) => string;
  isPremium: boolean;
}

export const awsTasks: AWSTask[] = [
  {
    id: 'aws-bulk-ec2-control',
    name: 'Bulk EC2 Start/Stop/Reboot',
    category: 'Bulk Operations',
    description: 'Control multiple EC2 instances at once',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'instanceIds', label: 'Instance IDs (comma-separated)', type: 'textarea', required: true, placeholder: 'i-1234567890abcdef0, i-0987654321fedcba0' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Start', 'Stop', 'Reboot'], defaultValue: 'Start' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const instanceIdsRaw = (params.instanceIds as string).split(',').map((n: string) => n.trim());
      const action = params.action;
      
      return `# AWS Bulk EC2 Control
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    $InstanceIds = @(${instanceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
${action === 'Start' ? `    Start-EC2Instance -InstanceId $InstanceIds
    Write-Host "✓ Starting $($InstanceIds.Count) instances..." -ForegroundColor Green` :
action === 'Stop' ? `    Stop-EC2Instance -InstanceId $InstanceIds -Force
    Write-Host "✓ Stopping $($InstanceIds.Count) instances..." -ForegroundColor Green` :
`    Restart-EC2Instance -InstanceId $InstanceIds
    Write-Host "✓ Rebooting $($InstanceIds.Count) instances..." -ForegroundColor Green`}
    
    Write-Host ""
    Write-Host "Bulk EC2 operation completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-create-ec2-instance',
    name: 'Create EC2 Instance',
    category: 'EC2 Management',
    description: 'Launch a new EC2 instance',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'amiId', label: 'AMI ID', type: 'text', required: true, placeholder: 'ami-0abcdef1234567890' },
      { id: 'instanceType', label: 'Instance Type', type: 'select', required: true, options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium'], defaultValue: 't2.micro' },
      { id: 'keyName', label: 'Key Pair Name', type: 'text', required: true },
      { id: 'securityGroup', label: 'Security Group ID', type: 'text', required: true }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const amiId = escapePowerShellString(params.amiId);
      const instanceType = params.instanceType;
      const keyName = escapePowerShellString(params.keyName);
      const securityGroup = escapePowerShellString(params.securityGroup);
      
      return `# Create AWS EC2 Instance
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    $Instance = New-EC2Instance \`
        -ImageId "${amiId}" \`
        -InstanceType "${instanceType}" \`
        -KeyName "${keyName}" \`
        -SecurityGroupId "${securityGroup}" \`
        -MinCount 1 \`
        -MaxCount 1
    
    $InstanceId = $Instance.Instances[0].InstanceId
    
    Write-Host "✓ EC2 instance created: $InstanceId" -ForegroundColor Green
    Write-Host "  AMI: ${amiId}" -ForegroundColor Cyan
    Write-Host "  Type: ${instanceType}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Instance creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-manage-s3-bucket',
    name: 'Manage S3 Bucket',
    category: 'S3 Storage',
    description: 'Create or configure S3 bucket',
    parameters: [
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create', 'Enable Versioning', 'Enable Encryption'], defaultValue: 'Create' }
    ],
    scriptTemplate: (params) => {
      const bucketName = escapePowerShellString(params.bucketName);
      const region = escapePowerShellString(params.region);
      const action = params.action;
      
      return `# AWS S3 Bucket Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create' ? `    New-S3Bucket -BucketName "${bucketName}" -Region "${region}"
    Write-Host "✓ S3 bucket created: ${bucketName}" -ForegroundColor Green` :
action === 'Enable Versioning' ? `    Write-S3BucketVersioning -BucketName "${bucketName}" -VersioningConfig_Status Enabled
    Write-Host "✓ Versioning enabled for: ${bucketName}" -ForegroundColor Green` :
`    $Config = New-Object Amazon.S3.Model.ServerSideEncryptionConfiguration
    $Rule = New-Object Amazon.S3.Model.ServerSideEncryptionRule
    $Rule.ApplyServerSideEncryptionByDefault = New-Object Amazon.S3.Model.ServerSideEncryptionByDefault
    $Rule.ApplyServerSideEncryptionByDefault.ServerSideEncryptionAlgorithm = "AES256"
    $Config.Rules.Add($Rule)
    
    Set-S3BucketEncryption -BucketName "${bucketName}" -ServerSideEncryptionConfiguration $Config
    Write-Host "✓ Encryption enabled for: ${bucketName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-create-iam-user',
    name: 'Create IAM User',
    category: 'IAM Management',
    description: 'Create IAM user with policy attachment',
    parameters: [
      { id: 'userName', label: 'User Name', type: 'text', required: true, placeholder: 'john.doe' },
      { id: 'policyArn', label: 'Policy ARN (optional)', type: 'text', required: false, placeholder: 'arn:aws:iam::aws:policy/ReadOnlyAccess' },
      { id: 'createAccessKey', label: 'Create Access Key', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const userName = escapePowerShellString(params.userName);
      const policyArn = params.policyArn ? escapePowerShellString(params.policyArn) : '';
      const createAccessKey = toPowerShellBoolean(params.createAccessKey);
      
      return `# Create AWS IAM User
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
    # Create user
    $User = New-IAMUser -UserName "${userName}"
    Write-Host "✓ IAM user created: ${userName}" -ForegroundColor Green
    
${policyArn ? `    # Attach policy
    Register-IAMUserPolicy -UserName "${userName}" -PolicyArn "${policyArn}"
    Write-Host "✓ Policy attached: ${policyArn}" -ForegroundColor Green
` : ''}
${createAccessKey ? `    # Create access key
    $AccessKey = New-IAMAccessKey -UserName "${userName}"
    Write-Host ""
    Write-Host "Access Key Created:" -ForegroundColor Cyan
    Write-Host "  Access Key ID: $($AccessKey.AccessKeyId)" -ForegroundColor Yellow
    Write-Host "  Secret Access Key: $($AccessKey.SecretAccessKey)" -ForegroundColor Yellow
    Write-Host "  ⚠ Save these credentials securely - they won't be shown again!" -ForegroundColor Red
` : ''}
} catch {
    Write-Error "User creation failed: $_"
}`;
    }
  ,
    isPremium: true
  }
];
