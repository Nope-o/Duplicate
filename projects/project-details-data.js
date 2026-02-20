// Shared data source for all /projects/<slug>/ detail pages.
// Add new entries here using the folder name as the key.
window.PROJECT_DETAILS = {
  AutomationDashboard: {
    title: "Employee Details",
    subtitle: "Demo Power BI dashboard for employee profile, workforce distribution, and staffing insights.",
    createdOn: "November 2025",
    visibility: "Internal",
    status: "Active",
    likes: 28,
    heroImage: "../../assets/images/projects/automation-dashboard/hero.png",
    heroFit: "contain",
    logoImage: "../../assets/images/projects/automation-dashboard/logo.webp",
    overview: [
      "This is a demo project used to present an Employee Details reporting experience in a clear, executive-friendly layout.",
      "The page showcases sample views for headcount, department split, role mix, location distribution, and employee data completeness.",
      "All metrics shown here are demo placeholders for presentation and design validation."
    ],
    requirements: [
      "Power BI access with workspace permissions",
      "Structured employee source data (Excel/SharePoint/API)",
      "Defined fields such as employee ID, department, role, manager, and location"
    ],
    highlights: [
      "Unified employee snapshot with searchable profile-level details.",
      "Interactive filters by team, department, location, and reporting manager.",
      "Quick visual breakdowns to support staffing and planning reviews.",
      "Demo narrative sections to explain each KPI block for first-time viewers."
    ],
    mvp: [
      "One-screen visibility of workforce information for faster leadership review.",
      "Demo-ready dashboard structure that can be connected to live employee datasets."
    ],
    techStack: ["Power BI", "Power Query", "DAX", "Excel", "SharePoint"],
    gallery: [
      { src: "../../assets/images/projects/automation-dashboard/hero.png", alt: "Employee Details dashboard demo overview" },
      { src: "../../assets/images/projects/automation-dashboard/gallery-context.webp", alt: "Employee Details demo context view" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "mondelez-operational-dashboard": {
    title: "Mondelez Operational Dashboard",
    subtitle: "Power BI reporting suite for EUC and EUC-Tech operations with consolidated visibility and automatic data refresh.",
    createdOn: "December 2025",
    visibility: "Internal",
    status: "Active",
    likes: 25,
    heroImage: "../../assets/images/projects/mondelez-operational-dashboard/Mond1_edited.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/mondelez-operational-dashboard/icon.svg",
    headerHighlights: ["Intune", "Citrix VMs", "App Packaging", "Mailbox", "Office"],
    logoImage: "../../assets/images/projects/mondelez-operational-dashboard/logo.webp",
    overview: [
      "Abbreviation used in this project: EUC = End User Computing.",
      "The dashboard was created for EUC and EUC-Tech teams to track operational performance in one place.",
      "Before this implementation, reporting was handled in Excel and there was no clear visualization layer for management.",
      "The solution introduced a consolidated operational view with server-connected datasets that refresh automatically."
    ],
    requirements: [
      "Power BI workspace access with report and dataset permissions",
      "Configured server data source and refresh pipeline",
      "Standardized metrics for Intune, Citrix virtual machines, application packaging, mailbox, and Office",
      "Defined audience views for operational teams and management"
    ],
    highlights: [
      "Unified reporting for EUC and EUC-Tech workloads in a single management dashboard.",
      "Moved operations from spreadsheet-driven tracking to visual KPI monitoring.",
      "Enabled clearer visibility across Intune status, Citrix VM coverage, application packaging progress, mailbox operations, and Office-related metrics.",
      "Introduced consolidated slicing and drill-downs for faster leadership review.",
      "Automated report refresh from server data to keep dashboards current without manual rework."
    ],
    mvp: [
      "Replaced fragmented Excel reporting with one consolidated operational dashboard.",
      "Delivered near real-time visibility for management through automatically updated server-backed data."
    ],
    techStack: ["Power BI", "Power Query", "DAX", "SQL/Server Data", "Operational Analytics"],
    gallery: [
      { src: "../../assets/images/projects/mondelez-operational-dashboard/Mond1_edited.webp", alt: "Mondelez operational dashboard preview 1" },
      { src: "../../assets/images/projects/mondelez-operational-dashboard/Mond2_edited.webp", alt: "Mondelez operational dashboard preview 2" },
      { src: "../../assets/images/projects/mondelez-operational-dashboard/Mond3_edited.webp", alt: "Mondelez operational dashboard preview 3" },
      { src: "../../assets/images/projects/mondelez-operational-dashboard/Mond4_edited.webp", alt: "Mondelez operational dashboard preview 4" },
      { src: "../../assets/images/projects/mondelez-operational-dashboard/Mond5_edited.webp", alt: "Mondelez operational dashboard preview 5" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  AttendanceTracker: {
    title: "Attendance Tracker App",
    subtitle: "Internal attendance platform for real-time marking, automation, and clear reporting.",
    createdOn: "August 2025",
    visibility: "Internal",
    status: "Completed",
    likes: 30,
    heroImage: "../../assets/images/projects/attendance-tracker/Att1_edited.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/attendance-tracker/icon.svg",
    headerHighlights: ["Mark", "Automate", "Track"],
    logoImage: "../../assets/images/projects/attendance-tracker/logo.webp",
    overview: [
      "Attendance was earlier managed in monthly Excel sheets, which caused manual effort, delays, and edit risks.",
      "This solution combines Power Apps (operations), Power Automate (process automation), and Power BI (analytics).",
      "Managers can mark attendance for direct reportees with role-based access and faster correction handling.",
      "Historical records are archived automatically while active data stays lightweight for better app performance."
    ],
    requirements: [
      "Microsoft 365 access with Power Apps, Power Automate, and Power BI",
      "SharePoint lists for active attendance and archive storage",
      "Manager-reportee and shift mapping for controlled attendance entry",
      "Teams integration for automated shift and missing-attendance alerts"
    ],
    highlights: [
      "Real-time attendance entry with role-based manager views.",
      "Automated archive model keeps only active months in primary storage for better performance.",
      "Correction workflow syncs updates across active and archive records.",
      "Automated missing-attendance and shift availability notifications via Teams.",
      "Power BI reporting with role-wise, location-wise, lead-wise, and engineer-level drilldowns.",
      "Core reports: Attendance Overview, Agent Attendance, and Attendance Missing Dashboard."
    ],
    mvp: [
      "Replaced spreadsheet-based attendance with a secure, real-time, and role-based process.",
      "Improved planning and governance with automation plus clear operational dashboards."
    ],
    techStack: ["Power Apps", "Power BI", "Power Automate", "Power Fx", "DAX", "SharePoint", "Microsoft Teams"],
    deliveryTracks: [],
    gallery: [
      { src: "../../assets/images/projects/attendance-tracker/Att1_edited.webp", alt: "Attendance tracker preview 1" },
      { src: "../../assets/images/projects/attendance-tracker/Att2_edited.webp", alt: "Attendance tracker preview 2" },
      { src: "../../assets/images/projects/attendance-tracker/Att3_edited.webp", alt: "Attendance tracker preview 3" },
      { src: "../../assets/images/projects/attendance-tracker/Att4_edited.webp", alt: "Attendance tracker preview 4" },
      { src: "../../assets/images/projects/attendance-tracker/Att5_edited.webp", alt: "Attendance tracker preview 5" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "sursight-studio": {
    title: "SurSight Studio",
    subtitle: "A next-generation riyaz and pitch intelligence studio where musicians can see, train, and improve intonation with real-time visual feedback.",
    createdOn: "January 2026",
    visibility: "Public",
    status: "Live",
    likes: 35,
    heroImage: "../../assets/images/projects/sursight-studio/hero.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/sursight-studio/icon.svg",
    headerHighlights: ["Practice", "Visualise", "Tune", "Excel"],
    logoImage: "../../assets/images/projects/sursight-studio/logo.webp",
    overview:
      "SurSight Studio (v2) is a musician-focused web app for real-time pitch training and Sargam practice. It captures microphone input, tracks note stability live, maps frequencies to both Western notes and Indian swaras relative to the selected Sa, and visualizes progress across timeline, cent deviation, and advanced analysis views. The latest version adds stronger practice syncing (Sa + octave), richer guided exercises, compact mobile workflows, and polished onboarding so learners can start faster and practice with more precision.",
    requirements: [
      "Modern browser with microphone access (Chrome, Edge, or Safari)",
      "Headphones or a quiet environment for cleaner pitch detection",
      "Basic understanding of Sa/Re/Ga or Western notes for better exercise flow"
    ],
    highlights: [
      "Real-time pitch timeline with target-note guidance and cent-level tuning feedback",
      "Dual mapping engine: Western notes + Sargam aligned to selected Sa",
      "Exercise engine synced with live settings (Sa and octave) for consistent targets",
      "Practice-focused modules: chromatic flow, Sargam drills, interval and octave exercises",
      "Advanced analysis views with pre-start empty state and cleaner light/dark readability",
      "Smart controls for noisy spaces: low-cut, gate, clarity, and adjustable FPS performance",
      "Mobile-compact UI with redesigned exercise mode, quick controls, and onboarding hints"
    ],
    mvp: [
      "Turns every riyaz session into measurable progress with real-time visual intonation feedback",
      "Bridges Western notes and Indian swaras around user-selected Sa for practical instrument/vocal training"
    ],
    techStack: ["JavaScript", "Web Audio API", "Canvas", "CSS", "Music Pedagogy"],
    gallery: [
      { src: "../../assets/images/projects/sursight-studio/gallery-1.webp", alt: "SurSight Studio preview 1" },
      { src: "../../assets/images/projects/sursight-studio/gallery-2.webp", alt: "SurSight Studio preview 2" },
      { src: "../../assets/images/projects/sursight-studio/gallery-3.webp", alt: "SurSight Studio preview 3" },
      { src: "../../assets/images/projects/sursight-studio/gallery-4.webp", alt: "SurSight Studio preview 4" },
      { src: "../../assets/images/projects/sursight-studio/gallery-5.webp", alt: "SurSight Studio preview 5" }
    ],
    links: [
      { label: "Open", href: "../sursight-studio-app/", style: "success", external: false },
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  liteedit: {
    title: "LiteEdit",
    subtitle: "A privacy-first browser image studio focused on compression, format conversion, and bulk photo workflows.",
    createdOn: "February 2026",
    visibility: "Public",
    status: "Under Development",
    likes: 32,
    heroImage: "../../assets/images/projects/liteedit/Liteimg1.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/liteedit/icon.svg",
    headerHighlights: ["Local Edit", "Compress", "Change Type", "Export"],
    logoImage: "../../assets/images/projects/liteedit/logo.webp",
    overview:
      "LiteEdit Pro runs fully on-device in the browser, so images are processed locally without server upload. The app is built for practical production use: import many photos at once (files/folder/camera), apply edits quickly, compress outputs using quality and resize controls, convert formats (JPG, PNG, WebP, AVIF, PDF), and export in single or bulk modes with progress and size-saving visibility.",
    requirements: [
      "Modern browser with JavaScript enabled",
      "Image files such as JPG, PNG, WebP, AVIF, BMP, GIF, TIFF, or SVG",
      "Enough device memory for batch editing up to 20 images in one session"
    ],
    highlights: [
      "Privacy-first local processing: edits stay in browser and export pipeline strips metadata for safer sharing",
      "Bulk import flow for multiple images and folders, plus camera capture modes (photo/document scan)",
      "Batch-ready workflow with up to 20 photos per session and quick switching across uploaded items",
      "Compression controls with quality + resize tuning, estimated output size, and visual savings meter",
      "Format conversion for JPG, PNG, WebP, AVIF, and PDF from the same export panel",
      "Bulk export options: ZIP bundle, combined PDF, or separate PDFs for large photo sets",
      "Simple and Advanced modes with responsive mobile controls for fast editing on smaller screens"
    ],
    mvp: [
      "Delivers private, on-device image optimization and format conversion without cloud dependency",
      "Reduces repetitive effort in multi-photo jobs through bulk import, quick edits, and one-tap batch export"
    ],
    techStack: ["HTML", "CSS", "JavaScript", "Canvas API", "Web APIs", "JSZip", "FileSaver.js", "jsPDF"],
    gallery: [
      { src: "../../assets/images/projects/liteedit/Liteimg1.webp", alt: "LiteEdit preview 1" }
    ],
    links: [
      { label: "Open", href: "../liteedit-app/", style: "success", external: false },
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "kba-review": {
    title: "KBA Review",
    subtitle: "Power Apps + Power BI governance workflow to standardize Knowledge Base Articles (KBAs) and track review quality for AI-assisted IT support.",
    createdOn: "March 2025",
    visibility: "Internal",
    status: "Active",
    likes: 27,
    heroImage: "../../assets/images/projects/kba-review/hero.png",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/kba-review/icon.svg",
    headerHighlights: ["Review", "Admin Mode", "Track in Power BI", "Improve AI"],
    logoImage: "../../assets/images/projects/kba-review/logo.webp",
    overview: [
      "Abbreviations used in this project: KBA = Knowledge Base Article, KM = Knowledge Management.",
      "Problem context: AI support responses were inconsistent when KBA articles had uneven structure, unclear wording, or incomplete metadata.",
      "Workflow ownership: Service Desk runs first-level review in User mode, while the Knowledge Management (KM) team uses Admin mode for governance actions, escalations, and controlled updates.",
      "Quality enforcement: Each KBA is validated for title format, searchable problem statements, environment coverage, ordered resolution steps, and accurate article/link references.",
      "Lifecycle control: Duplicate, outdated, or non-compliant KBAs are routed for update or retirement and tracked until closure.",
      "Power BI tracking: KM dashboards provide near real-time visibility into queue volume, aging, pass/fail quality trends, reviewer throughput, and turnaround time."
    ],
    requirements: [
      "Power Apps access with role-based reviewer permissions",
      "Connected enterprise ticketing or knowledge-base source",
      "Agreed quality rubric for article format, metadata, and resolution flow",
      "Power BI workspace access for KM tracking and reporting"
    ],
    highlights: [
      "Defines clear responsibilities across Service Desk, specialist teams, and audit reviewers",
      "Supports two operating modes: User mode for reviews and KM Admin mode for controlled actions",
      "Uses structured review states to classify articles as approve, update, or retire",
      "Enforces quality checks: title format, problem statement, environment, ordered resolution steps, and metadata completeness",
      "Improves AI retrieval by requiring user-search-friendly language and keyword coverage",
      "Publishes process visibility to Power BI so KM can monitor progress and quality metrics on time",
      "Reduces noise by identifying duplicate or outdated articles and routing them for correction",
      "Supports audit feedback loops so failed checks return to review with traceable ownership"
    ],
    mvp: [
      "Raises AI support response quality by standardizing how knowledge articles are written and maintained",
      "Creates a governed review pipeline that improves article trust, discoverability, and long-term maintainability"
    ],
    techStack: ["Power Apps", "Power Automate", "Power BI", "Knowledge Management", "ITSM", "Process Governance"],
    gallery: [
      { src: "../../assets/images/projects/kba-review/hero.png", alt: "KBA review dashboard placeholder" },
      { src: "../../assets/images/projects/kba-review/gallery-context.webp", alt: "KBA workflow placeholder" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "ai-knowledge-portal": {
    title: "AI Knowledge Portal",
    subtitle: "Production internal knowledge platform in Power Apps for unified KBA discovery, document access, and governance insights.",
    createdOn: "February 2025",
    visibility: "Internal",
    status: "Active",
    likes: 29,
    heroImage: "../../assets/images/projects/ai-knowledge-portal/KBA1.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/ai-knowledge-portal/icon.svg",
    headerHighlights: ["Search", "Filter", "Read PDF", "Track Quality"],
    logoImage: "../../assets/images/projects/ai-knowledge-portal/logo.webp",
    overview: [
      "Abbreviations used in this project: KBA = Knowledge Base Article, KM = Knowledge Management.",
      "Purpose: Deliver one internal portal where users can quickly find, read, and evaluate knowledge content without switching across disconnected systems.",
      "Data architecture: Power Apps consolidates SharePoint List records and PDF metadata into one unified collection using Concurrent(), ClearCollect(), and AddColumns() patterns.",
      "Search and discovery: Case-insensitive keyword matching spans title, product, audience, owner, description, service context, and keyword fields for precise recall.",
      "Role model: Standard User mode focuses on discovery and feedback, while KM Admin mode enables governance controls and quality oversight.",
      "Operational visibility: Power BI dashboards provide on-time tracking of portal usage, review progression, and content-quality trends for KM stakeholders."
    ],
    requirements: [
      "Power Apps environment with role-based security for User and KM Admin modes",
      "SharePoint Lists and PDF source storage with stable schema mapping",
      "Power BI workspace access for process tracking and governance reporting",
      "Defined metadata standards for audience, product, KBA type, owner, and keywords"
    ],
    highlights: [
      "Multi-source data integration into a single searchable model for article records and document assets",
      "Advanced search engine across KBA metadata and content descriptors with case-insensitive matching",
      "Three-level filtering (Audience, KBA Type, Product multi-select) with one-action full reset",
      "Responsive layout behavior using dynamic container visibility/height logic for clean cross-device UX",
      "Embedded PDF viewing that loads the correct document from selected records in real time",
      "Context-rich metadata panel with product, audience, service, owner, and keyword details",
      "AI summary panel that supports current pre-generated summaries and future real-time AI/chat integration",
      "Feedback workflow with one rating per session and negative input routing to the owning KBA stakeholder",
      "Frequency tracking through Patch()/UpdateIf() patterns to increment usage metrics automatically",
      "One-click Contact Owner action using encoded mailto links for faster communication"
    ],
    mvp: [
      "Transforms fragmented knowledge access into a production-ready, governed portal with reliable discovery and document navigation.",
      "Gives KM teams measurable control over content quality and usage through integrated feedback and Power BI reporting."
    ],
    techStack: ["Power Apps", "SharePoint", "Power BI", "Power Fx", "Knowledge Management", "ITSM"],
    gallery: [
      { src: "../../assets/images/projects/ai-knowledge-portal/KBA1.webp", alt: "AI Knowledge Portal preview 1" },
      { src: "../../assets/images/projects/ai-knowledge-portal/KBA2.webp", alt: "AI Knowledge Portal preview 2" },
      { src: "../../assets/images/projects/ai-knowledge-portal/KBA3.webp", alt: "AI Knowledge Portal preview 3" },
      { src: "../../assets/images/projects/ai-knowledge-portal/KBA4.webp", alt: "AI Knowledge Portal preview 4" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "my-apps-dashboards": {
    title: "My Apps & Dashboards",
    subtitle: "Power Apps unified access layer for role-based launch of tools, reports, dashboards, and SharePoint resources.",
    createdOn: "March 2025",
    visibility: "Internal",
    status: "Active",
    likes: 26,
    heroImage: "../../assets/images/projects/my-apps-dashboards/MyApps1.webp",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/my-apps-dashboards/icon.svg",
    headerHighlights: ["Role-Based Access", "Smart Launch", "Favorites", "Usage Insights"],
    logoImage: "../../assets/images/projects/my-apps-dashboards/logo.webp",
    overview: [
      "Abbreviations used in this project: SD = Service Desk, RDS = Remote/Desktop Support, QM = Quality Management.",
      "Purpose: Provide one internal entry point for applications, reports, dashboards, and SharePoint links instead of scattered bookmarks and portals.",
      "Role model: Users see only relevant assets based on role (for example SD, RDS, QM, and Managers), reducing clutter and improving discovery speed.",
      "Smart launch behavior: Links open directly when the user is in the HCL-Tech environment; for external environments (for example Ericsson), the app copies the link and shows the message: \"Link copied. Kindly open it in Ericsson environment.\"",
      "Governance visibility: Each catalog item surfaces clear metadata such as developer, responsible person, description, and intended audience for accountability."
    ],
    requirements: [
      "Power Apps environment with authenticated user context and role mapping",
      "Master catalog of tools/links with owner and audience metadata",
      "Cross-environment launch rules for internal vs external network access",
      "Persistent storage for favorites, wishlist, and usage telemetry"
    ],
    highlights: [
      "Role-Based Access: Shows applications by user role so each user gets a personalized and focused experience.",
      "Smart Launch: Automatically handles in-network open vs external copy-link guidance for smoother multi-environment usage.",
      "Metadata Display: Exposes developer, responsible owner, description, and target audience for every item.",
      "Favorites and Wishlist: Lets users bookmark tools and save wishlist items with automatic reload on next login.",
      "Advanced Search: Supports keyword/phrase matching with synonym and related-term detection for faster discovery.",
      "Usage-Aware Ranking: Tracks launch frequency and sorts each section by most-used tools.",
      "Environment Awareness: Detects out-of-network access and provides the right instruction path.",
      "Custom Wishlist Management: Maintains a user-specific wishlist that persists across sessions."
    ],
    mvp: [
      "Centralizes access to internal tools and portals in one governed experience.",
      "Eliminates confusion from scattered links and reduces time spent searching.",
      "Improves productivity through personalized role-based views and quick favorites.",
      "Strengthens governance and accountability with explicit ownership metadata.",
      "Scales cleanly as new tools, teams, and environments are introduced."
    ],
    techStack: ["Power Apps", "SharePoint", "Power BI", "Power Fx", "Role-Based Access", "Knowledge Management"],
    gallery: [
      { src: "../../assets/images/projects/my-apps-dashboards/MyApps1.webp", alt: "My Apps & Dashboards preview 1" },
      { src: "../../assets/images/projects/my-apps-dashboards/MyApps2.webp", alt: "My Apps & Dashboards preview 2" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  },

  "nac-script": {
    title: "NAC Script Automation",
    subtitle: "Python SSH automation for NAC switch health checks, interface validation, and VLAN-ready reporting.",
    createdOn: "December 2025",
    visibility: "Internal",
    status: "Completed",
    likes: 24,
    heroImage: "../../assets/images/projects/nac-script/hero.png",
    heroFit: "contain",
    headerIcon: "../../assets/images/projects/nac-script/icon.svg",
    headerHighlights: ["SSH Collection", "Port Validation", "VLAN Mapping", "Report Automation"],
    logoImage: "../../assets/images/projects/nac-script/logo.webp",
    overview: [
      "Abbreviation used in this project: NAC = Network Access Control.",
      "The project automated switch-level audit tasks that were previously CLI-heavy and time-consuming.",
      "Interface VLAN enrichment and report calculations were integrated into the same automation flow to avoid fragmented processes.",
      "End-to-end effort was reduced from around 2 days of manual work to about 1 hour."
    ],
    requirements: [
      "Python runtime with SSH automation libraries and regex parsing support",
      "Authorized SSH access to target switches",
      "Input inventory with switch identifiers and device context",
      "Standardized output workbook format for audit reporting"
    ],
    highlights: [
      "Automated collection of configuration output and error indicators through SSH.",
      "Validation of all ports with accurate trunk-port detection and VLAN assignment mapping.",
      "Integrated vulnerability-oriented checks for faster risk identification at interface level.",
      "Improved output reliability by disabling paging and handling command-read timeouts.",
      "Moved parsing to safer in-memory processing with cleaner merge logic per port.",
      "Auto-initialized Excel output when files/sheets were missing, reducing run failures.",
      "Added structured success/error logging and visible failure capture in final report.",
      "Refactored script into modular parsing functions for easier maintenance and future enhancements."
    ],
    mvp: [
      "Reduced manual CLI validation effort and improved report consistency across NAC audits, cutting turnaround from roughly 2 days to about 1 hour.",
      "Delivered an end-to-end script that covers config checks, interface VLAN enrichment, and export-ready reporting."
    ],
    techStack: ["Python", "SSH", "Regex", "Excel Automation", "Network CLI", "Structured Logging"],
    gallery: [
      { src: "../../assets/images/projects/nac-script/hero.png", alt: "NAC automation report dashboard placeholder" },
      { src: "../../assets/images/projects/nac-script/gallery-context.webp", alt: "NAC script execution context placeholder" }
    ],
    links: [
      { label: "Back to Projects", href: "../../#projects", external: false }
    ]
  }
};
