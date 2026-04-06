/**
 * ownershipSyncService
 *
 * Keeps the denormalized routing columns on course_assignments in sync
 * whenever an assignment changes in the admin panel.
 *
 * Columns kept in sync:
 *   course_assignments.super_moderator_id          – the career's super_mod user id
 *   course_assignments.default_senior_moderator_id – earliest-assigned senior_mod for that course
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// syncModeratorLinks
// Called when a moderator is assigned to a course.
// ---------------------------------------------------------------------------

interface SyncModeratorLinksParams {
  moderatorId: string;
  courseId: string;
}

export async function syncModeratorLinks(params: SyncModeratorLinksParams): Promise<void> {
  const { moderatorId, courseId } = params;

  // 1. Find the career for this course
  const { data: careerCourse } = await supabase
    .from('career_courses')
    .select('career_id')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .maybeSingle();

  const careerId = (careerCourse as { career_id: string } | null)?.career_id;

  // 2. Find the super_moderator for this career
  const { data: careerAssign } = careerId
    ? await supabase
        .from('career_assignments')
        .select('user_id')
        .eq('career_id', careerId)
        .maybeSingle()
    : { data: null };

  const superModeratorId = (careerAssign as { user_id: string } | null)?.user_id ?? null;

  // 3. Find the default senior_moderator for this course
  //    (earliest assigned, i.e. the row with is_default_manager = true,
  //     or fall back to the earliest created_at)
  const { data: defaultSeniorRow } = await supabase
    .from('course_assignments')
    .select('user_id')
    .eq('course_id', courseId)
    .eq('role', 'senior_moderator')
    .order('assigned_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const defaultSeniorModId = (defaultSeniorRow as { user_id: string } | null)?.user_id ?? null;

  // 4. Write the resolved values back to the moderator's course_assignments row
  const { error } = await supabase
    .from('course_assignments')
    .update({
      super_moderator_id: superModeratorId,
      default_senior_moderator_id: defaultSeniorModId,
    })
    .eq('user_id', moderatorId)
    .eq('course_id', courseId)
    .eq('role', 'moderator');

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// syncSeniorModeratorLinks
// Called when a senior_moderator is assigned to a career.
// ---------------------------------------------------------------------------

interface SyncSeniorModeratorLinksParams {
  seniorModeratorId: string;
  careerId: string;
}

export async function syncSeniorModeratorLinks(
  params: SyncSeniorModeratorLinksParams,
): Promise<void> {
  const { seniorModeratorId, careerId } = params;

  // 1. Confirm career exists
  const { data: career } = await supabase
    .from('careers')
    .select('id')
    .eq('id', careerId)
    .maybeSingle();

  if (!career) {
    throw new Error(`Career ${careerId} does not exist.`);
  }

  // 2. Find the super_moderator for this career
  const { data: careerAssign } = await supabase
    .from('career_assignments')
    .select('user_id')
    .eq('career_id', careerId)
    .maybeSingle();

  const superModeratorId = (careerAssign as { user_id: string } | null)?.user_id;

  if (!superModeratorId) {
    throw new Error(
      `No super_moderator is assigned to career ${careerId}. ` +
      'Assign a Career Manager to this career before syncing senior moderator links.',
    );
  }

  // 3. Stamp super_moderator_id on all of this senior_mod's course_assignment rows
  const { error } = await supabase
    .from('course_assignments')
    .update({ super_moderator_id: superModeratorId })
    .eq('user_id', seniorModeratorId)
    .eq('role', 'senior_moderator');

  if (error) throw error;
}
