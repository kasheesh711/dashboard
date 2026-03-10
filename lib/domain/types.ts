export type AppRole = "strategist" | "ops" | "parent";
export type Pathway = "us_college" | "uk_college" | "us_boarding" | "uk_boarding";
export type OverallStatus = "green" | "yellow" | "red";
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "done"
  | "overdue";
export type TaskComputedStatus = TaskStatus;
export type TaskCategory =
  | "application"
  | "testing"
  | "academics"
  | "project"
  | "admin";
export type DecisionStatus = "pending" | "resolved";
export type NoteAuthorRole = "strategist" | "ops" | "tutor_input" | "mentor_input";
export type NoteVisibility = "internal" | "parent";
export type ArtifactType = "drive_folder" | "doc" | "sheet" | "slide" | "external_link";
export type SchoolBucket = "reach" | "target" | "likely";
export type CollegeListBucketSource = "system" | "counselor";
export type CollegeOwnership =
  | "Public"
  | "Private nonprofit"
  | "Private for-profit"
  | "Unknown";
export type CollegeSortOption =
  | "name_asc"
  | "admission_rate_asc"
  | "admission_rate_desc"
  | "sat_average_desc"
  | "net_price_asc"
  | "earnings_desc"
  | "completion_desc"
  | "size_desc";

export type FamilyContact = {
  id: string;
  fullName: string;
  email: string;
  relationship: string;
  isPrimary: boolean;
  userId?: string;
};

export type MonthlySummary = {
  id: string;
  studentId?: string;
  reportingMonth: string;
  biggestWin: string;
  biggestRisk: string;
  topNextActions: [string, string, string];
  parentVisibleSummary: string;
  internalSummaryNotes: string;
};

export type AcademicUpdate = {
  id: string;
  studentId?: string;
  date: string;
  subjectPriority: string;
  gradeOrPredictedTrend: string;
  tutoringStatus: string;
  tutorNoteSummary: string;
  testPrepStatus?: string;
  parentVisible: boolean;
};

export type ProfileUpdate = {
  id: string;
  studentId?: string;
  date: string;
  projectName: string;
  milestoneStatus: string;
  evidenceAdded: string;
  mentorNoteSummary: string;
  parentVisible: boolean;
};

export type TaskItem = {
  id: string;
  studentId?: string;
  itemName: string;
  category: TaskCategory;
  owner: string;
  dueDate: string;
  status: TaskStatus;
  dependencyNotes?: string;
  parentVisible: boolean;
};

export type DecisionLogItem = {
  id: string;
  studentId?: string;
  date: string;
  decisionType: string;
  summary: string;
  owner: string;
  pendingFamilyInput: boolean;
  status: DecisionStatus;
  parentVisible: boolean;
};

export type NoteItem = {
  id: string;
  studentId?: string;
  date: string;
  authorRole: NoteAuthorRole;
  noteType: string;
  summary: string;
  body: string;
  visibility: NoteVisibility;
};

export type ArtifactLink = {
  id: string;
  studentId?: string;
  artifactName: string;
  artifactType: ArtifactType;
  linkUrl: string;
  uploadDate: string;
  owner: string;
  parentVisible: boolean;
};

export type StudentTestingProfile = {
  id: string;
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  strategyNote?: string;
};

export type StudentActivityItem = {
  id: string;
  activityName: string;
  role: string;
  impactSummary: string;
  sortOrder: number;
};

export type StudentCompetitionItem = {
  id: string;
  competitionName: string;
  result: string;
  yearLabel: string;
  sortOrder: number;
};

export type StudentSchoolTarget = {
  id: string;
  schoolName: string;
  country: string;
  bucket: SchoolBucket;
  fitNote: string;
  sortOrder: number;
};

export type CollegeProgramMatch = {
  code: string;
  title: string;
};

export type CollegeDemographicMixItem = {
  label: string;
  share?: number;
  colorToken: string;
};

export type CollegeSearchFilters = {
  familySlug?: string;
  query?: string;
  state?: string;
  city?: string;
  ownership?: CollegeOwnership | "all";
  sizeMin?: number;
  sizeMax?: number;
  admissionRateMin?: number;
  admissionRateMax?: number;
  satMin?: number;
  satMax?: number;
  netPriceMax?: number;
  completionMin?: number;
  retentionMin?: number;
  earningsMin?: number;
  zip?: string;
  distance?: string;
  programCode?: string;
  sort?: CollegeSortOption;
  page?: number;
  perPage?: number;
  selectedScorecardSchoolId?: number;
};

export type CollegeSearchResult = {
  scorecardSchoolId: number;
  schoolName: string;
  city: string;
  state: string;
  ownership: CollegeOwnership;
  studentSize?: number;
  admissionRate?: number;
  satAverage?: number;
  completionRate?: number;
  retentionRate?: number;
  averageNetPrice?: number;
  medianEarnings?: number;
  tuitionStickerPrice?: number;
  latitude?: number;
  longitude?: number;
  matchedPrograms: CollegeProgramMatch[];
  demographicMix?: CollegeDemographicMixItem[];
  heroImage?: string;
  heroImageAlt?: string;
  heroAccent?: string;
};

export type FamilyCollegeStrategyProfile = {
  id: string;
  familyId: string;
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  intendedMajorCodes: string[];
  intendedMajorLabels: string[];
  strategyNote?: string;
};

export type FamilyCollegeListItem = {
  id: string;
  familyCollegeListId: string;
  scorecardSchoolId: number;
  schoolName: string;
  city: string;
  state: string;
  ownership: CollegeOwnership;
  studentSize?: number;
  admissionRate?: number;
  satAverage?: number;
  completionRate?: number;
  retentionRate?: number;
  averageNetPrice?: number;
  medianEarnings?: number;
  matchedProgramCodes: string[];
  matchedProgramLabels: string[];
  bucket: SchoolBucket;
  bucketSource: CollegeListBucketSource;
  fitScore: number;
  fitRationale: string;
  counselorNote?: string;
  sortOrder: number;
};

export type FamilyCollegeList = {
  id: string;
  familyId: string;
  listName: string;
  isCurrent: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  items: FamilyCollegeListItem[];
};

export type BucketSuggestion = {
  bucket: SchoolBucket;
  fitScore: number;
  fitRationale: string;
};

export type StudentCase = {
  id: string;
  familyId: string;
  familySlug: string;
  slug: string;
  studentName: string;
  gradeLevel: string;
  pathway: Pathway;
  tier: string;
  currentPhase: string;
  overallStatus: OverallStatus;
  statusReason: string;
  createdDate: string;
  lastUpdatedDate: string;
  testingProfile?: StudentTestingProfile;
  activities: StudentActivityItem[];
  competitions: StudentCompetitionItem[];
  schoolTargets: StudentSchoolTarget[];
  monthlySummaries: MonthlySummary[];
  academicUpdates: AcademicUpdate[];
  profileUpdates: ProfileUpdate[];
  tasks: TaskItem[];
  decisionLogItems: DecisionLogItem[];
  notes: NoteItem[];
  artifactLinks: ArtifactLink[];
};

export type FamilyWorkspace = {
  id: string;
  slug: string;
  familyLabel: string;
  legacyStudentName?: string;
  parentContactName: string;
  strategistOwnerId?: string;
  opsOwnerId?: string;
  strategistOwnerName: string;
  opsOwnerName: string;
  createdDate: string;
  lastUpdatedDate: string;
  contacts: FamilyContact[];
  students: StudentCase[];
  monthlySummaries: MonthlySummary[];
  academicUpdates: AcademicUpdate[];
  profileUpdates: ProfileUpdate[];
  tasks: TaskItem[];
  decisionLogItems: DecisionLogItem[];
  notes: NoteItem[];
  artifactLinks: ArtifactLink[];
  collegeStrategyProfile?: FamilyCollegeStrategyProfile;
  collegeLists: FamilyCollegeList[];
};

export type FamilyFilters = {
  search?: string;
  strategist?: string;
  pathway?: Pathway | "all";
  status?: OverallStatus | "all";
  deadlineWindow?: "all" | "7" | "30" | "overdue";
};

export type StudentListItem = {
  id: string;
  slug: string;
  familyId: string;
  familySlug: string;
  familyLabel: string;
  studentName: string;
  gradeLevel: string;
  pathway: Pathway;
  pathwayLabel: string;
  tier: string;
  currentPhase: string;
  overallStatus: OverallStatus;
  statusReason: string;
  biggestRisk: string;
  nextCriticalDueDate?: string;
  lastUpdatedDate: string;
  pendingDecisionCount: number;
  overdueTaskCount: number;
  currentSat?: number;
  projectedSat?: number;
  schoolBucketCounts: Record<SchoolBucket, number>;
};

export type FamilyListItem = {
  id: string;
  slug: string;
  familyLabel: string;
  parentContactName: string;
  strategistOwnerName: string;
  opsOwnerName: string;
  studentCount: number;
  studentNames: string[];
  activeStatuses: OverallStatus[];
  nextCriticalDueDate?: string;
  biggestRisk: string;
  lastUpdatedDate: string;
  pendingDecisionCount: number;
  overdueTaskCount: number;
};

export type DashboardMetrics = {
  activeFamilies: number;
  activeStudents: number;
  urgentStudents: number;
  overdueItems: number;
  parentVisibleDueSoon: number;
  testingProfilesReady: number;
  schoolListsReady: number;
  missingCurrentMonthSummary: number;
};

export type DashboardSnapshot = {
  metrics: DashboardMetrics;
  urgentStudents: StudentListItem[];
  upcomingTasks: Array<{
    familySlug: string;
    studentSlug?: string;
    familyLabel: string;
    studentName: string;
    itemName: string;
    dueDate: string;
    computedStatus: TaskComputedStatus;
    parentVisible: boolean;
  }>;
  schoolFitInsights: Array<{
    studentSlug: string;
    studentName: string;
    currentSat?: number;
    projectedSat?: number;
    recommendation: string;
  }>;
};

export type StudentPortfolio = {
  family: Pick<
    FamilyWorkspace,
    | "id"
    | "slug"
    | "familyLabel"
    | "parentContactName"
    | "strategistOwnerName"
    | "opsOwnerName"
  >;
  student: StudentCase;
  familyWideNotes: NoteItem[];
  familyWideDecisions: DecisionLogItem[];
  familyWideArtifacts: ArtifactLink[];
};

export type PortalStudentCase = {
  id: string;
  slug: string;
  studentName: string;
  gradeLevel: string;
  pathway: Pathway;
  tier: string;
  currentPhase: string;
  overallStatus: OverallStatus;
  currentSummary?: MonthlySummary;
  summaryHistory: MonthlySummary[];
  academicUpdate?: AcademicUpdate;
  profileUpdate?: ProfileUpdate;
  tasks: TaskItem[];
  decisions: DecisionLogItem[];
  artifactLinks: ArtifactLink[];
};

export type PortalCase = {
  family: Pick<FamilyWorkspace, "slug" | "familyLabel" | "parentContactName"> & {
    overallStatus: OverallStatus;
  };
  students: PortalStudentCase[];
  familyDecisions: DecisionLogItem[];
  familyArtifactLinks: ArtifactLink[];
  availableSlugs: string[];
};

export type CreateFamilyWithStudentInput = {
  familyLabel: string;
  parentContactName: string;
  parentEmail: string;
  strategistOwnerId?: string;
  opsOwnerId?: string;
  studentName: string;
  gradeLevel: string;
  pathway: Pathway;
  tier: string;
  currentPhase: string;
  overallStatus: OverallStatus;
  statusReason: string;
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  strategyNote?: string;
};

export type CreateStudentInput = {
  familyId: string;
  familySlug: string;
  studentName: string;
  gradeLevel: string;
  pathway: Pathway;
  tier: string;
  currentPhase: string;
  overallStatus: OverallStatus;
  statusReason: string;
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  strategyNote?: string;
};

type StudentScopedInput = {
  id?: string;
  familyId: string;
  familySlug: string;
  studentId?: string;
  studentSlug?: string;
};

export type UpsertMonthlySummaryInput = StudentScopedInput & {
  reportingMonth: string;
  biggestWin: string;
  biggestRisk: string;
  topNextActions: [string, string, string];
  parentVisibleSummary: string;
  internalSummaryNotes: string;
};

export type UpsertTaskInput = StudentScopedInput & {
  itemName: string;
  category: TaskCategory;
  owner: string;
  dueDate: string;
  status: TaskStatus;
  dependencyNotes?: string;
  parentVisible: boolean;
};

export type UpsertDecisionInput = StudentScopedInput & {
  date: string;
  decisionType: string;
  summary: string;
  owner: string;
  pendingFamilyInput: boolean;
  status: DecisionStatus;
  parentVisible: boolean;
};

export type UpsertNoteInput = StudentScopedInput & {
  date: string;
  authorRole: NoteAuthorRole;
  noteType: string;
  summary: string;
  body: string;
  visibility: NoteVisibility;
};

export type UpsertArtifactLinkInput = StudentScopedInput & {
  artifactName: string;
  artifactType: ArtifactType;
  linkUrl: string;
  uploadDate: string;
  owner: string;
  parentVisible: boolean;
};

export type UpsertAcademicUpdateInput = StudentScopedInput & {
  date: string;
  subjectPriority: string;
  gradeOrPredictedTrend: string;
  tutoringStatus: string;
  tutorNoteSummary: string;
  testPrepStatus?: string;
  parentVisible: boolean;
};

export type UpsertProfileUpdateInput = StudentScopedInput & {
  date: string;
  projectName: string;
  milestoneStatus: string;
  evidenceAdded: string;
  mentorNoteSummary: string;
  parentVisible: boolean;
};

export type UpsertTestingProfileInput = StudentScopedInput & {
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  strategyNote?: string;
};

export type UpsertStudentActivityInput = StudentScopedInput & {
  activityName: string;
  role: string;
  impactSummary: string;
  sortOrder?: number;
};

export type UpsertStudentCompetitionInput = StudentScopedInput & {
  competitionName: string;
  result: string;
  yearLabel: string;
  sortOrder?: number;
};

export type UpsertStudentSchoolTargetInput = StudentScopedInput & {
  schoolName: string;
  country: string;
  bucket: SchoolBucket;
  fitNote: string;
  sortOrder?: number;
};

export type UpsertFamilyCollegeStrategyProfileInput = {
  familyId: string;
  familySlug: string;
  currentSat?: number;
  projectedSat?: number;
  currentAct?: number;
  projectedAct?: number;
  intendedMajorCodes: string[];
  intendedMajorLabels: string[];
  strategyNote?: string;
};

export type CreateFamilyCollegeListInput = {
  familyId: string;
  familySlug: string;
  listName: string;
  setCurrent?: boolean;
  createdBy?: string;
};

export type UpsertFamilyCollegeListItemInput = {
  id?: string;
  familyId: string;
  familySlug: string;
  familyCollegeListId: string;
  scorecardSchoolId: number;
  schoolName: string;
  city: string;
  state: string;
  ownership: CollegeOwnership;
  studentSize?: number;
  admissionRate?: number;
  satAverage?: number;
  completionRate?: number;
  retentionRate?: number;
  averageNetPrice?: number;
  medianEarnings?: number;
  matchedProgramCodes: string[];
  matchedProgramLabels: string[];
  bucket: SchoolBucket;
  bucketSource: CollegeListBucketSource;
  fitScore: number;
  fitRationale: string;
  counselorNote?: string;
  sortOrder?: number;
};

export type UpdateFamilyCollegeListItemAssignmentInput = {
  id: string;
  familyId: string;
  familySlug: string;
  bucket: SchoolBucket;
  bucketSource: CollegeListBucketSource;
  fitScore: number;
  fitRationale: string;
  counselorNote?: string;
};
