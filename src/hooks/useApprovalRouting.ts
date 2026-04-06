import { supabase } from '@/integrations/supabase/client';
import type {
  ApprovalTask,
  ApprovalStatus,
  ContentType,
  SubmitterRole,
} from '@/types/ownership';

// ---------------------------------------------------------------------------
// Typed wrappers for the new approval_tasks table rows
// (not yet in the auto-generated types.ts)
// ---------------------------------------------------------------------------

interface ApprovalTaskInsert {
  career_id: string;
  course_id: string;
  submitted_by: string;
  submitter_role: SubmitterRole;
  content_type: ContentType;
  content_id: string;
  assigned_to: string;
}

interface ApprovalTaskRow {
  id: string;
  career_id: string;
  course_id: string | null;
  submitted_by: string;
  submitter_role: string;
  content_type: string;
  content_id: string;
  assigned_to: string;
  status: string;
  reassigned_by: string | null;
  reassigned_at: string | null;
  created_at: string;
  updated_at: string;
}

function toApprovalTask(row: ApprovalTaskRow): ApprovalTask {
  return {
    id: row.id,
    career_id: row.career_id,
    course_id: row.course_id,
    submitted_by: row.submitted_by,
    submitter_role: row.submitter_role as SubmitterRole,
    content_type: row.content_type as ContentType,
    content_id: row.content_id,
    assigned_to: row.assigned_to,
    status: row.status as ApprovalStatus,
    reassigned_by: row.reassigned_by,
    reassigned_at: row.reassigned_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// submitForApproval
// ---------------------------------------------------------------------------

interface SubmitParams {
  submittedBy: string;
  submitterRole: SubmitterRole;
  careerId: string;
  courseId: string;
  contentType: ContentType;
  contentId: string;
}

async function submitForApproval(params: SubmitParams): Promise<ApprovalTask> {
  const { submittedBy, submitterRole, careerId, courseId, contentType, contentId } = params;

  let assignedTo: string;

  if (submitterRole === 'senior_moderator') {
    // Find the super_moderator_id stored on the senior_mod's course_assignment row.
    const { data: caRow } = await supabase
      .from('course_assignments')
      .select('super_moderator_id')
      .eq('user_id', submittedBy)
      .eq('course_id', courseId)
      .eq('role', 'senior_moderator')
      .maybeSingle();

    const superModId = caRow?.super_moderator_id as string | null | undefined;

    if (superModId) {
      assignedTo = superModId;
    } else {
      // Fall back: look up career_assignments for this career
      const { data: careerAssign } = await supabase
        .from('career_assignments')
        .select('user_id')
        .eq('career_id', careerId)
        .maybeSingle();

      if (!careerAssign?.user_id) {
        throw new Error(
          `No super_moderator found for career ${careerId}. ` +
          'Run syncSeniorModeratorLinks to populate the link before submitting.',
        );
      }
      assignedTo = careerAssign.user_id as string;
    }
  } else {
    // submitterRole === 'moderator'
    const { data: modRow } = await supabase
      .from('course_assignments')
      .select('default_senior_moderator_id')
      .eq('user_id', submittedBy)
      .eq('course_id', courseId)
      .eq('role', 'moderator')
      .maybeSingle();

    const defaultSeniorModId = modRow?.default_senior_moderator_id as string | null | undefined;

    if (!defaultSeniorModId) {
      throw new Error(
        `No default senior moderator is set for moderator ${submittedBy} on course ${courseId}. ` +
        'Run syncModeratorLinks to populate the link before submitting.',
      );
    }
    assignedTo = defaultSeniorModId;
  }

  const insert: ApprovalTaskInsert = {
    career_id: careerId,
    course_id: courseId,
    submitted_by: submittedBy,
    submitter_role: submitterRole,
    content_type: contentType,
    content_id: contentId,
    assigned_to: assignedTo,
  };

  const { data, error } = await (supabase as ReturnType<typeof supabase.from> extends never
    ? never
    : typeof supabase)
    .from('approval_tasks')
    .insert(insert)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Failed to create approval task: no row returned.');

  return toApprovalTask(data as ApprovalTaskRow);
}

// ---------------------------------------------------------------------------
// reassignTask
// ---------------------------------------------------------------------------

interface ReassignParams {
  taskId: string;
  reassignedBy: string;
  reassignedByRole: 'super_moderator' | 'senior_moderator';
  newAssignee: string;
  careerId: string;
}

async function reassignTask(params: ReassignParams): Promise<ApprovalTask> {
  const { taskId, reassignedBy, reassignedByRole, newAssignee, careerId } = params;

  // Validate scope
  if (reassignedByRole === 'super_moderator') {
    const { data: scopeRow } = await supabase
      .from('career_assignments')
      .select('id')
      .eq('user_id', reassignedBy)
      .eq('career_id', careerId)
      .maybeSingle();

    if (!scopeRow) {
      throw new Error(`User ${reassignedBy} is not a super_moderator for career ${careerId}.`);
    }
  } else {
    // senior_moderator: must have a course_assignment in this career
    const { data: careersData } = await supabase
      .from('career_courses')
      .select('course_id')
      .eq('career_id', careerId)
      .is('deleted_at', null);

    const courseIds = (careersData ?? []).map((r: { course_id: string }) => r.course_id);

    if (courseIds.length === 0) {
      throw new Error(`No courses found for career ${careerId}.`);
    }

    const { data: scopeRow } = await supabase
      .from('course_assignments')
      .select('id')
      .eq('user_id', reassignedBy)
      .eq('role', 'senior_moderator')
      .in('course_id', courseIds)
      .maybeSingle();

    if (!scopeRow) {
      throw new Error(
        `User ${reassignedBy} is not a senior_moderator on any course in career ${careerId}.`,
      );
    }
  }

  const { data, error } = await (supabase as ReturnType<typeof supabase.from> extends never
    ? never
    : typeof supabase)
    .from('approval_tasks')
    .update({
      assigned_to: newAssignee,
      status: 'reassigned',
      reassigned_by: reassignedBy,
      reassigned_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Failed to reassign task: no row returned.');

  return toApprovalTask(data as ApprovalTaskRow);
}

// ---------------------------------------------------------------------------
// getEligibleReassignees
// ---------------------------------------------------------------------------

interface EligibleReassigneeParams {
  reassignerRole: 'super_moderator' | 'senior_moderator';
  careerId: string;
  courseId?: string;
  excludeUserId?: string;
}

interface Reassignee {
  id: string;
  full_name: string;
  role: string;
}

async function getEligibleReassignees(params: EligibleReassigneeParams): Promise<Reassignee[]> {
  const { reassignerRole, careerId, courseId, excludeUserId } = params;

  const results: Reassignee[] = [];

  // Fetch super_moderator(s) for this career
  const { data: superModRows } = await supabase
    .from('career_assignments')
    .select('user_id, profiles!career_assignments_user_id_fkey(full_name)')
    .eq('career_id', careerId);

  for (const row of superModRows ?? []) {
    const uid = row.user_id as string;
    if (uid === excludeUserId) continue;
    const profile = row.profiles as { full_name: string | null } | null;
    results.push({ id: uid, full_name: profile?.full_name ?? uid, role: 'super_moderator' });
  }

  if (reassignerRole === 'super_moderator') {
    // All senior_moderators across the career
    const { data: careerCourses } = await supabase
      .from('career_courses')
      .select('course_id')
      .eq('career_id', careerId)
      .is('deleted_at', null);

    const courseIds = (careerCourses ?? []).map((r: { course_id: string }) => r.course_id);

    if (courseIds.length > 0) {
      const { data: seniorRows } = await supabase
        .from('course_assignments')
        .select('user_id, profiles!course_assignments_user_id_fkey(full_name)')
        .eq('role', 'senior_moderator')
        .in('course_id', courseIds);

      const seen = new Set(results.map((r) => r.id));
      for (const row of seniorRows ?? []) {
        const uid = row.user_id as string;
        if (seen.has(uid) || uid === excludeUserId) continue;
        seen.add(uid);
        const profile = row.profiles as { full_name: string | null } | null;
        results.push({ id: uid, full_name: profile?.full_name ?? uid, role: 'senior_moderator' });
      }
    }
  } else {
    // senior_moderator: only same-course senior_mods + super_mod
    if (courseId) {
      const { data: seniorRows } = await supabase
        .from('course_assignments')
        .select('user_id, profiles!course_assignments_user_id_fkey(full_name)')
        .eq('role', 'senior_moderator')
        .eq('course_id', courseId);

      const seen = new Set(results.map((r) => r.id));
      for (const row of seniorRows ?? []) {
        const uid = row.user_id as string;
        if (seen.has(uid) || uid === excludeUserId) continue;
        seen.add(uid);
        const profile = row.profiles as { full_name: string | null } | null;
        results.push({ id: uid, full_name: profile?.full_name ?? uid, role: 'senior_moderator' });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// getTasksAssignedTo  (used by the Pending Approvals panel)
// ---------------------------------------------------------------------------

export interface ApprovalTaskWithMeta extends ApprovalTask {
  submitter_name: string;
  course_name: string | null;
}

async function getTasksAssignedTo(userId: string): Promise<ApprovalTaskWithMeta[]> {
  const { data, error } = await (supabase as ReturnType<typeof supabase.from> extends never
    ? never
    : typeof supabase)
    .from('approval_tasks')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as ApprovalTaskRow[];

  // Enrich with submitter name and course name in parallel
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [profileRes, courseRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row.submitted_by)
          .maybeSingle(),
        row.course_id
          ? supabase.from('courses').select('name').eq('id', row.course_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        ...toApprovalTask(row),
        submitter_name:
          (profileRes.data as { full_name: string | null } | null)?.full_name ??
          row.submitted_by,
        course_name: (courseRes.data as { name: string } | null)?.name ?? null,
      } satisfies ApprovalTaskWithMeta;
    }),
  );

  return enriched;
}

// ---------------------------------------------------------------------------
// Hook export
// ---------------------------------------------------------------------------

export function useApprovalRouting() {
  return {
    submitForApproval,
    reassignTask,
    getEligibleReassignees,
    getTasksAssignedTo,
  };
}
