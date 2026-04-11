export const OWNER_MASTER_SPREADSHEET_ID =
  process.env.ANITRYA_OWNER_MASTER_SPREADSHEET_ID?.trim() ||
  "1EByVz3_XYPMxyC5a0KIno1gomdlRd-nhmyQC_bD4Bxs";

export const MASTER_TABS = {
  customers: "customers",
  projects: "projects",
  syncHealth: "sync_health",
} as const;

export const CUSTOMER_TABS = {
  projects: "projects",
  syncHealth: "sync_health",
  ga4SourceDaily: "ga4_source_daily",
  ga4LandingPageDaily: "ga4_landing_page_daily",
  gscQueryDaily: "gsc_query_daily",
  gscPageDaily: "gsc_page_daily",
} as const;

export const OWNER_SYNC_MODE = "project_scoped_backend_mirror";