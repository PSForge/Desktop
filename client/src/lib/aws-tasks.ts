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
  }
];
