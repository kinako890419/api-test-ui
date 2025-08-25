import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
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
    path: 'projects/:id/edit',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/edit-project/edit-project.component').then(m => m.EditProjectComponent),
  },
  { path: '**', redirectTo: 'login' },
];
