import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjDetailsResp, SortBy, Order, ProjectQuery } from '../../services/project.service';
import { ProjStatus } from '../../models/project.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  providers: [DatePipe],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  private readonly svc = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // UI State Signals
  readonly error = signal<string>('');
  readonly items = signal<ProjDetailsResp[]>([]);
  readonly totalItems = signal<number>(0);
  readonly hasMorePages = signal<boolean>(true);

  // Filter Signals
  readonly keyword = signal<string>('');
  readonly status = signal<ProjStatus | ''>('');
  readonly sortBy = signal<SortBy>('createdAt');
  readonly order = signal<Order>('desc');

  // Pagination Signals
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  // Computed signal for display count (shows actual items on current page)
  readonly displayCount = computed(() => {
    const currentItems = this.items().length;
    const currentPageNumber = this.currentPage();
    const pageSizeValue = this.pageSize();

    if (currentItems < pageSizeValue || !this.hasMorePages()) {
      // We're on the last page, show exact count
      return (currentPageNumber - 1) * pageSizeValue + currentItems;
    } else {
      // We have full page and more pages exist, show "X+" format
      return `${currentPageNumber * pageSizeValue}+`;
    }
  });

  // Search timeout for debouncing
  private searchTimeout: any;

  ngOnInit(): void {
    this.load();
  }

  /**
   * Load projects from the service
   */
  load(): void {
    this.error.set('');

    const query: ProjectQuery = {
      sortBy: this.sortBy(),
      order: this.order(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
      ...(this.status() && { status: this.status() as ProjStatus })
    };

    this.svc.list(query).subscribe({
      next: (projects) => {
        const projectList = projects || [];

        // Apply client-side keyword filtering since API doesn't support search
        const filteredProjects = this.keyword().trim()
          ? projectList.filter(project => this.matchesKeyword(project, this.keyword().trim().toLowerCase()))
          : projectList;

        this.items.set(filteredProjects);

        // Since API doesn't provide total count, we need to handle this differently
        // The count display should show actual filtered items, not pagination estimate
        const currentPageItems = filteredProjects.length;
        const currentPageNumber = this.currentPage();

        if (currentPageItems < this.pageSize()) {
          // Last page - we can calculate exact total
          this.hasMorePages.set(false);
          this.totalItems.set((currentPageNumber - 1) * this.pageSize() + currentPageItems);
        } else {
          // Full page returned - there might be more pages
          this.hasMorePages.set(true);
          // For pagination component, we set a high number to enable next page
          // But for display, we'll show the actual count differently
          this.totalItems.set(currentPageNumber * this.pageSize() + 1);
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.response_message ||
                           err?.message ||
                           'Failed to load projects. Please try again.';
        this.error.set(errorMessage);
        console.error('Failed to load projects:', err);
      }
    });
  }

  /**
   * Handle search input changes with debouncing
   */
  onKeywordChange(keyword: string): void {
    this.keyword.set(keyword);

    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search to avoid too many operations
    // Since we're doing client-side filtering, we reload to get fresh data
    this.searchTimeout = setTimeout(() => {
      this.currentPage.set(1); // Reset to first page when searching
      this.load();
    }, 500);
  }

  /**
   * Handle status filter changes
   */
  onStatusChange(status: ProjStatus | ''): void {
    this.status.set(status);
    this.currentPage.set(1); // Reset to first page when filtering
    this.load();
  }

  /**
   * Handle sort changes
   */
  onSortChange(sortBy: SortBy): void {
    this.sortBy.set(sortBy);
    this.load();
  }

  /**
   * Handle order changes
   */
  onOrderChange(order: Order): void {
    this.order.set(order);
    this.load();
  }

  /**
   * Handle page changes from paginator
   */
  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1); // PageEvent uses 0-based index
    this.pageSize.set(event.pageSize);
    this.load();
  }

  /**
   * Handle page size changes
   */
  changePageSize(newPageSize: number): void {
    this.pageSize.set(newPageSize);
    this.currentPage.set(1); // Reset to first page when changing page size
    this.load();
  }

  /**
   * Navigate to project details page
   */
  open(project: ProjDetailsResp): void {
    if (project.project_id) {
      this.router.navigate(['/projects', project.project_id]);
    }
  }

  /**
   * Navigate to edit project page
   */
  editProject(project: ProjDetailsResp): void {
    if (project.project_id) {
      this.router.navigate(['/projects', project.project_id, 'edit']);
    }
  }

  /**
   * Check if current user can edit the project
   */
  canEditProject(project: ProjDetailsResp): boolean {
    const currentUser = this.auth.currentUser();

    if (!project || !currentUser) {
      return false;
    }

    // User can edit if they are the creator or have OWNER role
    const isCreator = project.creator_id === currentUser.user_id;
    const isOwner = project.member_list?.some(
      member => member.user_id === currentUser.user_id && member.user_project_role === 'OWNER'
    );

    return isCreator || !!isOwner;
  }

  /**
   * Check if project allows full editing (not completed)
   */
  canFullyEditProject(project: ProjDetailsResp): boolean {
    return this.canEditProject(project) && project.project_status !== 'COMPLETED';
  }

  /**
   * Get tooltip text for edit button
   */
  getEditTooltip(project: ProjDetailsResp): string {
    if (!this.canEditProject(project)) {
      return 'You do not have permission to edit this project';
    }
    if (project.project_status === 'COMPLETED') {
      return 'Completed projects can only have their status modified';
    }
    return 'Edit project details';
  }

  /**
   * Clear all filters and reload
   */
  clearFilters(): void {
    this.keyword.set('');
    this.status.set('');
    this.sortBy.set('createdAt');
    this.order.set('desc');
    this.currentPage.set(1);
    this.pageSize.set(5);
    this.load();
  }

  /**
   * Apply client-side keyword filtering if needed
   * This is a fallback if the API doesn't support keyword search
   */
  private applyClientSideFiltering(): void {
    const searchKeyword = this.keyword().trim().toLowerCase();
    if (!searchKeyword) return;

    const filteredItems = this.items().filter(project =>
      this.matchesKeyword(project, searchKeyword)
    );

    this.items.set(filteredItems);
    this.totalItems.set(filteredItems.length);
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByProjectId(index: number, project: ProjDetailsResp): string | number {
    return project.project_id || index;
  }

  /**
   * Get status icon based on project status
   */
  getStatusIcon(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'schedule';
      case 'IN_PROGRESS':
        return 'work';
      case 'COMPLETED':
        return 'check_circle';
      default:
        return 'help_outline';
    }
  }

  /**
   * Get status label for display
   */
  getStatusLabel(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get CSS class for status styling
   */
  getStatusClass(status: ProjStatus | null | undefined): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'IN_PROGRESS':
        return 'in-progress';
      case 'COMPLETED':
        return 'completed';
      default:
        return 'default';
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) {
      return 'N/A';
    }

    try {
      const formatted = this.datePipe.transform(dateString, 'MMM d, y');
      return formatted || 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  }

  /**
   * Check if project matches search keyword
   */
  private matchesKeyword(project: ProjDetailsResp, keyword: string): boolean {
    const name = (project.project_name || '').toLowerCase();
    const description = (project.project_description || '').toLowerCase();

    return name.includes(keyword) || description.includes(keyword);
  }

  /**
   * Navigate to create project page
   */
  navigateToCreate(): void {
    this.router.navigate(['/projects/new']);
  }

  /**
   * Delete project with confirmation
   */
  deleteProject(project: ProjDetailsResp, event: Event): void {
    event.stopPropagation(); // Prevent navigation to project details

    if (confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
      this.svc.delete(project.project_id).subscribe({
        next: () => {
          this.snackBar.open('Project deleted successfully', 'Close', { duration: 3000 });
          this.load(); // Reload the projects list
        },
        error: (error) => {
          console.error('Error deleting project:', error);
          this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Clean up timeout on component destroy
   */
  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}
