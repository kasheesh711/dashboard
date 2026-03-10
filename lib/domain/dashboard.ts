import { format, isBefore, parseISO } from "date-fns";
import { demoFamilies } from "@/lib/domain/demo-data";
import type {
  AcademicUpdate,
  DashboardMetrics,
  DashboardSnapshot,
  DecisionLogItem,
  FamilyFilters,
  FamilyListItem,
  FamilyWorkspace,
  MonthlySummary,
  NoteItem,
  PortalCase,
  PortalStudentCase,
  ProfileUpdate,
  SchoolBucket,
  StudentCase,
  StudentListItem,
  StudentPortfolio,
  TaskComputedStatus,
  TaskItem,
} from "@/lib/domain/types";

export const REFERENCE_DATE = parseISO("2026-03-10");

const pathwayLabels: Record<StudentCase["pathway"], string> = {
  us_college: "US College",
  uk_college: "UK College",
  us_boarding: "US Boarding",
  uk_boarding: "UK Boarding",
};

const statusRank: Record<StudentCase["overallStatus"], number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

function sortByDateDesc<T extends { date?: string; reportingMonth?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const left = parseISO(a.date ?? a.reportingMonth ?? "1970-01-01").getTime();
    const right = parseISO(b.date ?? b.reportingMonth ?? "1970-01-01").getTime();
    return right - left;
  });
}

export function formatDisplayDate(value: string) {
  return format(parseISO(value), "MMM d, yyyy");
}

export function getCurrentReportingMonth() {
  return format(REFERENCE_DATE, "yyyy-MM-01");
}

export function computeTaskStatus(task: TaskItem): TaskComputedStatus {
  if (task.status === "overdue") return "overdue";
  if (task.status === "done") return "done";
  return isBefore(parseISO(task.dueDate), REFERENCE_DATE) ? "overdue" : task.status;
}

export function getLatestSummary(student: StudentCase): MonthlySummary | undefined {
  return sortByDateDesc(student.monthlySummaries)[0];
}

export function getSummaryHistory(student: StudentCase): MonthlySummary[] {
  return sortByDateDesc(student.monthlySummaries).slice(1);
}

export function getLatestAcademicUpdate(student: StudentCase): AcademicUpdate | undefined {
  return sortByDateDesc(student.academicUpdates.filter((item) => item.parentVisible))[0];
}

export function getLatestProfileUpdate(student: StudentCase): ProfileUpdate | undefined {
  return sortByDateDesc(student.profileUpdates.filter((item) => item.parentVisible))[0];
}

export function getOverdueTasks(student: StudentCase) {
  return student.tasks.filter((task) => computeTaskStatus(task) === "overdue");
}

export function getNextCriticalTask(student: StudentCase) {
  return [...student.tasks]
    .filter((task) => computeTaskStatus(task) !== "done")
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())[0];
}

function getSchoolBucketCounts(student: StudentCase): Record<SchoolBucket, number> {
  return student.schoolTargets.reduce<Record<SchoolBucket, number>>(
    (counts, item) => {
      counts[item.bucket] += 1;
      return counts;
    },
    { reach: 0, target: 0, likely: 0 },
  );
}

export function toStudentListItem(
  family: FamilyWorkspace,
  student: StudentCase,
): StudentListItem {
  const latestSummary = getLatestSummary(student);
  const nextTask = getNextCriticalTask(student);

  return {
    id: student.id,
    slug: student.slug,
    familyId: family.id,
    familySlug: family.slug,
    familyLabel: family.familyLabel,
    studentName: student.studentName,
    gradeLevel: student.gradeLevel,
    pathway: student.pathway,
    pathwayLabel: pathwayLabels[student.pathway],
    tier: student.tier,
    currentPhase: student.currentPhase,
    overallStatus: student.overallStatus,
    statusReason: student.statusReason,
    biggestRisk: latestSummary?.biggestRisk ?? "No monthly summary started yet.",
    nextCriticalDueDate: nextTask?.dueDate,
    lastUpdatedDate: student.lastUpdatedDate,
    pendingDecisionCount: student.decisionLogItems.filter((item) => item.pendingFamilyInput).length,
    overdueTaskCount: getOverdueTasks(student).length,
    currentSat: student.testingProfile?.currentSat,
    projectedSat: student.testingProfile?.projectedSat,
    schoolBucketCounts: getSchoolBucketCounts(student),
  };
}

function getFamilyOverallStatus(family: FamilyWorkspace): StudentCase["overallStatus"] {
  if (family.students.some((student) => student.overallStatus === "red")) return "red";
  if (family.students.some((student) => student.overallStatus === "yellow")) return "yellow";
  return "green";
}

function getFamilyNextCriticalDueDate(family: FamilyWorkspace) {
  return family.students
    .flatMap((student) => student.tasks)
    .filter((task) => computeTaskStatus(task) !== "done")
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())[0]?.dueDate;
}

function getFamilyBiggestRisk(family: FamilyWorkspace) {
  return family.students
    .map((student) => getLatestSummary(student)?.biggestRisk)
    .filter(Boolean)[0] ?? "No student summary started yet.";
}

export function toFamilyListItem(family: FamilyWorkspace): FamilyListItem {
  return {
    id: family.id,
    slug: family.slug,
    familyLabel: family.familyLabel,
    parentContactName: family.parentContactName,
    strategistOwnerName: family.strategistOwnerName,
    opsOwnerName: family.opsOwnerName,
    studentCount: family.students.length,
    studentNames: family.students.map((student) => student.studentName),
    activeStatuses: [...new Set(family.students.map((student) => student.overallStatus))],
    nextCriticalDueDate: getFamilyNextCriticalDueDate(family),
    biggestRisk: getFamilyBiggestRisk(family),
    lastUpdatedDate: family.lastUpdatedDate,
    pendingDecisionCount:
      family.students.flatMap((student) => student.decisionLogItems).filter((item) => item.pendingFamilyInput)
        .length + family.decisionLogItems.filter((item) => item.pendingFamilyInput).length,
    overdueTaskCount:
      family.students.flatMap((student) => getOverdueTasks(student)).length +
      family.tasks.filter((task) => computeTaskStatus(task) === "overdue").length,
  };
}

function matchesDeadlineWindow(student: StudentCase, deadlineWindow: FamilyFilters["deadlineWindow"]) {
  if (!deadlineWindow || deadlineWindow === "all") return true;

  if (deadlineWindow === "overdue") {
    return getOverdueTasks(student).length > 0;
  }

  const days = Number(deadlineWindow);
  const deadline = new Date(REFERENCE_DATE);
  deadline.setDate(deadline.getDate() + days);

  return student.tasks.some((task) => {
    if (computeTaskStatus(task) === "done") return false;
    const due = parseISO(task.dueDate).getTime();
    return due >= REFERENCE_DATE.getTime() && due <= deadline.getTime();
  });
}

export function filterFamilies(families: FamilyWorkspace[], filters: FamilyFilters = {}) {
  const search = filters.search?.trim().toLowerCase();

  return families
    .filter((family) => {
      if (search) {
        const matchesFamily =
          family.familyLabel.toLowerCase().includes(search) ||
          family.parentContactName.toLowerCase().includes(search) ||
          family.students.some((student) => student.studentName.toLowerCase().includes(search));

        if (!matchesFamily) return false;
      }
      if (filters.strategist && filters.strategist !== "all") {
        if (family.strategistOwnerName !== filters.strategist) return false;
      }
      if (filters.pathway && filters.pathway !== "all") {
        if (!family.students.some((student) => student.pathway === filters.pathway)) return false;
      }
      if (filters.status && filters.status !== "all") {
        if (!family.students.some((student) => student.overallStatus === filters.status)) return false;
      }
      if (!filters.deadlineWindow || filters.deadlineWindow === "all") return true;
      return family.students.some((student) => matchesDeadlineWindow(student, filters.deadlineWindow));
    })
    .sort((left, right) => {
      const statusDiff = statusRank[getFamilyOverallStatus(left)] - statusRank[getFamilyOverallStatus(right)];
      if (statusDiff !== 0) return statusDiff;

      const leftDate = getFamilyNextCriticalDueDate(left)
        ? parseISO(getFamilyNextCriticalDueDate(left) ?? "").getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightDate = getFamilyNextCriticalDueDate(right)
        ? parseISO(getFamilyNextCriticalDueDate(right) ?? "").getTime()
        : Number.MAX_SAFE_INTEGER;

      if (leftDate !== rightDate) return leftDate - rightDate;
      return left.familyLabel.localeCompare(right.familyLabel);
    });
}

function listStudents(families: FamilyWorkspace[]) {
  return families.flatMap((family) => family.students.map((student) => ({ family, student })));
}

function compareStudentPriority(
  left: { family: FamilyWorkspace; student: StudentCase },
  right: { family: FamilyWorkspace; student: StudentCase },
) {
  const leftItem = toStudentListItem(left.family, left.student);
  const rightItem = toStudentListItem(right.family, right.student);
  const statusDiff = statusRank[leftItem.overallStatus] - statusRank[rightItem.overallStatus];
  if (statusDiff !== 0) return statusDiff;

  const leftOverdue = leftItem.overdueTaskCount > 0 ? 0 : 1;
  const rightOverdue = rightItem.overdueTaskCount > 0 ? 0 : 1;
  if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue;

  const leftDate = leftItem.nextCriticalDueDate
    ? parseISO(leftItem.nextCriticalDueDate).getTime()
    : Number.MAX_SAFE_INTEGER;
  const rightDate = rightItem.nextCriticalDueDate
    ? parseISO(rightItem.nextCriticalDueDate).getTime()
    : Number.MAX_SAFE_INTEGER;
  if (leftDate !== rightDate) return leftDate - rightDate;

  return left.student.studentName.localeCompare(right.student.studentName);
}

function getSchoolFitRecommendation(student: StudentCase) {
  const current = student.testingProfile?.currentSat;
  const projected = student.testingProfile?.projectedSat;
  const counts = getSchoolBucketCounts(student);

  if (!projected && !current) {
    return "Add a testing baseline before expanding the school list.";
  }

  const bestScore = projected ?? current ?? 0;

  if (bestScore >= 1500) {
    return counts.reach < 3
      ? "Projected score supports adding one more ambitious reach."
      : "Keep the current reach mix and refine differentiation evidence.";
  }

  if (bestScore >= 1450) {
    return counts.target < 3
      ? "Projected score supports converting one likely into a stronger target."
      : "Keep the current spread and strengthen narrative fit notes.";
  }

  if (bestScore >= 1380) {
    return counts.likely < 2
      ? "Increase the likely bucket to protect the overall list."
      : "Hold the list steady and improve application evidence before adding reaches.";
  }

  return "Prioritize additional likely schools and reduce score-dependent reaches.";
}

export function getDashboardMetrics(families: FamilyWorkspace[]): DashboardMetrics {
  const students = listStudents(families).map((item) => item.student);
  const currentMonth = getCurrentReportingMonth();
  const allTasks = students.flatMap((student) => student.tasks);

  return {
    activeFamilies: families.length,
    activeStudents: students.length,
    urgentStudents: students.filter(
      (student) => student.overallStatus === "red" || getOverdueTasks(student).length > 0,
    ).length,
    overdueItems: allTasks.filter((task) => computeTaskStatus(task) === "overdue").length,
    parentVisibleDueSoon: allTasks.filter((task) => {
      if (!task.parentVisible || computeTaskStatus(task) === "done") return false;
      const due = parseISO(task.dueDate).getTime();
      const future = new Date(REFERENCE_DATE);
      future.setDate(future.getDate() + 14);
      return due >= REFERENCE_DATE.getTime() && due <= future.getTime();
    }).length,
    testingProfilesReady: students.filter((student) => Boolean(student.testingProfile)).length,
    schoolListsReady: students.filter((student) => student.schoolTargets.length >= 2).length,
    missingCurrentMonthSummary: students.filter(
      (student) => !student.monthlySummaries.some((summary) => summary.reportingMonth === currentMonth),
    ).length,
  };
}

export function buildDashboardSnapshot(families: FamilyWorkspace[]): DashboardSnapshot {
  const prioritizedStudents = listStudents(families).sort(compareStudentPriority);

  return {
    metrics: getDashboardMetrics(families),
    urgentStudents: prioritizedStudents.slice(0, 6).map(({ family, student }) => toStudentListItem(family, student)),
    upcomingTasks: prioritizedStudents
      .flatMap(({ family, student }) =>
        student.tasks.map((task) => ({
          familySlug: family.slug,
          studentSlug: student.slug,
          familyLabel: family.familyLabel,
          studentName: student.studentName,
          itemName: task.itemName,
          dueDate: task.dueDate,
          computedStatus: computeTaskStatus(task),
          parentVisible: task.parentVisible,
        })),
      )
      .filter((task) => task.computedStatus !== "done")
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
      .slice(0, 8),
    schoolFitInsights: prioritizedStudents.slice(0, 4).map(({ student }) => ({
      studentSlug: student.slug,
      studentName: student.studentName,
      currentSat: student.testingProfile?.currentSat,
      projectedSat: student.testingProfile?.projectedSat,
      recommendation: getSchoolFitRecommendation(student),
    })),
  };
}

function buildPortalStudentCase(student: StudentCase): PortalStudentCase {
  return {
    id: student.id,
    slug: student.slug,
    studentName: student.studentName,
    gradeLevel: student.gradeLevel,
    pathway: student.pathway,
    tier: student.tier,
    currentPhase: student.currentPhase,
    overallStatus: student.overallStatus,
    currentSummary: getLatestSummary(student),
    summaryHistory: getSummaryHistory(student),
    academicUpdate: getLatestAcademicUpdate(student),
    profileUpdate: getLatestProfileUpdate(student),
    tasks: student.tasks.filter((task) => task.parentVisible),
    decisions: student.decisionLogItems.filter((decision) => decision.parentVisible),
    artifactLinks: student.artifactLinks.filter((artifact) => artifact.parentVisible),
  };
}

function getPortalOverallStatus(family: FamilyWorkspace) {
  return getFamilyOverallStatus(family);
}

export function buildPortalCase(families: FamilyWorkspace[], slug?: string): PortalCase | null {
  const family =
    families.find((item) => item.slug === slug) ??
    [...families].sort((a, b) => a.familyLabel.localeCompare(b.familyLabel))[0];

  if (!family) return null;

  return {
    family: {
      slug: family.slug,
      familyLabel: family.familyLabel,
      parentContactName: family.parentContactName,
      overallStatus: getPortalOverallStatus(family),
    },
    students: family.students.map(buildPortalStudentCase),
    familyDecisions: family.decisionLogItems.filter((decision) => decision.parentVisible),
    familyArtifactLinks: family.artifactLinks.filter((artifact) => artifact.parentVisible),
    availableSlugs: families.map((item) => item.slug),
  };
}

export function buildStudentPortfolio(
  families: FamilyWorkspace[],
  slug: string,
): StudentPortfolio | null {
  for (const family of families) {
    const student = family.students.find((item) => item.slug === slug);
    if (student) {
      return {
        family: {
          id: family.id,
          slug: family.slug,
          familyLabel: family.familyLabel,
          parentContactName: family.parentContactName,
          strategistOwnerName: family.strategistOwnerName,
          opsOwnerName: family.opsOwnerName,
        },
        student,
        familyWideNotes: family.notes,
        familyWideDecisions: family.decisionLogItems,
        familyWideArtifacts: family.artifactLinks,
      };
    }
  }

  return null;
}

export function getDemoFamilies() {
  return demoFamilies;
}

export function getStudentBySlug(families: FamilyWorkspace[], slug: string) {
  return buildStudentPortfolio(families, slug)?.student ?? null;
}

export function getStudentScopedRecords<T extends { studentId?: string }>(
  items: T[],
  studentId: string,
) {
  return items.filter((item) => item.studentId === studentId);
}

export function getFamilyWideRecords<T extends { studentId?: string }>(items: T[]) {
  return items.filter((item) => !item.studentId);
}

export function buildMomentumSummary(student: StudentCase) {
  const summary = getLatestSummary(student);
  const nextTask = getNextCriticalTask(student);

  return {
    headline: summary ? summary.biggestWin : "Current month summary not started",
    detail: summary
      ? `${student.studentName} is ${student.overallStatus} with a current focus on ${summary.topNextActions[0].toLowerCase()}.`
      : `${student.studentName} does not have a current monthly summary yet.`,
    nextActionLabel: nextTask
      ? `${nextTask.itemName} due ${formatDisplayDate(nextTask.dueDate)}`
      : "No active deadline is currently logged.",
  };
}

export function getStudentCountsLabel(family: FamilyWorkspace) {
  return `${family.students.length} student${family.students.length === 1 ? "" : "s"}`;
}

export function getFamilyPendingItems(family: FamilyWorkspace): DecisionLogItem[] {
  return [
    ...family.decisionLogItems,
    ...family.students.flatMap((student) => student.decisionLogItems),
  ]
    .filter((item) => item.pendingFamilyInput)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getFamilyLatestNotes(family: FamilyWorkspace): NoteItem[] {
  return [...family.notes, ...family.students.flatMap((student) => student.notes)]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
}
