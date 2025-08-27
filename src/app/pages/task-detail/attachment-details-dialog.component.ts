import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TaskAttachmentResp } from '../../models/task.models';

@Component({
  selector: 'app-attachment-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  providers: [DatePipe],
  template: `
    <div class="attachment-details-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>attach_file</mat-icon>
        Attachment Details
      </h2>
      
      <mat-dialog-content class="dialog-content">
        <mat-card appearance="outlined" class="attachment-info-card">
          <mat-card-content>
            <div class="attachment-field">
              <mat-icon class="field-icon">description</mat-icon>
              <div class="field-content">
                <label class="field-label">File Name</label>
                <div class="field-value file-name">{{ data.file_name }}</div>
              </div>
            </div>

            <div class="attachment-field">
              <mat-icon class="field-icon">storage</mat-icon>
              <div class="field-content">
                <label class="field-label">File Size</label>
                <div class="field-value">{{ formatFileSize(data.file_size) }}</div>
              </div>
            </div>

            <div class="attachment-field">
              <mat-icon class="field-icon">category</mat-icon>
              <div class="field-content">
                <label class="field-label">Content Type</label>
                <div class="field-value">{{ data.content_type || 'Unknown' }}</div>
              </div>
            </div>

            <div class="attachment-field">
              <mat-icon class="field-icon">person</mat-icon>
              <div class="field-content">
                <label class="field-label">Uploaded By</label>
                <div class="field-value">{{ data.creator_name || 'Unknown' }}</div>
              </div>
            </div>

            <div class="attachment-field">
              <mat-icon class="field-icon">access_time</mat-icon>
              <div class="field-content">
                <label class="field-label">Uploaded At</label>
                <div class="field-value">{{ formatDate(data.created_at) }}</div>
              </div>
            </div>

            <div class="attachment-field" *ngIf="data.updated_at && data.updated_at !== data.created_at">
              <mat-icon class="field-icon">update</mat-icon>
              <div class="field-content">
                <label class="field-label">Last Updated</label>
                <div class="field-value">{{ formatDate(data.updated_at) }}</div>
              </div>
            </div>

            <div class="attachment-field">
              <mat-icon class="field-icon">fingerprint</mat-icon>
              <div class="field-content">
                <label class="field-label">Attachment ID</label>
                <div class="field-value">#{{ data.id }}</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="onClose()" color="primary">
          <mat-icon>close</mat-icon>
          Close
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .attachment-details-dialog {
      min-width: 450px;
      max-width: 600px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      color: #1976d2;
    }

    .dialog-content {
      padding: 20px 24px;
    }

    .attachment-info-card {
      margin: 0;
    }

    .attachment-field {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .attachment-field:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }

    .field-icon {
      color: #666;
      margin-top: 2px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .field-content {
      flex: 1;
      min-width: 0;
    }

    .field-label {
      display: block;
      font-weight: 500;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .field-value {
      font-size: 14px;
      color: #333;
      word-break: break-word;
    }

    .file-name {
      font-weight: 600;
      color: #1976d2;
      font-size: 16px;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      margin: 0;
    }

    .dialog-actions button {
      min-width: 80px;
    }

    @media (max-width: 600px) {
      .attachment-details-dialog {
        min-width: 300px;
        max-width: 90vw;
      }
      
      .dialog-title,
      .dialog-content,
      .dialog-actions {
        padding-left: 16px;
        padding-right: 16px;
      }
    }
  `]
})
export class AttachmentDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AttachmentDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskAttachmentResp,
    private datePipe: DatePipe
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';

    try {
      const formatted = this.datePipe.transform(dateString, 'MMM d, y, h:mm a');
      return formatted || 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
