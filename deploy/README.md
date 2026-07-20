# ReelWeaver Alibaba Cloud Deployment Guide

This guide shows how to deploy ReelWeaver on Alibaba Cloud for the hackathon submission.

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Function   │────▶│   DashScope API  │     │   OSS       │
│  Compute    │     │  (Qwen Models)   │     │  (Videos)   │
│  (Agents)   │     │                  │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                                           │
       └─────────────────┬─────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   VPC / Security    │
              │   Groups            │
              └─────────────────────┘
```

## Prerequisites

1. **Alibaba Cloud Account** with:
   - Function Compute enabled
   - Object Storage Service (OSS) enabled
   - DashScope (Qwen) API access
   - VPC configured

2. **Local Tools**:
   - `fun` CLI (Function Compute) or Serverless Framework
   - Terraform (optional, for IaC)
   - Docker (for container deployment)

## Deployment Options

### Option 1: Function Compute (Recommended for Hackathon)

Deploy each agent as a separate FC function for scalability.

#### 1. Prepare Deployment Package

```bash
# Create deployment package
cd ReelWeaver
zip -r reelweaver.zip . -x "node_modules/*" ".git/*" "*.log" "output/*" "demo.js"
```

#### 2. Create FC Service & Functions

```bash
# Using fun CLI
fun init -n reelweaver-service

# Configure template.yml (see below)
fun deploy
```

#### 3. template.yml for Function Compute

```yaml
ROSTemplateFormatVersion: '2015-09-01'
Transform: 'Aliyun::Serverless-2018-04-03'
Resources:
  ReelWeaverService:
    Type: 'Aliyun::Serverless::Service'
    Properties:
      Description: ReelWeaver AI Showrunner Pipeline
      VpcConfig:
        VpcId: vpc-xxxxx
        VSwitchIds: [vsw-xxxxx]
        SecurityGroupId: sg-xxxxx
      InternetAccess: true
      LogConfig:
        Project: reelweaver-logs
        Logstore: function-logs

  ScriptwriterFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/ScriptwriterAgent.handler
      Runtime: nodejs20
      CodeUri: ./reelweaver.zip
      Timeout: 300
      MemorySize: 1024
      EnvironmentVariables:
        QWEN_API_KEY: ${QWEN_API_KEY}
        QWEN_BASE_URL: https://dashscope.aliyuncs.com/compatible-mode/v1
        STAGE: scriptwriting
      Events:
        - HttpTrigger:
            Type: HTTP
            Properties:
              AuthType: ANONYMOUS
              Methods: [POST]

  StoryboardFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/StoryboardAgent.handler
      Runtime: nodejs20
      CodeUri: ./reelweaver.zip
      Timeout: 300
      MemorySize: 1024
      EnvironmentVariables:
        QWEN_API_KEY: ${QWEN_API_KEY}
        STAGE: storyboarding

  VideoGeneratorFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/VideoGeneratorAgent.handler
      Runtime: nodejs20
      CodeUri: ./reelweaver.zip
      Timeout: 600
      MemorySize: 2048
      EnvironmentVariables:
        QWEN_API_KEY: ${QWEN_API_KEY}
        OSS_BUCKET: reelweaver-output
        OSS_REGION: oss-cn-hangzhou
        STAGE: videoGen

  EditorFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/EditorAgent.handler
      Runtime: nodejs20
      CodeUri: ./reelweaver.zip
      Timeout: 300
      MemorySize: 1024
      EnvironmentVariables:
        QWEN_API_KEY: ${QWEN_API_KEY}
        STAGE: editing

  OrchestratorFunction:
    Type: 'Aliyun::Serverless::Function'
    Properties:
      Handler: agents/ReelWeaverOrchestrator.handler
      Runtime: nodejs20
      CodeUri: ./reelweaver.zip
      Timeout: 900
      MemorySize: 2048
      EnvironmentVariables:
        QWEN_API_KEY: ${QWEN_API_KEY}
        OSS_BUCKET: reelweaver-output
        STAGE: orchestrator
```

### Option 2: Container Deployment (ECS / ACK)

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Create output directory
RUN mkdir -p output

# Expose port for HTTP API
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

#### Build & Push to ACR

```bash
# Build
docker build -t registry.cn-hangzhou.aliyuncs.com/your-namespace/reelweaver:latest .

# Push
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/reelweaver:latest
```

#### Deploy to ECS/ACK

Use the Alibaba Cloud console or Terraform to create:
- ECS instance or ACK cluster
- Security groups (allow 3000, 80, 443)
- SLB for load balancing
- Auto-scaling group

## OSS Configuration for Video Storage

### 1. Create Bucket

```bash
# Using aliyun CLI
aliyun oss mb oss://reelweaver-output --region oss-cn-hangzhou
aliyun oss bucket-acl --bucket reelweaver-output --acl public-read
```

### 2. Configure CORS

```xml
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>
```

```bash
aliyun oss cors --bucket reelweaver-output --cors-file cors.xml
```

### 3. Set Lifecycle (Optional - Auto-cleanup)

```xml
<LifecycleConfiguration>
  <Rule>
    <ID>cleanup-old-videos</ID>
    <Prefix>temp/</Prefix>
    <Status>Enabled</Status>
    <Expiration>
      <Days>7</Days>
    </Expiration>
  </Rule>
</LifecycleConfiguration>
```

## Environment Variables (Production)

```bash
# Required
QWEN_API_KEY=sk-xxxxxxxxxxxxx
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_CHAT_MODEL=qwen-plus
QWEN_VISION_MODEL=qwen-vl-plus
QWEN_VIDEO_MODEL=wan2.1-t2v-turbo

# OSS
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=reelweaver-output
OSS_ACCESS_KEY_ID=LTAIxxxxx
OSS_ACCESS_KEY_SECRET=xxxxx

# Token Budget
TOKEN_BUDGET_TOTAL=30000
TOKEN_BUDGET_SCRIPTWRITING=8000
TOKEN_BUDGET_STORYBOARDING=6000
TOKEN_BUDGET_VIDEO_GEN=12000
TOKEN_BUDGET_EDITING=4000

# App
NODE_ENV=production
LOG_LEVEL=info
```

## Testing Deployment

### 1. Invoke Orchestrator

```bash
# Function Compute
curl -X POST https://your-fc-endpoint/reelweaver \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Drama",
    "genre": "Thriller",
    "tone": "Tense",
    "logline": "A test story",
    "durationSeconds": 60,
    "characters": [{"name": "Hero", "description": "Brave"}],
    "keyBeats": ["Inciting incident", "Climax"],
    "constraints": ["Vertical format"]
  }'
```

### 2. Check Logs

```bash
# Function Compute logs
fun logs reelweaver-service/OrchestratorFunction

# Or in console: FC > Services > reelweaver-service > Logs
```

### 3. Verify Output in OSS

```bash
# List generated videos
aliyun oss ls oss://reelweaver-output/outputs/

# Download final video
aliyun oss cp oss://reelweaver-output/outputs/projectId_final.mp4 ./final.mp4
```

## Cost Estimation (Hackathon Scale)

| Component | Usage | Est. Cost (CNY) |
|-----------|-------|-----------------|
| Function Compute | 100 invocations × 15s × 2GB | ~5 |
| DashScope API | 30K tokens × 4 models | ~50 |
| OSS Storage | 1GB video storage | ~1 |
| OSS Traffic | 10GB download | ~8 |
| **Total** | | **~64 CNY (~$9)** |

Well within free tier / hackathon credits.

## Security Checklist

- [ ] API keys in FC Environment Variables (not code)
- [ ] OSS bucket: private by default, signed URLs for access
- [ ] VPC: Functions in private subnet, NAT for internet
- [ ] Security Groups: Minimal inbound (FC only), outbound to DashScope/OSS
- [ ] RAM Roles: Least privilege for FC → OSS, FC → DashScope
- [ ] Logs: No sensitive data in logs

## Proof of Deployment for Submission

Include in your repo:
1. `deploy/proof-of-deployment.md` - Screenshots of:
   - FC Service/Functions list
   - OSS Bucket with generated videos
   - DashScope API call logs
   - VPC/Security Group config
2. Code reference: `agents/ReelWeaverOrchestrator.js` showing Alibaba Cloud SDK usage
3. Architecture diagram (this guide's Mermaid charts)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| FC timeout | Increase timeout to 900s for orchestrator |
| OOM error | Increase memory to 2048MB for video generation |
| DashScope 401 | Verify API key in env vars, check quota |
| OSS 403 | Check RAM role permissions, bucket policy |
| VPC timeout | Ensure NAT Gateway for internet access |

## Quick Deploy Script

```bash
#!/bin/bash
# deploy.sh - One-click deploy

set -e

SERVICE_NAME="reelweaver-service"
REGION="cn-hangzhou"

echo "🚀 Deploying ReelWeaver to Alibaba Cloud..."

# 1. Install fun if needed
if ! command -v fun &> /dev/null; then
    npm install -g @alicloud/fun
fi

# 2. Configure
fun config --region $REGION --access-key-id $ALIBABA_CLOUD_ACCESS_KEY_ID --access-key-secret $ALIBABA_CLOUD_ACCESS_KEY_SECRET

# 3. Package
zip -r reelweaver.zip . -x "node_modules/*" ".git/*" "*.log" "output/*" "demo.js" "deploy/*"

# 4. Deploy
fun deploy --service $SERVICE_NAME

echo "✅ Deployment complete!"
echo "📋 Service URL: https://$SERVICE_NAME.$REGION.fc.devsapp.net"
```