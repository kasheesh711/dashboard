"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import { isSupabaseConfigured } from "@/lib/auth/config";
import { requireInternalAccess } from "@/lib/auth/session";
import {
  createFamilyWithStudent,
  createStudent,
  createFamilyCollegeList,
  deleteFamilyCollegeListItem,
  setCurrentFamilyCollegeList,
  upsertAcademicUpdate,
  upsertArtifactLink,
  upsertDecision,
  updateFamilyCollegeListItemAssignment,
  upsertFamilyCollegeListItem,
  upsertFamilyCollegeStrategyProfile,
  upsertMonthlySummary,
  upsertNote,
  upsertProfileUpdate,
  upsertStudentActivity,
  upsertStudentCompetition,
  upsertStudentSchoolTarget,
  upsertTask,
  upsertTestingProfile,
} from "@/lib/db/mutations";
import { getInternalFamilyBySlug } from "@/lib/db/queries";
import {
  makeCollegeListItemInput,
  suggestCollegeBucket,
} from "@/lib/domain/college-scorecard";
import { getCip4Labels } from "@/lib/domain/cip4";
import {
  academicUpdateSchema,
  artifactLinkSchema,
  familyCollegeListItemSchema,
  familyCollegeListSchema,
  familyCollegeStrategyProfileSchema,
  createStudentSchema,
  decisionSchema,
  familyWithStudentSchema,
  monthlySummarySchema,
  noteSchema,
  profileUpdateSchema,
  studentActivitySchema,
  studentCompetitionSchema,
  studentSchoolTargetSchema,
  taskSchema,
  testingProfileSchema,
} from "@/lib/validation/schema";

function getStringValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function getBooleanValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function getStringValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function normalizeOptional(value: string) {
  return value.trim() ? value.trim() : undefined;
}

function getReturnPath(formData: FormData, fallback: string) {
  return normalizeOptional(getStringValue(formData.get("returnPath"))) ?? fallback;
}

function redirectWithMessage(path: string, type: "message" | "error", value: string) {
  redirect(`${path}?${type}=${encodeURIComponent(value)}`);
}

function formatValidationError(error: ZodError) {
  return error.issues[0]?.message ?? "Validation failed.";
}

async function requireWritableFamilyInScope(path: string, familySlug: string, familyId: string) {
  const actor = await requireInternalAccess(path);
  const family = await getInternalFamilyBySlug(actor, familySlug);

  if (!family || family.id !== familyId) {
    redirectWithMessage(path, "error", "Family access is not available in the current role.");
  }

  return actor;
}

function revalidateSharedPaths(familySlug: string, studentSlug?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/families");
  revalidatePath(`/families/${familySlug}`);
  if (studentSlug) {
    revalidatePath(`/students/${studentSlug}`);
  }
}

export async function createFamilyWithStudentAction(formData: FormData) {
  await requireInternalAccess("/families/new");

  if (!isSupabaseConfigured()) {
    redirectWithMessage("/families/new", "error", "Live Supabase is required for writes.");
  }

  try {
    const input = familyWithStudentSchema.parse({
      familyLabel: getStringValue(formData.get("familyLabel")),
      parentContactName: getStringValue(formData.get("parentContactName")),
      parentEmail: getStringValue(formData.get("parentEmail")),
      strategistOwnerId: getStringValue(formData.get("strategistOwnerId")),
      opsOwnerId: getStringValue(formData.get("opsOwnerId")),
      studentName: getStringValue(formData.get("studentName")),
      gradeLevel: getStringValue(formData.get("gradeLevel")),
      pathway: getStringValue(formData.get("pathway")),
      tier: getStringValue(formData.get("tier")),
      currentPhase: getStringValue(formData.get("currentPhase")),
      overallStatus: getStringValue(formData.get("overallStatus")),
      statusReason: getStringValue(formData.get("statusReason")),
      currentSat: getStringValue(formData.get("currentSat")),
      projectedSat: getStringValue(formData.get("projectedSat")),
      currentAct: getStringValue(formData.get("currentAct")),
      projectedAct: getStringValue(formData.get("projectedAct")),
      strategyNote: normalizeOptional(getStringValue(formData.get("strategyNote"))),
    });

    const actor = await requireInternalAccess("/families/new");
    const result = await createFamilyWithStudent({
      ...input,
      strategistOwnerId:
        actor.activeRole === "strategist"
          ? actor.profileId
          : normalizeOptional(input.strategistOwnerId ?? ""),
      opsOwnerId: normalizeOptional(input.opsOwnerId ?? ""),
    });

    revalidateSharedPaths(result.family.slug, result.student.slug);
    redirect(`/families/${result.family.slug}?message=${encodeURIComponent("Family and first student created.")}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof ZodError) {
      redirectWithMessage("/families/new", "error", formatValidationError(error));
    }

    const message = error instanceof Error ? error.message : "Unable to create family.";
    redirectWithMessage("/families/new", "error", message);
  }
}

export async function createStudentAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const path = getReturnPath(formData, `/students/new?family=${familySlug}`);
  await requireWritableFamilyInScope(path, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(path, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = createStudentSchema.parse({
      studentName: getStringValue(formData.get("studentName")),
      gradeLevel: getStringValue(formData.get("gradeLevel")),
      pathway: getStringValue(formData.get("pathway")),
      tier: getStringValue(formData.get("tier")),
      currentPhase: getStringValue(formData.get("currentPhase")),
      overallStatus: getStringValue(formData.get("overallStatus")),
      statusReason: getStringValue(formData.get("statusReason")),
      currentSat: getStringValue(formData.get("currentSat")),
      projectedSat: getStringValue(formData.get("projectedSat")),
      currentAct: getStringValue(formData.get("currentAct")),
      projectedAct: getStringValue(formData.get("projectedAct")),
      strategyNote: normalizeOptional(getStringValue(formData.get("strategyNote"))),
    });

    const student = await createStudent({
      familyId,
      familySlug,
      ...input,
    });

    revalidateSharedPaths(familySlug, student.slug);
    redirect(`/students/${student.slug}?message=${encodeURIComponent("Student created.")}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to create student.";
    redirectWithMessage(path, "error", message);
  }
}

function getScopedFormMeta(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const studentId = normalizeOptional(getStringValue(formData.get("studentId")));
  const studentSlug = normalizeOptional(getStringValue(formData.get("studentSlug")));
  const returnPath = getReturnPath(
    formData,
    studentSlug ? `/students/${studentSlug}` : `/families/${familySlug}`,
  );

  return { familySlug, familyId, studentId, studentSlug, returnPath };
}

export async function saveMonthlySummaryAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = monthlySummarySchema.parse({
      reportingMonth: getStringValue(formData.get("reportingMonth")),
      biggestWin: getStringValue(formData.get("biggestWin")),
      biggestRisk: getStringValue(formData.get("biggestRisk")),
      topNextActions: [
        getStringValue(formData.get("topNextAction1")),
        getStringValue(formData.get("topNextAction2")),
        getStringValue(formData.get("topNextAction3")),
      ],
      parentVisibleSummary: getStringValue(formData.get("parentVisibleSummary")),
      internalSummaryNotes: getStringValue(formData.get("internalSummaryNotes")),
    });

    await upsertMonthlySummary({
      id: normalizeOptional(getStringValue(formData.get("summaryId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Monthly summary saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save monthly summary.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveTaskAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = taskSchema.parse({
      itemName: getStringValue(formData.get("itemName")),
      category: getStringValue(formData.get("category")),
      owner: getStringValue(formData.get("owner")),
      dueDate: getStringValue(formData.get("dueDate")),
      status: getStringValue(formData.get("status")),
      dependencyNotes: normalizeOptional(getStringValue(formData.get("dependencyNotes"))),
      parentVisible: getBooleanValue(formData.get("parentVisible")),
    });

    await upsertTask({
      id: normalizeOptional(getStringValue(formData.get("taskId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Task saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save task.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveDecisionAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = decisionSchema.parse({
      date: getStringValue(formData.get("date")),
      decisionType: getStringValue(formData.get("decisionType")),
      summary: getStringValue(formData.get("summary")),
      owner: getStringValue(formData.get("owner")),
      pendingFamilyInput: getBooleanValue(formData.get("pendingFamilyInput")),
      status: getStringValue(formData.get("status")),
      parentVisible: getBooleanValue(formData.get("parentVisible")),
    });

    await upsertDecision({
      id: normalizeOptional(getStringValue(formData.get("decisionId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Decision saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save decision.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveNoteAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = noteSchema.parse({
      date: getStringValue(formData.get("date")),
      authorRole: getStringValue(formData.get("authorRole")),
      noteType: getStringValue(formData.get("noteType")),
      summary: getStringValue(formData.get("summary")),
      body: getStringValue(formData.get("body")),
      visibility: getStringValue(formData.get("visibility")),
    });

    await upsertNote({
      id: normalizeOptional(getStringValue(formData.get("noteId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Note saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save note.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveArtifactLinkAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = artifactLinkSchema.parse({
      artifactName: getStringValue(formData.get("artifactName")),
      artifactType: getStringValue(formData.get("artifactType")),
      linkUrl: getStringValue(formData.get("linkUrl")),
      uploadDate: getStringValue(formData.get("uploadDate")),
      owner: getStringValue(formData.get("owner")),
      parentVisible: getBooleanValue(formData.get("parentVisible")),
    });

    await upsertArtifactLink({
      id: normalizeOptional(getStringValue(formData.get("artifactId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Artifact link saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save artifact link.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveAcademicUpdateAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = academicUpdateSchema.parse({
      date: getStringValue(formData.get("date")),
      subjectPriority: getStringValue(formData.get("subjectPriority")),
      gradeOrPredictedTrend: getStringValue(formData.get("gradeOrPredictedTrend")),
      tutoringStatus: getStringValue(formData.get("tutoringStatus")),
      tutorNoteSummary: getStringValue(formData.get("tutorNoteSummary")),
      testPrepStatus: normalizeOptional(getStringValue(formData.get("testPrepStatus"))),
      parentVisible: getBooleanValue(formData.get("parentVisible")),
    });

    await upsertAcademicUpdate({
      id: normalizeOptional(getStringValue(formData.get("academicUpdateId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Academic update saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save academic update.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveProfileUpdateAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = profileUpdateSchema.parse({
      date: getStringValue(formData.get("date")),
      projectName: getStringValue(formData.get("projectName")),
      milestoneStatus: getStringValue(formData.get("milestoneStatus")),
      evidenceAdded: getStringValue(formData.get("evidenceAdded")),
      mentorNoteSummary: getStringValue(formData.get("mentorNoteSummary")),
      parentVisible: getBooleanValue(formData.get("parentVisible")),
    });

    await upsertProfileUpdate({
      id: normalizeOptional(getStringValue(formData.get("profileUpdateId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Profile update saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save profile update.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveTestingProfileAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = testingProfileSchema.parse({
      currentSat: getStringValue(formData.get("currentSat")),
      projectedSat: getStringValue(formData.get("projectedSat")),
      currentAct: getStringValue(formData.get("currentAct")),
      projectedAct: getStringValue(formData.get("projectedAct")),
      strategyNote: normalizeOptional(getStringValue(formData.get("strategyNote"))),
    });

    await upsertTestingProfile({
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Testing profile saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save testing profile.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveStudentActivityAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = studentActivitySchema.parse({
      activityName: getStringValue(formData.get("activityName")),
      role: getStringValue(formData.get("role")),
      impactSummary: getStringValue(formData.get("impactSummary")),
      sortOrder: normalizeOptional(getStringValue(formData.get("sortOrder"))),
    });

    await upsertStudentActivity({
      id: normalizeOptional(getStringValue(formData.get("activityId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Activity saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save activity.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveStudentCompetitionAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = studentCompetitionSchema.parse({
      competitionName: getStringValue(formData.get("competitionName")),
      result: getStringValue(formData.get("result")),
      yearLabel: getStringValue(formData.get("yearLabel")),
      sortOrder: normalizeOptional(getStringValue(formData.get("sortOrder"))),
    });

    await upsertStudentCompetition({
      id: normalizeOptional(getStringValue(formData.get("competitionId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "Competition saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save competition.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveStudentSchoolTargetAction(formData: FormData) {
  const meta = getScopedFormMeta(formData);
  await requireWritableFamilyInScope(meta.returnPath, meta.familySlug, meta.familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(meta.returnPath, "error", "Live Supabase is required for writes.");
  }

  try {
    const input = studentSchoolTargetSchema.parse({
      schoolName: getStringValue(formData.get("schoolName")),
      country: getStringValue(formData.get("country")),
      bucket: getStringValue(formData.get("bucket")),
      fitNote: getStringValue(formData.get("fitNote")),
      sortOrder: normalizeOptional(getStringValue(formData.get("sortOrder"))),
    });

    await upsertStudentSchoolTarget({
      id: normalizeOptional(getStringValue(formData.get("schoolTargetId"))),
      familyId: meta.familyId,
      familySlug: meta.familySlug,
      studentId: meta.studentId,
      studentSlug: meta.studentSlug,
      ...input,
    });

    revalidateSharedPaths(meta.familySlug, meta.studentSlug);
    redirectWithMessage(meta.returnPath, "message", "School target saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save school target.";
    redirectWithMessage(meta.returnPath, "error", message);
  }
}

export async function saveFamilyCollegeStrategyProfileAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    const intendedMajorCodes = getStringValues(formData, "intendedMajorCodes");
    const input = familyCollegeStrategyProfileSchema.parse({
      currentSat: getStringValue(formData.get("currentSat")),
      projectedSat: getStringValue(formData.get("projectedSat")),
      currentAct: getStringValue(formData.get("currentAct")),
      projectedAct: getStringValue(formData.get("projectedAct")),
      intendedMajorCodes,
      intendedMajorLabels: getCip4Labels(intendedMajorCodes),
      strategyNote: normalizeOptional(getStringValue(formData.get("strategyNote"))),
    });

    await upsertFamilyCollegeStrategyProfile({
      familyId,
      familySlug,
      ...input,
    });

    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "College strategy saved.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to save college strategy.";
    redirectWithMessage(returnPath, "error", message);
  }
}

export async function createFamilyCollegeListAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  const actor = await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    const input = familyCollegeListSchema.parse({
      listName: getStringValue(formData.get("listName")),
      setCurrent: getBooleanValue(formData.get("setCurrent")),
    });

    await createFamilyCollegeList({
      familyId,
      familySlug,
      listName: input.listName,
      setCurrent: input.setCurrent ?? true,
      createdBy: actor.profileId,
    });

    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "College list created.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to create college list.";
    redirectWithMessage(returnPath, "error", message);
  }
}

export async function setCurrentFamilyCollegeListAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const listId = getStringValue(formData.get("familyCollegeListId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    await setCurrentFamilyCollegeList(familyId, listId);
    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "Current college list updated.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof Error ? error.message : "Unable to update the current college list.";
    redirectWithMessage(returnPath, "error", message);
  }
}

function parseFamilyCollegeListItemForm(formData: FormData) {
  return familyCollegeListItemSchema.parse({
    scorecardSchoolId: getStringValue(formData.get("scorecardSchoolId")),
    schoolName: getStringValue(formData.get("schoolName")),
    city: getStringValue(formData.get("city")),
    state: getStringValue(formData.get("state")),
    ownership: getStringValue(formData.get("ownership")),
    studentSize: normalizeOptional(getStringValue(formData.get("studentSize"))),
    admissionRate: normalizeOptional(getStringValue(formData.get("admissionRate"))),
    satAverage: normalizeOptional(getStringValue(formData.get("satAverage"))),
    completionRate: normalizeOptional(getStringValue(formData.get("completionRate"))),
    retentionRate: normalizeOptional(getStringValue(formData.get("retentionRate"))),
    averageNetPrice: normalizeOptional(getStringValue(formData.get("averageNetPrice"))),
    medianEarnings: normalizeOptional(getStringValue(formData.get("medianEarnings"))),
    matchedProgramCodes: getStringValues(formData, "matchedProgramCodes"),
    matchedProgramLabels: getStringValues(formData, "matchedProgramLabels"),
    bucket: getStringValue(formData.get("bucket")),
    bucketSource: getStringValue(formData.get("bucketSource")),
    fitScore: getStringValue(formData.get("fitScore")),
    fitRationale: getStringValue(formData.get("fitRationale")),
    counselorNote: normalizeOptional(getStringValue(formData.get("counselorNote"))),
    sortOrder: normalizeOptional(getStringValue(formData.get("sortOrder"))),
  });
}

export async function addFamilyCollegeListItemAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const familyCollegeListId = getStringValue(formData.get("familyCollegeListId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  const actor = await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    const family = await getInternalFamilyBySlug(actor, familySlug);
    if (!family) {
      throw new Error("Family was not found for this college list action.");
    }

    const baseInput = parseFamilyCollegeListItemForm(formData);
    const school = {
      scorecardSchoolId: baseInput.scorecardSchoolId,
      schoolName: baseInput.schoolName,
      city: baseInput.city,
      state: baseInput.state,
      ownership: baseInput.ownership,
      studentSize: baseInput.studentSize,
      admissionRate: baseInput.admissionRate,
      satAverage: baseInput.satAverage,
      completionRate: baseInput.completionRate,
      retentionRate: baseInput.retentionRate,
      averageNetPrice: baseInput.averageNetPrice,
      medianEarnings: baseInput.medianEarnings,
      matchedPrograms: baseInput.matchedProgramCodes.map((code, index) => ({
        code,
        title: baseInput.matchedProgramLabels[index] ?? code,
      })),
    };

    const suggestion = suggestCollegeBucket(family.collegeStrategyProfile, school);
    const sortOrder =
      family.collegeLists.find((list) => list.id === familyCollegeListId)?.items.length ?? 0;

    await upsertFamilyCollegeListItem({
      familyId,
      familySlug,
      ...makeCollegeListItemInput(familyCollegeListId, school, suggestion, sortOrder),
    });

    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "School added to the current list.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to add school to the list.";
    redirectWithMessage(returnPath, "error", message);
  }
}

export async function updateFamilyCollegeListItemAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const itemId = getStringValue(formData.get("familyCollegeListItemId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    const input = parseFamilyCollegeListItemForm(formData);

    await updateFamilyCollegeListItemAssignment({
      id: itemId,
      familyId,
      familySlug,
      bucket: input.bucket,
      bucketSource: input.bucketSource,
      fitScore: input.fitScore,
      fitRationale: input.fitRationale,
      counselorNote: input.counselorNote,
    });

    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "College list item updated.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message =
      error instanceof ZodError
        ? formatValidationError(error)
        : error instanceof Error
          ? error.message
          : "Unable to update the college list item.";
    redirectWithMessage(returnPath, "error", message);
  }
}

export async function removeFamilyCollegeListItemAction(formData: FormData) {
  const familySlug = getStringValue(formData.get("familySlug"));
  const familyId = getStringValue(formData.get("familyId"));
  const itemId = getStringValue(formData.get("familyCollegeListItemId"));
  const returnPath = getReturnPath(formData, `/families/${familySlug}`);
  await requireWritableFamilyInScope(returnPath, familySlug, familyId);

  if (!isSupabaseConfigured()) {
    redirectWithMessage(returnPath, "error", "Live Supabase is required for college-list writes.");
  }

  try {
    await deleteFamilyCollegeListItem(itemId);
    revalidateSharedPaths(familySlug);
    redirectWithMessage(returnPath, "message", "School removed from the list.");
  } catch (error) {
    if (isRedirectError(error)) throw error;

    const message = error instanceof Error ? error.message : "Unable to remove school.";
    redirectWithMessage(returnPath, "error", message);
  }
}
