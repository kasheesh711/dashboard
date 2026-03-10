import {
  type CreateFamilyWithStudentInput,
  type CreateStudentInput,
  type UpsertAcademicUpdateInput,
  type UpsertArtifactLinkInput,
  type CreateFamilyCollegeListInput,
  type UpsertDecisionInput,
  type UpdateFamilyCollegeListItemAssignmentInput,
  type UpsertFamilyCollegeListItemInput,
  type UpsertFamilyCollegeStrategyProfileInput,
  type UpsertMonthlySummaryInput,
  type UpsertNoteInput,
  type UpsertProfileUpdateInput,
  type UpsertStudentActivityInput,
  type UpsertStudentCompetitionInput,
  type UpsertStudentSchoolTargetInput,
  type UpsertTaskInput,
  type UpsertTestingProfileInput,
} from "@/lib/domain/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

async function maybeUpsertTestingProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  studentId: string,
  input: {
    currentSat?: number;
    projectedSat?: number;
    currentAct?: number;
    projectedAct?: number;
    strategyNote?: string;
  },
) {
  if (
    input.currentSat == null &&
    input.projectedSat == null &&
    input.currentAct == null &&
    input.projectedAct == null &&
    !input.strategyNote
  ) {
    return;
  }

  const payload = {
    student_id: studentId,
    current_sat: input.currentSat ?? null,
    projected_sat: input.projectedSat ?? null,
    current_act: input.currentAct ?? null,
    projected_act: input.projectedAct ?? null,
    strategy_note: input.strategyNote || null,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("student_testing_profiles")
    .select("id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const query = existing
    ? supabase.from("student_testing_profiles").update(payload).eq("id", existing.id)
    : supabase.from("student_testing_profiles").insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function createFamilyWithStudent(input: CreateFamilyWithStudentInput) {
  const supabase = await createSupabaseServerClient();
  const familySlug = slugify(input.familyLabel) || `family-${Date.now()}`;
  const studentSlug = slugify(input.studentName) || `student-${Date.now()}`;

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({
      slug: familySlug,
      student_name: input.studentName,
      parent_contact_name: input.parentContactName,
      pathway: input.pathway,
      tier: input.tier,
      strategist_owner_id: input.strategistOwnerId || null,
      ops_owner_id: input.opsOwnerId || null,
      current_phase: input.currentPhase,
      overall_status: input.overallStatus,
      status_reason: input.statusReason,
      created_date: currentDate(),
      last_updated_date: currentDate(),
    })
    .select("id, slug")
    .single();

  if (familyError || !family) {
    throw familyError ?? new Error("Unable to create family.");
  }

  const { error: contactError } = await supabase.from("family_contacts").insert({
    family_id: family.id,
    full_name: input.parentContactName,
    email: input.parentEmail,
    relationship: "Parent",
    is_primary: true,
  });

  if (contactError) throw contactError;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      family_id: family.id,
      slug: studentSlug,
      student_name: input.studentName,
      grade_level: input.gradeLevel,
      pathway: input.pathway,
      tier: input.tier,
      current_phase: input.currentPhase,
      overall_status: input.overallStatus,
      status_reason: input.statusReason,
      created_date: currentDate(),
      last_updated_date: currentDate(),
    })
    .select("id, slug")
    .single();

  if (studentError || !student) {
    throw studentError ?? new Error("Unable to create first student.");
  }

  await maybeUpsertTestingProfile(supabase, student.id, {
    currentSat: input.currentSat,
    projectedSat: input.projectedSat,
    currentAct: input.currentAct,
    projectedAct: input.projectedAct,
    strategyNote: input.strategyNote,
  });

  return { family, student };
}

export async function createStudent(input: CreateStudentInput) {
  const supabase = await createSupabaseServerClient();
  const studentSlug = slugify(input.studentName) || `student-${Date.now()}`;

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      family_id: input.familyId,
      slug: studentSlug,
      student_name: input.studentName,
      grade_level: input.gradeLevel,
      pathway: input.pathway,
      tier: input.tier,
      current_phase: input.currentPhase,
      overall_status: input.overallStatus,
      status_reason: input.statusReason,
      created_date: currentDate(),
      last_updated_date: currentDate(),
    })
    .select("id, slug")
    .single();

  if (error || !student) {
    throw error ?? new Error("Unable to create student.");
  }

  await maybeUpsertTestingProfile(supabase, student.id, {
    currentSat: input.currentSat,
    projectedSat: input.projectedSat,
    currentAct: input.currentAct,
    projectedAct: input.projectedAct,
    strategyNote: input.strategyNote,
  });

  const { error: familyTouchError } = await supabase
    .from("families")
    .update({ last_updated_date: currentDate() })
    .eq("id", input.familyId);

  if (familyTouchError) throw familyTouchError;

  return student;
}

export async function upsertMonthlySummary(input: UpsertMonthlySummaryInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    reporting_month: input.reportingMonth,
    biggest_win: input.biggestWin,
    biggest_risk: input.biggestRisk,
    top_next_action_1: input.topNextActions[0],
    top_next_action_2: input.topNextActions[1],
    top_next_action_3: input.topNextActions[2],
    parent_visible_summary: input.parentVisibleSummary,
    internal_summary_notes: input.internalSummaryNotes,
  };

  const query = input.id
    ? supabase.from("monthly_summaries").update(payload).eq("id", input.id)
    : supabase.from("monthly_summaries").insert(payload);
  const { error } = await query;

  if (error) throw error;
}

export async function upsertTask(input: UpsertTaskInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    item_name: input.itemName,
    category: input.category,
    owner: input.owner,
    due_date: input.dueDate,
    status: input.status,
    dependency_notes: input.dependencyNotes || null,
    parent_visible: input.parentVisible,
  };

  const query = input.id
    ? supabase.from("tasks").update(payload).eq("id", input.id)
    : supabase.from("tasks").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertDecision(input: UpsertDecisionInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    date: input.date,
    decision_type: input.decisionType,
    summary: input.summary,
    owner: input.owner,
    pending_family_input: input.pendingFamilyInput,
    status: input.status,
    parent_visible: input.parentVisible,
  };

  const query = input.id
    ? supabase.from("decision_log_items").update(payload).eq("id", input.id)
    : supabase.from("decision_log_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertNote(input: UpsertNoteInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    date: input.date,
    author_role: input.authorRole,
    note_type: input.noteType,
    summary: input.summary,
    body: input.body,
    visibility: input.visibility,
  };

  const query = input.id
    ? supabase.from("notes").update(payload).eq("id", input.id)
    : supabase.from("notes").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertArtifactLink(input: UpsertArtifactLinkInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    artifact_name: input.artifactName,
    artifact_type: input.artifactType,
    link_url: input.linkUrl,
    upload_date: input.uploadDate,
    owner: input.owner,
    parent_visible: input.parentVisible,
  };

  const query = input.id
    ? supabase.from("artifact_links").update(payload).eq("id", input.id)
    : supabase.from("artifact_links").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertAcademicUpdate(input: UpsertAcademicUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    date: input.date,
    subject_priority: input.subjectPriority,
    grade_or_predicted_trend: input.gradeOrPredictedTrend,
    tutoring_status: input.tutoringStatus,
    tutor_note_summary: input.tutorNoteSummary,
    test_prep_status: input.testPrepStatus || null,
    parent_visible: input.parentVisible,
  };

  const query = input.id
    ? supabase.from("academic_updates").update(payload).eq("id", input.id)
    : supabase.from("academic_updates").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertProfileUpdate(input: UpsertProfileUpdateInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    student_id: input.studentId || null,
    date: input.date,
    project_name: input.projectName,
    milestone_status: input.milestoneStatus,
    evidence_added: input.evidenceAdded,
    mentor_note_summary: input.mentorNoteSummary,
    parent_visible: input.parentVisible,
  };

  const query = input.id
    ? supabase.from("profile_updates").update(payload).eq("id", input.id)
    : supabase.from("profile_updates").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertTestingProfile(input: UpsertTestingProfileInput) {
  if (!input.studentId) {
    throw new Error("Testing profiles require a student.");
  }

  const supabase = await createSupabaseServerClient();
  await maybeUpsertTestingProfile(supabase, input.studentId, input);
}

export async function upsertStudentActivity(input: UpsertStudentActivityInput) {
  if (!input.studentId) {
    throw new Error("Activities require a student.");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    student_id: input.studentId,
    activity_name: input.activityName,
    role: input.role,
    impact_summary: input.impactSummary,
    sort_order: input.sortOrder ?? 0,
  };

  const query = input.id
    ? supabase.from("student_activity_items").update(payload).eq("id", input.id)
    : supabase.from("student_activity_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertStudentCompetition(input: UpsertStudentCompetitionInput) {
  if (!input.studentId) {
    throw new Error("Competitions require a student.");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    student_id: input.studentId,
    competition_name: input.competitionName,
    result: input.result,
    year_label: input.yearLabel,
    sort_order: input.sortOrder ?? 0,
  };

  const query = input.id
    ? supabase.from("student_competition_items").update(payload).eq("id", input.id)
    : supabase.from("student_competition_items").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertStudentSchoolTarget(input: UpsertStudentSchoolTargetInput) {
  if (!input.studentId) {
    throw new Error("School targets require a student.");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    student_id: input.studentId,
    school_name: input.schoolName,
    country: input.country,
    bucket: input.bucket,
    fit_note: input.fitNote,
    sort_order: input.sortOrder ?? 0,
  };

  const query = input.id
    ? supabase.from("student_school_targets").update(payload).eq("id", input.id)
    : supabase.from("student_school_targets").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertFamilyCollegeStrategyProfile(
  input: UpsertFamilyCollegeStrategyProfileInput,
) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_id: input.familyId,
    current_sat: input.currentSat ?? null,
    projected_sat: input.projectedSat ?? null,
    current_act: input.currentAct ?? null,
    projected_act: input.projectedAct ?? null,
    intended_major_codes: input.intendedMajorCodes,
    intended_major_labels: input.intendedMajorLabels,
    strategy_note: input.strategyNote ?? null,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("family_college_strategy_profiles")
    .select("id")
    .eq("family_id", input.familyId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const query = existing
    ? supabase.from("family_college_strategy_profiles").update(payload).eq("id", existing.id)
    : supabase.from("family_college_strategy_profiles").insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function createFamilyCollegeList(input: CreateFamilyCollegeListInput) {
  const supabase = await createSupabaseServerClient();

  if (input.setCurrent) {
    const { error: unsetError } = await supabase
      .from("family_college_lists")
      .update({ is_current: false })
      .eq("family_id", input.familyId);

    if (unsetError) throw unsetError;
  }

  const { data, error } = await supabase
    .from("family_college_lists")
    .insert({
      family_id: input.familyId,
      list_name: input.listName,
      is_current: input.setCurrent ?? true,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create family college list.");
  }

  return data.id;
}

export async function setCurrentFamilyCollegeList(familyId: string, listId: string) {
  const supabase = await createSupabaseServerClient();
  const { error: unsetError } = await supabase
    .from("family_college_lists")
    .update({ is_current: false })
    .eq("family_id", familyId);

  if (unsetError) throw unsetError;

  const { error } = await supabase
    .from("family_college_lists")
    .update({ is_current: true })
    .eq("id", listId)
    .eq("family_id", familyId);

  if (error) throw error;
}

export async function upsertFamilyCollegeListItem(input: UpsertFamilyCollegeListItemInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    family_college_list_id: input.familyCollegeListId,
    scorecard_school_id: input.scorecardSchoolId,
    school_name: input.schoolName,
    city: input.city,
    state: input.state,
    ownership: input.ownership,
    student_size: input.studentSize ?? null,
    admission_rate: input.admissionRate ?? null,
    sat_average: input.satAverage ?? null,
    completion_rate: input.completionRate ?? null,
    retention_rate: input.retentionRate ?? null,
    average_net_price: input.averageNetPrice ?? null,
    median_earnings: input.medianEarnings ?? null,
    matched_program_codes: input.matchedProgramCodes,
    matched_program_labels: input.matchedProgramLabels,
    bucket: input.bucket,
    bucket_source: input.bucketSource,
    fit_score: input.fitScore,
    fit_rationale: input.fitRationale,
    counselor_note: input.counselorNote ?? null,
    sort_order: input.sortOrder ?? 0,
  };

  const { data: existing, error: fetchError } = await supabase
    .from("family_college_list_items")
    .select("id")
    .eq("family_college_list_id", input.familyCollegeListId)
    .eq("scorecard_school_id", input.scorecardSchoolId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const query = input.id
    ? supabase.from("family_college_list_items").update(payload).eq("id", input.id)
    : existing
      ? supabase.from("family_college_list_items").update(payload).eq("id", existing.id)
      : supabase.from("family_college_list_items").insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function updateFamilyCollegeListItemAssignment(
  input: UpdateFamilyCollegeListItemAssignmentInput,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("family_college_list_items")
    .update({
      bucket: input.bucket,
      bucket_source: input.bucketSource,
      fit_score: input.fitScore,
      fit_rationale: input.fitRationale,
      counselor_note: input.counselorNote ?? null,
    })
    .eq("id", input.id);

  if (error) throw error;
}

export async function deleteFamilyCollegeListItem(id: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("family_college_list_items").delete().eq("id", id);
  if (error) throw error;
}
