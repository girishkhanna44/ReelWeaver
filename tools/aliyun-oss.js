const OSS = require('ali-oss');

class AliyunOSS {
  constructor(config = {}) {
    this.client = new OSS({
      region: config.region || process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: config.accessKeyId || process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: config.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET,
      bucket: config.bucket || process.env.OSS_BUCKET || 'reelweaver-output',
      secure: true,
      timeout: 120000,
    });
  }

  async uploadVideo(localPath, projectId) {
    const key = `outputs/${projectId}_${Date.now()}.mp4`;
    
    try {
      await this.client.put(key, localPath);
      
      // Generate signed URL (expires in 24h)
      const url = this.client.signatureUrl(key, { expires: 86400 });
      return { key, url };
    } catch (error) {
      console.error('[AliyunOSS] Upload failed:', error.message);
      throw error;
    }
  }

  async downloadVideo(objectKey, localPath) {
    try {
      await this.client.get(objectKey, localPath);
      return localPath;
    } catch (error) {
      console.error('[AliyunOSS] Download failed:', error.message);
      throw error;
    }
  }

  async listProjectVideos(projectId) {
    try {
      const result = await this.client.list({
        prefix: `outputs/${projectId}`,
      });
      return result.objects || [];
    } catch (error) {
      console.error('[AliyunOSS] List failed:', error.message);
      return [];
    }
  }

  async deleteVideo(objectKey) {
    try {
      await this.client.delete(objectKey);
      return true;
    } catch (error) {
      console.error('[AliyunOSS] Delete failed:', error.message);
      return false;
    }
  }

  // Generate presigned URL for direct browser upload
  async getPresignedUploadUrl(objectKey, expires = 3600) {
    try {
      const url = this.client.signatureUrl(objectKey, {
        expires,
        method: 'PUT',
        'Content-Type': 'video/mp4',
      });
      return url;
    } catch (error) {
      console.error('[AliyunOSS] Presigned URL failed:', error.message);
      throw error;
    }
  }
}

module.exports = AliyunOSS;