import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'projects',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent),
  },
  {
    path: 'projects/new',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/create-project/create-project.component').then(m => m.CreateProjectComponent),
  },
  {
    path: 'projects/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
  },
  {
    path: 'projects/:id/tasks/:taskId',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/task-detail/task-detail.component').then(m => m.TaskDetailComponent),
  },
  {
    path: 'projects/:id/edit',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/edit-project/edit-project.component').then(m => m.EditProjectComponent),
  },
  {
    path: 'users',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/admin-users/admin-users.component').then(m => m.AdminUsersComponent),
  },
  {
    path: 'users/:id',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'auth/login' },
];
