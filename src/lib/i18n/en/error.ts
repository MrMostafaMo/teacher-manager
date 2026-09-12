export const error = {
  title: "Something went wrong",
  description: "The app hit an unexpected error. Your data is stored locally and is safe.",
  copyDetails: "Copy Details",
  tryAgain: "Try Again",
  dbHealthTitle: "Database needs attention",
  dbHealthBody:
    "Some database tables are missing or failed a consistency check. Your data is stored locally — restore from a backup to repair it.",
  dbHealthMissing: "Missing tables",
  dbHealthSettings: "Open backup settings",
  dbRepaired: "Recreated empty tables: {{tables}}",
} as const;
