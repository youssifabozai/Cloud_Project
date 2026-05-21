import api from './api';

export interface NotificationItem {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  getAll: (unreadOnly?: boolean) => {
    const qs = unreadOnly ? '?unreadOnly=true' : '';
    return api.get<{ success: boolean; data: NotificationItem[] }>(`/notifications${qs}`);
  },

  markAllAsRead: () =>
    api.put<{ success: boolean }>('/notifications/read-all', {}),

  markAsRead: (id: string) =>
    api.put<{ success: boolean }>(`/notifications/${id}/read`, {}),

  testSns: (message: string) =>
    api.post<{ success: boolean }>('/notifications/test-sns', { message }),
};
