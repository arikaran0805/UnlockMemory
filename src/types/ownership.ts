export type SubmitterRole = 'moderator' | 'senior_moderator';
export type ContentType = 'post' | 'lesson' | 'practice_lab';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reassigned';

export interface ApprovalTask {
  id: string;
  career_id: string;
  course_id: string | null;
  submitted_by: string;
  submitter_role: SubmitterRole;
  content_type: ContentType;
  content_id: string;
  assigned_to: string;
  status: ApprovalStatus;
  reassigned_by: string | null;
  reassigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseOwnershipLinks {
  course_id: string;
  super_moderator_id: string;
  senior_moderator_ids: string[];
  default_senior_moderator_id: string;
}
