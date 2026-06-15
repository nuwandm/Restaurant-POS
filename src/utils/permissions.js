// Role-Based Access Control
// Each role lists the views and actions it is ALLOWED to perform.

export const ROLE_PERMISSIONS = {
  admin: {
    views: ['pos', 'orders', 'kitchen', 'reports', 'menu', 'tables', 'settings', 'shift'],
    actions: ['checkout', 'void', 'discount', 'manageStaff', 'manageMenu', 'manageSettings', 'closeShift', 'openShift', 'clearOrders', 'exportData'],
  },
  cashier: {
    views: ['pos', 'orders', 'kitchen', 'reports', 'shift'],
    actions: ['checkout', 'void', 'discount', 'closeShift', 'openShift'],
  },
  waiter: {
    views: ['pos', 'kitchen'],
    actions: [], // no checkout, no void, no discount
  },
};

export function can(role, action) {
  return ROLE_PERMISSIONS[role]?.actions?.includes(action) ?? false;
}

export function canViewPage(role, view) {
  return ROLE_PERMISSIONS[role]?.views?.includes(view) ?? false;
}

export function getAllowedViews(role) {
  return ROLE_PERMISSIONS[role]?.views ?? [];
}
