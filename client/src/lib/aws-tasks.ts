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
  },
  {
    id: 'aws-manage-ec2-instances',
    name: 'Manage EC2 Instances',
    category: 'Common Admin Tasks',
    description: 'Modify, terminate, or describe EC2 instances',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'instanceId', label: 'Instance ID', type: 'text', required: true, placeholder: 'i-1234567890abcdef0' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Describe', 'Modify Instance Type', 'Terminate'], defaultValue: 'Describe' },
      { id: 'newInstanceType', label: 'New Instance Type (for Modify)', type: 'select', required: false, options: ['t2.micro', 't2.small', 't2.medium', 't3.micro', 't3.small', 't3.medium'], defaultValue: 't2.small' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const instanceId = escapePowerShellString(params.instanceId);
      const action = params.action;
      const newInstanceType = params.newInstanceType;
      
      return `# AWS EC2 Instance Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Describe' ? `    $Instance = Get-EC2Instance -InstanceId "${instanceId}"
    Write-Host "✓ Instance Details:" -ForegroundColor Green
    Write-Host "  Instance ID: $($Instance.Instances[0].InstanceId)" -ForegroundColor Cyan
    Write-Host "  State: $($Instance.Instances[0].State.Name)" -ForegroundColor Cyan
    Write-Host "  Type: $($Instance.Instances[0].InstanceType)" -ForegroundColor Cyan
    Write-Host "  Public IP: $($Instance.Instances[0].PublicIpAddress)" -ForegroundColor Cyan` :
action === 'Modify Instance Type' ? `    # Stop instance if running
    $Instance = Get-EC2Instance -InstanceId "${instanceId}"
    if ($Instance.Instances[0].State.Name -eq "running") {
        Stop-EC2Instance -InstanceId "${instanceId}"
        Write-Host "Stopping instance..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
    
    # Modify instance type
    Edit-EC2InstanceAttribute -InstanceId "${instanceId}" -InstanceType "${newInstanceType}"
    Write-Host "✓ Instance type changed to: ${newInstanceType}" -ForegroundColor Green
    
    # Restart instance
    Start-EC2Instance -InstanceId "${instanceId}"
    Write-Host "✓ Instance restarted" -ForegroundColor Green` :
`    # Terminate instance
    Remove-EC2Instance -InstanceId "${instanceId}" -Force
    Write-Host "✓ Instance ${instanceId} terminated" -ForegroundColor Green`}
    
} catch {
    Write-Error "Operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-s3-lifecycle-policy',
    name: 'Manage S3 Bucket Lifecycle Policies',
    category: 'Common Admin Tasks',
    description: 'Configure lifecycle policies for S3 buckets',
    parameters: [
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'daysToGlacier', label: 'Days to Glacier Transition', type: 'number', required: false, placeholder: '90', defaultValue: 90 },
      { id: 'daysToExpire', label: 'Days to Expire', type: 'number', required: false, placeholder: '365', defaultValue: 365 }
    ],
    scriptTemplate: (params) => {
      const bucketName = escapePowerShellString(params.bucketName);
      const daysToGlacier = params.daysToGlacier || 90;
      const daysToExpire = params.daysToExpire || 365;
      
      return `# AWS S3 Lifecycle Policy Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3

try {
    $LifecycleConfig = New-Object Amazon.S3.Model.LifecycleConfiguration
    
    # Create lifecycle rule
    $Rule = New-Object Amazon.S3.Model.LifecycleRule
    $Rule.Id = "AutoArchiveRule"
    $Rule.Status = "Enabled"
    $Rule.Filter = New-Object Amazon.S3.Model.LifecycleRuleFilter
    $Rule.Filter.Prefix = ""
    
    # Transition to Glacier
    $GlacierTransition = New-Object Amazon.S3.Model.LifecycleTransition
    $GlacierTransition.Days = ${daysToGlacier}
    $GlacierTransition.StorageClass = "GLACIER"
    $Rule.Transitions.Add($GlacierTransition)
    
    # Expiration
    $Rule.Expiration = New-Object Amazon.S3.Model.LifecycleRuleExpiration
    $Rule.Expiration.Days = ${daysToExpire}
    
    $LifecycleConfig.Rules.Add($Rule)
    
    Write-S3LifecycleConfiguration -BucketName "${bucketName}" -Configuration $LifecycleConfig
    
    Write-Host "✓ Lifecycle policy configured for: ${bucketName}" -ForegroundColor Green
    Write-Host "  Glacier transition: ${daysToGlacier} days" -ForegroundColor Cyan
    Write-Host "  Expiration: ${daysToExpire} days" -ForegroundColor Cyan
    
} catch {
    Write-Error "Lifecycle policy configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-configure-iam-groups',
    name: 'Configure IAM Users and Groups',
    category: 'Common Admin Tasks',
    description: 'Create IAM groups and add users',
    parameters: [
      { id: 'groupName', label: 'Group Name', type: 'text', required: true, placeholder: 'Developers' },
      { id: 'userNames', label: 'User Names (comma-separated)', type: 'textarea', required: false, placeholder: 'user1, user2, user3' },
      { id: 'policyArn', label: 'Policy ARN', type: 'text', required: false, placeholder: 'arn:aws:iam::aws:policy/PowerUserAccess' }
    ],
    scriptTemplate: (params) => {
      const groupName = escapePowerShellString(params.groupName);
      const userNamesRaw = params.userNames ? (params.userNames as string).split(',').map((n: string) => n.trim()) : [];
      const policyArn = params.policyArn ? escapePowerShellString(params.policyArn) : '';
      
      return `# AWS IAM Group Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
    # Create group
    New-IAMGroup -GroupName "${groupName}"
    Write-Host "✓ IAM group created: ${groupName}" -ForegroundColor Green
    
${policyArn ? `    # Attach policy to group
    Register-IAMGroupPolicy -GroupName "${groupName}" -PolicyArn "${policyArn}"
    Write-Host "✓ Policy attached: ${policyArn}" -ForegroundColor Green
` : ''}
${userNamesRaw.length > 0 ? `    # Add users to group
    $Users = @(${userNamesRaw.map(u => `"${escapePowerShellString(u)}"`).join(', ')})
    foreach ($User in $Users) {
        Add-IAMUserToGroup -GroupName "${groupName}" -UserName $User
        Write-Host "✓ Added user: $User" -ForegroundColor Cyan
    }
` : ''}
    Write-Host ""
    Write-Host "IAM group configuration completed!" -ForegroundColor Green
    
} catch {
    Write-Error "Group configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-configure-iam-policies',
    name: 'Configure IAM Policies',
    category: 'Common Admin Tasks',
    description: 'Create custom IAM policies',
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'MyCustomPolicy' },
      { id: 'description', label: 'Policy Description', type: 'text', required: true, placeholder: 'Custom policy for...' },
      { id: 'service', label: 'AWS Service', type: 'select', required: true, options: ['s3', 'ec2', 'rds', 'lambda', 'dynamodb'], defaultValue: 's3' },
      { id: 'actions', label: 'Allowed Actions', type: 'select', required: true, options: ['Read Only', 'Read/Write', 'Full Access'], defaultValue: 'Read Only' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const description = escapePowerShellString(params.description);
      const service = params.service;
      const actions = params.actions;
      
      const actionMap: Record<string, string> = {
        'Read Only': `"${service}:Get*", "${service}:List*", "${service}:Describe*"`,
        'Read/Write': `"${service}:Get*", "${service}:List*", "${service}:Describe*", "${service}:Put*", "${service}:Create*", "${service}:Update*"`,
        'Full Access': `"${service}:*"`
      };
      
      return `# AWS IAM Policy Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
    $PolicyDocument = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Action = @(${actionMap[actions]})
                Resource = "*"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $Policy = New-IAMPolicy \`
        -PolicyName "${policyName}" \`
        -Description "${description}" \`
        -PolicyDocument $PolicyDocument
    
    Write-Host "✓ IAM policy created: ${policyName}" -ForegroundColor Green
    Write-Host "  ARN: $($Policy.Arn)" -ForegroundColor Cyan
    Write-Host "  Service: ${service}" -ForegroundColor Cyan
    Write-Host "  Actions: ${actions}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Policy creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-setup-cloudwatch-alarms',
    name: 'Set up CloudWatch Alarms',
    category: 'Common Admin Tasks',
    description: 'Create CloudWatch alarms for monitoring',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'alarmName', label: 'Alarm Name', type: 'text', required: true, placeholder: 'HighCPUAlarm' },
      { id: 'instanceId', label: 'Instance ID', type: 'text', required: true, placeholder: 'i-1234567890abcdef0' },
      { id: 'metricName', label: 'Metric', type: 'select', required: true, options: ['CPUUtilization', 'DiskReadBytes', 'DiskWriteBytes', 'NetworkIn', 'NetworkOut'], defaultValue: 'CPUUtilization' },
      { id: 'threshold', label: 'Threshold Value', type: 'number', required: true, placeholder: '80', defaultValue: 80 },
      { id: 'emailAddress', label: 'Notification Email', type: 'email', required: false, placeholder: 'admin@example.com' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const alarmName = escapePowerShellString(params.alarmName);
      const instanceId = escapePowerShellString(params.instanceId);
      const metricName = params.metricName;
      const threshold = params.threshold;
      const emailAddress = params.emailAddress ? escapePowerShellString(params.emailAddress) : '';
      
      return `# AWS CloudWatch Alarm Setup
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudWatch

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${emailAddress ? `    # Create SNS topic for notifications
    Import-Module AWS.Tools.SimpleNotificationService
    $Topic = New-SNSTopic -Name "${alarmName}-notifications"
    New-SNSSubscription -TopicArn $Topic -Protocol email -Endpoint "${emailAddress}"
    Write-Host "✓ SNS topic created and email subscription pending confirmation" -ForegroundColor Yellow
    
` : ''}    # Create CloudWatch alarm
    $Dimension = New-Object Amazon.CloudWatch.Model.Dimension
    $Dimension.Name = "InstanceId"
    $Dimension.Value = "${instanceId}"
    
    Write-CWMetricAlarm \`
        -AlarmName "${alarmName}" \`
        -ComparisonOperator GreaterThanThreshold \`
        -EvaluationPeriods 2 \`
        -MetricName "${metricName}" \`
        -Namespace "AWS/EC2" \`
        -Period 300 \`
        -Statistic Average \`
        -Threshold ${threshold} \`
        -ActionsEnabled \$true${emailAddress ? ` \`
        -AlarmAction $Topic` : ''} \`
        -Dimension $Dimension
    
    Write-Host "✓ CloudWatch alarm created: ${alarmName}" -ForegroundColor Green
    Write-Host "  Metric: ${metricName}" -ForegroundColor Cyan
    Write-Host "  Threshold: ${threshold}" -ForegroundColor Cyan
    Write-Host "  Instance: ${instanceId}" -ForegroundColor Cyan
    
} catch {
    Write-Error "Alarm creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-retrieve-cloudwatch-metrics',
    name: 'Retrieve CloudWatch Metrics',
    category: 'Common Admin Tasks',
    description: 'Get CloudWatch metrics for AWS resources',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'namespace', label: 'Namespace', type: 'select', required: true, options: ['AWS/EC2', 'AWS/RDS', 'AWS/ELB', 'AWS/Lambda', 'AWS/S3'], defaultValue: 'AWS/EC2' },
      { id: 'metricName', label: 'Metric Name', type: 'select', required: true, options: ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadBytes', 'DiskWriteBytes'], defaultValue: 'CPUUtilization' },
      { id: 'instanceId', label: 'Instance ID (for EC2)', type: 'text', required: false, placeholder: 'i-1234567890abcdef0' },
      { id: 'hours', label: 'Hours of History', type: 'number', required: true, placeholder: '24', defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const namespace = params.namespace;
      const metricName = params.metricName;
      const instanceId = params.instanceId ? escapePowerShellString(params.instanceId) : '';
      const hours = params.hours;
      
      return `# AWS CloudWatch Metrics Retrieval
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudWatch

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    $StartTime = (Get-Date).AddHours(-${hours})
    $EndTime = Get-Date
    
${instanceId ? `    $Dimension = New-Object Amazon.CloudWatch.Model.Dimension
    $Dimension.Name = "InstanceId"
    $Dimension.Value = "${instanceId}"
    
    $Metrics = Get-CWMetricStatistic \`
        -Namespace "${namespace}" \`
        -MetricName "${metricName}" \`
        -Dimension $Dimension \`
        -StartTime $StartTime \`
        -EndTime $EndTime \`
        -Period 3600 \`
        -Statistic Average
` : `    $Metrics = Get-CWMetricStatistic \`
        -Namespace "${namespace}" \`
        -MetricName "${metricName}" \`
        -StartTime $StartTime \`
        -EndTime $EndTime \`
        -Period 3600 \`
        -Statistic Average
`}
    Write-Host "✓ CloudWatch Metrics Retrieved:" -ForegroundColor Green
    Write-Host "  Namespace: ${namespace}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metricName}" -ForegroundColor Cyan
    Write-Host "  Period: Last ${hours} hours" -ForegroundColor Cyan
    Write-Host ""
    
    $Metrics.Datapoints | Sort-Object Timestamp | Format-Table Timestamp, Average, Unit -AutoSize
    
} catch {
    Write-Error "Metrics retrieval failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-manage-route53-dns',
    name: 'Manage Route53 DNS Zones',
    category: 'Common Admin Tasks',
    description: 'Create and manage Route53 hosted zones and records',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Hosted Zone', 'Add A Record', 'Add CNAME Record', 'List Records'], defaultValue: 'Create Hosted Zone' },
      { id: 'domainName', label: 'Domain Name', type: 'text', required: true, placeholder: 'example.com' },
      { id: 'recordName', label: 'Record Name (for records)', type: 'text', required: false, placeholder: 'www.example.com' },
      { id: 'recordValue', label: 'Record Value (IP or hostname)', type: 'text', required: false, placeholder: '192.0.2.1' },
      { id: 'ttl', label: 'TTL (seconds)', type: 'number', required: false, placeholder: '300', defaultValue: 300 }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const domainName = escapePowerShellString(params.domainName);
      const recordName = params.recordName ? escapePowerShellString(params.recordName) : '';
      const recordValue = params.recordValue ? escapePowerShellString(params.recordValue) : '';
      const ttl = params.ttl || 300;
      
      return `# AWS Route53 DNS Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Route53

try {
${action === 'Create Hosted Zone' ? `    $Zone = New-R53HostedZone -Name "${domainName}" -CallerReference (Get-Date).Ticks
    Write-Host "✓ Hosted zone created for: ${domainName}" -ForegroundColor Green
    Write-Host "  Zone ID: $($Zone.HostedZone.Id)" -ForegroundColor Cyan
    Write-Host "  Nameservers:" -ForegroundColor Cyan
    $Zone.DelegationSet.NameServers | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }` :
action === 'List Records' ? `    $Zones = Get-R53HostedZoneList | Where-Object { $_.Name -eq "${domainName}." }
    if ($Zones.Count -eq 0) {
        Write-Error "Hosted zone not found for: ${domainName}"
        exit
    }
    
    $ZoneId = $Zones[0].Id
    $Records = Get-R53ResourceRecordSet -HostedZoneId $ZoneId
    
    Write-Host "✓ DNS Records for ${domainName}:" -ForegroundColor Green
    $Records.ResourceRecordSets | Format-Table Name, Type, TTL, @{Name="Value";Expression={$_.ResourceRecords.Value}} -AutoSize` :
`    # Get hosted zone ID
    $Zones = Get-R53HostedZoneList | Where-Object { $_.Name -eq "${domainName}." }
    if ($Zones.Count -eq 0) {
        Write-Error "Hosted zone not found for: ${domainName}"
        exit
    }
    
    $ZoneId = $Zones[0].Id
    
    # Create record change
    $Change = New-Object Amazon.Route53.Model.Change
    $Change.Action = "CREATE"
    $Change.ResourceRecordSet = New-Object Amazon.Route53.Model.ResourceRecordSet
    $Change.ResourceRecordSet.Name = "${recordName}"
    $Change.ResourceRecordSet.Type = "${action === 'Add A Record' ? 'A' : 'CNAME'}"
    $Change.ResourceRecordSet.TTL = ${ttl}
    $Change.ResourceRecordSet.ResourceRecords.Add((New-Object Amazon.Route53.Model.ResourceRecord -Property @{Value="${recordValue}"}))
    
    $ChangeBatch = New-Object Amazon.Route53.Model.ChangeBatch
    $ChangeBatch.Changes.Add($Change)
    
    Edit-R53ResourceRecordSet -HostedZoneId $ZoneId -ChangeBatch $ChangeBatch
    
    Write-Host "✓ ${action === 'Add A Record' ? 'A' : 'CNAME'} record created" -ForegroundColor Green
    Write-Host "  Name: ${recordName}" -ForegroundColor Cyan
    Write-Host "  Value: ${recordValue}" -ForegroundColor Cyan
    Write-Host "  TTL: ${ttl}" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Route53 operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-create-modify-vpc',
    name: 'Create and Modify VPCs',
    category: 'Common Admin Tasks',
    description: 'Create and configure Virtual Private Clouds',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'cidrBlock', label: 'CIDR Block', type: 'text', required: true, placeholder: '10.0.0.0/16' },
      { id: 'vpcName', label: 'VPC Name', type: 'text', required: true, placeholder: 'MyVPC' },
      { id: 'enableDnsHostnames', label: 'Enable DNS Hostnames', type: 'boolean', required: false, defaultValue: true },
      { id: 'enableDnsSupport', label: 'Enable DNS Support', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const cidrBlock = escapePowerShellString(params.cidrBlock);
      const vpcName = escapePowerShellString(params.vpcName);
      const enableDnsHostnames = toPowerShellBoolean(params.enableDnsHostnames);
      const enableDnsSupport = toPowerShellBoolean(params.enableDnsSupport);
      
      return `# AWS VPC Creation
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Create VPC
    $Vpc = New-EC2Vpc -CidrBlock "${cidrBlock}"
    $VpcId = $Vpc.VpcId
    
    Write-Host "✓ VPC created: $VpcId" -ForegroundColor Green
    
    # Tag VPC
    New-EC2Tag -Resource $VpcId -Tag @{Key="Name";Value="${vpcName}"}
    
    # Enable DNS settings
    Edit-EC2VpcAttribute -VpcId $VpcId -EnableDnsHostnames ${enableDnsHostnames}
    Edit-EC2VpcAttribute -VpcId $VpcId -EnableDnsSupport ${enableDnsSupport}
    
    Write-Host "✓ VPC configuration completed" -ForegroundColor Green
    Write-Host "  VPC ID: $VpcId" -ForegroundColor Cyan
    Write-Host "  CIDR Block: ${cidrBlock}" -ForegroundColor Cyan
    Write-Host "  DNS Hostnames: ${enableDnsHostnames}" -ForegroundColor Cyan
    Write-Host "  DNS Support: ${enableDnsSupport}" -ForegroundColor Cyan
    
} catch {
    Write-Error "VPC creation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-configure-subnets-security-groups',
    name: 'Configure Subnets and Security Groups',
    category: 'Common Admin Tasks',
    description: 'Create subnets and security groups for VPCs',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'vpcId', label: 'VPC ID', type: 'text', required: true, placeholder: 'vpc-1234567890abcdef0' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Subnet', 'Create Security Group'], defaultValue: 'Create Subnet' },
      { id: 'cidrBlock', label: 'CIDR Block (for subnet)', type: 'text', required: false, placeholder: '10.0.1.0/24' },
      { id: 'availabilityZone', label: 'Availability Zone (for subnet)', type: 'text', required: false, placeholder: 'us-east-1a' },
      { id: 'sgName', label: 'Security Group Name', type: 'text', required: false, placeholder: 'WebServerSG' },
      { id: 'sgDescription', label: 'Security Group Description', type: 'text', required: false, placeholder: 'Allow HTTP and HTTPS' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const vpcId = escapePowerShellString(params.vpcId);
      const action = params.action;
      const cidrBlock = params.cidrBlock ? escapePowerShellString(params.cidrBlock) : '';
      const availabilityZone = params.availabilityZone ? escapePowerShellString(params.availabilityZone) : '';
      const sgName = params.sgName ? escapePowerShellString(params.sgName) : '';
      const sgDescription = params.sgDescription ? escapePowerShellString(params.sgDescription) : '';
      
      return `# AWS Subnet and Security Group Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Subnet' ? `    $Subnet = New-EC2Subnet \`
        -VpcId "${vpcId}" \`
        -CidrBlock "${cidrBlock}" \`
        -AvailabilityZone "${availabilityZone}"
    
    Write-Host "✓ Subnet created: $($Subnet.SubnetId)" -ForegroundColor Green
    Write-Host "  CIDR: ${cidrBlock}" -ForegroundColor Cyan
    Write-Host "  AZ: ${availabilityZone}" -ForegroundColor Cyan` :
`    # Create security group
    $SecurityGroup = New-EC2SecurityGroup \`
        -VpcId "${vpcId}" \`
        -GroupName "${sgName}" \`
        -Description "${sgDescription}"
    
    Write-Host "✓ Security group created: $SecurityGroup" -ForegroundColor Green
    
    # Add HTTP rule
    $IpPermission1 = New-Object Amazon.EC2.Model.IpPermission
    $IpPermission1.IpProtocol = "tcp"
    $IpPermission1.FromPort = 80
    $IpPermission1.ToPort = 80
    $IpPermission1.Ipv4Ranges.Add("0.0.0.0/0")
    
    # Add HTTPS rule
    $IpPermission2 = New-Object Amazon.EC2.Model.IpPermission
    $IpPermission2.IpProtocol = "tcp"
    $IpPermission2.FromPort = 443
    $IpPermission2.ToPort = 443
    $IpPermission2.Ipv4Ranges.Add("0.0.0.0/0")
    
    Grant-EC2SecurityGroupIngress -GroupId $SecurityGroup -IpPermission @($IpPermission1, $IpPermission2)
    
    Write-Host "✓ Ingress rules added (HTTP, HTTPS)" -ForegroundColor Green`}
    
} catch {
    Write-Error "Configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-generate-cost-billing-reports',
    name: 'Generate Cost and Billing Reports',
    category: 'Common Admin Tasks',
    description: 'Retrieve AWS cost and usage data',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true, placeholder: '2024-01-01' },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true, placeholder: '2024-01-31' },
      { id: 'granularity', label: 'Granularity', type: 'select', required: true, options: ['DAILY', 'MONTHLY'], defaultValue: 'MONTHLY' },
      { id: 'groupBy', label: 'Group By', type: 'select', required: true, options: ['SERVICE', 'REGION', 'USAGE_TYPE'], defaultValue: 'SERVICE' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const granularity = params.granularity;
      const groupBy = params.groupBy;
      
      return `# AWS Cost and Billing Report
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CostExplorer

try {
    $TimePeriod = New-Object Amazon.CostExplorer.Model.DateInterval
    $TimePeriod.Start = "${startDate}"
    $TimePeriod.End = "${endDate}"
    
    $GroupDefinition = New-Object Amazon.CostExplorer.Model.GroupDefinition
    $GroupDefinition.Type = "DIMENSION"
    $GroupDefinition.Key = "${groupBy}"
    
    $Result = Get-CECostAndUsage \`
        -TimePeriod $TimePeriod \`
        -Granularity ${granularity} \`
        -Metric "BlendedCost" \`
        -GroupBy $GroupDefinition
    
    Write-Host "✓ AWS Cost Report (${startDate} to ${endDate})" -ForegroundColor Green
    Write-Host ""
    
    foreach ($ResultByTime in $Result.ResultsByTime) {
        Write-Host "Period: $($ResultByTime.TimePeriod.Start) to $($ResultByTime.TimePeriod.End)" -ForegroundColor Cyan
        
        foreach ($Group in $ResultByTime.Groups) {
            $Service = $Group.Keys[0]
            $Cost = [math]::Round([decimal]$Group.Metrics["BlendedCost"].Amount, 2)
            Write-Host "  $Service : \$$Cost" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
} catch {
    Write-Error "Cost report generation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-manage-ec2-snapshots',
    name: 'Manage EC2 Snapshots',
    category: 'Common Admin Tasks',
    description: 'Create and manage EBS volume snapshots',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Snapshot', 'List Snapshots', 'Delete Snapshot'], defaultValue: 'Create Snapshot' },
      { id: 'volumeId', label: 'Volume ID (for create)', type: 'text', required: false, placeholder: 'vol-1234567890abcdef0' },
      { id: 'description', label: 'Snapshot Description', type: 'text', required: false, placeholder: 'Daily backup' },
      { id: 'snapshotId', label: 'Snapshot ID (for delete)', type: 'text', required: false, placeholder: 'snap-1234567890abcdef0' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const volumeId = params.volumeId ? escapePowerShellString(params.volumeId) : '';
      const description = params.description ? escapePowerShellString(params.description) : 'Snapshot created by PSForge';
      const snapshotId = params.snapshotId ? escapePowerShellString(params.snapshotId) : '';
      
      return `# AWS EC2 Snapshot Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Snapshot' ? `    $Snapshot = New-EC2Snapshot -VolumeId "${volumeId}" -Description "${description}"
    Write-Host "✓ Snapshot created: $($Snapshot.SnapshotId)" -ForegroundColor Green
    Write-Host "  Volume: ${volumeId}" -ForegroundColor Cyan
    Write-Host "  Description: ${description}" -ForegroundColor Cyan
    Write-Host "  State: $($Snapshot.State)" -ForegroundColor Cyan` :
action === 'List Snapshots' ? `    $Snapshots = Get-EC2Snapshot -OwnerIds self
    
    Write-Host "✓ Your EBS Snapshots:" -ForegroundColor Green
    $Snapshots | Sort-Object StartTime -Descending | Select-Object -First 20 | Format-Table SnapshotId, VolumeId, State, StartTime, VolumeSize, Description -AutoSize` :
`    Remove-EC2Snapshot -SnapshotId "${snapshotId}" -Force
    Write-Host "✓ Snapshot deleted: ${snapshotId}" -ForegroundColor Green`}
    
} catch {
    Write-Error "Snapshot operation failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-configure-s3-bucket-permissions',
    name: 'Configure S3 Bucket Permissions',
    category: 'Common Admin Tasks',
    description: 'Manage S3 bucket access control and policies',
    parameters: [
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Block Public Access', 'Allow Public Read', 'Add Bucket Policy'], defaultValue: 'Block Public Access' },
      { id: 'principalArn', label: 'Principal ARN (for policy)', type: 'text', required: false, placeholder: 'arn:aws:iam::123456789012:user/username' }
    ],
    scriptTemplate: (params) => {
      const bucketName = escapePowerShellString(params.bucketName);
      const action = params.action;
      const principalArn = params.principalArn ? escapePowerShellString(params.principalArn) : '';
      
      return `# AWS S3 Bucket Permissions Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3

try {
${action === 'Block Public Access' ? `    $PublicAccessBlockConfig = New-Object Amazon.S3.Model.PublicAccessBlockConfiguration
    $PublicAccessBlockConfig.BlockPublicAcls = \$true
    $PublicAccessBlockConfig.IgnorePublicAcls = \$true
    $PublicAccessBlockConfig.BlockPublicPolicy = \$true
    $PublicAccessBlockConfig.RestrictPublicBuckets = \$true
    
    Add-S3PublicAccessBlock -BucketName "${bucketName}" -PublicAccessBlockConfiguration $PublicAccessBlockConfig
    
    Write-Host "✓ Public access blocked for: ${bucketName}" -ForegroundColor Green` :
action === 'Allow Public Read' ? `    $Policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${bucketName}/*"
        }
    ]
}
"@
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy
    
    Write-Host "✓ Public read access enabled for: ${bucketName}" -ForegroundColor Green
    Write-Host "  ⚠ Bucket is now publicly accessible!" -ForegroundColor Yellow` :
`    $Policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "${principalArn}"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::${bucketName}/*"
        }
    ]
}
"@
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy
    
    Write-Host "✓ Bucket policy added for: ${bucketName}" -ForegroundColor Green
    Write-Host "  Principal: ${principalArn}" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Permission configuration failed: $_"
}`;
    }
  ,
    isPremium: true
  },
  {
    id: 'aws-manage-lambda-functions',
    name: 'Manage Lambda Functions',
    category: 'Common Admin Tasks',
    description: 'Create, update, and invoke Lambda functions',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Function', 'Update Code', 'Invoke Function', 'List Functions'], defaultValue: 'Create Function' },
      { id: 'functionName', label: 'Function Name', type: 'text', required: true, placeholder: 'MyFunction' },
      { id: 'runtime', label: 'Runtime', type: 'select', required: false, options: ['python3.11', 'python3.10', 'nodejs20.x', 'nodejs18.x', 'java17', 'dotnet8'], defaultValue: 'python3.11' },
      { id: 'handler', label: 'Handler', type: 'text', required: false, placeholder: 'index.handler', defaultValue: 'index.handler' },
      { id: 'roleArn', label: 'IAM Role ARN', type: 'text', required: false, placeholder: 'arn:aws:iam::123456789012:role/lambda-role' },
      { id: 'zipFilePath', label: 'Code Zip File Path', type: 'path', required: false, placeholder: 'C:\\code\\function.zip' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const functionName = escapePowerShellString(params.functionName);
      const runtime = params.runtime;
      const handler = escapePowerShellString(params.handler || 'index.handler');
      const roleArn = params.roleArn ? escapePowerShellString(params.roleArn) : '';
      const zipFilePath = params.zipFilePath ? escapePowerShellString(params.zipFilePath) : '';
      
      return `# AWS Lambda Function Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Lambda

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Function' ? `    # Read zip file
    $ZipContent = [System.IO.File]::ReadAllBytes("${zipFilePath}")
    $MemoryStream = New-Object System.IO.MemoryStream
    $MemoryStream.Write($ZipContent, 0, $ZipContent.Length)
    
    # Create Lambda function
    Publish-LMFunction \`
        -FunctionName "${functionName}" \`
        -Runtime "${runtime}" \`
        -Handler "${handler}" \`
        -Role "${roleArn}" \`
        -ZipFileContent $MemoryStream.ToArray()
    
    Write-Host "✓ Lambda function created: ${functionName}" -ForegroundColor Green
    Write-Host "  Runtime: ${runtime}" -ForegroundColor Cyan
    Write-Host "  Handler: ${handler}" -ForegroundColor Cyan` :
action === 'Update Code' ? `    # Read zip file
    $ZipContent = [System.IO.File]::ReadAllBytes("${zipFilePath}")
    $MemoryStream = New-Object System.IO.MemoryStream
    $MemoryStream.Write($ZipContent, 0, $ZipContent.Length)
    
    # Update Lambda function code
    Update-LMFunctionCode \`
        -FunctionName "${functionName}" \`
        -ZipFileContent $MemoryStream.ToArray()
    
    Write-Host "✓ Lambda function code updated: ${functionName}" -ForegroundColor Green` :
action === 'Invoke Function' ? `    # Invoke Lambda function
    $Response = Invoke-LMFunction -FunctionName "${functionName}" -InvocationType RequestResponse
    
    $Payload = [System.Text.Encoding]::UTF8.GetString($Response.Payload.ToArray())
    
    Write-Host "✓ Lambda function invoked: ${functionName}" -ForegroundColor Green
    Write-Host "  Status Code: $($Response.StatusCode)" -ForegroundColor Cyan
    Write-Host "  Payload:" -ForegroundColor Cyan
    Write-Host $Payload -ForegroundColor Yellow` :
`    # List Lambda functions
    $Functions = Get-LMFunctionList
    
    Write-Host "✓ Lambda Functions:" -ForegroundColor Green
    $Functions | Format-Table FunctionName, Runtime, Handler, LastModified, CodeSize -AutoSize`}
    
} catch {
    Write-Error "Lambda operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-configure-rds-instances',
    name: 'Configure RDS Database Instances',
    category: 'Common Admin Tasks',
    description: 'Create RDS instances, configure backups, and manage snapshots',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Instance', 'Create Snapshot', 'Modify Backup Settings', 'List Instances'], defaultValue: 'Create Instance' },
      { id: 'dbInstanceIdentifier', label: 'DB Instance Identifier', type: 'text', required: true, placeholder: 'mydbinstance' },
      { id: 'engine', label: 'Database Engine', type: 'select', required: false, options: ['mysql', 'postgres', 'mariadb', 'oracle-se2', 'sqlserver-ex'], defaultValue: 'mysql' },
      { id: 'instanceClass', label: 'Instance Class', type: 'select', required: false, options: ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.r5.large', 'db.r5.xlarge'], defaultValue: 'db.t3.micro' },
      { id: 'allocatedStorage', label: 'Allocated Storage (GB)', type: 'number', required: false, placeholder: '20', defaultValue: 20 },
      { id: 'masterUsername', label: 'Master Username', type: 'text', required: false, placeholder: 'admin' },
      { id: 'backupRetentionPeriod', label: 'Backup Retention (days)', type: 'number', required: false, placeholder: '7', defaultValue: 7 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const dbInstanceIdentifier = escapePowerShellString(params.dbInstanceIdentifier);
      const engine = params.engine;
      const instanceClass = params.instanceClass;
      const allocatedStorage = params.allocatedStorage || 20;
      const masterUsername = params.masterUsername ? escapePowerShellString(params.masterUsername) : 'admin';
      const backupRetentionPeriod = params.backupRetentionPeriod || 7;
      
      return `# AWS RDS Database Instance Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.RDS

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Instance' ? `    # Generate secure password
    $MasterPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_})
    
    # Create RDS instance
    New-RDSDBInstance \`
        -DBInstanceIdentifier "${dbInstanceIdentifier}" \`
        -Engine "${engine}" \`
        -DBInstanceClass "${instanceClass}" \`
        -AllocatedStorage ${allocatedStorage} \`
        -MasterUsername "${masterUsername}" \`
        -MasterUserPassword $MasterPassword \`
        -BackupRetentionPeriod ${backupRetentionPeriod} \`
        -StorageEncrypted \$true
    
    Write-Host "✓ RDS instance creation initiated: ${dbInstanceIdentifier}" -ForegroundColor Green
    Write-Host "  Engine: ${engine}" -ForegroundColor Cyan
    Write-Host "  Instance Class: ${instanceClass}" -ForegroundColor Cyan
    Write-Host "  Storage: ${allocatedStorage} GB" -ForegroundColor Cyan
    Write-Host "  Master Username: ${masterUsername}" -ForegroundColor Cyan
    Write-Host "  Master Password: $MasterPassword" -ForegroundColor Yellow
    Write-Host "  ⚠ Save the password securely - it won't be shown again!" -ForegroundColor Red` :
action === 'Create Snapshot' ? `    # Create manual snapshot
    $SnapshotId = "${dbInstanceIdentifier}-snapshot-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    New-RDSDBSnapshot \`
        -DBSnapshotIdentifier $SnapshotId \`
        -DBInstanceIdentifier "${dbInstanceIdentifier}"
    
    Write-Host "✓ RDS snapshot creation initiated: $SnapshotId" -ForegroundColor Green
    Write-Host "  DB Instance: ${dbInstanceIdentifier}" -ForegroundColor Cyan` :
action === 'Modify Backup Settings' ? `    # Modify backup retention period
    Edit-RDSDBInstance \`
        -DBInstanceIdentifier "${dbInstanceIdentifier}" \`
        -BackupRetentionPeriod ${backupRetentionPeriod} \`
        -ApplyImmediately \$true
    
    Write-Host "✓ Backup settings updated for: ${dbInstanceIdentifier}" -ForegroundColor Green
    Write-Host "  Backup Retention: ${backupRetentionPeriod} days" -ForegroundColor Cyan` :
`    # List RDS instances
    $Instances = Get-RDSDBInstance
    
    Write-Host "✓ RDS Database Instances:" -ForegroundColor Green
    $Instances | Format-Table DBInstanceIdentifier, Engine, DBInstanceClass, DBInstanceStatus, AllocatedStorage -AutoSize`}
    
} catch {
    Write-Error "RDS operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-manage-eks-clusters',
    name: 'Manage Elastic Kubernetes Service (EKS)',
    category: 'Common Admin Tasks',
    description: 'Create EKS clusters and manage node groups',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Cluster', 'Create Node Group', 'List Clusters', 'Describe Cluster'], defaultValue: 'Create Cluster' },
      { id: 'clusterName', label: 'Cluster Name', type: 'text', required: true, placeholder: 'my-eks-cluster' },
      { id: 'roleArn', label: 'Service Role ARN', type: 'text', required: false, placeholder: 'arn:aws:iam::123456789012:role/eks-service-role' },
      { id: 'subnetIds', label: 'Subnet IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'subnet-12345, subnet-67890' },
      { id: 'nodeGroupName', label: 'Node Group Name', type: 'text', required: false, placeholder: 'my-node-group' },
      { id: 'instanceTypes', label: 'Instance Types', type: 'select', required: false, options: ['t3.medium', 't3.large', 'm5.large', 'm5.xlarge'], defaultValue: 't3.medium' },
      { id: 'desiredSize', label: 'Desired Node Count', type: 'number', required: false, placeholder: '2', defaultValue: 2 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const clusterName = escapePowerShellString(params.clusterName);
      const roleArn = params.roleArn ? escapePowerShellString(params.roleArn) : '';
      const subnetIdsRaw = params.subnetIds ? (params.subnetIds as string).split(',').map((n: string) => n.trim()) : [];
      const nodeGroupName = params.nodeGroupName ? escapePowerShellString(params.nodeGroupName) : 'default-node-group';
      const instanceTypes = params.instanceTypes;
      const desiredSize = params.desiredSize || 2;
      
      return `# AWS EKS Cluster Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EKS

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Cluster' ? `    # Create EKS cluster
    $ResourcesVpcConfig = New-Object Amazon.EKS.Model.VpcConfigRequest
    $ResourcesVpcConfig.SubnetIds = @(${subnetIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')})
    
    New-EKSCluster \`
        -Name "${clusterName}" \`
        -RoleArn "${roleArn}" \`
        -ResourcesVpcConfig $ResourcesVpcConfig
    
    Write-Host "✓ EKS cluster creation initiated: ${clusterName}" -ForegroundColor Green
    Write-Host "  This may take 10-15 minutes to complete" -ForegroundColor Yellow
    Write-Host "  Role ARN: ${roleArn}" -ForegroundColor Cyan` :
action === 'Create Node Group' ? `    # Create managed node group
    $ScalingConfig = New-Object Amazon.EKS.Model.NodegroupScalingConfig
    $ScalingConfig.DesiredSize = ${desiredSize}
    $ScalingConfig.MinSize = 1
    $ScalingConfig.MaxSize = 4
    
    New-EKSNodegroup \`
        -ClusterName "${clusterName}" \`
        -NodegroupName "${nodeGroupName}" \`
        -ScalingConfig $ScalingConfig \`
        -Subnet @(${subnetIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) \`
        -InstanceType @("${instanceTypes}") \`
        -NodeRole "${roleArn}"
    
    Write-Host "✓ Node group creation initiated: ${nodeGroupName}" -ForegroundColor Green
    Write-Host "  Cluster: ${clusterName}" -ForegroundColor Cyan
    Write-Host "  Instance Type: ${instanceTypes}" -ForegroundColor Cyan
    Write-Host "  Desired Size: ${desiredSize}" -ForegroundColor Cyan` :
action === 'Describe Cluster' ? `    # Get cluster details
    $Cluster = Get-EKSCluster -Name "${clusterName}"
    
    Write-Host "✓ EKS Cluster Details:" -ForegroundColor Green
    Write-Host "  Name: $($Cluster.Name)" -ForegroundColor Cyan
    Write-Host "  Status: $($Cluster.Status)" -ForegroundColor Cyan
    Write-Host "  Version: $($Cluster.Version)" -ForegroundColor Cyan
    Write-Host "  Endpoint: $($Cluster.Endpoint)" -ForegroundColor Cyan
    Write-Host "  Created: $($Cluster.CreatedAt)" -ForegroundColor Cyan` :
`    # List EKS clusters
    $Clusters = Get-EKSClusterList
    
    Write-Host "✓ EKS Clusters:" -ForegroundColor Green
    foreach ($Name in $Clusters) {
        $ClusterInfo = Get-EKSCluster -Name $Name
        Write-Host "  $Name - Status: $($ClusterInfo.Status) - Version: $($ClusterInfo.Version)" -ForegroundColor Cyan
    }`}
    
} catch {
    Write-Error "EKS operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-configure-systems-manager',
    name: 'Configure AWS Systems Manager',
    category: 'Common Admin Tasks',
    description: 'Run commands, manage parameter store, and patch management',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Run Command', 'Put Parameter', 'Get Parameter', 'Create Patch Baseline'], defaultValue: 'Run Command' },
      { id: 'instanceIds', label: 'Instance IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'i-1234567890abcdef0, i-0987654321fedcba0' },
      { id: 'command', label: 'Command to Run', type: 'textarea', required: false, placeholder: 'Get-Service' },
      { id: 'parameterName', label: 'Parameter Name', type: 'text', required: false, placeholder: '/myapp/database/password' },
      { id: 'parameterValue', label: 'Parameter Value', type: 'text', required: false, placeholder: 'SecurePassword123!' },
      { id: 'parameterType', label: 'Parameter Type', type: 'select', required: false, options: ['String', 'SecureString', 'StringList'], defaultValue: 'String' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const instanceIdsRaw = params.instanceIds ? (params.instanceIds as string).split(',').map((n: string) => n.trim()) : [];
      const command = params.command ? escapePowerShellString(params.command) : '';
      const parameterName = params.parameterName ? escapePowerShellString(params.parameterName) : '';
      const parameterValue = params.parameterValue ? escapePowerShellString(params.parameterValue) : '';
      const parameterType = params.parameterType;
      
      return `# AWS Systems Manager Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.SimpleSystemsManagement

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Run Command' ? `    # Send command to instances
    $Response = Send-SSMCommand \`
        -DocumentName "AWS-RunPowerShellScript" \`
        -InstanceId @(${instanceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) \`
        -Parameter @{commands="${command}"}
    
    Write-Host "✓ Command sent successfully" -ForegroundColor Green
    Write-Host "  Command ID: $($Response.CommandId)" -ForegroundColor Cyan
    Write-Host "  Targets: ${instanceIdsRaw.length} instance(s)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Use Get-SSMCommandInvocation to check command status" -ForegroundColor Yellow` :
action === 'Put Parameter' ? `    # Store parameter
    Write-SSMParameter \`
        -Name "${parameterName}" \`
        -Value "${parameterValue}" \`
        -Type "${parameterType}" \`
        -Overwrite \$true
    
    Write-Host "✓ Parameter stored successfully" -ForegroundColor Green
    Write-Host "  Name: ${parameterName}" -ForegroundColor Cyan
    Write-Host "  Type: ${parameterType}" -ForegroundColor Cyan` :
action === 'Get Parameter' ? `    # Retrieve parameter
    $Parameter = Get-SSMParameter -Name "${parameterName}" -WithDecryption \$true
    
    Write-Host "✓ Parameter retrieved successfully" -ForegroundColor Green
    Write-Host "  Name: $($Parameter.Name)" -ForegroundColor Cyan
    Write-Host "  Type: $($Parameter.Type)" -ForegroundColor Cyan
    Write-Host "  Value: $($Parameter.Value)" -ForegroundColor Yellow
    Write-Host "  Last Modified: $($Parameter.LastModifiedDate)" -ForegroundColor Cyan` :
`    # Create patch baseline
    New-SSMPatchBaseline \`
        -Name "CustomPatchBaseline" \`
        -OperatingSystem "WINDOWS" \`
        -ApprovalRule @(
            @{
                PatchFilterGroup = @{
                    PatchFilter = @(
                        @{
                            Key = "CLASSIFICATION"
                            Value = @("SecurityUpdates", "CriticalUpdates")
                        }
                    )
                }
                ApproveAfterDays = 7
                EnableNonSecurity = \$false
            }
        )
    
    Write-Host "✓ Patch baseline created successfully" -ForegroundColor Green`}
    
} catch {
    Write-Error "Systems Manager operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-manage-autoscaling-groups',
    name: 'Manage Auto Scaling Groups',
    category: 'Common Admin Tasks',
    description: 'Create ASGs, configure scaling policies and schedules',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create ASG', 'Update Capacity', 'Create Scaling Policy', 'List ASGs'], defaultValue: 'Create ASG' },
      { id: 'asgName', label: 'Auto Scaling Group Name', type: 'text', required: true, placeholder: 'my-asg' },
      { id: 'launchTemplateId', label: 'Launch Template ID', type: 'text', required: false, placeholder: 'lt-1234567890abcdef0' },
      { id: 'minSize', label: 'Minimum Size', type: 'number', required: false, placeholder: '1', defaultValue: 1 },
      { id: 'maxSize', label: 'Maximum Size', type: 'number', required: false, placeholder: '4', defaultValue: 4 },
      { id: 'desiredCapacity', label: 'Desired Capacity', type: 'number', required: false, placeholder: '2', defaultValue: 2 },
      { id: 'subnetIds', label: 'Subnet IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'subnet-12345, subnet-67890' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const asgName = escapePowerShellString(params.asgName);
      const launchTemplateId = params.launchTemplateId ? escapePowerShellString(params.launchTemplateId) : '';
      const minSize = params.minSize || 1;
      const maxSize = params.maxSize || 4;
      const desiredCapacity = params.desiredCapacity || 2;
      const subnetIdsRaw = params.subnetIds ? (params.subnetIds as string).split(',').map((n: string) => n.trim()) : [];
      
      return `# AWS Auto Scaling Group Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.AutoScaling

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create ASG' ? `    # Create Auto Scaling Group
    $LaunchTemplate = New-Object Amazon.AutoScaling.Model.LaunchTemplateSpecification
    $LaunchTemplate.LaunchTemplateId = "${launchTemplateId}"
    $LaunchTemplate.Version = "\$Latest"
    
    New-ASAutoScalingGroup \`
        -AutoScalingGroupName "${asgName}" \`
        -LaunchTemplate $LaunchTemplate \`
        -MinSize ${minSize} \`
        -MaxSize ${maxSize} \`
        -DesiredCapacity ${desiredCapacity} \`
        -VPCZoneIdentifier "${subnetIdsRaw.join(',')}"
    
    Write-Host "✓ Auto Scaling Group created: ${asgName}" -ForegroundColor Green
    Write-Host "  Min Size: ${minSize}" -ForegroundColor Cyan
    Write-Host "  Max Size: ${maxSize}" -ForegroundColor Cyan
    Write-Host "  Desired Capacity: ${desiredCapacity}" -ForegroundColor Cyan` :
action === 'Update Capacity' ? `    # Update Auto Scaling Group capacity
    Update-ASAutoScalingGroup \`
        -AutoScalingGroupName "${asgName}" \`
        -MinSize ${minSize} \`
        -MaxSize ${maxSize} \`
        -DesiredCapacity ${desiredCapacity}
    
    Write-Host "✓ Auto Scaling Group updated: ${asgName}" -ForegroundColor Green
    Write-Host "  New Min Size: ${minSize}" -ForegroundColor Cyan
    Write-Host "  New Max Size: ${maxSize}" -ForegroundColor Cyan
    Write-Host "  New Desired Capacity: ${desiredCapacity}" -ForegroundColor Cyan` :
action === 'Create Scaling Policy' ? `    # Create target tracking scaling policy
    $TargetTrackingConfig = New-Object Amazon.AutoScaling.Model.TargetTrackingConfiguration
    $TargetTrackingConfig.TargetValue = 50.0
    $TargetTrackingConfig.PredefinedMetricSpecification = New-Object Amazon.AutoScaling.Model.PredefinedMetricSpecification
    $TargetTrackingConfig.PredefinedMetricSpecification.PredefinedMetricType = "ASGAverageCPUUtilization"
    
    Write-ASScalingPolicy \`
        -AutoScalingGroupName "${asgName}" \`
        -PolicyName "${asgName}-cpu-scaling-policy" \`
        -PolicyType "TargetTrackingScaling" \`
        -TargetTrackingConfiguration $TargetTrackingConfig
    
    Write-Host "✓ Scaling policy created for: ${asgName}" -ForegroundColor Green
    Write-Host "  Policy Type: Target Tracking" -ForegroundColor Cyan
    Write-Host "  Target: 50% CPU Utilization" -ForegroundColor Cyan` :
`    # List Auto Scaling Groups
    $ASGs = Get-ASAutoScalingGroup
    
    Write-Host "✓ Auto Scaling Groups:" -ForegroundColor Green
    $ASGs | Format-Table AutoScalingGroupName, MinSize, MaxSize, DesiredCapacity, @{Name="Instances";Expression={$_.Instances.Count}} -AutoSize`}
    
} catch {
    Write-Error "Auto Scaling operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-configure-config-rules',
    name: 'Configure AWS Config Rules',
    category: 'Common Admin Tasks',
    description: 'Set up compliance rules and remediation actions',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Enable Config', 'Create Rule', 'List Rules', 'Get Compliance'], defaultValue: 'Enable Config' },
      { id: 'bucketName', label: 'S3 Bucket for Config', type: 'text', required: false, placeholder: 'my-config-bucket' },
      { id: 'ruleType', label: 'Rule Type', type: 'select', required: false, options: ['encrypted-volumes', 'required-tags', 's3-bucket-public-read-prohibited', 'iam-password-policy'], defaultValue: 'encrypted-volumes' },
      { id: 'ruleName', label: 'Rule Name', type: 'text', required: false, placeholder: 'check-encrypted-volumes' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const bucketName = params.bucketName ? escapePowerShellString(params.bucketName) : '';
      const ruleType = params.ruleType;
      const ruleName = params.ruleName ? escapePowerShellString(params.ruleName) : 'compliance-rule';
      
      const ruleMap: Record<string, string> = {
        'encrypted-volumes': 'ENCRYPTED_VOLUMES',
        'required-tags': 'REQUIRED_TAGS',
        's3-bucket-public-read-prohibited': 'S3_BUCKET_PUBLIC_READ_PROHIBITED',
        'iam-password-policy': 'IAM_PASSWORD_POLICY'
      };
      
      return `# AWS Config Rules Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.ConfigService

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Enable Config' ? `    # Create configuration recorder
    $RecordingGroup = New-Object Amazon.ConfigService.Model.RecordingGroup
    $RecordingGroup.AllSupported = \$true
    $RecordingGroup.IncludeGlobalResourceTypes = \$true
    
    Write-CFGConfigurationRecorder \`
        -ConfigurationRecorderName "default" \`
        -RecordingGroup $RecordingGroup \`
        -RoleARN "arn:aws:iam::$(Get-STSCallerIdentity).Account:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig"
    
    # Create delivery channel
    Write-CFGDeliveryChannel \`
        -DeliveryChannelName "default" \`
        -S3BucketName "${bucketName}"
    
    # Start configuration recorder
    Start-CFGConfigurationRecorder -ConfigurationRecorderName "default"
    
    Write-Host "✓ AWS Config enabled successfully" -ForegroundColor Green
    Write-Host "  S3 Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Recording: All supported resources" -ForegroundColor Cyan` :
action === 'Create Rule' ? `    # Create managed config rule
    $Source = New-Object Amazon.ConfigService.Model.Source
    $Source.Owner = "AWS"
    $Source.SourceIdentifier = "${ruleMap[ruleType]}"
    
    Write-CFGConfigRule \`
        -ConfigRuleName "${ruleName}" \`
        -Source $Source
    
    Write-Host "✓ Config rule created: ${ruleName}" -ForegroundColor Green
    Write-Host "  Type: ${ruleType}" -ForegroundColor Cyan
    Write-Host "  Source: AWS Managed Rule" -ForegroundColor Cyan` :
action === 'Get Compliance' ? `    # Get compliance summary
    $ComplianceSummary = Get-CFGComplianceSummaryByConfigRule
    
    Write-Host "✓ Config Rules Compliance Summary:" -ForegroundColor Green
    Write-Host "  Compliant Rules: $($ComplianceSummary.CompliantResourceCount.CappedCount)" -ForegroundColor Green
    Write-Host "  Non-Compliant Rules: $($ComplianceSummary.NonCompliantResourceCount.CappedCount)" -ForegroundColor Red
    Write-Host ""
    
    # Get detailed compliance
    $Rules = Get-CFGConfigRule
    foreach ($Rule in $Rules) {
        $Compliance = Get-CFGComplianceByConfigRule -ConfigRuleName $Rule.ConfigRuleName
        Write-Host "  $($Rule.ConfigRuleName): $($Compliance.ComplianceType)" -ForegroundColor Cyan
    }` :
`    # List all config rules
    $Rules = Get-CFGConfigRule
    
    Write-Host "✓ AWS Config Rules:" -ForegroundColor Green
    $Rules | Format-Table ConfigRuleName, ConfigRuleState, @{Name="Source";Expression={$_.Source.Owner}} -AutoSize`}
    
} catch {
    Write-Error "Config operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-manage-load-balancers',
    name: 'Manage Elastic Load Balancers',
    category: 'Common Admin Tasks',
    description: 'Create ALB/NLB, configure listeners and target groups',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create ALB', 'Create Target Group', 'Create Listener', 'List Load Balancers'], defaultValue: 'Create ALB' },
      { id: 'lbName', label: 'Load Balancer Name', type: 'text', required: true, placeholder: 'my-load-balancer' },
      { id: 'subnetIds', label: 'Subnet IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'subnet-12345, subnet-67890' },
      { id: 'securityGroups', label: 'Security Group IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'sg-12345, sg-67890' },
      { id: 'targetGroupName', label: 'Target Group Name', type: 'text', required: false, placeholder: 'my-target-group' },
      { id: 'vpcId', label: 'VPC ID', type: 'text', required: false, placeholder: 'vpc-1234567890abcdef0' },
      { id: 'port', label: 'Port', type: 'number', required: false, placeholder: '80', defaultValue: 80 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const lbName = escapePowerShellString(params.lbName);
      const subnetIdsRaw = params.subnetIds ? (params.subnetIds as string).split(',').map((n: string) => n.trim()) : [];
      const securityGroupsRaw = params.securityGroups ? (params.securityGroups as string).split(',').map((n: string) => n.trim()) : [];
      const targetGroupName = params.targetGroupName ? escapePowerShellString(params.targetGroupName) : '';
      const vpcId = params.vpcId ? escapePowerShellString(params.vpcId) : '';
      const port = params.port || 80;
      
      return `# AWS Elastic Load Balancer Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.ElasticLoadBalancingV2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create ALB' ? `    # Create Application Load Balancer
    $LoadBalancer = New-ELB2LoadBalancer \`
        -Name "${lbName}" \`
        -Type "application" \`
        -Subnet @(${subnetIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) \`
        -SecurityGroup @(${securityGroupsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) \`
        -Scheme "internet-facing" \`
        -IpAddressType "ipv4"
    
    Write-Host "✓ Application Load Balancer created: ${lbName}" -ForegroundColor Green
    Write-Host "  ARN: $($LoadBalancer[0].LoadBalancerArn)" -ForegroundColor Cyan
    Write-Host "  DNS Name: $($LoadBalancer[0].DNSName)" -ForegroundColor Yellow
    Write-Host "  State: $($LoadBalancer[0].State.Code)" -ForegroundColor Cyan` :
action === 'Create Target Group' ? `    # Create target group
    $TargetGroup = New-ELB2TargetGroup \`
        -Name "${targetGroupName}" \`
        -Protocol "HTTP" \`
        -Port ${port} \`
        -VpcId "${vpcId}" \`
        -HealthCheckEnabled \$true \`
        -HealthCheckPath "/" \`
        -HealthCheckProtocol "HTTP" \`
        -HealthCheckIntervalSeconds 30 \`
        -HealthyThresholdCount 2 \`
        -UnhealthyThresholdCount 2
    
    Write-Host "✓ Target Group created: ${targetGroupName}" -ForegroundColor Green
    Write-Host "  ARN: $($TargetGroup.TargetGroupArn)" -ForegroundColor Cyan
    Write-Host "  Protocol: HTTP" -ForegroundColor Cyan
    Write-Host "  Port: ${port}" -ForegroundColor Cyan` :
action === 'Create Listener' ? `    # Get load balancer ARN
    $LoadBalancers = Get-ELB2LoadBalancer -Name @("${lbName}")
    $LoadBalancerArn = $LoadBalancers[0].LoadBalancerArn
    
    # Get target group ARN
    $TargetGroups = Get-ELB2TargetGroup -Name @("${targetGroupName}")
    $TargetGroupArn = $TargetGroups[0].TargetGroupArn
    
    # Create default action
    $DefaultAction = New-Object Amazon.ElasticLoadBalancingV2.Model.Action
    $DefaultAction.Type = "forward"
    $DefaultAction.TargetGroupArn = $TargetGroupArn
    
    # Create listener
    $Listener = New-ELB2Listener \`
        -LoadBalancerArn $LoadBalancerArn \`
        -Protocol "HTTP" \`
        -Port ${port} \`
        -DefaultAction $DefaultAction
    
    Write-Host "✓ Listener created for load balancer: ${lbName}" -ForegroundColor Green
    Write-Host "  Protocol: HTTP" -ForegroundColor Cyan
    Write-Host "  Port: ${port}" -ForegroundColor Cyan
    Write-Host "  Target Group: ${targetGroupName}" -ForegroundColor Cyan` :
`    # List load balancers
    $LoadBalancers = Get-ELB2LoadBalancer
    
    Write-Host "✓ Elastic Load Balancers:" -ForegroundColor Green
    $LoadBalancers | Format-Table LoadBalancerName, Type, Scheme, State, DNSName -AutoSize`}
    
} catch {
    Write-Error "Load Balancer operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-configure-organizations',
    name: 'Configure AWS Organizations',
    category: 'Common Admin Tasks',
    description: 'Manage accounts, organizational units, and service control policies',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Organization', 'Create OU', 'Create Account', 'List Accounts', 'Attach SCP'], defaultValue: 'List Accounts' },
      { id: 'ouName', label: 'Organizational Unit Name', type: 'text', required: false, placeholder: 'Production' },
      { id: 'accountName', label: 'Account Name', type: 'text', required: false, placeholder: 'Dev Account' },
      { id: 'accountEmail', label: 'Account Email', type: 'email', required: false, placeholder: 'aws-dev@example.com' },
      { id: 'policyName', label: 'SCP Policy Name', type: 'text', required: false, placeholder: 'DenyS3DeletePolicy' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const ouName = params.ouName ? escapePowerShellString(params.ouName) : '';
      const accountName = params.accountName ? escapePowerShellString(params.accountName) : '';
      const accountEmail = params.accountEmail ? escapePowerShellString(params.accountEmail) : '';
      const policyName = params.policyName ? escapePowerShellString(params.policyName) : '';
      
      return `# AWS Organizations Management
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Organizations

try {
${action === 'Create Organization' ? `    # Create organization
    $Organization = New-ORGOrganization -FeatureSet "ALL"
    
    Write-Host "✓ AWS Organization created" -ForegroundColor Green
    Write-Host "  Organization ID: $($Organization.Id)" -ForegroundColor Cyan
    Write-Host "  Master Account ID: $($Organization.MasterAccountId)" -ForegroundColor Cyan
    Write-Host "  Feature Set: ALL" -ForegroundColor Cyan` :
action === 'Create OU' ? `    # Get root ID
    $Roots = Get-ORGRoot
    $RootId = $Roots[0].Id
    
    # Create organizational unit
    $OU = New-ORGOrganizationalUnit \`
        -ParentId $RootId \`
        -Name "${ouName}"
    
    Write-Host "✓ Organizational Unit created: ${ouName}" -ForegroundColor Green
    Write-Host "  OU ID: $($OU.Id)" -ForegroundColor Cyan
    Write-Host "  Parent: Root" -ForegroundColor Cyan` :
action === 'Create Account' ? `    # Create new account
    $Request = New-ORGAccount \`
        -AccountName "${accountName}" \`
        -Email "${accountEmail}"
    
    Write-Host "✓ Account creation initiated: ${accountName}" -ForegroundColor Green
    Write-Host "  Request ID: $($Request.Id)" -ForegroundColor Cyan
    Write-Host "  Email: ${accountEmail}" -ForegroundColor Cyan
    Write-Host "  Status: $($Request.State)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Account creation may take several minutes" -ForegroundColor Yellow` :
action === 'Attach SCP' ? `    # Create service control policy
    $PolicyDocument = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Deny",
            "Action": [
                "s3:DeleteBucket",
                "s3:DeleteObject"
            ],
            "Resource": "*"
        }
    ]
}
"@
    
    $Policy = New-ORGPolicy \`
        -Name "${policyName}" \`
        -Description "Deny S3 delete operations" \`
        -Content $PolicyDocument \`
        -Type "SERVICE_CONTROL_POLICY"
    
    Write-Host "✓ Service Control Policy created: ${policyName}" -ForegroundColor Green
    Write-Host "  Policy ID: $($Policy.PolicySummary.Id)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Use Add-ORGPolicy to attach this policy to an account or OU" -ForegroundColor Yellow` :
`    # List all accounts
    $Accounts = Get-ORGAccountList
    
    Write-Host "✓ AWS Organization Accounts:" -ForegroundColor Green
    $Accounts | Format-Table Id, Name, Email, Status, JoinedTimestamp -AutoSize`}
    
} catch {
    Write-Error "Organizations operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-manage-secrets-manager',
    name: 'Manage AWS Secrets Manager',
    category: 'Common Admin Tasks',
    description: 'Create secrets, enable rotation, and retrieve values',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Secret', 'Get Secret Value', 'Update Secret', 'Enable Rotation', 'List Secrets'], defaultValue: 'Create Secret' },
      { id: 'secretName', label: 'Secret Name', type: 'text', required: true, placeholder: 'prod/database/password' },
      { id: 'secretValue', label: 'Secret Value', type: 'text', required: false, placeholder: 'MySecurePassword123!' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Production database password' },
      { id: 'rotationLambdaArn', label: 'Rotation Lambda ARN', type: 'text', required: false, placeholder: 'arn:aws:lambda:us-east-1:123456789012:function:rotate-secret' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const secretName = escapePowerShellString(params.secretName);
      const secretValue = params.secretValue ? escapePowerShellString(params.secretValue) : '';
      const description = params.description ? escapePowerShellString(params.description) : '';
      const rotationLambdaArn = params.rotationLambdaArn ? escapePowerShellString(params.rotationLambdaArn) : '';
      
      return `# AWS Secrets Manager
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.SecretsManager

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Secret' ? `    # Create secret
    $Secret = New-SECSecret \`
        -Name "${secretName}" \`
        -Description "${description}" \`
        -SecretString "${secretValue}"
    
    Write-Host "✓ Secret created: ${secretName}" -ForegroundColor Green
    Write-Host "  ARN: $($Secret.ARN)" -ForegroundColor Cyan
    Write-Host "  Version ID: $($Secret.VersionId)" -ForegroundColor Cyan` :
action === 'Get Secret Value' ? `    # Retrieve secret value
    $Secret = Get-SECSecretValue -SecretId "${secretName}"
    
    Write-Host "✓ Secret retrieved: ${secretName}" -ForegroundColor Green
    Write-Host "  ARN: $($Secret.ARN)" -ForegroundColor Cyan
    Write-Host "  Created: $($Secret.CreatedDate)" -ForegroundColor Cyan
    Write-Host "  Value: $($Secret.SecretString)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠ Handle this secret value securely!" -ForegroundColor Red` :
action === 'Update Secret' ? `    # Update secret value
    Update-SECSecret \`
        -SecretId "${secretName}" \`
        -SecretString "${secretValue}"
    
    Write-Host "✓ Secret updated: ${secretName}" -ForegroundColor Green` :
action === 'Enable Rotation' ? `    # Enable automatic rotation
    Update-SECSecretRotation \`
        -SecretId "${secretName}" \`
        -RotationLambdaARN "${rotationLambdaArn}" \`
        -RotationRules_AutomaticallyAfterDays 30
    
    Write-Host "✓ Rotation enabled for: ${secretName}" -ForegroundColor Green
    Write-Host "  Lambda ARN: ${rotationLambdaArn}" -ForegroundColor Cyan
    Write-Host "  Rotation Period: 30 days" -ForegroundColor Cyan` :
`    # List all secrets
    $Secrets = Get-SECSecretList
    
    Write-Host "✓ AWS Secrets:" -ForegroundColor Green
    $Secrets | Format-Table Name, Description, LastChangedDate, LastRotatedDate -AutoSize`}
    
} catch {
    Write-Error "Secrets Manager operation failed: $_"
}`;
    },
    isPremium: true
  },
  {
    id: 'aws-configure-cloudtrail',
    name: 'Configure CloudTrail Logging',
    category: 'Common Admin Tasks',
    description: 'Enable audit logging, create trails, and log insights',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Trail', 'Start Logging', 'Stop Logging', 'Lookup Events', 'List Trails'], defaultValue: 'Create Trail' },
      { id: 'trailName', label: 'Trail Name', type: 'text', required: true, placeholder: 'my-organization-trail' },
      { id: 'bucketName', label: 'S3 Bucket Name', type: 'text', required: false, placeholder: 'my-cloudtrail-bucket' },
      { id: 'includeGlobalEvents', label: 'Include Global Service Events', type: 'boolean', required: false, defaultValue: true },
      { id: 'isMultiRegion', label: 'Multi-Region Trail', type: 'boolean', required: false, defaultValue: true },
      { id: 'eventName', label: 'Event Name (for lookup)', type: 'text', required: false, placeholder: 'CreateUser' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const trailName = escapePowerShellString(params.trailName);
      const bucketName = params.bucketName ? escapePowerShellString(params.bucketName) : '';
      const includeGlobalEvents = toPowerShellBoolean(params.includeGlobalEvents);
      const isMultiRegion = toPowerShellBoolean(params.isMultiRegion);
      const eventName = params.eventName ? escapePowerShellString(params.eventName) : '';
      
      return `# AWS CloudTrail Configuration
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudTrail

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Trail' ? `    # Create CloudTrail trail
    New-CTTrail \`
        -Name "${trailName}" \`
        -S3BucketName "${bucketName}" \`
        -IncludeGlobalServiceEvent ${includeGlobalEvents} \`
        -IsMultiRegionTrail ${isMultiRegion} \`
        -EnableLogFileValidation \$true
    
    # Start logging
    Start-CTLogging -Name "${trailName}"
    
    Write-Host "✓ CloudTrail trail created and started: ${trailName}" -ForegroundColor Green
    Write-Host "  S3 Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Multi-Region: ${isMultiRegion}" -ForegroundColor Cyan
    Write-Host "  Global Events: ${includeGlobalEvents}" -ForegroundColor Cyan
    Write-Host "  Log Validation: Enabled" -ForegroundColor Cyan` :
action === 'Start Logging' ? `    # Start logging for trail
    Start-CTLogging -Name "${trailName}"
    
    Write-Host "✓ Logging started for trail: ${trailName}" -ForegroundColor Green` :
action === 'Stop Logging' ? `    # Stop logging for trail
    Stop-CTLogging -Name "${trailName}"
    
    Write-Host "✓ Logging stopped for trail: ${trailName}" -ForegroundColor Yellow` :
action === 'Lookup Events' ? `    # Lookup recent events
    $LookupAttributes = New-Object Amazon.CloudTrail.Model.LookupAttribute
    $LookupAttributes.AttributeKey = "EventName"
    $LookupAttributes.AttributeValue = "${eventName}"
    
    $Events = Find-CTEvent -LookupAttribute $LookupAttributes -MaxResult 50
    
    Write-Host "✓ CloudTrail Events (Event: ${eventName}):" -ForegroundColor Green
    foreach ($Event in $Events) {
        Write-Host ""
        Write-Host "  Event Time: $($Event.EventTime)" -ForegroundColor Cyan
        Write-Host "  Event Name: $($Event.EventName)" -ForegroundColor Yellow
        Write-Host "  User: $($Event.Username)" -ForegroundColor Cyan
        Write-Host "  Resources:" -ForegroundColor Cyan
        foreach ($Resource in $Event.Resources) {
            Write-Host "    - $($Resource.ResourceType): $($Resource.ResourceName)" -ForegroundColor Gray
        }
    }` :
`    # List all trails
    $Trails = Get-CTTrail
    
    Write-Host "✓ CloudTrail Trails:" -ForegroundColor Green
    foreach ($Trail in $Trails) {
        $Status = Get-CTTrailStatus -Name $Trail.Name
        Write-Host ""
        Write-Host "  Name: $($Trail.Name)" -ForegroundColor Cyan
        Write-Host "  S3 Bucket: $($Trail.S3BucketName)" -ForegroundColor Cyan
        Write-Host "  Multi-Region: $($Trail.IsMultiRegionTrail)" -ForegroundColor Cyan
        Write-Host "  Logging: $($Status.IsLogging)" -ForegroundColor $(if ($Status.IsLogging) { "Green" } else { "Yellow" })
    }`}
    
} catch {
    Write-Error "CloudTrail operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-rds-snapshot',
    name: 'Configure RDS Automated Snapshots',
    category: 'RDS & Databases',
    description: 'Configure automated backup snapshots for RDS database instances',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'dbInstanceId', label: 'DB Instance ID', type: 'text', required: true, placeholder: 'mydb-instance' },
      { id: 'backupRetentionDays', label: 'Backup Retention (Days)', type: 'number', required: true, placeholder: '7' },
      { id: 'backupWindow', label: 'Backup Window', type: 'text', required: true, placeholder: '03:00-04:00' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const dbInstanceId = escapePowerShellString(params.dbInstanceId);
      const retentionDays = params.backupRetentionDays || 7;
      const backupWindow = escapePowerShellString(params.backupWindow);

      return `# Configure RDS Automated Snapshots
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.RDS

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    Edit-RDSDBInstance \`
        -DBInstanceIdentifier "${dbInstanceId}" \`
        -BackupRetentionPeriod ${retentionDays} \`
        -PreferredBackupWindow "${backupWindow}" \`
        -ApplyImmediately \\$true
    
    Write-Host "✓ RDS automated snapshots configured" -ForegroundColor Green
    Write-Host "  DB Instance: ${dbInstanceId}" -ForegroundColor Cyan
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Cyan
    Write-Host "  Backup Window: ${backupWindow}" -ForegroundColor Cyan
    
} catch {
    Write-Error "RDS snapshot configuration failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-manage-iam-policies',
    name: 'Create and Attach IAM Policy',
    category: 'IAM & Security',
    description: 'Create custom IAM policy and attach to user, group, or role',
    parameters: [
      { id: 'policyName', label: 'Policy Name', type: 'text', required: true, placeholder: 'S3ReadOnlyPolicy' },
      { id: 'policyDocument', label: 'Policy JSON Document', type: 'textarea', required: true, placeholder: '{"Version":"2012-10-17","Statement":[...]}' },
      { id: 'attachTo', label: 'Attach To Type', type: 'select', required: true, options: ['User', 'Group', 'Role'], defaultValue: 'User' },
      { id: 'targetName', label: 'Target Name', type: 'text', required: true, placeholder: 'john.doe or Developers' }
    ],
    scriptTemplate: (params) => {
      const policyName = escapePowerShellString(params.policyName);
      const policyDoc = escapePowerShellString(params.policyDocument);
      const attachTo = params.attachTo || 'User';
      const targetName = escapePowerShellString(params.targetName);

      return `# Create and Attach IAM Policy
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
    $PolicyDocument = @"
${policyDoc}
"@
    
    # Create policy
    $Policy = New-IAMPolicy \`
        -PolicyName "${policyName}" \`
        -PolicyDocument $PolicyDocument \`
        -Description "Custom policy created via PowerShell"
    
    Write-Host "✓ IAM policy created: ${policyName}" -ForegroundColor Green
    Write-Host "  Policy ARN: $($Policy.Arn)" -ForegroundColor Cyan
    
    # Attach policy
    ${attachTo === 'User' ? `Register-IAMUserPolicy -UserName "${targetName}" -PolicyArn $Policy.Arn
    Write-Host "✓ Policy attached to user: ${targetName}" -ForegroundColor Green` :
    attachTo === 'Group' ? `Register-IAMGroupPolicy -GroupName "${targetName}" -PolicyArn $Policy.Arn
    Write-Host "✓ Policy attached to group: ${targetName}" -ForegroundColor Green` :
    `Register-IAMRolePolicy -RoleName "${targetName}" -PolicyArn $Policy.Arn
    Write-Host "✓ Policy attached to role: ${targetName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "IAM policy operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-vpc-peering',
    name: 'Create VPC Peering Connection',
    category: 'Networking',
    description: 'Create VPC peering connection between two VPCs for private communication',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'requesterVpcId', label: 'Requester VPC ID', type: 'text', required: true, placeholder: 'vpc-1234567890abcdef0' },
      { id: 'accepterVpcId', label: 'Accepter VPC ID', type: 'text', required: true, placeholder: 'vpc-0987654321fedcba0' },
      { id: 'peeringName', label: 'Peering Connection Name', type: 'text', required: true, placeholder: 'Production-to-Dev' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const requesterVpc = escapePowerShellString(params.requesterVpcId);
      const accepterVpc = escapePowerShellString(params.accepterVpcId);
      const peeringName = escapePowerShellString(params.peeringName);

      return `# Create VPC Peering Connection
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Create peering connection
    $PeeringConnection = New-EC2VpcPeeringConnection \`
        -VpcId "${requesterVpc}" \`
        -PeerVpcId "${accepterVpc}"
    
    $PeeringId = $PeeringConnection.VpcPeeringConnectionId
    
    # Tag the peering connection
    New-EC2Tag -Resource $PeeringId -Tag @{Key="Name"; Value="${peeringName}"}
    
    Write-Host "✓ VPC peering connection created: $PeeringId" -ForegroundColor Green
    Write-Host "  Name: ${peeringName}" -ForegroundColor Cyan
    Write-Host "  Requester VPC: ${requesterVpc}" -ForegroundColor Cyan
    Write-Host "  Accepter VPC: ${accepterVpc}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️ Next step: Accept peering connection:" -ForegroundColor Yellow
    Write-Host "  Approve-EC2VpcPeeringConnection -VpcPeeringConnectionId $PeeringId" -ForegroundColor Gray
    
} catch {
    Write-Error "VPC peering creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-cloudwatch-alarm',
    name: 'Create CloudWatch Alarm',
    category: 'Monitoring & Alerting',
    description: 'Configure CloudWatch alarm for monitoring AWS resources with SNS notifications',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'alarmName', label: 'Alarm Name', type: 'text', required: true, placeholder: 'High-CPU-Alert' },
      { id: 'metricName', label: 'Metric Name', type: 'select', required: true, options: ['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadOps', 'DiskWriteOps'], defaultValue: 'CPUUtilization' },
      { id: 'instanceId', label: 'EC2 Instance ID', type: 'text', required: true, placeholder: 'i-1234567890abcdef0' },
      { id: 'threshold', label: 'Threshold Value', type: 'number', required: true, placeholder: '80' },
      { id: 'snsTopicArn', label: 'SNS Topic ARN (Optional)', type: 'text', required: false, placeholder: 'arn:aws:sns:us-east-1:123456789012:MyTopic' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const alarmName = escapePowerShellString(params.alarmName);
      const metricName = params.metricName || 'CPUUtilization';
      const instanceId = escapePowerShellString(params.instanceId);
      const threshold = params.threshold || 80;
      const snsArn = params.snsTopicArn ? escapePowerShellString(params.snsTopicArn) : '';

      return `# Create CloudWatch Alarm
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudWatch

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    $Dimension = New-Object Amazon.CloudWatch.Model.Dimension
    $Dimension.Name = "InstanceId"
    $Dimension.Value = "${instanceId}"
    
    $AlarmParams = @{
        AlarmName = "${alarmName}"
        MetricName = "${metricName}"
        Namespace = "AWS/EC2"
        Statistic = "Average"
        Period = 300
        EvaluationPeriods = 2
        Threshold = ${threshold}
        ComparisonOperator = "GreaterThanThreshold"
        Dimensions = $Dimension
    }
    
    ${snsArn ? `$AlarmParams.AlarmActions = @("${snsArn}")` : ''}
    
    Write-CWMetricAlarm @AlarmParams
    
    Write-Host "✓ CloudWatch alarm created successfully" -ForegroundColor Green
    Write-Host "  Alarm Name: ${alarmName}" -ForegroundColor Cyan
    Write-Host "  Metric: ${metricName}" -ForegroundColor Cyan
    Write-Host "  Instance: ${instanceId}" -ForegroundColor Cyan
    Write-Host "  Threshold: ${threshold}" -ForegroundColor Cyan
    ${snsArn ? `Write-Host "  SNS Notifications: Enabled" -ForegroundColor Cyan` : `Write-Host "  SNS Notifications: Not configured" -ForegroundColor Yellow`}
    
} catch {
    Write-Error "CloudWatch alarm creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-manage-elastic-ip',
    name: 'Allocate and Associate Elastic IP',
    category: 'Networking',
    description: 'Allocate Elastic IP address and associate it with EC2 instance',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'instanceId', label: 'EC2 Instance ID', type: 'text', required: true, placeholder: 'i-1234567890abcdef0' },
      { id: 'domain', label: 'Domain', type: 'select', required: true, options: ['vpc', 'standard'], defaultValue: 'vpc' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const instanceId = escapePowerShellString(params.instanceId);
      const domain = params.domain || 'vpc';

      return `# Allocate and Associate Elastic IP
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Allocate Elastic IP
    $EIP = New-EC2Address -Domain ${domain}
    
    Write-Host "✓ Elastic IP allocated: $($EIP.PublicIp)" -ForegroundColor Green
    Write-Host "  Allocation ID: $($EIP.AllocationId)" -ForegroundColor Cyan
    
    # Associate with instance
    $Association = Register-EC2Address \`
        -InstanceId "${instanceId}" \`
        -AllocationId $EIP.AllocationId
    
    Write-Host "✓ Elastic IP associated with instance" -ForegroundColor Green
    Write-Host "  Instance ID: ${instanceId}" -ForegroundColor Cyan
    Write-Host "  Public IP: $($EIP.PublicIp)" -ForegroundColor Cyan
    Write-Host "  Association ID: $($Association.AssociationId)" -ForegroundColor Gray
    
} catch {
    Write-Error "Elastic IP operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-autoscaling-group',
    name: 'Create Auto Scaling Group',
    category: 'EC2 Management',
    description: 'Configure Auto Scaling Group with launch configuration for automatic instance scaling',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'asgName', label: 'Auto Scaling Group Name', type: 'text', required: true, placeholder: 'WebServer-ASG' },
      { id: 'launchConfigName', label: 'Launch Configuration Name', type: 'text', required: true, placeholder: 'WebServer-LC' },
      { id: 'minSize', label: 'Minimum Instances', type: 'number', required: true, placeholder: '2' },
      { id: 'maxSize', label: 'Maximum Instances', type: 'number', required: true, placeholder: '10' },
      { id: 'desiredCapacity', label: 'Desired Capacity', type: 'number', required: true, placeholder: '3' },
      { id: 'availabilityZones', label: 'Availability Zones (comma-separated)', type: 'text', required: true, placeholder: 'us-east-1a, us-east-1b' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const asgName = escapePowerShellString(params.asgName);
      const lcName = escapePowerShellString(params.launchConfigName);
      const minSize = params.minSize || 2;
      const maxSize = params.maxSize || 10;
      const desiredCapacity = params.desiredCapacity || 3;
      const azRaw = (params.availabilityZones as string).split(',').map((az: string) => az.trim());

      return `# Create Auto Scaling Group
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.AutoScaling

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    $AvailabilityZones = @(${azRaw.map(az => `"${escapePowerShellString(az)}"`).join(', ')})
    
    # Create Auto Scaling Group
    New-ASAutoScalingGroup \`
        -AutoScalingGroupName "${asgName}" \`
        -LaunchConfigurationName "${lcName}" \`
        -MinSize ${minSize} \`
        -MaxSize ${maxSize} \`
        -DesiredCapacity ${desiredCapacity} \`
        -AvailabilityZones $AvailabilityZones \`
        -HealthCheckType EC2 \`
        -HealthCheckGracePeriod 300
    
    Write-Host "✓ Auto Scaling Group created successfully" -ForegroundColor Green
    Write-Host "  ASG Name: ${asgName}" -ForegroundColor Cyan
    Write-Host "  Launch Configuration: ${lcName}" -ForegroundColor Cyan
    Write-Host "  Min Size: ${minSize}" -ForegroundColor Cyan
    Write-Host "  Max Size: ${maxSize}" -ForegroundColor Cyan
    Write-Host "  Desired Capacity: ${desiredCapacity}" -ForegroundColor Cyan
    Write-Host "  Availability Zones: $($AvailabilityZones -join ', ')" -ForegroundColor Cyan
    
} catch {
    Write-Error "Auto Scaling Group creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-lambda-function',
    name: 'Create and Deploy Lambda Function',
    category: 'Serverless',
    description: 'Create AWS Lambda function with deployment package and execution role',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'functionName', label: 'Function Name', type: 'text', required: true, placeholder: 'MyLambdaFunction' },
      { id: 'runtime', label: 'Runtime', type: 'select', required: true, options: ['python3.9', 'python3.10', 'nodejs18.x', 'nodejs20.x', 'dotnet6', 'dotnet8'], defaultValue: 'python3.9' },
      { id: 'roleArn', label: 'IAM Role ARN', type: 'text', required: true, placeholder: 'arn:aws:iam::123456789012:role/lambda-execution-role' },
      { id: 'handler', label: 'Handler', type: 'text', required: true, placeholder: 'index.handler' },
      { id: 'zipFilePath', label: 'Deployment Package Path', type: 'path', required: true, placeholder: 'C:\\Lambda\\function.zip' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const functionName = escapePowerShellString(params.functionName);
      const runtime = params.runtime || 'python3.9';
      const roleArn = escapePowerShellString(params.roleArn);
      const handler = escapePowerShellString(params.handler);
      const zipPath = escapePowerShellString(params.zipFilePath);

      return `# Create and Deploy Lambda Function
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Lambda

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Read deployment package
    $ZipBytes = [System.IO.File]::ReadAllBytes("${zipPath}")
    $MemoryStream = New-Object System.IO.MemoryStream(,$ZipBytes)
    
    # Create Lambda function
    Publish-LMFunction \`
        -FunctionName "${functionName}" \`
        -Runtime ${runtime} \`
        -Role "${roleArn}" \`
        -Handler "${handler}" \`
        -ZipFile $MemoryStream \`
        -Description "Lambda function created via PowerShell" \`
        -Timeout 30 \`
        -MemorySize 256
    
    Write-Host "✓ Lambda function created successfully" -ForegroundColor Green
    Write-Host "  Function Name: ${functionName}" -ForegroundColor Cyan
    Write-Host "  Runtime: ${runtime}" -ForegroundColor Cyan
    Write-Host "  Handler: ${handler}" -ForegroundColor Cyan
    Write-Host "  Timeout: 30 seconds" -ForegroundColor Cyan
    Write-Host "  Memory: 256 MB" -ForegroundColor Cyan
    
    $Function = Get-LMFunction -FunctionName "${functionName}"
    Write-Host "  Function ARN: $($Function.FunctionArn)" -ForegroundColor Gray
    
} catch {
    Write-Error "Lambda function creation failed: $_"
} finally {
    if ($MemoryStream) { $MemoryStream.Dispose() }
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-configure-route53-healthcheck',
    name: 'Create Route53 Health Check',
    category: 'DNS & Route53',
    description: 'Configure Route53 health check to monitor endpoint availability',
    parameters: [
      { id: 'healthCheckName', label: 'Health Check Name', type: 'text', required: true, placeholder: 'WebServer-HealthCheck' },
      { id: 'ipAddress', label: 'IP Address to Monitor', type: 'text', required: true, placeholder: '192.0.2.1' },
      { id: 'port', label: 'Port', type: 'number', required: true, placeholder: '80' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: true, options: ['HTTP', 'HTTPS', 'TCP'], defaultValue: 'HTTP' },
      { id: 'resourcePath', label: 'Resource Path (for HTTP/HTTPS)', type: 'text', required: false, placeholder: '/health' }
    ],
    scriptTemplate: (params) => {
      const healthCheckName = escapePowerShellString(params.healthCheckName);
      const ipAddress = escapePowerShellString(params.ipAddress);
      const port = params.port || 80;
      const protocol = params.protocol || 'HTTP';
      const resourcePath = params.resourcePath ? escapePowerShellString(params.resourcePath) : '/';

      return `# Create Route53 Health Check
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Route53

try {
    $HealthCheckConfig = New-Object Amazon.Route53.Model.HealthCheckConfig
    $HealthCheckConfig.IPAddress = "${ipAddress}"
    $HealthCheckConfig.Port = ${port}
    $HealthCheckConfig.Type = "${protocol}"
    ${protocol !== 'TCP' ? `$HealthCheckConfig.ResourcePath = "${resourcePath}"` : ''}
    $HealthCheckConfig.RequestInterval = 30
    $HealthCheckConfig.FailureThreshold = 3
    
    # Create health check
    $HealthCheck = New-R53HealthCheck \`
        -CallerReference ([Guid]::NewGuid().ToString()) \`
        -HealthCheckConfig $HealthCheckConfig
    
    # Tag the health check
    $Tag = New-Object Amazon.Route53.Model.Tag
    $Tag.Key = "Name"
    $Tag.Value = "${healthCheckName}"
    
    Edit-R53TagsForResource \`
        -ResourceType healthcheck \`
        -ResourceId $HealthCheck.HealthCheck.Id \`
        -AddTag $Tag
    
    Write-Host "✓ Route53 health check created successfully" -ForegroundColor Green
    Write-Host "  Health Check ID: $($HealthCheck.HealthCheck.Id)" -ForegroundColor Cyan
    Write-Host "  Name: ${healthCheckName}" -ForegroundColor Cyan
    Write-Host "  IP Address: ${ipAddress}" -ForegroundColor Cyan
    Write-Host "  Port: ${port}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    ${protocol !== 'TCP' ? `Write-Host "  Resource Path: ${resourcePath}" -ForegroundColor Cyan` : ''}
    
} catch {
    Write-Error "Route53 health check creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-create-ami-from-instance',
    name: 'Create AMI from EC2 Instance',
    category: 'EC2 Management',
    description: 'Create a custom Amazon Machine Image from an existing EC2 instance for backup or replication',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'instanceId', label: 'Source Instance ID', type: 'text', required: true, placeholder: 'i-1234567890abcdef0' },
      { id: 'amiName', label: 'AMI Name', type: 'text', required: true, placeholder: 'MyApp-Production-AMI' },
      { id: 'description', label: 'AMI Description', type: 'text', required: false, placeholder: 'Production server baseline image' },
      { id: 'noReboot', label: 'No Reboot During Creation', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const instanceId = escapePowerShellString(params.instanceId);
      const amiName = escapePowerShellString(params.amiName);
      const description = params.description ? escapePowerShellString(params.description) : 'Created by PowerShell automation';
      const noReboot = toPowerShellBoolean(params.noReboot);

      return `# Create AMI from EC2 Instance
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Create AMI from instance
    $AMI = New-EC2Image \`
        -InstanceId "${instanceId}" \`
        -Name "${amiName}" \`
        -Description "${description}" \`
        -NoReboot ${noReboot}
    
    Write-Host "✓ AMI creation initiated" -ForegroundColor Green
    Write-Host "  AMI ID: $($AMI)" -ForegroundColor Cyan
    Write-Host "  Source Instance: ${instanceId}" -ForegroundColor Cyan
    Write-Host "  Name: ${amiName}" -ForegroundColor Cyan
    Write-Host ""
    
    # Wait for AMI to become available
    Write-Host "Waiting for AMI to become available..." -ForegroundColor Yellow
    $Attempts = 0
    do {
        Start-Sleep -Seconds 30
        $Attempts++
        $Image = Get-EC2Image -ImageId $AMI
        Write-Host "  Status: $($Image.State)" -ForegroundColor Gray
    } while ($Image.State -eq "pending" -and $Attempts -lt 20)
    
    if ($Image.State -eq "available") {
        Write-Host "✓ AMI is now available" -ForegroundColor Green
    } else {
        Write-Host "⚠ AMI creation still in progress. Check console for status." -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "AMI creation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-manage-security-groups',
    name: 'Manage EC2 Security Groups',
    category: 'EC2 Management',
    description: 'Create, modify, and configure security group rules for network access control',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Security Group', 'Add Inbound Rule', 'Add Outbound Rule', 'List Rules'], defaultValue: 'Create Security Group' },
      { id: 'vpcId', label: 'VPC ID', type: 'text', required: false, placeholder: 'vpc-1234567890abcdef0' },
      { id: 'securityGroupId', label: 'Security Group ID (for rules)', type: 'text', required: false, placeholder: 'sg-1234567890abcdef0' },
      { id: 'groupName', label: 'Security Group Name', type: 'text', required: false, placeholder: 'WebServer-SG' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Security group for web servers' },
      { id: 'protocol', label: 'Protocol', type: 'select', required: false, options: ['tcp', 'udp', 'icmp', '-1'], defaultValue: 'tcp' },
      { id: 'fromPort', label: 'From Port', type: 'number', required: false, placeholder: '443' },
      { id: 'toPort', label: 'To Port', type: 'number', required: false, placeholder: '443' },
      { id: 'cidrBlock', label: 'CIDR Block', type: 'text', required: false, placeholder: '0.0.0.0/0' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const vpcId = params.vpcId ? escapePowerShellString(params.vpcId) : '';
      const securityGroupId = params.securityGroupId ? escapePowerShellString(params.securityGroupId) : '';
      const groupName = params.groupName ? escapePowerShellString(params.groupName) : '';
      const description = params.description ? escapePowerShellString(params.description) : 'Created by PowerShell';
      const protocol = params.protocol || 'tcp';
      const fromPort = params.fromPort || 443;
      const toPort = params.toPort || 443;
      const cidrBlock = params.cidrBlock ? escapePowerShellString(params.cidrBlock) : '0.0.0.0/0';

      return `# Manage EC2 Security Groups
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Security Group' ? `    # Create security group
    $SG = New-EC2SecurityGroup \`
        -GroupName "${groupName}" \`
        -Description "${description}" \`
        -VpcId "${vpcId}"
    
    Write-Host "✓ Security group created" -ForegroundColor Green
    Write-Host "  Security Group ID: $SG" -ForegroundColor Cyan
    Write-Host "  Name: ${groupName}" -ForegroundColor Cyan
    Write-Host "  VPC: ${vpcId}" -ForegroundColor Cyan` :
action === 'Add Inbound Rule' ? `    # Create inbound rule
    $IpPermission = New-Object Amazon.EC2.Model.IpPermission
    $IpPermission.IpProtocol = "${protocol}"
    $IpPermission.FromPort = ${fromPort}
    $IpPermission.ToPort = ${toPort}
    $IpRange = New-Object Amazon.EC2.Model.IpRange
    $IpRange.CidrIp = "${cidrBlock}"
    $IpRange.Description = "Added via PowerShell automation"
    $IpPermission.Ipv4Ranges.Add($IpRange)
    
    Grant-EC2SecurityGroupIngress \`
        -GroupId "${securityGroupId}" \`
        -IpPermission $IpPermission
    
    Write-Host "✓ Inbound rule added" -ForegroundColor Green
    Write-Host "  Security Group: ${securityGroupId}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  Ports: ${fromPort}-${toPort}" -ForegroundColor Cyan
    Write-Host "  Source: ${cidrBlock}" -ForegroundColor Cyan` :
action === 'Add Outbound Rule' ? `    # Create outbound rule
    $IpPermission = New-Object Amazon.EC2.Model.IpPermission
    $IpPermission.IpProtocol = "${protocol}"
    $IpPermission.FromPort = ${fromPort}
    $IpPermission.ToPort = ${toPort}
    $IpRange = New-Object Amazon.EC2.Model.IpRange
    $IpRange.CidrIp = "${cidrBlock}"
    $IpPermission.Ipv4Ranges.Add($IpRange)
    
    Grant-EC2SecurityGroupEgress \`
        -GroupId "${securityGroupId}" \`
        -IpPermission $IpPermission
    
    Write-Host "✓ Outbound rule added" -ForegroundColor Green
    Write-Host "  Security Group: ${securityGroupId}" -ForegroundColor Cyan
    Write-Host "  Protocol: ${protocol}" -ForegroundColor Cyan
    Write-Host "  Ports: ${fromPort}-${toPort}" -ForegroundColor Cyan
    Write-Host "  Destination: ${cidrBlock}" -ForegroundColor Cyan` :
`    # List security group rules
    $SG = Get-EC2SecurityGroup -GroupId "${securityGroupId}"
    
    Write-Host "✓ Security Group Details" -ForegroundColor Green
    Write-Host "  Name: $($SG.GroupName)" -ForegroundColor Cyan
    Write-Host "  ID: $($SG.GroupId)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Inbound Rules:" -ForegroundColor Yellow
    $SG.IpPermissions | ForEach-Object {
        Write-Host "  Protocol: $($_.IpProtocol), Ports: $($_.FromPort)-$($_.ToPort), Sources: $($_.Ipv4Ranges.CidrIp -join ', ')" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Outbound Rules:" -ForegroundColor Yellow
    $SG.IpPermissionsEgress | ForEach-Object {
        Write-Host "  Protocol: $($_.IpProtocol), Ports: $($_.FromPort)-$($_.ToPort), Destinations: $($_.Ipv4Ranges.CidrIp -join ', ')" -ForegroundColor Gray
    }`}
    
} catch {
    Write-Error "Security group operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-manage-ebs-volumes',
    name: 'Manage EBS Volumes',
    category: 'EC2 Management',
    description: 'Create, attach, detach, and snapshot EBS volumes for EC2 instances',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Volume', 'Attach Volume', 'Detach Volume', 'Create Snapshot', 'List Volumes'], defaultValue: 'Create Volume' },
      { id: 'availabilityZone', label: 'Availability Zone', type: 'text', required: false, placeholder: 'us-east-1a' },
      { id: 'volumeId', label: 'Volume ID', type: 'text', required: false, placeholder: 'vol-1234567890abcdef0' },
      { id: 'instanceId', label: 'Instance ID', type: 'text', required: false, placeholder: 'i-1234567890abcdef0' },
      { id: 'deviceName', label: 'Device Name', type: 'text', required: false, placeholder: '/dev/sdf' },
      { id: 'volumeSize', label: 'Volume Size (GB)', type: 'number', required: false, placeholder: '100', defaultValue: 100 },
      { id: 'volumeType', label: 'Volume Type', type: 'select', required: false, options: ['gp3', 'gp2', 'io1', 'io2', 'st1', 'sc1'], defaultValue: 'gp3' },
      { id: 'encrypted', label: 'Encrypt Volume', type: 'boolean', required: false, defaultValue: true }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const availabilityZone = params.availabilityZone ? escapePowerShellString(params.availabilityZone) : 'us-east-1a';
      const volumeId = params.volumeId ? escapePowerShellString(params.volumeId) : '';
      const instanceId = params.instanceId ? escapePowerShellString(params.instanceId) : '';
      const deviceName = params.deviceName ? escapePowerShellString(params.deviceName) : '/dev/sdf';
      const volumeSize = params.volumeSize || 100;
      const volumeType = params.volumeType || 'gp3';
      const encrypted = toPowerShellBoolean(params.encrypted);

      return `# Manage EBS Volumes
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Volume' ? `    # Create EBS volume
    $Volume = New-EC2Volume \`
        -AvailabilityZone "${availabilityZone}" \`
        -Size ${volumeSize} \`
        -VolumeType "${volumeType}" \`
        -Encrypted ${encrypted}
    
    Write-Host "✓ EBS volume created" -ForegroundColor Green
    Write-Host "  Volume ID: $($Volume.VolumeId)" -ForegroundColor Cyan
    Write-Host "  Size: ${volumeSize} GB" -ForegroundColor Cyan
    Write-Host "  Type: ${volumeType}" -ForegroundColor Cyan
    Write-Host "  AZ: ${availabilityZone}" -ForegroundColor Cyan
    Write-Host "  Encrypted: ${encrypted}" -ForegroundColor Cyan` :
action === 'Attach Volume' ? `    # Attach volume to instance
    Add-EC2Volume \`
        -VolumeId "${volumeId}" \`
        -InstanceId "${instanceId}" \`
        -Device "${deviceName}"
    
    Write-Host "✓ Volume attached successfully" -ForegroundColor Green
    Write-Host "  Volume: ${volumeId}" -ForegroundColor Cyan
    Write-Host "  Instance: ${instanceId}" -ForegroundColor Cyan
    Write-Host "  Device: ${deviceName}" -ForegroundColor Cyan` :
action === 'Detach Volume' ? `    # Detach volume from instance
    Dismount-EC2Volume -VolumeId "${volumeId}" -Force
    
    Write-Host "✓ Volume detached successfully" -ForegroundColor Green
    Write-Host "  Volume: ${volumeId}" -ForegroundColor Cyan` :
action === 'Create Snapshot' ? `    # Create snapshot of volume
    $Snapshot = New-EC2Snapshot \`
        -VolumeId "${volumeId}" \`
        -Description "Snapshot created via PowerShell - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "✓ Snapshot creation initiated" -ForegroundColor Green
    Write-Host "  Snapshot ID: $($Snapshot.SnapshotId)" -ForegroundColor Cyan
    Write-Host "  Volume: ${volumeId}" -ForegroundColor Cyan
    Write-Host "  Status: $($Snapshot.State)" -ForegroundColor Cyan` :
`    # List EBS volumes
    $Volumes = Get-EC2Volume
    
    Write-Host "✓ EBS Volumes:" -ForegroundColor Green
    $Volumes | Format-Table VolumeId, Size, VolumeType, State, AvailabilityZone, Encrypted -AutoSize`}
    
} catch {
    Write-Error "EBS operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-s3-bucket-policy',
    name: 'Manage S3 Bucket Policies',
    category: 'S3 Storage',
    description: 'Create and apply bucket policies for access control and security',
    parameters: [
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'policyType', label: 'Policy Type', type: 'select', required: true, options: ['Block Public Access', 'Allow Cross-Account Access', 'Require SSL', 'Allow CloudFront Access'], defaultValue: 'Block Public Access' },
      { id: 'crossAccountId', label: 'Cross-Account AWS ID (if applicable)', type: 'text', required: false, placeholder: '123456789012' },
      { id: 'cloudfrontOAI', label: 'CloudFront OAI ID (if applicable)', type: 'text', required: false, placeholder: 'E1A2B3C4D5E6F7' }
    ],
    scriptTemplate: (params) => {
      const bucketName = escapePowerShellString(params.bucketName);
      const policyType = params.policyType;
      const crossAccountId = params.crossAccountId ? escapePowerShellString(params.crossAccountId) : '';
      const cloudfrontOAI = params.cloudfrontOAI ? escapePowerShellString(params.cloudfrontOAI) : '';

      return `# Manage S3 Bucket Policies
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3

try {
${policyType === 'Block Public Access' ? `    # Configure public access block
    Write-S3PublicAccessBlock \`
        -BucketName "${bucketName}" \`
        -PublicAccessBlockConfiguration_BlockPublicAcl \$true \`
        -PublicAccessBlockConfiguration_BlockPublicPolicy \$true \`
        -PublicAccessBlockConfiguration_IgnorePublicAcl \$true \`
        -PublicAccessBlockConfiguration_RestrictPublicBucket \$true
    
    Write-Host "✓ Public access blocked for bucket: ${bucketName}" -ForegroundColor Green
    Write-Host "  BlockPublicAcls: Enabled" -ForegroundColor Cyan
    Write-Host "  BlockPublicPolicy: Enabled" -ForegroundColor Cyan
    Write-Host "  IgnorePublicAcls: Enabled" -ForegroundColor Cyan
    Write-Host "  RestrictPublicBuckets: Enabled" -ForegroundColor Cyan` :
policyType === 'Allow Cross-Account Access' ? `    # Create cross-account access policy
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "CrossAccountAccess"
                Effect = "Allow"
                Principal = @{
                    AWS = "arn:aws:iam::${crossAccountId}:root"
                }
                Action = @(
                    "s3:GetObject",
                    "s3:ListBucket"
                )
                Resource = @(
                    "arn:aws:s3:::${bucketName}",
                    "arn:aws:s3:::${bucketName}/*"
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy
    
    Write-Host "✓ Cross-account access policy applied" -ForegroundColor Green
    Write-Host "  Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Granted to Account: ${crossAccountId}" -ForegroundColor Cyan` :
policyType === 'Require SSL' ? `    # Create SSL-only policy
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "DenyNonSSL"
                Effect = "Deny"
                Principal = "*"
                Action = "s3:*"
                Resource = @(
                    "arn:aws:s3:::${bucketName}",
                    "arn:aws:s3:::${bucketName}/*"
                )
                Condition = @{
                    Bool = @{
                        "aws:SecureTransport" = "false"
                    }
                }
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy
    
    Write-Host "✓ SSL-only policy applied" -ForegroundColor Green
    Write-Host "  Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  Non-SSL requests: Denied" -ForegroundColor Cyan` :
`    # Create CloudFront OAI access policy
    $Policy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Sid = "CloudFrontOAIAccess"
                Effect = "Allow"
                Principal = @{
                    AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${cloudfrontOAI}"
                }
                Action = "s3:GetObject"
                Resource = "arn:aws:s3:::${bucketName}/*"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    Write-S3BucketPolicy -BucketName "${bucketName}" -Policy $Policy
    
    Write-Host "✓ CloudFront OAI access policy applied" -ForegroundColor Green
    Write-Host "  Bucket: ${bucketName}" -ForegroundColor Cyan
    Write-Host "  CloudFront OAI: ${cloudfrontOAI}" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "S3 bucket policy operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-s3-sync-objects',
    name: 'Sync S3 Objects',
    category: 'S3 Storage',
    description: 'Synchronize files between local directory and S3 bucket with advanced options',
    parameters: [
      { id: 'bucketName', label: 'Bucket Name', type: 'text', required: true, placeholder: 'my-company-bucket' },
      { id: 'localPath', label: 'Local Path', type: 'path', required: true, placeholder: 'C:\\Backups\\Data' },
      { id: 's3Prefix', label: 'S3 Prefix (folder)', type: 'text', required: false, placeholder: 'backups/daily/' },
      { id: 'direction', label: 'Sync Direction', type: 'select', required: true, options: ['Upload to S3', 'Download from S3'], defaultValue: 'Upload to S3' },
      { id: 'deleteRemoved', label: 'Delete files not in source', type: 'boolean', required: false, defaultValue: false },
      { id: 'dryRun', label: 'Dry Run (preview only)', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const bucketName = escapePowerShellString(params.bucketName);
      const localPath = escapePowerShellString(params.localPath);
      const s3Prefix = params.s3Prefix ? escapePowerShellString(params.s3Prefix) : '';
      const direction = params.direction;
      const deleteRemoved = toPowerShellBoolean(params.deleteRemoved);
      const dryRun = toPowerShellBoolean(params.dryRun);

      return `# Sync S3 Objects
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.S3

try {
    $DryRun = ${dryRun}
    $DeleteRemoved = ${deleteRemoved}
    $Stats = @{Uploaded = 0; Downloaded = 0; Deleted = 0; Skipped = 0}
    
${direction === 'Upload to S3' ? `    # Upload local files to S3
    Write-Host "Syncing local files to s3://${bucketName}/${s3Prefix}" -ForegroundColor Cyan
    
    $LocalFiles = Get-ChildItem -Path "${localPath}" -Recurse -File
    
    foreach ($File in $LocalFiles) {
        $RelativePath = $File.FullName.Substring("${localPath}".Length).TrimStart('\\').Replace('\\', '/')
        $S3Key = "${s3Prefix}$RelativePath"
        
        # Check if file exists in S3
        try {
            $S3Object = Get-S3Object -BucketName "${bucketName}" -Key $S3Key
            $S3LastModified = $S3Object.LastModified
            
            if ($File.LastWriteTimeUtc -gt $S3LastModified) {
                if (-not $DryRun) {
                    Write-S3Object -BucketName "${bucketName}" -Key $S3Key -File $File.FullName
                }
                Write-Host "  Updated: $S3Key" -ForegroundColor Yellow
                $Stats.Uploaded++
            } else {
                $Stats.Skipped++
            }
        } catch {
            if (-not $DryRun) {
                Write-S3Object -BucketName "${bucketName}" -Key $S3Key -File $File.FullName
            }
            Write-Host "  Uploaded: $S3Key" -ForegroundColor Green
            $Stats.Uploaded++
        }
    }
    
    if ($DeleteRemoved) {
        $S3Objects = Get-S3Object -BucketName "${bucketName}" -KeyPrefix "${s3Prefix}"
        foreach ($S3Obj in $S3Objects) {
            $LocalEquivalent = Join-Path "${localPath}" ($S3Obj.Key.Substring("${s3Prefix}".Length).Replace('/', '\\'))
            if (-not (Test-Path $LocalEquivalent)) {
                if (-not $DryRun) {
                    Remove-S3Object -BucketName "${bucketName}" -Key $S3Obj.Key -Force
                }
                Write-Host "  Deleted: $($S3Obj.Key)" -ForegroundColor Red
                $Stats.Deleted++
            }
        }
    }` :
`    # Download S3 files to local
    Write-Host "Syncing s3://${bucketName}/${s3Prefix} to local directory" -ForegroundColor Cyan
    
    $S3Objects = Get-S3Object -BucketName "${bucketName}" -KeyPrefix "${s3Prefix}"
    
    foreach ($S3Obj in $S3Objects) {
        if ($S3Obj.Key.EndsWith('/')) { continue }
        
        $RelativePath = $S3Obj.Key.Substring("${s3Prefix}".Length).Replace('/', '\\')
        $LocalFilePath = Join-Path "${localPath}" $RelativePath
        $LocalDir = Split-Path $LocalFilePath -Parent
        
        if (-not (Test-Path $LocalDir)) {
            New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null
        }
        
        $ShouldDownload = $true
        if (Test-Path $LocalFilePath) {
            $LocalFile = Get-Item $LocalFilePath
            if ($LocalFile.LastWriteTimeUtc -ge $S3Obj.LastModified) {
                $ShouldDownload = $false
                $Stats.Skipped++
            }
        }
        
        if ($ShouldDownload) {
            if (-not $DryRun) {
                Read-S3Object -BucketName "${bucketName}" -Key $S3Obj.Key -File $LocalFilePath
            }
            Write-Host "  Downloaded: $($S3Obj.Key)" -ForegroundColor Green
            $Stats.Downloaded++
        }
    }`}
    
    Write-Host ""
    Write-Host "✓ Sync completed" -ForegroundColor Green
    Write-Host "  Files processed: $($Stats.Uploaded + $Stats.Downloaded)" -ForegroundColor Cyan
    Write-Host "  Files skipped: $($Stats.Skipped)" -ForegroundColor Gray
    Write-Host "  Files deleted: $($Stats.Deleted)" -ForegroundColor $(if ($Stats.Deleted -gt 0) { "Red" } else { "Gray" })
    if ($DryRun) {
        Write-Host "  (Dry run - no changes made)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "S3 sync operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-iam-role-management',
    name: 'Manage IAM Roles',
    category: 'IAM Management',
    description: 'Create and configure IAM roles with trust policies and permissions',
    parameters: [
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Role', 'Attach Policy', 'List Role Policies', 'Delete Role'], defaultValue: 'Create Role' },
      { id: 'roleName', label: 'Role Name', type: 'text', required: true, placeholder: 'EC2-Admin-Role' },
      { id: 'trustedService', label: 'Trusted Service', type: 'select', required: false, options: ['ec2.amazonaws.com', 'lambda.amazonaws.com', 'ecs-tasks.amazonaws.com', 'states.amazonaws.com'], defaultValue: 'ec2.amazonaws.com' },
      { id: 'policyArn', label: 'Policy ARN (for attach)', type: 'text', required: false, placeholder: 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess' },
      { id: 'description', label: 'Role Description', type: 'text', required: false, placeholder: 'Role for EC2 instances to access AWS resources' }
    ],
    scriptTemplate: (params) => {
      const action = params.action;
      const roleName = escapePowerShellString(params.roleName);
      const trustedService = params.trustedService || 'ec2.amazonaws.com';
      const policyArn = params.policyArn ? escapePowerShellString(params.policyArn) : '';
      const description = params.description ? escapePowerShellString(params.description) : 'Created by PowerShell automation';

      return `# Manage IAM Roles
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
${action === 'Create Role' ? `    # Create trust policy document
    $TrustPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{
                    Service = "${trustedService}"
                }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    # Create IAM role
    $Role = New-IAMRole \`
        -RoleName "${roleName}" \`
        -AssumeRolePolicyDocument $TrustPolicy \`
        -Description "${description}"
    
    Write-Host "✓ IAM role created" -ForegroundColor Green
    Write-Host "  Role Name: ${roleName}" -ForegroundColor Cyan
    Write-Host "  Role ARN: $($Role.Arn)" -ForegroundColor Cyan
    Write-Host "  Trusted Service: ${trustedService}" -ForegroundColor Cyan` :
action === 'Attach Policy' ? `    # Attach policy to role
    Register-IAMRolePolicy \`
        -RoleName "${roleName}" \`
        -PolicyArn "${policyArn}"
    
    Write-Host "✓ Policy attached to role" -ForegroundColor Green
    Write-Host "  Role: ${roleName}" -ForegroundColor Cyan
    Write-Host "  Policy: ${policyArn}" -ForegroundColor Cyan` :
action === 'List Role Policies' ? `    # List attached policies
    Write-Host "Policies attached to role: ${roleName}" -ForegroundColor Cyan
    Write-Host ""
    
    # Managed policies
    $ManagedPolicies = Get-IAMAttachedRolePolicyList -RoleName "${roleName}"
    Write-Host "Managed Policies:" -ForegroundColor Yellow
    if ($ManagedPolicies.Count -eq 0) {
        Write-Host "  (none)" -ForegroundColor Gray
    } else {
        $ManagedPolicies | ForEach-Object {
            Write-Host "  $($_.PolicyName)" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    
    # Inline policies
    $InlinePolicies = Get-IAMRolePolicyList -RoleName "${roleName}"
    Write-Host "Inline Policies:" -ForegroundColor Yellow
    if ($InlinePolicies.Count -eq 0) {
        Write-Host "  (none)" -ForegroundColor Gray
    } else {
        $InlinePolicies | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Green
        }
    }` :
`    # Delete role (must detach policies first)
    Write-Host "Removing policies from role..." -ForegroundColor Yellow
    
    # Detach managed policies
    $ManagedPolicies = Get-IAMAttachedRolePolicyList -RoleName "${roleName}"
    foreach ($Policy in $ManagedPolicies) {
        Unregister-IAMRolePolicy -RoleName "${roleName}" -PolicyArn $Policy.PolicyArn
        Write-Host "  Detached: $($Policy.PolicyName)" -ForegroundColor Gray
    }
    
    # Delete inline policies
    $InlinePolicies = Get-IAMRolePolicyList -RoleName "${roleName}"
    foreach ($Policy in $InlinePolicies) {
        Remove-IAMRolePolicy -RoleName "${roleName}" -PolicyName $Policy
        Write-Host "  Deleted inline: $Policy" -ForegroundColor Gray
    }
    
    # Delete the role
    Remove-IAMRole -RoleName "${roleName}" -Force
    
    Write-Host "✓ IAM role deleted: ${roleName}" -ForegroundColor Green`}
    
} catch {
    Write-Error "IAM role operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-iam-access-key-rotation',
    name: 'Rotate IAM Access Keys',
    category: 'IAM Management',
    description: 'Rotate access keys for IAM users with optional old key deactivation',
    parameters: [
      { id: 'userName', label: 'IAM User Name', type: 'text', required: true, placeholder: 'service-account' },
      { id: 'deactivateOld', label: 'Deactivate Old Keys', type: 'boolean', required: false, defaultValue: true },
      { id: 'deleteOld', label: 'Delete Old Keys', type: 'boolean', required: false, defaultValue: false }
    ],
    scriptTemplate: (params) => {
      const userName = escapePowerShellString(params.userName);
      const deactivateOld = toPowerShellBoolean(params.deactivateOld);
      const deleteOld = toPowerShellBoolean(params.deleteOld);

      return `# Rotate IAM Access Keys
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.IdentityManagement

try {
    $DeactivateOld = ${deactivateOld}
    $DeleteOld = ${deleteOld}
    
    # Get existing access keys
    $ExistingKeys = Get-IAMAccessKey -UserName "${userName}"
    
    Write-Host "Current access keys for ${userName}:" -ForegroundColor Cyan
    $ExistingKeys | ForEach-Object {
        Write-Host "  Key: $($_.AccessKeyId) - Status: $($_.Status) - Created: $($_.CreateDate)" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Check if user has 2 keys already (AWS limit)
    if ($ExistingKeys.Count -ge 2) {
        if ($DeleteOld) {
            $OldestKey = $ExistingKeys | Sort-Object CreateDate | Select-Object -First 1
            Remove-IAMAccessKey -UserName "${userName}" -AccessKeyId $OldestKey.AccessKeyId -Force
            Write-Host "✓ Deleted oldest key: $($OldestKey.AccessKeyId)" -ForegroundColor Yellow
        } else {
            Write-Host "⚠ User already has 2 access keys. Cannot create more until one is deleted." -ForegroundColor Red
            Write-Host "  Set 'Delete Old Keys' to true to automatically delete the oldest key." -ForegroundColor Yellow
            exit
        }
    }
    
    # Create new access key
    $NewKey = New-IAMAccessKey -UserName "${userName}"
    
    Write-Host "✓ New access key created" -ForegroundColor Green
    Write-Host "  Access Key ID: $($NewKey.AccessKeyId)" -ForegroundColor Cyan
    Write-Host "  Secret Access Key: $($NewKey.SecretAccessKey)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Save the secret key now - it cannot be retrieved later!" -ForegroundColor Red
    Write-Host ""
    
    # Handle old keys
    $ExistingKeys = Get-IAMAccessKey -UserName "${userName}" | Where-Object { $_.AccessKeyId -ne $NewKey.AccessKeyId }
    
    foreach ($OldKey in $ExistingKeys) {
        if ($DeleteOld) {
            Remove-IAMAccessKey -UserName "${userName}" -AccessKeyId $OldKey.AccessKeyId -Force
            Write-Host "✓ Deleted old key: $($OldKey.AccessKeyId)" -ForegroundColor Yellow
        } elseif ($DeactivateOld -and $OldKey.Status -eq "Active") {
            Update-IAMAccessKey -UserName "${userName}" -AccessKeyId $OldKey.AccessKeyId -Status Inactive
            Write-Host "✓ Deactivated old key: $($OldKey.AccessKeyId)" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Key rotation completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Error "Access key rotation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-rds-parameter-groups',
    name: 'Manage RDS Parameter Groups',
    category: 'RDS Database',
    description: 'Create and modify RDS parameter groups for database configuration',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Parameter Group', 'Modify Parameters', 'Apply to Instance', 'List Parameters'], defaultValue: 'Create Parameter Group' },
      { id: 'parameterGroupName', label: 'Parameter Group Name', type: 'text', required: true, placeholder: 'mysql-custom-params' },
      { id: 'family', label: 'DB Family', type: 'select', required: false, options: ['mysql8.0', 'mysql5.7', 'postgres14', 'postgres15', 'mariadb10.6'], defaultValue: 'mysql8.0' },
      { id: 'description', label: 'Description', type: 'text', required: false, placeholder: 'Custom parameter group for production' },
      { id: 'dbInstanceId', label: 'DB Instance Identifier (for apply)', type: 'text', required: false, placeholder: 'production-db' },
      { id: 'parameterName', label: 'Parameter Name', type: 'text', required: false, placeholder: 'max_connections' },
      { id: 'parameterValue', label: 'Parameter Value', type: 'text', required: false, placeholder: '500' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const parameterGroupName = escapePowerShellString(params.parameterGroupName);
      const family = params.family || 'mysql8.0';
      const description = params.description ? escapePowerShellString(params.description) : 'Custom parameter group';
      const dbInstanceId = params.dbInstanceId ? escapePowerShellString(params.dbInstanceId) : '';
      const parameterName = params.parameterName ? escapePowerShellString(params.parameterName) : '';
      const parameterValue = params.parameterValue ? escapePowerShellString(params.parameterValue) : '';

      return `# Manage RDS Parameter Groups
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.RDS

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Parameter Group' ? `    # Create parameter group
    New-RDSDBParameterGroup \`
        -DBParameterGroupName "${parameterGroupName}" \`
        -DBParameterGroupFamily "${family}" \`
        -Description "${description}"
    
    Write-Host "✓ Parameter group created" -ForegroundColor Green
    Write-Host "  Name: ${parameterGroupName}" -ForegroundColor Cyan
    Write-Host "  Family: ${family}" -ForegroundColor Cyan` :
action === 'Modify Parameters' ? `    # Modify parameter
    $Parameter = New-Object Amazon.RDS.Model.Parameter
    $Parameter.ParameterName = "${parameterName}"
    $Parameter.ParameterValue = "${parameterValue}"
    $Parameter.ApplyMethod = "pending-reboot"
    
    Edit-RDSDBParameterGroup \`
        -DBParameterGroupName "${parameterGroupName}" \`
        -Parameter $Parameter
    
    Write-Host "✓ Parameter modified" -ForegroundColor Green
    Write-Host "  Group: ${parameterGroupName}" -ForegroundColor Cyan
    Write-Host "  Parameter: ${parameterName} = ${parameterValue}" -ForegroundColor Cyan
    Write-Host "  Note: Requires instance reboot to apply" -ForegroundColor Yellow` :
action === 'Apply to Instance' ? `    # Apply parameter group to instance
    Edit-RDSDBInstance \`
        -DBInstanceIdentifier "${dbInstanceId}" \`
        -DBParameterGroupName "${parameterGroupName}" \`
        -ApplyImmediately \$true
    
    Write-Host "✓ Parameter group applied" -ForegroundColor Green
    Write-Host "  Instance: ${dbInstanceId}" -ForegroundColor Cyan
    Write-Host "  Parameter Group: ${parameterGroupName}" -ForegroundColor Cyan
    Write-Host "  Note: Some parameters require reboot to take effect" -ForegroundColor Yellow` :
`    # List parameters
    $Parameters = Get-RDSDBParameter -DBParameterGroupName "${parameterGroupName}"
    
    Write-Host "Parameters in ${parameterGroupName}:" -ForegroundColor Cyan
    Write-Host ""
    
    $ModifiedParams = $Parameters | Where-Object { $_.Source -eq "user" }
    if ($ModifiedParams.Count -gt 0) {
        Write-Host "User-Modified Parameters:" -ForegroundColor Yellow
        $ModifiedParams | Format-Table ParameterName, ParameterValue, ApplyType -AutoSize
    }
    
    Write-Host ""
    Write-Host "Total parameters: $($Parameters.Count)" -ForegroundColor Gray`}
    
} catch {
    Write-Error "RDS parameter group operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-lambda-layer-management',
    name: 'Manage Lambda Layers',
    category: 'Serverless',
    description: 'Create, publish, and manage Lambda layers for shared code and dependencies',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Layer', 'List Layers', 'Delete Layer Version', 'Add Layer to Function'], defaultValue: 'Create Layer' },
      { id: 'layerName', label: 'Layer Name', type: 'text', required: true, placeholder: 'common-dependencies' },
      { id: 'description', label: 'Layer Description', type: 'text', required: false, placeholder: 'Shared Python libraries for data processing' },
      { id: 'zipFilePath', label: 'Layer Package Path', type: 'path', required: false, placeholder: 'C:\\Lambda\\layer.zip' },
      { id: 'compatibleRuntimes', label: 'Compatible Runtimes', type: 'select', required: false, options: ['python3.9', 'python3.10', 'nodejs18.x', 'nodejs20.x'], defaultValue: 'python3.9' },
      { id: 'functionName', label: 'Function Name (for add)', type: 'text', required: false, placeholder: 'my-lambda-function' },
      { id: 'layerVersionArn', label: 'Layer Version ARN', type: 'text', required: false, placeholder: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const layerName = escapePowerShellString(params.layerName);
      const description = params.description ? escapePowerShellString(params.description) : 'Lambda layer created via PowerShell';
      const zipFilePath = params.zipFilePath ? escapePowerShellString(params.zipFilePath) : '';
      const compatibleRuntimes = params.compatibleRuntimes || 'python3.9';
      const functionName = params.functionName ? escapePowerShellString(params.functionName) : '';
      const layerVersionArn = params.layerVersionArn ? escapePowerShellString(params.layerVersionArn) : '';

      return `# Manage Lambda Layers
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Lambda

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Layer' ? `    # Read layer package
    $ZipBytes = [System.IO.File]::ReadAllBytes("${zipFilePath}")
    $MemoryStream = New-Object System.IO.MemoryStream(,$ZipBytes)
    
    # Publish layer version
    $Layer = Publish-LMLayerVersion \`
        -LayerName "${layerName}" \`
        -Description "${description}" \`
        -ZipFile $MemoryStream \`
        -CompatibleRuntime @("${compatibleRuntimes}")
    
    Write-Host "✓ Lambda layer published" -ForegroundColor Green
    Write-Host "  Layer Name: ${layerName}" -ForegroundColor Cyan
    Write-Host "  Version: $($Layer.Version)" -ForegroundColor Cyan
    Write-Host "  Layer ARN: $($Layer.LayerVersionArn)" -ForegroundColor Cyan
    Write-Host "  Compatible Runtime: ${compatibleRuntimes}" -ForegroundColor Cyan
    
    $MemoryStream.Dispose()` :
action === 'List Layers' ? `    # List layer versions
    $Layers = Get-LMLayerVersionList -LayerName "${layerName}"
    
    Write-Host "Layer versions for ${layerName}:" -ForegroundColor Cyan
    Write-Host ""
    
    $Layers | ForEach-Object {
        Write-Host "  Version $($_.Version)" -ForegroundColor Green
        Write-Host "    ARN: $($_.LayerVersionArn)" -ForegroundColor Gray
        Write-Host "    Created: $($_.CreatedDate)" -ForegroundColor Gray
        Write-Host "    Runtimes: $($_.CompatibleRuntimes -join ', ')" -ForegroundColor Gray
        Write-Host ""
    }` :
action === 'Delete Layer Version' ? `    # Extract version from ARN
    $Version = "${layerVersionArn}".Split(':')[-1]
    
    Remove-LMLayerVersion -LayerName "${layerName}" -VersionNumber $Version
    
    Write-Host "✓ Layer version deleted" -ForegroundColor Green
    Write-Host "  Layer: ${layerName}" -ForegroundColor Cyan
    Write-Host "  Version: $Version" -ForegroundColor Cyan` :
`    # Add layer to function
    $Function = Get-LMFunction -FunctionName "${functionName}"
    $CurrentLayers = $Function.Configuration.Layers.Arn
    
    # Add new layer to existing layers
    $NewLayers = @($CurrentLayers) + @("${layerVersionArn}")
    $NewLayers = $NewLayers | Where-Object { $_ }
    
    Update-LMFunctionConfiguration \`
        -FunctionName "${functionName}" \`
        -Layer $NewLayers
    
    Write-Host "✓ Layer added to function" -ForegroundColor Green
    Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
    Write-Host "  Layer: ${layerVersionArn}" -ForegroundColor Cyan
    Write-Host "  Total layers: $($NewLayers.Count)" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Lambda layer operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-cloudwatch-log-groups',
    name: 'Manage CloudWatch Log Groups',
    category: 'Monitoring & Alerting',
    description: 'Create, configure, and query CloudWatch log groups with retention policies',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Log Group', 'Set Retention', 'Query Logs', 'Delete Log Group', 'List Log Groups'], defaultValue: 'Create Log Group' },
      { id: 'logGroupName', label: 'Log Group Name', type: 'text', required: true, placeholder: '/aws/lambda/my-function' },
      { id: 'retentionDays', label: 'Retention (days)', type: 'select', required: false, options: ['1', '3', '7', '14', '30', '60', '90', '180', '365', 'Never Expire'], defaultValue: '30' },
      { id: 'filterPattern', label: 'Filter Pattern (for query)', type: 'text', required: false, placeholder: 'ERROR' },
      { id: 'startTime', label: 'Start Time (hours ago)', type: 'number', required: false, placeholder: '24', defaultValue: 24 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const logGroupName = escapePowerShellString(params.logGroupName);
      const retentionDays = params.retentionDays === 'Never Expire' ? 0 : (parseInt(params.retentionDays) || 30);
      const filterPattern = params.filterPattern ? escapePowerShellString(params.filterPattern) : '';
      const startTime = params.startTime || 24;

      return `# Manage CloudWatch Log Groups
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudWatchLogs

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Log Group' ? `    # Create log group
    New-CWLLogGroup -LogGroupName "${logGroupName}"
    
    Write-Host "✓ Log group created: ${logGroupName}" -ForegroundColor Green
    
    # Set retention if specified
${retentionDays > 0 ? `    Write-CWLRetentionPolicy -LogGroupName "${logGroupName}" -RetentionInDays ${retentionDays}
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Cyan` : `    Write-Host "  Retention: Never expire" -ForegroundColor Cyan`}` :
action === 'Set Retention' ? `    # Set retention policy
${retentionDays > 0 ? `    Write-CWLRetentionPolicy -LogGroupName "${logGroupName}" -RetentionInDays ${retentionDays}
    
    Write-Host "✓ Retention policy updated" -ForegroundColor Green
    Write-Host "  Log Group: ${logGroupName}" -ForegroundColor Cyan
    Write-Host "  Retention: ${retentionDays} days" -ForegroundColor Cyan` : `    Remove-CWLRetentionPolicy -LogGroupName "${logGroupName}"
    
    Write-Host "✓ Retention policy removed (logs never expire)" -ForegroundColor Green
    Write-Host "  Log Group: ${logGroupName}" -ForegroundColor Cyan`}` :
action === 'Query Logs' ? `    # Query logs using CloudWatch Logs Insights
    $StartTime = (Get-Date).AddHours(-${startTime})
    $EndTime = Get-Date
    
    $Query = @"
fields @timestamp, @message
| filter @message like /${filterPattern}/
| sort @timestamp desc
| limit 100
"@
    
    # Start query
    $QueryId = Start-CWLQuery \`
        -LogGroupName "${logGroupName}" \`
        -StartTime ([DateTimeOffset]$StartTime).ToUnixTimeMilliseconds() \`
        -EndTime ([DateTimeOffset]$EndTime).ToUnixTimeMilliseconds() \`
        -QueryString $Query
    
    Write-Host "Query started: $QueryId" -ForegroundColor Cyan
    Write-Host "Waiting for results..." -ForegroundColor Yellow
    
    # Wait for query to complete
    do {
        Start-Sleep -Seconds 1
        $Status = Get-CWLQueryResult -QueryId $QueryId
    } while ($Status.Status -eq "Running")
    
    Write-Host "✓ Query completed" -ForegroundColor Green
    Write-Host "  Records scanned: $($Status.Statistics.RecordsScanned)" -ForegroundColor Gray
    Write-Host "  Records matched: $($Status.Statistics.RecordsMatched)" -ForegroundColor Gray
    Write-Host ""
    
    # Display results
    foreach ($Result in $Status.Results) {
        $Timestamp = ($Result | Where-Object { $_.Field -eq "@timestamp" }).Value
        $Message = ($Result | Where-Object { $_.Field -eq "@message" }).Value
        Write-Host "[$Timestamp] $Message" -ForegroundColor White
    }` :
action === 'Delete Log Group' ? `    # Delete log group
    Remove-CWLLogGroup -LogGroupName "${logGroupName}" -Force
    
    Write-Host "✓ Log group deleted: ${logGroupName}" -ForegroundColor Green
    Write-Host "  ⚠ All logs have been permanently deleted" -ForegroundColor Yellow` :
`    # List log groups
    $LogGroups = Get-CWLLogGroup
    
    Write-Host "✓ CloudWatch Log Groups:" -ForegroundColor Green
    Write-Host ""
    
    $LogGroups | ForEach-Object {
        $Retention = if ($_.RetentionInDays) { "$($_.RetentionInDays) days" } else { "Never expire" }
        $SizeMB = [math]::Round($_.StoredBytes / 1MB, 2)
        Write-Host "  $($_.LogGroupName)" -ForegroundColor Cyan
        Write-Host "    Retention: $Retention | Size: $SizeMB MB" -ForegroundColor Gray
    }`}
    
} catch {
    Write-Error "CloudWatch Logs operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-cloudwatch-dashboard',
    name: 'Create CloudWatch Dashboard',
    category: 'Monitoring & Alerting',
    description: 'Create custom CloudWatch dashboards with widgets for monitoring AWS resources',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'dashboardName', label: 'Dashboard Name', type: 'text', required: true, placeholder: 'Production-Overview' },
      { id: 'instanceIds', label: 'EC2 Instance IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'i-1234567890abcdef0, i-0987654321fedcba0' },
      { id: 'rdsInstanceIds', label: 'RDS Instance IDs (comma-separated)', type: 'textarea', required: false, placeholder: 'production-db, staging-db' },
      { id: 'lambdaFunctions', label: 'Lambda Functions (comma-separated)', type: 'textarea', required: false, placeholder: 'function1, function2' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const dashboardName = escapePowerShellString(params.dashboardName);
      const instanceIdsRaw = params.instanceIds ? (params.instanceIds as string).split(',').map((n: string) => n.trim()).filter((n: string) => n) : [];
      const rdsInstanceIdsRaw = params.rdsInstanceIds ? (params.rdsInstanceIds as string).split(',').map((n: string) => n.trim()).filter((n: string) => n) : [];
      const lambdaFunctionsRaw = params.lambdaFunctions ? (params.lambdaFunctions as string).split(',').map((n: string) => n.trim()).filter((n: string) => n) : [];

      return `# Create CloudWatch Dashboard
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CloudWatch

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Build dashboard widgets
    $Widgets = @()
    $YPosition = 0
    
${instanceIdsRaw.length > 0 ? `    # EC2 CPU Utilization Widget
    $EC2Metrics = @()
    @(${instanceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) | ForEach-Object {
        $EC2Metrics += @("AWS/EC2", "CPUUtilization", "InstanceId", $_)
    }
    
    $Widgets += @{
        type = "metric"
        x = 0
        y = $YPosition
        width = 12
        height = 6
        properties = @{
            title = "EC2 CPU Utilization"
            region = "${region}"
            metrics = @($EC2Metrics)
            period = 300
            stat = "Average"
        }
    }
    $YPosition += 6
` : ''}
${rdsInstanceIdsRaw.length > 0 ? `    # RDS Connections Widget
    $RDSMetrics = @()
    @(${rdsInstanceIdsRaw.map(id => `"${escapePowerShellString(id)}"`).join(', ')}) | ForEach-Object {
        $RDSMetrics += @("AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", $_)
    }
    
    $Widgets += @{
        type = "metric"
        x = 0
        y = $YPosition
        width = 12
        height = 6
        properties = @{
            title = "RDS Database Connections"
            region = "${region}"
            metrics = @($RDSMetrics)
            period = 300
            stat = "Average"
        }
    }
    $YPosition += 6
` : ''}
${lambdaFunctionsRaw.length > 0 ? `    # Lambda Invocations Widget
    $LambdaMetrics = @()
    @(${lambdaFunctionsRaw.map(fn => `"${escapePowerShellString(fn)}"`).join(', ')}) | ForEach-Object {
        $LambdaMetrics += @("AWS/Lambda", "Invocations", "FunctionName", $_)
    }
    
    $Widgets += @{
        type = "metric"
        x = 0
        y = $YPosition
        width = 12
        height = 6
        properties = @{
            title = "Lambda Invocations"
            region = "${region}"
            metrics = @($LambdaMetrics)
            period = 300
            stat = "Sum"
        }
    }
    
    # Lambda Errors Widget
    $LambdaErrorMetrics = @()
    @(${lambdaFunctionsRaw.map(fn => `"${escapePowerShellString(fn)}"`).join(', ')}) | ForEach-Object {
        $LambdaErrorMetrics += @("AWS/Lambda", "Errors", "FunctionName", $_)
    }
    
    $Widgets += @{
        type = "metric"
        x = 12
        y = $YPosition
        width = 12
        height = 6
        properties = @{
            title = "Lambda Errors"
            region = "${region}"
            metrics = @($LambdaErrorMetrics)
            period = 300
            stat = "Sum"
        }
    }
` : ''}
    # Create dashboard body
    $DashboardBody = @{
        widgets = $Widgets
    } | ConvertTo-Json -Depth 10
    
    # Create/update dashboard
    Write-CWDashboard -DashboardName "${dashboardName}" -DashboardBody $DashboardBody
    
    Write-Host "✓ CloudWatch dashboard created/updated" -ForegroundColor Green
    Write-Host "  Dashboard: ${dashboardName}" -ForegroundColor Cyan
    Write-Host "  Region: ${region}" -ForegroundColor Cyan
    Write-Host "  Widgets: $($Widgets.Count)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "View at: https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboardName}" -ForegroundColor Yellow
    
} catch {
    Write-Error "CloudWatch dashboard operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-vpc-subnet-management',
    name: 'Manage VPC Subnets',
    category: 'Networking',
    description: 'Create and configure VPC subnets with route table associations',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create Subnet', 'Associate Route Table', 'Enable Auto-Assign IP', 'List Subnets'], defaultValue: 'Create Subnet' },
      { id: 'vpcId', label: 'VPC ID', type: 'text', required: true, placeholder: 'vpc-1234567890abcdef0' },
      { id: 'subnetName', label: 'Subnet Name', type: 'text', required: false, placeholder: 'Public-Subnet-1a' },
      { id: 'cidrBlock', label: 'CIDR Block', type: 'text', required: false, placeholder: '10.0.1.0/24' },
      { id: 'availabilityZone', label: 'Availability Zone', type: 'text', required: false, placeholder: 'us-east-1a' },
      { id: 'subnetId', label: 'Subnet ID (for operations)', type: 'text', required: false, placeholder: 'subnet-1234567890abcdef0' },
      { id: 'routeTableId', label: 'Route Table ID', type: 'text', required: false, placeholder: 'rtb-1234567890abcdef0' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const vpcId = escapePowerShellString(params.vpcId);
      const subnetName = params.subnetName ? escapePowerShellString(params.subnetName) : '';
      const cidrBlock = params.cidrBlock ? escapePowerShellString(params.cidrBlock) : '';
      const availabilityZone = params.availabilityZone ? escapePowerShellString(params.availabilityZone) : '';
      const subnetId = params.subnetId ? escapePowerShellString(params.subnetId) : '';
      const routeTableId = params.routeTableId ? escapePowerShellString(params.routeTableId) : '';

      return `# Manage VPC Subnets
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create Subnet' ? `    # Create subnet
    $Subnet = New-EC2Subnet \`
        -VpcId "${vpcId}" \`
        -CidrBlock "${cidrBlock}" \`
        -AvailabilityZone "${availabilityZone}"
    
    # Tag the subnet
    $Tag = New-Object Amazon.EC2.Model.Tag
    $Tag.Key = "Name"
    $Tag.Value = "${subnetName}"
    New-EC2Tag -Resource $Subnet.SubnetId -Tag $Tag
    
    Write-Host "✓ Subnet created" -ForegroundColor Green
    Write-Host "  Subnet ID: $($Subnet.SubnetId)" -ForegroundColor Cyan
    Write-Host "  Name: ${subnetName}" -ForegroundColor Cyan
    Write-Host "  VPC: ${vpcId}" -ForegroundColor Cyan
    Write-Host "  CIDR: ${cidrBlock}" -ForegroundColor Cyan
    Write-Host "  AZ: ${availabilityZone}" -ForegroundColor Cyan` :
action === 'Associate Route Table' ? `    # Associate route table with subnet
    $Association = Register-EC2RouteTable \`
        -RouteTableId "${routeTableId}" \`
        -SubnetId "${subnetId}"
    
    Write-Host "✓ Route table associated" -ForegroundColor Green
    Write-Host "  Subnet: ${subnetId}" -ForegroundColor Cyan
    Write-Host "  Route Table: ${routeTableId}" -ForegroundColor Cyan
    Write-Host "  Association ID: $($Association)" -ForegroundColor Cyan` :
action === 'Enable Auto-Assign IP' ? `    # Enable auto-assign public IP
    Edit-EC2SubnetAttribute \`
        -SubnetId "${subnetId}" \`
        -MapPublicIpOnLaunch \$true
    
    Write-Host "✓ Auto-assign public IP enabled" -ForegroundColor Green
    Write-Host "  Subnet: ${subnetId}" -ForegroundColor Cyan
    Write-Host "  New instances will receive public IPs automatically" -ForegroundColor Yellow` :
`    # List subnets in VPC
    $Subnets = Get-EC2Subnet -Filter @{Name="vpc-id";Values="${vpcId}"}
    
    Write-Host "✓ Subnets in VPC ${vpcId}:" -ForegroundColor Green
    Write-Host ""
    
    $Subnets | ForEach-Object {
        $Name = ($_.Tags | Where-Object { $_.Key -eq "Name" }).Value
        if (-not $Name) { $Name = "(unnamed)" }
        
        Write-Host "  $Name" -ForegroundColor Cyan
        Write-Host "    Subnet ID: $($_.SubnetId)" -ForegroundColor Gray
        Write-Host "    CIDR: $($_.CidrBlock)" -ForegroundColor Gray
        Write-Host "    AZ: $($_.AvailabilityZone)" -ForegroundColor Gray
        Write-Host "    Available IPs: $($_.AvailableIpAddressCount)" -ForegroundColor Gray
        Write-Host "    Public IP: $(if ($_.MapPublicIpOnLaunch) { 'Auto-assign' } else { 'No' })" -ForegroundColor Gray
        Write-Host ""
    }`}
    
} catch {
    Write-Error "VPC subnet operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-nat-gateway-management',
    name: 'Manage NAT Gateways',
    category: 'Networking',
    description: 'Create and configure NAT gateways for private subnet internet access',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Create NAT Gateway', 'Add Route to Private Subnet', 'Delete NAT Gateway', 'List NAT Gateways'], defaultValue: 'Create NAT Gateway' },
      { id: 'subnetId', label: 'Public Subnet ID', type: 'text', required: false, placeholder: 'subnet-1234567890abcdef0' },
      { id: 'allocationId', label: 'Elastic IP Allocation ID', type: 'text', required: false, placeholder: 'eipalloc-1234567890abcdef0' },
      { id: 'natGatewayId', label: 'NAT Gateway ID', type: 'text', required: false, placeholder: 'nat-1234567890abcdef0' },
      { id: 'routeTableId', label: 'Private Route Table ID', type: 'text', required: false, placeholder: 'rtb-1234567890abcdef0' },
      { id: 'natGatewayName', label: 'NAT Gateway Name', type: 'text', required: false, placeholder: 'NAT-Gateway-1a' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const subnetId = params.subnetId ? escapePowerShellString(params.subnetId) : '';
      const allocationId = params.allocationId ? escapePowerShellString(params.allocationId) : '';
      const natGatewayId = params.natGatewayId ? escapePowerShellString(params.natGatewayId) : '';
      const routeTableId = params.routeTableId ? escapePowerShellString(params.routeTableId) : '';
      const natGatewayName = params.natGatewayName ? escapePowerShellString(params.natGatewayName) : 'NAT-Gateway';

      return `# Manage NAT Gateways
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EC2

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Create NAT Gateway' ? `    # Create NAT Gateway
    $NatGateway = New-EC2NatGateway \`
        -SubnetId "${subnetId}" \`
        -AllocationId "${allocationId}"
    
    # Tag the NAT Gateway
    $Tag = New-Object Amazon.EC2.Model.Tag
    $Tag.Key = "Name"
    $Tag.Value = "${natGatewayName}"
    New-EC2Tag -Resource $NatGateway.NatGateway.NatGatewayId -Tag $Tag
    
    Write-Host "✓ NAT Gateway creation initiated" -ForegroundColor Green
    Write-Host "  NAT Gateway ID: $($NatGateway.NatGateway.NatGatewayId)" -ForegroundColor Cyan
    Write-Host "  Name: ${natGatewayName}" -ForegroundColor Cyan
    Write-Host "  Subnet: ${subnetId}" -ForegroundColor Cyan
    Write-Host "  State: $($NatGateway.NatGateway.State)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Waiting for NAT Gateway to become available..." -ForegroundColor Yellow
    
    # Wait for NAT Gateway to be available
    $Attempts = 0
    do {
        Start-Sleep -Seconds 15
        $Attempts++
        $Status = Get-EC2NatGateway -NatGatewayId $NatGateway.NatGateway.NatGatewayId
        Write-Host "  Status: $($Status.State)" -ForegroundColor Gray
    } while ($Status.State -eq "pending" -and $Attempts -lt 20)
    
    if ($Status.State -eq "available") {
        Write-Host "✓ NAT Gateway is now available" -ForegroundColor Green
    }` :
action === 'Add Route to Private Subnet' ? `    # Add route to NAT Gateway in private route table
    New-EC2Route \`
        -RouteTableId "${routeTableId}" \`
        -DestinationCidrBlock "0.0.0.0/0" \`
        -NatGatewayId "${natGatewayId}"
    
    Write-Host "✓ Route added to private subnet" -ForegroundColor Green
    Write-Host "  Route Table: ${routeTableId}" -ForegroundColor Cyan
    Write-Host "  Destination: 0.0.0.0/0" -ForegroundColor Cyan
    Write-Host "  NAT Gateway: ${natGatewayId}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Private subnet instances can now access the internet via NAT" -ForegroundColor Yellow` :
action === 'Delete NAT Gateway' ? `    # Delete NAT Gateway
    Remove-EC2NatGateway -NatGatewayId "${natGatewayId}" -Force
    
    Write-Host "✓ NAT Gateway deletion initiated: ${natGatewayId}" -ForegroundColor Green
    Write-Host "  Note: The associated Elastic IP is NOT automatically released" -ForegroundColor Yellow
    Write-Host "  You may want to release it to avoid charges" -ForegroundColor Yellow` :
`    # List NAT Gateways
    $NatGateways = Get-EC2NatGateway
    
    Write-Host "✓ NAT Gateways:" -ForegroundColor Green
    Write-Host ""
    
    $NatGateways | Where-Object { $_.State -ne "deleted" } | ForEach-Object {
        $Name = ($_.Tags | Where-Object { $_.Key -eq "Name" }).Value
        if (-not $Name) { $Name = "(unnamed)" }
        
        Write-Host "  $Name" -ForegroundColor Cyan
        Write-Host "    NAT Gateway ID: $($_.NatGatewayId)" -ForegroundColor Gray
        Write-Host "    State: $($_.State)" -ForegroundColor $(if ($_.State -eq "available") { "Green" } else { "Yellow" })
        Write-Host "    Subnet: $($_.SubnetId)" -ForegroundColor Gray
        Write-Host "    Public IP: $($_.NatGatewayAddresses[0].PublicIp)" -ForegroundColor Gray
        Write-Host ""
    }`}
    
} catch {
    Write-Error "NAT Gateway operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-eks-workload-deployment',
    name: 'Deploy EKS Workloads',
    category: 'Kubernetes',
    description: 'Configure kubectl and deploy workloads to Amazon EKS clusters',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'clusterName', label: 'EKS Cluster Name', type: 'text', required: true, placeholder: 'my-eks-cluster' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Configure kubectl', 'List Nodes', 'List Pods', 'Scale Deployment', 'Get Cluster Info'], defaultValue: 'Configure kubectl' },
      { id: 'namespace', label: 'Namespace', type: 'text', required: false, placeholder: 'default', defaultValue: 'default' },
      { id: 'deploymentName', label: 'Deployment Name (for scale)', type: 'text', required: false, placeholder: 'my-app' },
      { id: 'replicas', label: 'Replicas (for scale)', type: 'number', required: false, placeholder: '3', defaultValue: 3 }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const clusterName = escapePowerShellString(params.clusterName);
      const action = params.action;
      const namespace = params.namespace ? escapePowerShellString(params.namespace) : 'default';
      const deploymentName = params.deploymentName ? escapePowerShellString(params.deploymentName) : '';
      const replicas = params.replicas || 3;

      return `# Deploy EKS Workloads
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.EKS

try {
    Set-DefaultAWSRegion -Region "${region}"
    
${action === 'Configure kubectl' ? `    # Update kubeconfig for EKS cluster
    Write-Host "Updating kubeconfig for cluster: ${clusterName}" -ForegroundColor Cyan
    
    aws eks update-kubeconfig --name "${clusterName}" --region "${region}"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ kubectl configured for EKS cluster" -ForegroundColor Green
        Write-Host "  Cluster: ${clusterName}" -ForegroundColor Cyan
        Write-Host "  Region: ${region}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Current context:" -ForegroundColor Yellow
        kubectl config current-context
    } else {
        Write-Error "Failed to update kubeconfig"
    }` :
action === 'List Nodes' ? `    # List cluster nodes
    Write-Host "Nodes in cluster ${clusterName}:" -ForegroundColor Cyan
    Write-Host ""
    
    kubectl get nodes -o wide
    
    Write-Host ""
    Write-Host "Node details:" -ForegroundColor Yellow
    kubectl describe nodes | Select-String -Pattern "Name:|Roles:|cpu:|memory:|pods:"` :
action === 'List Pods' ? `    # List pods in namespace
    Write-Host "Pods in namespace ${namespace}:" -ForegroundColor Cyan
    Write-Host ""
    
    kubectl get pods -n "${namespace}" -o wide
    
    Write-Host ""
    Write-Host "Pod resource usage:" -ForegroundColor Yellow
    kubectl top pods -n "${namespace}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  (Metrics server not available)" -ForegroundColor Gray
    }` :
action === 'Scale Deployment' ? `    # Scale deployment
    Write-Host "Scaling deployment ${deploymentName} to ${replicas} replicas" -ForegroundColor Cyan
    
    kubectl scale deployment "${deploymentName}" -n "${namespace}" --replicas=${replicas}
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Deployment scaled" -ForegroundColor Green
        Write-Host "  Deployment: ${deploymentName}" -ForegroundColor Cyan
        Write-Host "  Namespace: ${namespace}" -ForegroundColor Cyan
        Write-Host "  Replicas: ${replicas}" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Current status:" -ForegroundColor Yellow
        kubectl rollout status deployment/"${deploymentName}" -n "${namespace}"
    }` :
`    # Get cluster info
    Write-Host "EKS Cluster Information" -ForegroundColor Cyan
    Write-Host ""
    
    $Cluster = Get-EKSCluster -Name "${clusterName}"
    
    Write-Host "Cluster Details:" -ForegroundColor Yellow
    Write-Host "  Name: $($Cluster.Name)" -ForegroundColor Cyan
    Write-Host "  Status: $($Cluster.Status)" -ForegroundColor $(if ($Cluster.Status -eq "ACTIVE") { "Green" } else { "Yellow" })
    Write-Host "  Version: $($Cluster.Version)" -ForegroundColor Cyan
    Write-Host "  Endpoint: $($Cluster.Endpoint)" -ForegroundColor Gray
    Write-Host "  Platform Version: $($Cluster.PlatformVersion)" -ForegroundColor Gray
    Write-Host "  Created: $($Cluster.CreatedAt)" -ForegroundColor Gray
    Write-Host ""
    
    # Node groups
    $NodeGroups = Get-EKSNodegroupList -ClusterName "${clusterName}"
    Write-Host "Node Groups:" -ForegroundColor Yellow
    foreach ($NG in $NodeGroups) {
        $NGInfo = Get-EKSNodegroup -ClusterName "${clusterName}" -NodegroupName $NG
        Write-Host "  $NG" -ForegroundColor Cyan
        Write-Host "    Status: $($NGInfo.Status)" -ForegroundColor Gray
        Write-Host "    Instance Types: $($NGInfo.InstanceTypes -join ', ')" -ForegroundColor Gray
        Write-Host "    Desired/Min/Max: $($NGInfo.ScalingConfig.DesiredSize)/$($NGInfo.ScalingConfig.MinSize)/$($NGInfo.ScalingConfig.MaxSize)" -ForegroundColor Gray
    }`}
    
} catch {
    Write-Error "EKS operation failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-cost-explorer-report',
    name: 'Generate Cost Explorer Report',
    category: 'Cost Management',
    description: 'Retrieve AWS cost and usage data for billing analysis and optimization',
    parameters: [
      { id: 'startDate', label: 'Start Date (YYYY-MM-DD)', type: 'text', required: true, placeholder: '2024-01-01' },
      { id: 'endDate', label: 'End Date (YYYY-MM-DD)', type: 'text', required: true, placeholder: '2024-01-31' },
      { id: 'granularity', label: 'Granularity', type: 'select', required: true, options: ['DAILY', 'MONTHLY'], defaultValue: 'DAILY' },
      { id: 'groupBy', label: 'Group By', type: 'select', required: true, options: ['SERVICE', 'LINKED_ACCOUNT', 'REGION', 'USAGE_TYPE'], defaultValue: 'SERVICE' },
      { id: 'exportCsv', label: 'Export to CSV', type: 'boolean', required: false, defaultValue: true },
      { id: 'csvPath', label: 'CSV Export Path', type: 'path', required: false, placeholder: 'C:\\Reports\\aws-costs.csv' }
    ],
    scriptTemplate: (params) => {
      const startDate = escapePowerShellString(params.startDate);
      const endDate = escapePowerShellString(params.endDate);
      const granularity = params.granularity || 'DAILY';
      const groupBy = params.groupBy || 'SERVICE';
      const exportCsv = toPowerShellBoolean(params.exportCsv);
      const csvPath = params.csvPath ? escapePowerShellString(params.csvPath) : 'aws-costs.csv';

      return `# Generate Cost Explorer Report
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.CostExplorer

try {
    $ExportToCsv = ${exportCsv}
    
    # Define time period
    $TimePeriod = New-Object Amazon.CostExplorer.Model.DateInterval
    $TimePeriod.Start = "${startDate}"
    $TimePeriod.End = "${endDate}"
    
    # Define grouping
    $GroupDefinition = New-Object Amazon.CostExplorer.Model.GroupDefinition
    $GroupDefinition.Type = "DIMENSION"
    $GroupDefinition.Key = "${groupBy}"
    
    # Get cost and usage data
    $CostData = Get-CECostAndUsage \`
        -TimePeriod $TimePeriod \`
        -Granularity "${granularity}" \`
        -Metric @("BlendedCost", "UnblendedCost", "UsageQuantity") \`
        -GroupBy $GroupDefinition
    
    Write-Host "✓ AWS Cost Report" -ForegroundColor Green
    Write-Host "  Period: ${startDate} to ${endDate}" -ForegroundColor Cyan
    Write-Host "  Granularity: ${granularity}" -ForegroundColor Cyan
    Write-Host "  Grouped by: ${groupBy}" -ForegroundColor Cyan
    Write-Host ""
    
    # Calculate totals by group
    $TotalsByGroup = @{}
    foreach ($Result in $CostData.ResultsByTime) {
        foreach ($Group in $Result.Groups) {
            $Key = $Group.Keys[0]
            $Amount = [decimal]$Group.Metrics["BlendedCost"].Amount
            
            if ($TotalsByGroup.ContainsKey($Key)) {
                $TotalsByGroup[$Key] += $Amount
            } else {
                $TotalsByGroup[$Key] = $Amount
            }
        }
    }
    
    # Display top costs
    Write-Host "Cost by ${groupBy}:" -ForegroundColor Yellow
    $TotalsByGroup.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15 | ForEach-Object {
        $Formatted = "{0:C2}" -f $_.Value
        Write-Host ("  {0,-40} {1,12}" -f $_.Key, $Formatted) -ForegroundColor $(if ($_.Value -gt 100) { "Red" } elseif ($_.Value -gt 10) { "Yellow" } else { "Green" })
    }
    
    # Total
    $GrandTotal = ($TotalsByGroup.Values | Measure-Object -Sum).Sum
    Write-Host ""
    Write-Host ("  {0,-40} {1,12}" -f "TOTAL", ("{0:C2}" -f $GrandTotal)) -ForegroundColor Cyan
    
    # Export to CSV
    if ($ExportToCsv) {
        $CsvData = @()
        foreach ($Result in $CostData.ResultsByTime) {
            $Date = $Result.TimePeriod.Start
            foreach ($Group in $Result.Groups) {
                $CsvData += [PSCustomObject]@{
                    Date = $Date
                    Group = $Group.Keys[0]
                    BlendedCost = $Group.Metrics["BlendedCost"].Amount
                    UnblendedCost = $Group.Metrics["UnblendedCost"].Amount
                    UsageQuantity = $Group.Metrics["UsageQuantity"].Amount
                    Unit = $Group.Metrics["BlendedCost"].Unit
                }
            }
        }
        
        $CsvData | Export-Csv -Path "${csvPath}" -NoTypeInformation
        Write-Host ""
        Write-Host "✓ Report exported to: ${csvPath}" -ForegroundColor Green
    }
    
} catch {
    Write-Error "Cost Explorer report failed: $_"
}`;
    },
    isPremium: true
  },

  {
    id: 'aws-lambda-event-triggers',
    name: 'Manage Lambda Event Triggers',
    category: 'Serverless',
    description: 'Configure event source mappings and triggers for Lambda functions',
    parameters: [
      { id: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
      { id: 'action', label: 'Action', type: 'select', required: true, options: ['Add S3 Trigger', 'Add SQS Trigger', 'Add CloudWatch Schedule', 'List Triggers', 'Remove Trigger'], defaultValue: 'Add S3 Trigger' },
      { id: 'functionName', label: 'Lambda Function Name', type: 'text', required: true, placeholder: 'my-lambda-function' },
      { id: 's3BucketName', label: 'S3 Bucket Name (for S3 trigger)', type: 'text', required: false, placeholder: 'my-bucket' },
      { id: 's3Events', label: 'S3 Events', type: 'select', required: false, options: ['s3:ObjectCreated:*', 's3:ObjectRemoved:*', 's3:ObjectCreated:Put'], defaultValue: 's3:ObjectCreated:*' },
      { id: 's3Prefix', label: 'S3 Key Prefix Filter', type: 'text', required: false, placeholder: 'uploads/' },
      { id: 'sqsQueueArn', label: 'SQS Queue ARN (for SQS trigger)', type: 'text', required: false, placeholder: 'arn:aws:sqs:us-east-1:123456789012:my-queue' },
      { id: 'batchSize', label: 'Batch Size (for SQS)', type: 'number', required: false, placeholder: '10', defaultValue: 10 },
      { id: 'scheduleExpression', label: 'Schedule Expression', type: 'text', required: false, placeholder: 'rate(5 minutes)' },
      { id: 'triggerUUID', label: 'Trigger UUID (for remove)', type: 'text', required: false, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
    ],
    scriptTemplate: (params) => {
      const region = escapePowerShellString(params.region);
      const action = params.action;
      const functionName = escapePowerShellString(params.functionName);
      const s3BucketName = params.s3BucketName ? escapePowerShellString(params.s3BucketName) : '';
      const s3Events = params.s3Events || 's3:ObjectCreated:*';
      const s3Prefix = params.s3Prefix ? escapePowerShellString(params.s3Prefix) : '';
      const sqsQueueArn = params.sqsQueueArn ? escapePowerShellString(params.sqsQueueArn) : '';
      const batchSize = params.batchSize || 10;
      const scheduleExpression = params.scheduleExpression ? escapePowerShellString(params.scheduleExpression) : 'rate(5 minutes)';
      const triggerUUID = params.triggerUUID ? escapePowerShellString(params.triggerUUID) : '';

      return `# Manage Lambda Event Triggers
# Generated: ${new Date().toISOString()}

Import-Module AWS.Tools.Lambda
Import-Module AWS.Tools.S3
Import-Module AWS.Tools.CloudWatchEvents

try {
    Set-DefaultAWSRegion -Region "${region}"
    
    # Get Lambda function ARN
    $Function = Get-LMFunction -FunctionName "${functionName}"
    $FunctionArn = $Function.Configuration.FunctionArn
    
${action === 'Add S3 Trigger' ? `    # Add permission for S3 to invoke Lambda
    $StatementId = "s3-trigger-$(Get-Date -Format 'yyyyMMddHHmmss')"
    
    Add-LMPermission \`
        -FunctionName "${functionName}" \`
        -StatementId $StatementId \`
        -Action "lambda:InvokeFunction" \`
        -Principal "s3.amazonaws.com" \`
        -SourceArn "arn:aws:s3:::${s3BucketName}"
    
    # Configure S3 bucket notification
    $LambdaConfig = New-Object Amazon.S3.Model.LambdaFunctionConfiguration
    $LambdaConfig.LambdaFunctionArn = $FunctionArn
    $LambdaConfig.Events = @("${s3Events}")
    
${s3Prefix ? `    # Add prefix filter
    $FilterRule = New-Object Amazon.S3.Model.FilterRule
    $FilterRule.Name = "prefix"
    $FilterRule.Value = "${s3Prefix}"
    $LambdaConfig.Filter = New-Object Amazon.S3.Model.S3KeyFilter
    $LambdaConfig.Filter.FilterRules.Add($FilterRule)
` : ''}
    $NotificationConfig = Get-S3BucketNotification -BucketName "${s3BucketName}"
    $NotificationConfig.LambdaFunctionConfigurations.Add($LambdaConfig)
    
    Write-S3BucketNotification -BucketName "${s3BucketName}" -NotificationConfiguration $NotificationConfig
    
    Write-Host "✓ S3 trigger added to Lambda function" -ForegroundColor Green
    Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
    Write-Host "  Bucket: ${s3BucketName}" -ForegroundColor Cyan
    Write-Host "  Events: ${s3Events}" -ForegroundColor Cyan
${s3Prefix ? `    Write-Host "  Prefix: ${s3Prefix}" -ForegroundColor Cyan` : ''}` :
action === 'Add SQS Trigger' ? `    # Create SQS event source mapping
    $Mapping = New-LMEventSourceMapping \`
        -FunctionName "${functionName}" \`
        -EventSourceArn "${sqsQueueArn}" \`
        -BatchSize ${batchSize} \`
        -Enabled \$true
    
    Write-Host "✓ SQS trigger added to Lambda function" -ForegroundColor Green
    Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
    Write-Host "  Queue ARN: ${sqsQueueArn}" -ForegroundColor Cyan
    Write-Host "  Batch Size: ${batchSize}" -ForegroundColor Cyan
    Write-Host "  UUID: $($Mapping.UUID)" -ForegroundColor Gray` :
action === 'Add CloudWatch Schedule' ? `    # Create CloudWatch Events rule
    $RuleName = "${functionName}-schedule"
    
    Write-CWERule \`
        -Name $RuleName \`
        -ScheduleExpression "${scheduleExpression}" \`
        -State ENABLED
    
    # Add Lambda as target
    $Target = New-Object Amazon.CloudWatchEvents.Model.Target
    $Target.Id = "1"
    $Target.Arn = $FunctionArn
    
    Write-CWETarget -Rule $RuleName -Target $Target
    
    # Add permission for CloudWatch to invoke Lambda
    Add-LMPermission \`
        -FunctionName "${functionName}" \`
        -StatementId "cloudwatch-schedule-$(Get-Date -Format 'yyyyMMddHHmmss')" \`
        -Action "lambda:InvokeFunction" \`
        -Principal "events.amazonaws.com" \`
        -SourceArn (Get-CWERule -Name $RuleName).Arn
    
    Write-Host "✓ CloudWatch schedule trigger added" -ForegroundColor Green
    Write-Host "  Function: ${functionName}" -ForegroundColor Cyan
    Write-Host "  Rule: $RuleName" -ForegroundColor Cyan
    Write-Host "  Schedule: ${scheduleExpression}" -ForegroundColor Cyan` :
action === 'List Triggers' ? `    # List event source mappings
    $Mappings = Get-LMEventSourceMappingList -FunctionName "${functionName}"
    
    Write-Host "Event Source Mappings for ${functionName}:" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Mappings.Count -eq 0) {
        Write-Host "  (No event source mappings)" -ForegroundColor Gray
    } else {
        $Mappings | ForEach-Object {
            Write-Host "  UUID: $($_.UUID)" -ForegroundColor Green
            Write-Host "    Source: $($_.EventSourceArn)" -ForegroundColor Gray
            Write-Host "    State: $($_.State)" -ForegroundColor $(if ($_.State -eq "Enabled") { "Green" } else { "Yellow" })
            Write-Host "    Batch Size: $($_.BatchSize)" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    # List CloudWatch Events rules targeting this function
    Write-Host "CloudWatch Event Rules:" -ForegroundColor Cyan
    $Rules = Get-CWERule | Where-Object { $_.Name -like "*${functionName}*" }
    
    if ($Rules.Count -eq 0) {
        Write-Host "  (No dedicated CloudWatch rules found)" -ForegroundColor Gray
    } else {
        $Rules | ForEach-Object {
            Write-Host "  $($_.Name) - $($_.ScheduleExpression)" -ForegroundColor Green
        }
    }` :
`    # Remove event source mapping
    Remove-LMEventSourceMapping -UUID "${triggerUUID}" -Force
    
    Write-Host "✓ Event source mapping removed" -ForegroundColor Green
    Write-Host "  UUID: ${triggerUUID}" -ForegroundColor Cyan`}
    
} catch {
    Write-Error "Lambda trigger operation failed: $_"
}`;
    },
    isPremium: true
  }
];
