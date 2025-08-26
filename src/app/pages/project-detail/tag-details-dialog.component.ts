import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TagsResp } from '../../services/project.service';

@Component({
  selector: 'app-tag-details-dialog',
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
    <div class="tag-details-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>label</mat-icon>
        Tag Details
      </h2>
      
      <mat-dialog-content class="dialog-content">
        <mat-card appearance="outlined" class="tag-info-card">
          <mat-card-content>
            <div class="tag-field">
              <mat-icon class="field-icon">label</mat-icon>
              <div class="field-content">
                <label class="field-label">Tag Name</label>
                <div class="field-value tag-name">{{ data.tag_name }}</div>
              </div>
            </div>

            <div class="tag-field">
              <mat-icon class="field-icon">person</mat-icon>
              <div class="field-content">
                <label class="field-label">Created By</label>
                <div class="field-value">{{ data.creator || 'Unknown' }}</div>
              </div>
            </div>

            <div class="tag-field">
              <mat-icon class="field-icon">access_time</mat-icon>
              <div class="field-content">
                <label class="field-label">Created At</label>
                <div class="field-value">{{ formatDate(data.created_at) }}</div>
              </div>
            </div>

            <div class="tag-field" *ngIf="data.updated_at">
              <mat-icon class="field-icon">update</mat-icon>
              <div class="field-content">
                <label class="field-label">Last Updated</label>
                <div class="field-value">{{ formatDate(data.updated_at) }}</div>
              </div>
            </div>

            <div class="tag-field">
              <mat-icon class="field-icon">tag</mat-icon>
              <div class="field-content">
                <label class="field-label">Tag ID</label>
                <div class="field-value">#{{ data.tag_id }}</div>
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
    .tag-details-dialog {
      min-width: 400px;
      max-width: 500px;
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

    .tag-info-card {
      margin: 0;
    }

    .tag-field {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .tag-field:last-child {
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

    .tag-name {
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
      .tag-details-dialog {
        min-width: 280px;
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
export class TagDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TagDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TagsResp,
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
}
