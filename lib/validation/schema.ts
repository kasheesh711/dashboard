import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
const optionalNumericString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : undefined))
  .pipe(z.number().int().nonnegative().optional());
const optionalIntegerString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : undefined))
  .pipe(z.number().int().optional());
const optionalDecimalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : undefined))
  .pipe(z.number().optional());

export const studentCoreSchema = z.object({
  studentName: z.string().min(2),
  gradeLevel: z.string().min(2),
  pathway: z.enum(["us_college", "uk_college", "us_boarding", "uk_boarding"]),
  tier: z.string().min(2),
  currentPhase: z.string().min(2),
  overallStatus: z.enum(["green", "yellow", "red"]),
  statusReason: z.string().min(10),
});

export const familyWithStudentSchema = z.object({
  familyLabel: z.string().min(2),
  parentContactName: z.string().min(2),
  parentEmail: z.string().email(),
  strategistOwnerId: postgresUuidSchema.optional().or(z.literal("")),
  opsOwnerId: postgresUuidSchema.optional().or(z.literal("")),
  studentName: z.string().min(2),
  gradeLevel: z.string().min(2),
  pathway: z.enum(["us_college", "uk_college", "us_boarding", "uk_boarding"]),
  tier: z.string().min(2),
  currentPhase: z.string().min(2),
  overallStatus: z.enum(["green", "yellow", "red"]),
  statusReason: z.string().min(10),
  currentSat: optionalNumericString,
  projectedSat: optionalNumericString,
  currentAct: optionalNumericString,
  projectedAct: optionalNumericString,
  strategyNote: z.string().trim().optional(),
});

export const createStudentSchema = studentCoreSchema.extend({
  currentSat: optionalNumericString,
  projectedSat: optionalNumericString,
  currentAct: optionalNumericString,
  projectedAct: optionalNumericString,
  strategyNote: z.string().trim().optional(),
});

export const monthlySummarySchema = z.object({
  reportingMonth: isoDateSchema,
  biggestWin: z.string().min(10),
  biggestRisk: z.string().min(10),
  topNextActions: z.tuple([z.string().min(3), z.string().min(3), z.string().min(3)]),
  parentVisibleSummary: z.string().min(20),
  internalSummaryNotes: z.string().min(10),
});

export const taskSchema = z.object({
  itemName: z.string().min(3),
  category: z.enum(["application", "testing", "academics", "project", "admin"]),
  owner: z.string().min(2),
  dueDate: isoDateSchema,
  status: z.enum(["not_started", "in_progress", "blocked", "done", "overdue"]),
  dependencyNotes: z.string().optional(),
  parentVisible: z.boolean(),
});

export const noteSchema = z.object({
  date: isoDateSchema,
  authorRole: z.enum(["strategist", "ops", "tutor_input", "mentor_input"]),
  noteType: z.string().min(2),
  summary: z.string().min(5),
  body: z.string().min(10),
  visibility: z.enum(["internal", "parent"]),
});

export const artifactLinkSchema = z.object({
  artifactName: z.string().min(3),
  artifactType: z.enum(["drive_folder", "doc", "sheet", "slide", "external_link"]),
  linkUrl: z.string().url(),
  uploadDate: isoDateSchema,
  owner: z.string().min(2),
  parentVisible: z.boolean(),
});

export const decisionSchema = z.object({
  date: isoDateSchema,
  decisionType: z.string().min(3),
  summary: z.string().min(10),
  owner: z.string().min(2),
  pendingFamilyInput: z.boolean(),
  status: z.enum(["pending", "resolved"]),
  parentVisible: z.boolean(),
});

export const academicUpdateSchema = z.object({
  date: isoDateSchema,
  subjectPriority: z.string().min(3),
  gradeOrPredictedTrend: z.string().min(3),
  tutoringStatus: z.string().min(3),
  tutorNoteSummary: z.string().min(10),
  testPrepStatus: z.string().optional(),
  parentVisible: z.boolean(),
});

export const profileUpdateSchema = z.object({
  date: isoDateSchema,
  projectName: z.string().min(3),
  milestoneStatus: z.string().min(3),
  evidenceAdded: z.string().min(3),
  mentorNoteSummary: z.string().min(10),
  parentVisible: z.boolean(),
});

export const testingProfileSchema = z.object({
  currentSat: optionalNumericString,
  projectedSat: optionalNumericString,
  currentAct: optionalNumericString,
  projectedAct: optionalNumericString,
  strategyNote: z.string().trim().optional(),
});

export const studentActivitySchema = z.object({
  activityName: z.string().min(2),
  role: z.string().min(2),
  impactSummary: z.string().min(10),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const studentCompetitionSchema = z.object({
  competitionName: z.string().min(2),
  result: z.string().min(2),
  yearLabel: z.string().min(2),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const studentSchoolTargetSchema = z.object({
  schoolName: z.string().min(2),
  country: z.string().min(2),
  bucket: z.enum(["reach", "target", "likely"]),
  fitNote: z.string().min(5),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const familyCollegeStrategyProfileSchema = z.object({
  currentSat: optionalNumericString.refine((value) => value == null || value <= 1600, {
    message: "SAT must be 1600 or lower.",
  }),
  projectedSat: optionalNumericString.refine((value) => value == null || value <= 1600, {
    message: "Projected SAT must be 1600 or lower.",
  }),
  currentAct: optionalNumericString.refine((value) => value == null || value <= 36, {
    message: "ACT must be 36 or lower.",
  }),
  projectedAct: optionalNumericString.refine((value) => value == null || value <= 36, {
    message: "Projected ACT must be 36 or lower.",
  }),
  intendedMajorCodes: z.array(z.string().regex(/^\d{4}$/)).default([]),
  intendedMajorLabels: z.array(z.string().min(2)).default([]),
  strategyNote: z.string().trim().optional(),
});

export const familyCollegeListSchema = z.object({
  listName: z.string().min(2),
  setCurrent: z.boolean().optional(),
});

export const familyCollegeListItemSchema = z.object({
  scorecardSchoolId: z.coerce.number().int().positive(),
  schoolName: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  ownership: z.enum(["Public", "Private nonprofit", "Private for-profit", "Unknown"]),
  studentSize: z.coerce.number().int().nonnegative().optional(),
  admissionRate: z.coerce.number().min(0).max(1).optional(),
  satAverage: z.coerce.number().int().nonnegative().optional(),
  completionRate: z.coerce.number().min(0).max(1).optional(),
  retentionRate: z.coerce.number().min(0).max(1).optional(),
  averageNetPrice: z.coerce.number().nonnegative().optional(),
  medianEarnings: z.coerce.number().nonnegative().optional(),
  matchedProgramCodes: z.array(z.string()).default([]),
  matchedProgramLabels: z.array(z.string()).default([]),
  bucket: z.enum(["reach", "target", "likely"]),
  bucketSource: z.enum(["system", "counselor"]),
  fitScore: z.coerce.number().int().min(0).max(100),
  fitRationale: z.string().min(10),
  counselorNote: z.string().trim().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const collegeSearchFiltersSchema = z.object({
  familySlug: z.string().trim().optional(),
  query: z.string().trim().optional(),
  state: z.string().trim().max(2).optional(),
  city: z.string().trim().optional(),
  ownership: z
    .enum(["all", "Public", "Private nonprofit", "Private for-profit", "Unknown"])
    .optional(),
  sizeMin: optionalIntegerString,
  sizeMax: optionalIntegerString,
  admissionRateMin: optionalIntegerString
    .transform((value) => (value == null ? undefined : value / 100))
    .pipe(z.number().min(0).max(1).optional()),
  admissionRateMax: optionalIntegerString
    .transform((value) => (value == null ? undefined : value / 100))
    .pipe(z.number().min(0).max(1).optional()),
  satMin: optionalIntegerString,
  satMax: optionalIntegerString,
  netPriceMax: optionalIntegerString,
  completionMin: optionalIntegerString
    .transform((value) => (value == null ? undefined : value / 100))
    .pipe(z.number().min(0).max(1).optional()),
  retentionMin: optionalIntegerString
    .transform((value) => (value == null ? undefined : value / 100))
    .pipe(z.number().min(0).max(1).optional()),
  earningsMin: optionalIntegerString,
  zip: z.string().trim().optional(),
  distance: z.string().trim().optional(),
  programCode: z.string().trim().regex(/^\d{4}$/).optional(),
  sort: z
    .enum([
      "name_asc",
      "admission_rate_asc",
      "admission_rate_desc",
      "sat_average_desc",
      "net_price_asc",
      "earnings_desc",
      "completion_desc",
      "size_desc",
    ])
    .optional(),
  page: z.coerce.number().int().min(0).optional(),
  perPage: z.coerce.number().int().min(1).max(20).optional(),
  selected: z.coerce.number().int().positive().optional(),
});

export const analyticsFiltersSchema = z.object({
  school: z.string().trim().optional(),
  schoolQuery: z.string().trim().optional(),
  major: z.string().trim().optional(),
  gpaMin: optionalDecimalString,
  gpaMax: optionalDecimalString,
  satMin: optionalIntegerString,
  satMax: optionalIntegerString,
  actMin: optionalIntegerString,
  actMax: optionalIntegerString,
  metric: z.enum(["sat", "act"]).optional(),
  outcome: z.enum(["all", "accepted", "rejected"]).optional(),
});
