export const notifications = {
  title: "Notifications",
  empty: "No notifications",
  unread: "unread",
  markAllRead: "Mark all read",
  dismissAll: "Dismiss all",
  dismiss: "Dismiss",
  types: {
    homework_overdue: "Homework «{{title}}» is overdue ({{pending}} not submitted)",
    payment_overdue: "{{name}}: {{remaining}} still due for {{period}}",
    exception: "{{kind}} session on {{date}}",
    weak_skill: "{{count}} student(s) are weak in «{{name}}»",
    low_attendance: "{{name}} attendance is {{rate}} this month",
  },
} as const;
