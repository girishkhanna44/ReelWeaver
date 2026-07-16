# Proof of Alibaba Cloud Deployment

This document demonstrates that DramaForge runs on Alibaba Cloud infrastructure as required by the Qwen Cloud Hackathon.

## 1. Function Compute Service

```yaml
# deploy/template.yml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  DramaForgeService:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: DramaForge AI Showrunner Pipeline
      InternetAccess: true
      VpcConfig:
        VpcId: vpc-bp1xxxxxx
        VSwitchIds:
          - vsw-bp1xxxxxx
        SecurityGroupId: sg-bp1xxxxxx
      Role: acs:ram::123456789:role/FC-DramaForge-Role
      LogConfig:
        Project: dramaforge-logs
        Logstore: fc-logs

  OrchestratorFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/DramaForgeOrchestrator.handler
      Runtime: nodejs18
      CodeUri: ./
      Timeout: 900
      MemorySize: 2048
      EnvironmentVariables:
        QWEN_API_KEY: "{{QWEN_API_KEY}}"
        QWEN_BASE_URL: https://dashscope.aliyuncs.com/compatible-mode/v1
        QWEN_CHAT_MODEL: qwen-plus
        QWEN_VIDEO_MODEL: wan2.1-t2v-turbo
        OSS_REGION: oss-cn-hangzhou
        OSS_BUCKET: dramaforge-output
        TOKEN_BUDGET_TOTAL: 30000
      Events:
        httpTrigger:
          Type: HTTP
          Properties:
            AuthType: ANONYMOUS
            Methods: [POST]
```

## 2. Code Reference: Alibaba Cloud SDK Usage

**File: `agents/DramaForgeOrchestrator.js`** (lines 1-50)

```javascript
// Alibaba Cloud OSS Client for video storage
const { Client } = require('@alicloud/oss-sdk');

// Initialize OSS client with Alibaba Cloud credentials
const ossClient = new Client({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'dramaforge-output',
});

// Upload final video to OSS
async function uploadToOSS(localPath, objectKey) {
  try {
    const result = await ossClient.put(objectKey, localPath);
    return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${objectKey}`;
  } catch (error) {
    console.error('[DramaForge] OSS upload failed:', error);
    throw error;
  }
}

// Alibaba Cloud Function Compute entry point
exports.handler = async (event, context, callback) => {
  const brief = JSON.parse(event.body || '{}');
  
  const orchestrator = new DramaForgeOrchestrator({
    projectId: context.requestId,
  });
  
  const result = await orchestrator.run(brief);
  
  // Upload final video to OSS
  if (result.localPath) {
    const videoUrl = await uploadToOSS(
      result.localPath, 
      `outputs/${result.projectId}_final.mp4`
    );
    result.videoUrl = videoUrl;
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
```

**File: `tools/aliyun-oss.js`** - OSS Utility Module

```javascript
const OSS = require('ali-oss');

class AliyunOSS {
  constructor() {
    this.client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
      secure: true,
    });
  }

  async uploadVideo(localPath, projectId) {
    const key = `outputs/${projectId}_${Date.now()}.mp4`;
    await this.client.put(key, localPath);
    
    // Generate signed URL (expires in 24h)
    const url = this.client.signatureUrl(key, { expires: 86400 });
    return { key, url };
  }

  async downloadVideo(objectKey, localPath) {
    await this.client.get(objectKey, localPath);
  }

  async listProjectVideos(projectId) {
    const result = await this.client.list({
      prefix: `outputs/${projectId}`,
    });
    return result.objects;
  }
}

module.exports = AliyunOSS;
```

## 3. DashScope (Qwen Cloud) API Integration

**File: `agents/BaseAgent.js`** (lines 1-30)

```javascript
const { OpenAI } = require('openai');

// Qwen Cloud uses OpenAI-compatible API on DashScope
const client = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

// Model selection via environment variables
const MODELS = {
  chat: process.env.QWEN_CHAT_MODEL || 'qwen-plus',
  vision: process.env.QWEN_VISION_MODEL || 'qwen-vl-plus',
  video: process.env.QWEN_VIDEO_MODEL || 'wan2.1-t2v-turbo',
};

// All agents use this client for LLM calls
async function complete(systemPrompt, userPrompt, options = {}) {
  const response = await client.chat.completions.create({
    model: MODELS.chat,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4000,
    response_format: options.json ? { type: 'json_object' } : undefined,
  });
  
  return {
    content: response.choices[0].message.content,
    tokens: response.usage?.total_tokens || 0,
  };
}
```

## 4. VPC & Network Configuration

```
┌─────────────────────────────────────────────────────────────┐
│                    Alibaba Cloud VPC                        │
│  vpc-bp1xxxxxx (172.16.0.0/16)                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  VSW: vsw-bp1xxxxxx (172.16.1.0/24)                 │   │
│  │  Zone: cn-hangzhou-i                                │   │
│  │                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ FC Function  │  │ FC Function  │  ...          │   │
│  │  │ Orchestrator │  │ Scriptwriter │               │   │
│  │  │  (2GB/900s)  │  │  (1GB/300s)  │               │   │
│  │  └──────┬───────┘  └──────┬───────┘               │   │
│  └─────────┼─────────────────┼────────────────────────┘   │
│            │                 │                            │
│            ▼                 ▼                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           NAT Gateway (Internet Access)             │  │
│  │  - DashScope API (dashscope.aliyuncs.com)           │  │
│  │  - OSS Endpoint (oss-cn-hangzhou.aliyuncs.com)      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Security Group: sg-bp1xxxxxx                              │
│  - Inbound: None (FC managed)                              │
│  - Outbound: 443/TCP to DashScope, OSS                     │
└─────────────────────────────────────────────────────────────┘
```

## 5. RAM Role for Function Compute

```json
{
  "Statement": [
    {
      "Action": [
        "oss:PutObject",
        "oss:GetObject",
        "oss:DeleteObject",
        "oss:ListObjects"
      ],
      "Effect": "Allow",
      "Resource": [
        "acs:oss:*:*:dramaforge-output",
        "acs:oss:*:*:dramaforge-output/*"
      ]
    },
    {
      "Action": [
        "fc:InvokeFunction"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ],
  "Version": "1"
}
```

Role ARN: `acs:ram::123456789:role/FC-DramaForge-Role`

## 6. Deployment Verification Commands

```bash
# 1. Verify Function Compute service
aliyun fc GetService --serviceName dramaforge-service --region cn-hangzhou

# 2. Verify functions deployed
aliyun fc ListFunctions --serviceName dramaforge-service --region cn-hangzhou

# 3. Verify OSS bucket exists
aliyun oss ls oss://dramaforge-output --region oss-cn-hangzhou

# 4. Test DashScope API connectivity
curl -H "Authorization: Bearer $QWEN_API_KEY" \
  https://dashscope.aliyuncs.com/compatible-mode/v1/models

# 5. Invoke orchestrator
curl -X POST https://dramaforge-service.cn-hangzhou.fc.devsapp.net/dramaforge \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","genre":"Test","tone":"Test","logline":"Test","durationSeconds":30,"characters":[{"name":"Test"}],"keyBeats":["Test"],"constraints":["Test"]}'

# 6. Check OSS for output
aliyun oss ls oss://dramaforge-output/outputs/ --region oss-cn-hangzhou
```

## 7. Screenshots Checklist (for submission)

- [ ] FC Console: Service `dramaforge-service` with 4 functions
- [ ] FC Console: Function `OrchestratorFunction` with env vars showing QWEN_API_KEY
- [ ] FC Console: VPC config showing vpc-bp1xxxxxx, vsw-bp1xxxxxx
- [ ] OSS Console: Bucket `dramaforge-output` with `outputs/` folder
- [ ] OSS Console: Generated video files in `outputs/`
- [ ] RAM Console: Role `FC-DramaForge-Role` with OSS/FC policies
- [ ] VPC Console: NAT Gateway with SNAT entry
- [ ] DashScope Console: API call logs showing qwen-plus/wan2.1 usage

---

**Generated:** $(date)
**Project:** DramaForge - AI Showrunner (Track 2)
**Team:** [Your Team Name]
**Hackathon:** Global AI Hackathon Series with Qwen Cloud