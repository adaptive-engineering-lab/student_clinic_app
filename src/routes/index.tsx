import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { DashboardPage } from './DashboardPage'
import { RequireRole } from './RequireRole'
import { LoginPage } from '../features/auth/LoginPage'
import { StudentProfilePage } from '../features/students/StudentProfilePage'
import { NewVisitPage } from '../features/visits/NewVisitPage'
import { ReportsPage } from '../features/reports/ReportsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireRole allow={['nurse', 'admin', 'super_admin']}>
        <AppLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'students',
        element: (
          <RequireRole allow={['nurse', 'super_admin']}>
            <StudentProfilePage />
          </RequireRole>
        ),
      },
      {
        path: 'students/:studentId/visits/new',
        element: (
          <RequireRole allow={['nurse', 'super_admin']}>
            <NewVisitPage />
          </RequireRole>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequireRole allow={['nurse', 'admin', 'super_admin']}>
            <ReportsPage />
          </RequireRole>
        ),
      },
    ],
  },
])
