/**
 * Google Drive Service for Heavy File Storage
 * 
 * Handles upload/download of heavy files (videos, large images, backups)
 * to Google Drive using service accounts.
 * 
 * Uses 3 service accounts for redundancy:
 * - sa1.json: Primary (active uploads)
 * - sa2.json: Backup/fallback
 * - sa3.json: Archive/long-term storage
 */

import { google } from 'googleapis';
import { Readable } from 'stream';
import { createReadStream, createWriteStream, existsSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';

interface GoogleDriveConfig {
  sa1KeyFile: string;
  sa2KeyFile: string;
  sa3KeyFile: string;
  agePublicKey: string;
}

interface UploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  downloadLink: string;
  checksum: string;
  serviceAccount: 'sa1' | 'sa2' | 'sa3';
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
}

export class GoogleDriveService {
  private authClients: Map<string, any> = new Map();
  private driveClients: Map<string, any> = new Map();
  private config: {
    sa1KeyFile: string;
    sa2KeyFile: string;
    sa3KeyFile: string;
    agePublicKey: string;
  };
  private currentAccount: 'sa1' | 'sa2' | 'sa3' = 'sa1';
  private uploadCounts: Map<string, number> = new Map();

  constructor() {
    // Load service account keys from environment or file paths
    this.config = {
      sa1KeyFile: process.env.GDRIVE_SA1_KEY_FILE || '/tmp/sa1.json',
      sa2KeyFile: process.env.GDRIVE_SA2_KEY_FILE || '/tmp/sa2.json',
      sa3KeyFile: process.env.GDRIVE_SA3_KEY_FILE || '/tmp/sa3.json',
      agePublicKey: process.env.AGE_PUBLIC_KEY || '',
    };

    // Initialize upload counters
    this.uploadCounts.set('sa1', 0);
    this.uploadCounts.set('sa2', 0);
    this.uploadCounts.set('sa3', 0);
  }

  /**
   * Initialize Google Drive clients for all service accounts
   */
  async initialize(): Promise<void> {
    const accounts = ['sa1', 'sa2', 'sa3'] as const;
    const keyFiles = [
      process.env.GDRIVE_SA1_KEY_FILE || '/tmp/sa1.json',
      process.env.GDRIVE_SA2_KEY_FILE || '/tmp/sa2.json',
      process.env.GDRIVE_SA3_KEY_FILE || '/tmp/sa3.json',
    ];

    for (let i = 0; i < 3; i++) {
      const account = ['sa1', 'sa2', 'sa3'][i] as 'sa1' | 'sa2' | 'sa3';
      const keyFile = keyFiles[i];

      try {
        // Check if key file exists
        const fs = await import('fs');
        if (!fs.existsSync(keyFiles[i])) {
          console.warn(`[GoogleDrive] Service account key file not found: ${keyFiles[i]}`);
          continue;
        }

        // Load service account key
        const keyFile = JSON.parse(await import('fs/promises').then(fs => fs.readFile(keyFiles[i], 'utf-8')));

        // Create JWT auth client
        const { google } = await import('googleapis');
        const auth = new google.auth.GoogleAuth({
          credentials: keyFile,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const authClient = await auth.getClient();
        const drive = google.drive({ version: 'v3', auth: authClient });

        this.authClients.set(keyFiles[i], authClient);
        this.driveClients.set(keyFiles[i], drive);

        console.log(`[GoogleDrive] Initialized service account: ${keyFiles[i]}`);
      } catch (error) {
        console.error(`[GoogleDrive] Failed to initialize ${keyFiles[i]}:`, error);
      }
    }
  }

  /**
   * Get the current drive client (with fallback logic)
   */
  private getDriveClient(): { drive: any; account: 'sa1' | 'sa2' | 'sa3' } {
    const accounts = ['sa1', 'sa2', 'sa3'] as const;
    const keyFiles = [
      process.env.GDRIVE_SA1_KEY_FILE || '/tmp/sa1.json',
      process.env.GDRIVE_SA2_KEY_FILE || '/tmp/sa2.json',
      process.env.GDRIVE_SA3_KEY_FILE || '/tmp/sa3.json',
    ];

    // Try current account first
    const currentKey = ['sa1', 'sa2', 'sa3'][['sa1', 'sa2', 'sa3'].indexOf(this.currentAccount)];
    const currentKeyFile = keyFiles[['sa1', 'sa2', 'sa3'].indexOf(this.currentAccount)];

    if (this.driveClients.has(this.currentAccount)) {
      return { drive: this.driveClients.get(this.currentAccount), account: this.currentAccount };
    }

    // Fallback to available accounts
    for (const account of accounts) {
      if (this.driveClients.has(account)) {
        this.currentAccount = account;
        return { drive: this.driveClients.get(account), account };
      }
    }

    throw new Error('No Google Drive clients available');
  }

  /**
   * Switch to next available service account (for rate limiting)
   */
  private rotateAccount(): void {
    const accounts: ('sa1' | 'sa2' | 'sa3')[] = ['sa1', 'sa2', 'sa3'];
    const currentIndex = ['sa1', 'sa2', 'sa3'].indexOf(this.currentAccount);
    const nextIndex = (currentIndex + 1) % 3;
    
    // Check if next account is available
    for (let i = 0; i < 3; i++) {
      const nextAccount = accounts[(nextIndex + i) % 3];
      if (this.driveClients.has(nextAccount)) {
        this.currentAccount = nextAccount;
        console.log(`[GoogleDrive] Switched to service account: ${nextAccount}`);
        return;
      }
    }
  }

  /**
   * Calculate file checksum (SHA-256)
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const fs = await import('fs');
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    
    return hash.digest('hex');
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    folderId?: string
  ): Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    webViewLink: string;
    downloadLink: string;
    checksum: string;
    serviceAccount: 'sa1' | 'sa2' | 'sa3';
  }> {
    const fs = await import('fs');
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Calculate checksum
    const checksum = await this.calculateChecksum(filePath);
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Check file size (Google Drive limit: 5TB per file, but we'll limit to 100MB for free tier)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxSize) {
      throw new Error(`File size ${fileSize} exceeds maximum allowed size of ${maxSize} bytes`);
    }

    // Get drive client
    let { drive, account } = this.getDriveClient();
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < 3) {
      try {
        // Prepare file metadata
        const fileMetadata: any = {
          name: fileName,
        };

        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        // Create read stream
        const fs = await import('fs');
        const fileStream = fs.createReadStream(filePath);

        // Upload to Google Drive
        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: folderId ? [folderId] : undefined,
          },
          media: {
            mimeType: mimeType,
            body: fs.createReadStream(filePath),
          },
          fields: 'id, name, mimeType, size, webViewLink, webContentLink',
        });

        const file = response.data;
        
        // Generate download link
        const downloadLink = `https://drive.google.com/uc?id=${file.id}&export=download`;
        
        // Update upload count
        const currentAccount = this.currentAccount;
        const count = (this.uploadCounts.get(this.currentAccount) || 0) + 1;
        this.uploadCounts.set(this.currentAccount, count);

        // Rotate account if approaching rate limits (100 uploads per account)
        const countAfter = this.uploadCounts.get(this.currentAccount) || 0;
        if (countAfter > 90) {
          this.rotateAccount();
        }

        return {
          fileId: file.id!,
          fileName: file.name!,
          mimeType: file.mimeType!,
          size: parseInt(file.size!),
          webViewLink: file.webViewLink!,
          downloadLink: `https://drive.google.com/uc?id=${file.id}&export=download`,
          checksum: await this.calculateChecksum(filePath),
          serviceAccount: this.currentAccount,
        };
      } catch (error: any) {
        attempts++;
        console.warn(`[GoogleDrive] Upload attempt ${attempts} failed:`, error.message);
        
        if (attempts >= 3) {
          throw error;
        }
        
        // Rotate account and retry
        this.rotateAccount();
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error('Failed to upload file after 3 attempts');
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(fileId: string, destinationPath: string): Promise<void> {
    const { drive } = this.getDriveClient();
    const fs = await import('fs');

    const response = await drive.files.get({
      fileId,
      alt: 'media',
    }, {
      responseType: 'stream',
    });

    const writer = createWriteStream(destinationPath);
    await pipeline(response.data, writer);
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    const { drive } = this.getDriveClient();
    await drive.files.delete({ fileId });
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId?: string, pageSize: number = 100): Promise<any[]> {
    const { drive } = this.getDriveClient();
    
    const response = await drive.files.list({
      q: folderId ? `'${folderId}' in parents and trashed=false` : 'trashed=false',
      pageSize,
      fields: 'files(id, name, mimeType, size, webViewLink, webContentLink)',
      orderBy: 'createdTime desc',
    });

    return response.data.files || [];
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<string> {
    const { drive } = this.getDriveClient();
    
    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id',
    });

    return response.data.id!;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any | null> {
    const { drive } = this.getDriveClient();
    
    try {
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a folder structure for organized storage
   */
  async ensureFolderStructure(): Promise<Record<string, string>> {
    const folders = {
      uploads: 'TMT_Uploads',
      videos: 'TMT_Videos',
      images: 'TMT_Images',
      backups: 'TMT_Backups',
      archives: 'TMT_Archives',
    };

    const folderIds: Record<string, string> = {};

    for (const [key, name] of Object.entries(folders)) {
      // Check if folder exists
      const existing = await this.listFiles(undefined, 100);
      const existingFolder = existing.find(f => f.name === name && f.mimeType === 'application/vnd.google-apps.folder');
      
      if (existingFolder) {
        folderIds[key] = existingFolder.id;
      } else {
        const folderId = await this.createFolder(name);
        folderIds[key] = folderId;
      }
    }

    return folderIds;
  }

  /**
   * Get upload statistics
   */
  getUploadStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [account, count] of this.uploadCounts.entries()) {
      stats[account] = count;
    }
    return stats;
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { drive } = this.getDriveClient();
      await drive.about.get({ fields: 'user' });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();