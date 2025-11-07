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
  }
];
