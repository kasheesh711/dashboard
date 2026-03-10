import {
  buildDashboardSnapshot,
  buildPortalCase,
  buildStudentPortfolio,
  filterFamilies,
  getDemoFamilies,
  toFamilyListItem,
} from "@/lib/domain/dashboard";
import type {
  AppRole,
  DashboardSnapshot,
  DecisionStatus,
  FamilyContact,
  FamilyFilters,
  FamilyWorkspace,
  NoteAuthorRole,
  NoteVisibility,
  PortalCase,
  StudentPortfolio,
  TaskCategory,
  TaskStatus,
} from "@/lib/domain/types";
import type { InternalAccess, PortalAccess } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RawProfileRef = {
  full_name: string;
};

type RawProfileJoin = RawProfileRef | RawProfileRef[] | null;

type RawFamilyContact = {
  id: string;
  full_name: string;
  email: string;
  relationship: string;
  is_primary: boolean;
  user_id?: string | null;
};

type RawStudentTestingProfile = {
  id: string;
  current_sat?: number | null;
  projected_sat?: number | null;
  current_act?: number | null;
  projected_act?: number | null;
  strategy_note?: string | null;
};

type RawStudentActivity = {
  id: string;
  activity_name: string;
  role: string;
  impact_summary: string;
  sort_order: number;
};

type RawStudentCompetition = {
  id: string;
  competition_name: string;
  result: string;
  year_label: string;
  sort_order: number;
};

type RawStudentSchoolTarget = {
  id: string;
  school_name: string;
  country: string;
  bucket: "reach" | "target" | "likely";
  fit_note: string;
  sort_order: number;
};

type RawStudentRecord = {
  id: string;
  family_id: string;
  slug: string;
  student_name: string;
  grade_level: string;
  pathway: FamilyWorkspace["students"][number]["pathway"];
  tier: string;
  current_phase: string;
  overall_status: FamilyWorkspace["students"][number]["overallStatus"];
  status_reason: string;
  created_date: string;
  last_updated_date: string;
  student_testing_profiles?: RawStudentTestingProfile[] | null;
  student_activity_items?: RawStudentActivity[] | null;
  student_competition_items?: RawStudentCompetition[] | null;
  student_school_targets?: RawStudentSchoolTarget[] | null;
};

type RawMonthlySummary = {
  id: string;
  student_id?: string | null;
  reporting_month: string;
  biggest_win: string;
  biggest_risk: string;
  top_next_action_1: string;
  top_next_action_2: string;
  top_next_action_3: string;
  parent_visible_summary: string;
  internal_summary_notes: string;
};

type RawAcademicUpdate = {
  id: string;
  student_id?: string | null;
  date: string;
  subject_priority: string;
  grade_or_predicted_trend: string;
  tutoring_status: string;
  tutor_note_summary: string;
  test_prep_status?: string | null;
  parent_visible: boolean;
};

type RawProfileUpdate = {
  id: string;
  student_id?: string | null;
  date: string;
  project_name: string;
  milestone_status: string;
  evidence_added: string;
  mentor_note_summary: string;
  parent_visible: boolean;
};

type RawTask = {
  id: string;
  student_id?: string | null;
  item_name: string;
  category: TaskCategory;
  owner: string;
  due_date: string;
  status: TaskStatus;
  dependency_notes?: string | null;
  parent_visible: boolean;
};

type RawDecisionLogItem = {
  id: string;
  student_id?: string | null;
  date: string;
  decision_type: string;
  summary: string;
  owner: string;
  pending_family_input: boolean;
  status: DecisionStatus;
  parent_visible: boolean;
};

type RawNote = {
  id: string;
  student_id?: string | null;
  date: string;
  author_role: NoteAuthorRole;
  note_type: string;
  summary: string;
  body: string;
  visibility: NoteVisibility;
};

type RawArtifactLink = {
  id: string;
  student_id?: string | null;
  artifact_name: string;
  artifact_type: FamilyWorkspace["artifactLinks"][number]["artifactType"];
  link_url: string;
  upload_date: string;
  owner: string;
  parent_visible: boolean;
};

type RawFamilyCollegeStrategyProfile = {
  id: string;
  family_id: string;
  current_sat?: number | null;
  projected_sat?: number | null;
  current_act?: number | null;
  projected_act?: number | null;
  intended_major_codes?: string[] | null;
  intended_major_labels?: string[] | null;
  strategy_note?: string | null;
};

type RawFamilyCollegeListItem = {
  id: string;
  family_college_list_id: string;
  scorecard_school_id: number;
  school_name: string;
  city: string;
  state: string;
  ownership: FamilyWorkspace["collegeLists"][number]["items"][number]["ownership"];
  student_size?: number | null;
  admission_rate?: number | null;
  sat_average?: number | null;
  completion_rate?: number | null;
  retention_rate?: number | null;
  average_net_price?: number | null;
  median_earnings?: number | null;
  matched_program_codes?: string[] | null;
  matched_program_labels?: string[] | null;
  bucket: FamilyWorkspace["collegeLists"][number]["items"][number]["bucket"];
  bucket_source: FamilyWorkspace["collegeLists"][number]["items"][number]["bucketSource"];
  fit_score: number;
  fit_rationale: string;
  counselor_note?: string | null;
  sort_order: number;
};

type RawFamilyCollegeList = {
  id: string;
  family_id: string;
  list_name: string;
  is_current: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  family_college_list_items?: RawFamilyCollegeListItem[] | null;
};

type RawFamilyRecord = {
  id: string;
  slug: string;
  student_name?: string | null;
  parent_contact_name: string;
  pathway?: FamilyWorkspace["students"][number]["pathway"] | null;
  tier?: string | null;
  strategist_owner_id?: string | null;
  ops_owner_id?: string | null;
  strategist?: RawProfileJoin;
  ops?: RawProfileJoin;
  current_phase?: string | null;
  overall_status?: FamilyWorkspace["students"][number]["overallStatus"] | null;
  status_reason?: string | null;
  created_date: string;
  last_updated_date: string;
  family_contacts?: RawFamilyContact[];
  students?: RawStudentRecord[] | null;
  monthly_summaries?: RawMonthlySummary[];
  academic_updates?: RawAcademicUpdate[];
  profile_updates?: RawProfileUpdate[];
  tasks?: RawTask[];
  decision_log_items?: RawDecisionLogItem[];
  notes?: RawNote[];
  artifact_links?: RawArtifactLink[];
  family_college_strategy_profiles?: RawFamilyCollegeStrategyProfile[] | null;
  family_college_lists?: RawFamilyCollegeList[] | null;
};

type ProfileOption = {
  id: string;
  full_name: string;
  profile_roles?: Array<{
    role: Extract<AppRole, "strategist" | "ops" | "parent">;
  }> | null;
};

function mapFamilyContacts(contacts: RawFamilyContact[] = []): FamilyContact[] {
  return contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.full_name,
    email: contact.email,
    relationship: contact.relationship,
    isPrimary: contact.is_primary,
    userId: contact.user_id ?? undefined,
  }));
}

function getProfileName(profile: RawProfileJoin | undefined, fallback: string) {
  if (!profile) return fallback;
  if (Array.isArray(profile)) {
    return profile[0]?.full_name ?? fallback;
  }
  return profile.full_name;
}

function mapMonthlySummary(item: RawMonthlySummary) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    reportingMonth: item.reporting_month,
    biggestWin: item.biggest_win,
    biggestRisk: item.biggest_risk,
    topNextActions: [item.top_next_action_1, item.top_next_action_2, item.top_next_action_3] as [
      string,
      string,
      string,
    ],
    parentVisibleSummary: item.parent_visible_summary,
    internalSummaryNotes: item.internal_summary_notes,
  };
}

function mapAcademicUpdate(item: RawAcademicUpdate) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    date: item.date,
    subjectPriority: item.subject_priority,
    gradeOrPredictedTrend: item.grade_or_predicted_trend,
    tutoringStatus: item.tutoring_status,
    tutorNoteSummary: item.tutor_note_summary,
    testPrepStatus: item.test_prep_status ?? undefined,
    parentVisible: item.parent_visible,
  };
}

function mapProfileUpdate(item: RawProfileUpdate) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    date: item.date,
    projectName: item.project_name,
    milestoneStatus: item.milestone_status,
    evidenceAdded: item.evidence_added,
    mentorNoteSummary: item.mentor_note_summary,
    parentVisible: item.parent_visible,
  };
}

function mapTask(item: RawTask) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    itemName: item.item_name,
    category: item.category,
    owner: item.owner,
    dueDate: item.due_date,
    status: item.status,
    dependencyNotes: item.dependency_notes ?? undefined,
    parentVisible: item.parent_visible,
  };
}

function mapDecision(item: RawDecisionLogItem) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    date: item.date,
    decisionType: item.decision_type,
    summary: item.summary,
    owner: item.owner,
    pendingFamilyInput: item.pending_family_input,
    status: item.status,
    parentVisible: item.parent_visible,
  };
}

function mapNote(item: RawNote) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    date: item.date,
    authorRole: item.author_role,
    noteType: item.note_type,
    summary: item.summary,
    body: item.body,
    visibility: item.visibility,
  };
}

function mapArtifact(item: RawArtifactLink) {
  return {
    id: item.id,
    studentId: item.student_id ?? undefined,
    artifactName: item.artifact_name,
    artifactType: item.artifact_type,
    linkUrl: item.link_url,
    uploadDate: item.upload_date,
    owner: item.owner,
    parentVisible: item.parent_visible,
  };
}

function mapCollegeStrategyProfile(item?: RawFamilyCollegeStrategyProfile | null) {
  if (!item) return undefined;

  return {
    id: item.id,
    familyId: item.family_id,
    currentSat: item.current_sat ?? undefined,
    projectedSat: item.projected_sat ?? undefined,
    currentAct: item.current_act ?? undefined,
    projectedAct: item.projected_act ?? undefined,
    intendedMajorCodes: item.intended_major_codes ?? [],
    intendedMajorLabels: item.intended_major_labels ?? [],
    strategyNote: item.strategy_note ?? undefined,
  };
}

function mapCollegeLists(lists: RawFamilyCollegeList[] = []) {
  return lists.map((list) => ({
    id: list.id,
    familyId: list.family_id,
    listName: list.list_name,
    isCurrent: list.is_current,
    createdBy: list.created_by ?? undefined,
    createdAt: list.created_at ?? undefined,
    updatedAt: list.updated_at ?? undefined,
    items: (list.family_college_list_items ?? [])
      .map((item) => ({
        id: item.id,
        familyCollegeListId: item.family_college_list_id,
        scorecardSchoolId: item.scorecard_school_id,
        schoolName: item.school_name,
        city: item.city,
        state: item.state,
        ownership: item.ownership,
        studentSize: item.student_size ?? undefined,
        admissionRate: item.admission_rate ?? undefined,
        satAverage: item.sat_average ?? undefined,
        completionRate: item.completion_rate ?? undefined,
        retentionRate: item.retention_rate ?? undefined,
        averageNetPrice: item.average_net_price ?? undefined,
        medianEarnings: item.median_earnings ?? undefined,
        matchedProgramCodes: item.matched_program_codes ?? [],
        matchedProgramLabels: item.matched_program_labels ?? [],
        bucket: item.bucket,
        bucketSource: item.bucket_source,
        fitScore: item.fit_score,
        fitRationale: item.fit_rationale,
        counselorNote: item.counselor_note ?? undefined,
        sortOrder: item.sort_order,
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
  }));
}

function mapFamilyRecord(record: RawFamilyRecord): FamilyWorkspace {
  const mappedMonthlySummaries = (record.monthly_summaries ?? []).map(mapMonthlySummary);
  const mappedAcademicUpdates = (record.academic_updates ?? []).map(mapAcademicUpdate);
  const mappedProfileUpdates = (record.profile_updates ?? []).map(mapProfileUpdate);
  const mappedTasks = (record.tasks ?? []).map(mapTask);
  const mappedDecisions = (record.decision_log_items ?? []).map(mapDecision);
  const mappedNotes = (record.notes ?? []).map(mapNote);
  const mappedArtifacts = (record.artifact_links ?? []).map(mapArtifact);

  const rawStudents = record.students ?? [];
  const mappedStudents =
    rawStudents.length > 0
      ? rawStudents.map((student) => ({
          id: student.id,
          familyId: record.id,
          familySlug: record.slug,
          slug: student.slug,
          studentName: student.student_name,
          gradeLevel: student.grade_level,
          pathway: student.pathway,
          tier: student.tier,
          currentPhase: student.current_phase,
          overallStatus: student.overall_status,
          statusReason: student.status_reason,
          createdDate: student.created_date,
          lastUpdatedDate: student.last_updated_date,
          testingProfile: student.student_testing_profiles?.[0]
            ? {
                id: student.student_testing_profiles[0].id,
                currentSat: student.student_testing_profiles[0].current_sat ?? undefined,
                projectedSat: student.student_testing_profiles[0].projected_sat ?? undefined,
                currentAct: student.student_testing_profiles[0].current_act ?? undefined,
                projectedAct: student.student_testing_profiles[0].projected_act ?? undefined,
                strategyNote: student.student_testing_profiles[0].strategy_note ?? undefined,
              }
            : undefined,
          activities: (student.student_activity_items ?? [])
            .map((item) => ({
              id: item.id,
              activityName: item.activity_name,
              role: item.role,
              impactSummary: item.impact_summary,
              sortOrder: item.sort_order,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder),
          competitions: (student.student_competition_items ?? [])
            .map((item) => ({
              id: item.id,
              competitionName: item.competition_name,
              result: item.result,
              yearLabel: item.year_label,
              sortOrder: item.sort_order,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder),
          schoolTargets: (student.student_school_targets ?? [])
            .map((item) => ({
              id: item.id,
              schoolName: item.school_name,
              country: item.country,
              bucket: item.bucket,
              fitNote: item.fit_note,
              sortOrder: item.sort_order,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder),
          monthlySummaries: mappedMonthlySummaries.filter((item) => item.studentId === student.id),
          academicUpdates: mappedAcademicUpdates.filter((item) => item.studentId === student.id),
          profileUpdates: mappedProfileUpdates.filter((item) => item.studentId === student.id),
          tasks: mappedTasks.filter((item) => item.studentId === student.id),
          decisionLogItems: mappedDecisions.filter((item) => item.studentId === student.id),
          notes: mappedNotes.filter((item) => item.studentId === student.id),
          artifactLinks: mappedArtifacts.filter((item) => item.studentId === student.id),
        }))
      : [
          {
            id: `legacy-${record.id}`,
            familyId: record.id,
            familySlug: record.slug,
            slug: record.student_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || record.slug,
            studentName: record.student_name ?? record.parent_contact_name,
            gradeLevel: "Grade 11",
            pathway: record.pathway ?? "us_college",
            tier: record.tier ?? "Core Pathway",
            currentPhase: record.current_phase ?? "Launch and roadmap",
            overallStatus: record.overall_status ?? "green",
            statusReason:
              record.status_reason ?? "Legacy family record imported without student-specific posture.",
            createdDate: record.created_date,
            lastUpdatedDate: record.last_updated_date,
            testingProfile: undefined,
            activities: [],
            competitions: [],
            schoolTargets: [],
            monthlySummaries: mappedMonthlySummaries,
            academicUpdates: mappedAcademicUpdates,
            profileUpdates: mappedProfileUpdates,
            tasks: mappedTasks,
            decisionLogItems: mappedDecisions,
            notes: mappedNotes,
            artifactLinks: mappedArtifacts,
          },
        ];

  return {
    id: record.id,
    slug: record.slug,
    familyLabel: record.parent_contact_name.includes("Family")
      ? record.parent_contact_name
      : `${record.parent_contact_name.split(" ").at(-1) ?? "Family"} Family`,
    legacyStudentName: record.student_name ?? undefined,
    parentContactName: record.parent_contact_name,
    strategistOwnerId: record.strategist_owner_id ?? undefined,
    opsOwnerId: record.ops_owner_id ?? undefined,
    strategistOwnerName: getProfileName(record.strategist, "Unassigned strategist"),
    opsOwnerName: getProfileName(record.ops, "Unassigned ops"),
    createdDate: record.created_date,
    lastUpdatedDate: record.last_updated_date,
    contacts: mapFamilyContacts(record.family_contacts),
    students: mappedStudents,
    monthlySummaries: mappedMonthlySummaries.filter((item) => !item.studentId),
    academicUpdates: mappedAcademicUpdates.filter((item) => !item.studentId),
    profileUpdates: mappedProfileUpdates.filter((item) => !item.studentId),
    tasks: mappedTasks.filter((item) => !item.studentId),
    decisionLogItems: mappedDecisions.filter((item) => !item.studentId),
    notes: mappedNotes.filter((item) => !item.studentId),
    artifactLinks: mappedArtifacts.filter((item) => !item.studentId),
    collegeStrategyProfile: mapCollegeStrategyProfile(record.family_college_strategy_profiles?.[0]),
    collegeLists: mapCollegeLists(record.family_college_lists ?? []),
  };
}

async function fetchLiveInternalFamilies(): Promise<FamilyWorkspace[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("families").select(`
      id,
      slug,
      student_name,
      parent_contact_name,
      pathway,
      tier,
      strategist_owner_id,
      ops_owner_id,
      current_phase,
      overall_status,
      status_reason,
      created_date,
      last_updated_date,
      strategist:profiles!families_strategist_owner_id_fkey(full_name),
      ops:profiles!families_ops_owner_id_fkey(full_name),
      family_contacts(id, full_name, email, relationship, is_primary, user_id),
      students(
        id,
        family_id,
        slug,
        student_name,
        grade_level,
        pathway,
        tier,
        current_phase,
        overall_status,
        status_reason,
        created_date,
        last_updated_date,
        student_testing_profiles(id, current_sat, projected_sat, current_act, projected_act, strategy_note),
        student_activity_items(id, activity_name, role, impact_summary, sort_order),
        student_competition_items(id, competition_name, result, year_label, sort_order),
        student_school_targets(id, school_name, country, bucket, fit_note, sort_order)
      ),
      monthly_summaries(id, student_id, reporting_month, biggest_win, biggest_risk, top_next_action_1, top_next_action_2, top_next_action_3, parent_visible_summary, internal_summary_notes),
      academic_updates(id, student_id, date, subject_priority, grade_or_predicted_trend, tutoring_status, tutor_note_summary, test_prep_status, parent_visible),
      profile_updates(id, student_id, date, project_name, milestone_status, evidence_added, mentor_note_summary, parent_visible),
      tasks(id, student_id, item_name, category, owner, due_date, status, dependency_notes, parent_visible),
      decision_log_items(id, student_id, date, decision_type, summary, owner, pending_family_input, status, parent_visible),
      notes(id, student_id, date, author_role, note_type, summary, body, visibility),
      artifact_links(id, student_id, artifact_name, artifact_type, link_url, upload_date, owner, parent_visible),
      family_college_strategy_profiles(id, family_id, current_sat, projected_sat, current_act, projected_act, intended_major_codes, intended_major_labels, strategy_note),
      family_college_lists(
        id,
        family_id,
        list_name,
        is_current,
        created_by,
        created_at,
        updated_at,
        family_college_list_items(
          id,
          family_college_list_id,
          scorecard_school_id,
          school_name,
          city,
          state,
          ownership,
          student_size,
          admission_rate,
          sat_average,
          completion_rate,
          retention_rate,
          average_net_price,
          median_earnings,
          matched_program_codes,
          matched_program_labels,
          bucket,
          bucket_source,
          fit_score,
          fit_rationale,
          counselor_note,
          sort_order
        )
      )
    `);

  if (error) throw error;

  return ((data ?? []) as unknown as RawFamilyRecord[]).map(mapFamilyRecord);
}

function filterFamiliesForActorScope(families: FamilyWorkspace[], actor?: InternalAccess) {
  if (!actor || actor.activeRole === "ops") {
    return families;
  }

  return families.filter((family) =>
    family.strategistOwnerId
      ? family.strategistOwnerId === actor.profileId
      : family.strategistOwnerName === actor.fullName,
  );
}

async function getInternalFamiliesSource(actor: InternalAccess) {
  if (!isSupabaseConfigured() || actor.mode === "demo") {
    return filterFamiliesForActorScope(getDemoFamilies(), actor);
  }

  const families = await fetchLiveInternalFamilies();
  return filterFamiliesForActorScope(families, actor);
}

async function getPortalFamiliesSource(access: PortalAccess) {
  if (!isSupabaseConfigured() || access.mode === "demo") {
    return getDemoFamilies();
  }

  const families = await fetchLiveInternalFamilies();
  if (!access.enabled || !access.profileId) return [];

  return families.filter((family) =>
    family.contacts.some((contact) => contact.userId === access.profileId),
  );
}

export async function getPreviewDashboardSnapshot() {
  return buildDashboardSnapshot(getDemoFamilies());
}

export async function listPreviewFamilies(filters: FamilyFilters = {}) {
  return filterFamilies(getDemoFamilies(), filters).map(toFamilyListItem);
}

export async function getInternalDashboardSnapshot(actor: InternalAccess): Promise<DashboardSnapshot> {
  const families = await getInternalFamiliesSource(actor);
  return buildDashboardSnapshot(families);
}

export async function listInternalFamilies(actor: InternalAccess, filters: FamilyFilters = {}) {
  const families = await getInternalFamiliesSource(actor);
  return filterFamilies(families, filters).map(toFamilyListItem);
}

export async function getInternalFamilyBySlug(actor: InternalAccess, slug: string) {
  const families = await getInternalFamiliesSource(actor);
  return families.find((family) => family.slug === slug) ?? null;
}

export async function getStudentPortfolioBySlug(
  actor: InternalAccess,
  slug: string,
): Promise<StudentPortfolio | null> {
  const families = await getInternalFamiliesSource(actor);
  return buildStudentPortfolio(families, slug);
}

export async function getInternalAssigneeOptions(actor: InternalAccess) {
  if (!isSupabaseConfigured() || actor.mode === "demo") {
    const families = getDemoFamilies();

    return {
      strategists: [...new Set(families.map((family) => family.strategistOwnerName))].map(
        (fullName, index) => ({
          id: `demo-strategist-${index + 1}`,
          fullName,
          role: "strategist" as const,
        }),
      ),
      ops: [...new Set(families.map((family) => family.opsOwnerName))].map((fullName, index) => ({
        id: `demo-ops-${index + 1}`,
        fullName,
        role: "ops" as const,
      })),
    };
  }

  if (actor.activeRole !== "ops") {
    return {
      strategists: actor.roles.includes("strategist")
        ? [
            {
              id: actor.profileId,
              fullName: actor.fullName,
              role: "strategist" as const,
            },
          ]
        : [],
      ops: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, profile_roles(role)")
    .order("full_name", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as ProfileOption[];
  const strategists = rows
    .filter((profile) => (profile.profile_roles ?? []).some((role) => role.role === "strategist"))
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      role: "strategist" as const,
    }));
  const ops = rows
    .filter((profile) => (profile.profile_roles ?? []).some((role) => role.role === "ops"))
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      role: "ops" as const,
    }));

  return {
    strategists,
    ops,
  };
}

export async function getParentPortalSnapshot(
  access: PortalAccess,
  slug?: string,
): Promise<PortalCase | null> {
  const families = await getPortalFamiliesSource(access);
  return buildPortalCase(families, slug);
}
