export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          color: string | null
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          color?: string | null
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          color?: string | null
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_badge_reads: {
        Row: {
          badge_key: string
          created_at: string
          id: string
          seen_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          id?: string
          seen_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          id?: string
          seen_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_id: string
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          submitted_by: string | null
          title: string
          type: string
        }
        Insert: {
          admin_id: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          submitted_by?: string | null
          title: string
          type: string
        }
        Update: {
          admin_id?: string
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          submitted_by?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_code: string | null
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          placement: string
          priority: number
          redirect_url: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          ad_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          placement: string
          priority?: number
          redirect_url?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          ad_code?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          placement?: string
          priority?: number
          redirect_url?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      annotation_replies: {
        Row: {
          annotation_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          annotation_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          annotation_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotation_replies_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "post_annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      approval_history: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string
          feedback: string | null
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string
          feedback?: string | null
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string
          feedback?: string | null
          id?: string
          performed_by?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          career_id: string
          id: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          career_id: string
          id?: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          career_id?: string
          id?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_assignments_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      career_courses: {
        Row: {
          career_id: string
          course_id: string
          created_at: string
          deleted_at: string | null
          id: string
          is_primary: boolean | null
          skill_contributions: Json | null
        }
        Insert: {
          career_id: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean | null
          skill_contributions?: Json | null
        }
        Update: {
          career_id?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_primary?: boolean | null
          skill_contributions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "career_courses_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      career_skills: {
        Row: {
          career_id: string
          color: string | null
          created_at: string
          display_order: number
          icon: string | null
          id: string
          skill_name: string
          weight: number
        }
        Insert: {
          career_id: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          skill_name: string
          weight?: number
        }
        Update: {
          career_id?: string
          color?: string | null
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          skill_name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "career_skills_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      career_welcome_views: {
        Row: {
          career_id: string
          id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          career_id: string
          id?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          career_id?: string
          id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_welcome_views_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      careers: {
        Row: {
          author_id: string | null
          color: string
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          certificate_id: string
          course_id: string
          course_name: string
          created_at: string
          id: string
          issued_at: string
          learner_name: string
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          certificate_id: string
          course_id: string
          course_name: string
          created_at?: string
          id?: string
          issued_at?: string
          learner_name: string
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          certificate_id?: string
          course_id?: string
          course_name?: string
          created_at?: string
          id?: string
          issued_at?: string
          learner_name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          parent_id: string | null
          post_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          post_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          post_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string
          id: string
          reason: string | null
          report_type: string
          reporter_email: string | null
          reporter_id: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description: string
          id?: string
          reason?: string | null
          report_type: string
          reporter_email?: string | null
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string
          id?: string
          reason?: string | null
          report_type?: string
          reporter_email?: string | null
          reporter_id?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_annotation_replies: {
        Row: {
          annotation_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          annotation_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          annotation_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_annotation_replies_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "course_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_annotations: {
        Row: {
          author_id: string
          bubble_index: number | null
          comment: string
          course_id: string
          created_at: string
          editor_type: string | null
          id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          author_id: string
          bubble_index?: number | null
          comment: string
          course_id: string
          created_at?: string
          editor_type?: string | null
          id?: string
          selected_text: string
          selection_end: number
          selection_start: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          author_id?: string
          bubble_index?: number | null
          comment?: string
          course_id?: string
          created_at?: string
          editor_type?: string | null
          id?: string
          selected_text?: string
          selection_end?: number
          selection_start?: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_annotations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          course_id: string
          id: string
          is_default_manager: boolean
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          course_id: string
          id?: string
          is_default_manager?: boolean
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          course_id?: string
          id?: string
          is_default_manager?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          lesson_order: number
          lesson_rank: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          lesson_order?: number
          lesson_rank?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          lesson_order?: number
          lesson_rank?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: string
          created_at: string
          display_order: number
          id: string
          prerequisite_course_id: string | null
          prerequisite_text: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          display_order?: number
          id?: string
          prerequisite_course_id?: string | null
          prerequisite_text?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          display_order?: number
          id?: string
          prerequisite_course_id?: string | null
          prerequisite_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_anonymous: boolean
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_versions: {
        Row: {
          change_summary: string | null
          content: string
          course_id: string
          created_at: string
          edited_by: string
          editor_role: string | null
          editor_type: string | null
          id: string
          is_published: boolean | null
          status: string
          version_number: number
          versioning_note_locked: boolean
          versioning_note_type: string | null
        }
        Insert: {
          change_summary?: string | null
          content: string
          course_id: string
          created_at?: string
          edited_by: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string
          course_id?: string
          created_at?: string
          edited_by?: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_versions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          assigned_to: string | null
          author_id: string | null
          created_at: string
          default_senior_moderator: string | null
          deleted_at: string | null
          description: string | null
          featured: boolean | null
          featured_image: string | null
          icon: string | null
          id: string
          learning_hours: number | null
          level: string | null
          name: string
          prerequisites: string[] | null
          slug: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          author_id?: string | null
          created_at?: string
          default_senior_moderator?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          icon?: string | null
          id?: string
          learning_hours?: number | null
          level?: string | null
          name: string
          prerequisites?: string[] | null
          slug: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          author_id?: string | null
          created_at?: string
          default_senior_moderator?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          icon?: string | null
          id?: string
          learning_hours?: number | null
          level?: string | null
          name?: string
          prerequisites?: string[] | null
          slug?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delete_requests: {
        Row: {
          content_id: string
          content_title: string
          content_type: string
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_title: string
          content_type: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_title?: string
          content_type?: string
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      difficulty_levels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      eliminate_wrong_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          problem_id: string
          score: number | null
          selected_options: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          problem_id: string
          score?: number | null
          selected_options?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          problem_id?: string
          score?: number | null
          selected_options?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eliminate_wrong_attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "eliminate_wrong_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      eliminate_wrong_mappings: {
        Row: {
          context_note: string | null
          created_at: string
          created_by: string | null
          display_order: number
          eliminate_wrong_problem_id: string
          id: string
          sub_topic_id: string
        }
        Insert: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          eliminate_wrong_problem_id: string
          id?: string
          sub_topic_id: string
        }
        Update: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          eliminate_wrong_problem_id?: string
          id?: string
          sub_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eliminate_wrong_mappings_eliminate_wrong_problem_id_fkey"
            columns: ["eliminate_wrong_problem_id"]
            isOneToOne: false
            referencedRelation: "eliminate_wrong_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eliminate_wrong_mappings_sub_topic_id_fkey"
            columns: ["sub_topic_id"]
            isOneToOne: false
            referencedRelation: "sub_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      eliminate_wrong_problems: {
        Row: {
          allow_partial_credit: boolean
          allow_retry: boolean
          context_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          display_order: number
          explanation: string | null
          hints: Json | null
          id: string
          is_premium: boolean
          language: string
          options: Json
          selection_mode: string
          shuffle_options: boolean
          skill_id: string
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_partial_credit?: boolean
          allow_retry?: boolean
          context_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number
          explanation?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          options?: Json
          selection_mode?: string
          shuffle_options?: boolean
          skill_id: string
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_partial_credit?: boolean
          allow_retry?: boolean
          context_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number
          explanation?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          options?: Json
          selection_mode?: string
          shuffle_options?: boolean
          skill_id?: string
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eliminate_wrong_problems_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "practice_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      fix_error_mappings: {
        Row: {
          context_note: string | null
          created_at: string
          created_by: string | null
          display_order: number
          fix_error_problem_id: string
          id: string
          sub_topic_id: string
        }
        Insert: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          fix_error_problem_id: string
          id?: string
          sub_topic_id: string
        }
        Update: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          fix_error_problem_id?: string
          id?: string
          sub_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fix_error_mappings_fix_error_problem_id_fkey"
            columns: ["fix_error_problem_id"]
            isOneToOne: false
            referencedRelation: "fix_error_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fix_error_mappings_sub_topic_id_fkey"
            columns: ["sub_topic_id"]
            isOneToOne: false
            referencedRelation: "sub_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      fix_error_problems: {
        Row: {
          buggy_code: string
          correct_code: string
          created_at: string
          created_by: string | null
          custom_validator: string | null
          description: string | null
          difficulty: string
          display_order: number
          editable_end_line: number | null
          editable_start_line: number | null
          expected_output: string | null
          failure_message: string | null
          hints: Json | null
          id: string
          is_premium: boolean
          language: string
          sample_output: string | null
          skill_id: string
          slug: string
          status: string
          success_message: string | null
          tags: string[] | null
          test_cases: Json | null
          title: string
          updated_at: string
          validation_type: string
        }
        Insert: {
          buggy_code?: string
          correct_code?: string
          created_at?: string
          created_by?: string | null
          custom_validator?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number
          editable_end_line?: number | null
          editable_start_line?: number | null
          expected_output?: string | null
          failure_message?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          sample_output?: string | null
          skill_id: string
          slug: string
          status?: string
          success_message?: string | null
          tags?: string[] | null
          test_cases?: Json | null
          title: string
          updated_at?: string
          validation_type?: string
        }
        Update: {
          buggy_code?: string
          correct_code?: string
          created_at?: string
          created_by?: string | null
          custom_validator?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number
          editable_end_line?: number | null
          editable_start_line?: number | null
          expected_output?: string | null
          failure_message?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          sample_output?: string | null
          skill_id?: string
          slug?: string
          status?: string
          success_message?: string | null
          tags?: string[] | null
          test_cases?: Json | null
          title?: string
          updated_at?: string
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fix_error_problems_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "practice_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: []
      }
      learner_problem_progress: {
        Row: {
          attempts: number
          best_memory_mb: number | null
          best_runtime_ms: number | null
          created_at: string
          id: string
          problem_id: string
          solved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_memory_mb?: number | null
          best_runtime_ms?: number | null
          created_at?: string
          id?: string
          problem_id: string
          solved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          best_memory_mb?: number | null
          best_runtime_ms?: number | null
          created_at?: string
          id?: string
          problem_id?: string
          solved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string
          entity_type: string
          id: string
          lesson_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          entity_type?: string
          id?: string
          lesson_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          entity_type?: string
          id?: string
          lesson_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          course_id: string
          course_lesson_id: string | null
          id: string
          lesson_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          course_lesson_id?: string | null
          id?: string
          lesson_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          course_lesson_id?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_course_lesson_id_fkey"
            columns: ["course_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_time_tracking: {
        Row: {
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          lesson_id: string
          tracked_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id: string
          tracked_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          lesson_id?: string
          tracked_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_notifications: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          annotations: boolean
          changes_requested: boolean
          content_approved: boolean
          content_rejected: boolean
          content_submissions: boolean
          created_at: string
          delete_requests: boolean
          email_notifications: boolean
          id: string
          new_users: boolean
          reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          annotations?: boolean
          changes_requested?: boolean
          content_approved?: boolean
          content_rejected?: boolean
          content_submissions?: boolean
          created_at?: string
          delete_requests?: boolean
          email_notifications?: boolean
          id?: string
          new_users?: boolean
          reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          annotations?: boolean
          changes_requested?: boolean
          content_approved?: boolean
          content_rejected?: boolean
          content_submissions?: boolean
          created_at?: string
          delete_requests?: boolean
          email_notifications?: boolean
          id?: string
          new_users?: boolean
          reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          notification_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          notification_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          notification_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          page_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_annotations: {
        Row: {
          author_id: string
          bubble_index: number | null
          comment: string
          created_at: string
          editor_type: string | null
          id: string
          post_id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          author_id: string
          bubble_index?: number | null
          comment: string
          created_at?: string
          editor_type?: string | null
          id?: string
          post_id: string
          selected_text: string
          selection_end: number
          selection_start: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          author_id?: string
          bubble_index?: number | null
          comment?: string
          created_at?: string
          editor_type?: string | null
          id?: string
          post_id?: string
          selected_text?: string
          selection_end?: number
          selection_start?: number
          status?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_annotations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_annotations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "post_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          platform: string
          post_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          post_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          post_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_version_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_version_bookmarks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "post_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      post_versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          edited_by: string
          editor_role: string | null
          editor_type: string | null
          id: string
          is_published: boolean | null
          post_id: string
          status: string
          version_number: number
          versioning_note_locked: boolean
          versioning_note_type: string | null
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          edited_by: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          post_id: string
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          edited_by?: string
          editor_role?: string | null
          editor_type?: string | null
          id?: string
          is_published?: boolean | null
          post_id?: string
          status?: string
          version_number?: number
          versioning_note_locked?: boolean
          versioning_note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          author_id: string
          category_id: string | null
          code_theme: string | null
          content: string
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          lesson_id: string | null
          post_rank: string | null
          post_type: string | null
          published_at: string | null
          slug: string
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          author_id: string
          category_id?: string | null
          code_theme?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          lesson_id?: string | null
          post_rank?: string | null
          post_type?: string | null
          published_at?: string | null
          slug: string
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          author_id?: string
          category_id?: string | null
          code_theme?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          lesson_id?: string | null
          post_rank?: string | null
          post_type?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_posts_lesson_id"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_problems: {
        Row: {
          constraints: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string
          display_order: number | null
          examples: Json | null
          function_signature: Json | null
          hints: Json | null
          id: string
          input_format: string | null
          is_premium: boolean | null
          memory_limit: number | null
          output_format: string | null
          skill_id: string
          slug: string
          solution: string | null
          starter_code: Json | null
          status: string
          sub_topic: string
          supported_languages: string[] | null
          tags: string[] | null
          test_cases: Json | null
          time_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          constraints?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number | null
          examples?: Json | null
          function_signature?: Json | null
          hints?: Json | null
          id?: string
          input_format?: string | null
          is_premium?: boolean | null
          memory_limit?: number | null
          output_format?: string | null
          skill_id: string
          slug: string
          solution?: string | null
          starter_code?: Json | null
          status?: string
          sub_topic: string
          supported_languages?: string[] | null
          tags?: string[] | null
          test_cases?: Json | null
          time_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          constraints?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string
          display_order?: number | null
          examples?: Json | null
          function_signature?: Json | null
          hints?: Json | null
          id?: string
          input_format?: string | null
          is_premium?: boolean | null
          memory_limit?: number | null
          output_format?: string | null
          skill_id?: string
          slug?: string
          solution?: string | null
          starter_code?: Json | null
          status?: string
          sub_topic?: string
          supported_languages?: string[] | null
          tags?: string[] | null
          test_cases?: Json | null
          time_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_problems_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "practice_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_skills: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_skills_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      predict_output_attempts: {
        Row: {
          attempt_no: number
          created_at: string
          id: string
          is_correct: boolean
          problem_id: string
          revealed: boolean
          score_awarded: number
          time_taken: number | null
          user_id: string
          user_output: string
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          problem_id: string
          revealed?: boolean
          score_awarded?: number
          time_taken?: number | null
          user_id: string
          user_output?: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          problem_id?: string
          revealed?: boolean
          score_awarded?: number
          time_taken?: number | null
          user_id?: string
          user_output?: string
        }
        Relationships: [
          {
            foreignKeyName: "predict_output_attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "predict_output_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      predict_output_mappings: {
        Row: {
          context_note: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          predict_output_problem_id: string
          sub_topic_id: string
        }
        Insert: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          predict_output_problem_id: string
          sub_topic_id: string
        }
        Update: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          predict_output_problem_id?: string
          sub_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predict_output_mappings_predict_output_problem_id_fkey"
            columns: ["predict_output_problem_id"]
            isOneToOne: false
            referencedRelation: "predict_output_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predict_output_mappings_sub_topic_id_fkey"
            columns: ["sub_topic_id"]
            isOneToOne: false
            referencedRelation: "sub_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      predict_output_problems: {
        Row: {
          accepted_outputs: Json | null
          code: string
          common_mistakes: Json | null
          created_at: string
          created_by: string | null
          difficulty: string
          display_order: number
          expected_output: string
          explanation: string | null
          hints: Json | null
          id: string
          is_premium: boolean
          language: string
          match_mode: string
          output_type: string
          prompt: string | null
          reveal_allowed: boolean
          reveal_penalty: string
          reveal_timing: string
          skill_id: string
          slug: string
          status: string
          step_by_step: Json | null
          streak_eligible: boolean
          tags: string[] | null
          title: string
          updated_at: string
          xp_value: number
        }
        Insert: {
          accepted_outputs?: Json | null
          code?: string
          common_mistakes?: Json | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          display_order?: number
          expected_output?: string
          explanation?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          match_mode?: string
          output_type?: string
          prompt?: string | null
          reveal_allowed?: boolean
          reveal_penalty?: string
          reveal_timing?: string
          skill_id: string
          slug: string
          status?: string
          step_by_step?: Json | null
          streak_eligible?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          xp_value?: number
        }
        Update: {
          accepted_outputs?: Json | null
          code?: string
          common_mistakes?: Json | null
          created_at?: string
          created_by?: string | null
          difficulty?: string
          display_order?: number
          expected_output?: string
          explanation?: string | null
          hints?: Json | null
          id?: string
          is_premium?: boolean
          language?: string
          match_mode?: string
          output_type?: string
          prompt?: string | null
          reveal_allowed?: boolean
          reveal_penalty?: string
          reveal_timing?: string
          skill_id?: string
          slug?: string
          status?: string
          step_by_step?: Json | null
          streak_eligible?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "predict_output_problems_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "practice_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_bookmarks: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          problem_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          problem_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          problem_type?: string
          user_id?: string
        }
        Relationships: []
      }
      problem_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          problem_id: string
          problem_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id: string
          problem_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id?: string
          problem_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "problem_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_mappings: {
        Row: {
          context_note: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          problem_id: string
          sub_topic_id: string
        }
        Insert: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          problem_id: string
          sub_topic_id: string
        }
        Update: {
          context_note?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          problem_id?: string
          sub_topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_mappings_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "practice_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_mappings_sub_topic_id_fkey"
            columns: ["sub_topic_id"]
            isOneToOne: false
            referencedRelation: "sub_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_reactions: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          problem_type: string
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          problem_type?: string
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          problem_type?: string
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      problem_shares: {
        Row: {
          created_at: string
          id: string
          platform: string
          problem_id: string
          problem_type: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          problem_id: string
          problem_type?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          problem_id?: string
          problem_type?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["app_role"] | null
          avatar_url: string | null
          created_at: string
          current_streak: number | null
          email: string
          full_name: string | null
          id: string
          last_activity_date: string | null
          last_freeze_date: string | null
          max_streak: number | null
          selected_career: string | null
          streak_freezes_available: number
          streak_freezes_used: number
          updated_at: string
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["app_role"] | null
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          email: string
          full_name?: string | null
          id: string
          last_activity_date?: string | null
          last_freeze_date?: string | null
          max_streak?: number | null
          selected_career?: string | null
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
        }
        Update: {
          active_role?: Database["public"]["Enums"]["app_role"] | null
          avatar_url?: string | null
          created_at?: string
          current_streak?: number | null
          email?: string
          full_name?: string | null
          id?: string
          last_activity_date?: string | null
          last_freeze_date?: string | null
          max_streak?: number | null
          selected_career?: string | null
          streak_freezes_available?: number
          streak_freezes_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          destination_url: string
          hit_count: number
          id: string
          is_active: boolean
          redirect_type: number
          source_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_url: string
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_url?: string
          hit_count?: number
          id?: string
          is_active?: boolean
          redirect_type?: number
          source_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_invalidations: {
        Row: {
          created_by: string | null
          id: string
          invalidated_at: string
          reason: string
          user_id: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          invalidated_at?: string
          reason?: string
          user_id: string
        }
        Update: {
          created_by?: string | null
          id?: string
          invalidated_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          announcement_bg_color: string | null
          announcement_enabled: boolean | null
          announcement_end_date: string | null
          announcement_link_text: string | null
          announcement_link_url: string | null
          announcement_message: string | null
          announcement_start_date: string | null
          announcement_text_color: string | null
          code_theme: string | null
          course_avatar_gradient_from: string | null
          course_avatar_gradient_to: string | null
          course_bubble_bg: string | null
          course_bubble_text: string | null
          created_at: string
          facebook_url: string | null
          github_url: string | null
          hero_headline: string | null
          hero_highlight_color: string | null
          hero_highlight_text: string | null
          hero_quick_links: Json | null
          hero_subheadline: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          mentor_avatar_gradient_from: string | null
          mentor_avatar_gradient_to: string | null
          mentor_bubble_bg: string | null
          mentor_bubble_text: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          notification_window_days: number | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          schema_address: string | null
          schema_contact_email: string | null
          schema_phone: string | null
          schema_same_as: string[] | null
          schema_type: string | null
          search_placeholders: string[] | null
          site_description: string | null
          site_name: string
          site_url: string | null
          twitter_card_type: string | null
          twitter_site: string | null
          twitter_url: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_end_date?: string | null
          announcement_link_text?: string | null
          announcement_link_url?: string | null
          announcement_message?: string | null
          announcement_start_date?: string | null
          announcement_text_color?: string | null
          code_theme?: string | null
          course_avatar_gradient_from?: string | null
          course_avatar_gradient_to?: string | null
          course_bubble_bg?: string | null
          course_bubble_text?: string | null
          created_at?: string
          facebook_url?: string | null
          github_url?: string | null
          hero_headline?: string | null
          hero_highlight_color?: string | null
          hero_highlight_text?: string | null
          hero_quick_links?: Json | null
          hero_subheadline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mentor_avatar_gradient_from?: string | null
          mentor_avatar_gradient_to?: string | null
          mentor_bubble_bg?: string | null
          mentor_bubble_text?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_window_days?: number | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_address?: string | null
          schema_contact_email?: string | null
          schema_phone?: string | null
          schema_same_as?: string[] | null
          schema_type?: string | null
          search_placeholders?: string[] | null
          site_description?: string | null
          site_name?: string
          site_url?: string | null
          twitter_card_type?: string | null
          twitter_site?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          announcement_bg_color?: string | null
          announcement_enabled?: boolean | null
          announcement_end_date?: string | null
          announcement_link_text?: string | null
          announcement_link_url?: string | null
          announcement_message?: string | null
          announcement_start_date?: string | null
          announcement_text_color?: string | null
          code_theme?: string | null
          course_avatar_gradient_from?: string | null
          course_avatar_gradient_to?: string | null
          course_bubble_bg?: string | null
          course_bubble_text?: string | null
          created_at?: string
          facebook_url?: string | null
          github_url?: string | null
          hero_headline?: string | null
          hero_highlight_color?: string | null
          hero_highlight_text?: string | null
          hero_quick_links?: Json | null
          hero_subheadline?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          mentor_avatar_gradient_from?: string | null
          mentor_avatar_gradient_to?: string | null
          mentor_bubble_bg?: string | null
          mentor_bubble_text?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          notification_window_days?: number | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          schema_address?: string | null
          schema_contact_email?: string | null
          schema_phone?: string | null
          schema_same_as?: string[] | null
          schema_type?: string | null
          search_placeholders?: string[] | null
          site_description?: string | null
          site_name?: string
          site_url?: string | null
          twitter_card_type?: string | null
          twitter_site?: string | null
          twitter_url?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      social_media_clicks: {
        Row: {
          clicked_at: string
          id: string
          platform: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          platform: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          platform?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sub_topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_default: boolean
          lesson_id: string
          skill_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lesson_id: string
          skill_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          lesson_id?: string
          skill_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_topics_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_topics_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "practice_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_bookmarks: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          archived_at: string | null
          career_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          career_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          career_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_notification_preference: {
        Args: { p_preference_type: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_assigned_to_course_with_role: {
        Args: {
          _course_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_career: {
        Args: { _career_id: string; _user_id: string }
        Returns: boolean
      }
      owns_course_via_career: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      owns_post_via_career: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "senior_moderator"
        | "super_moderator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "senior_moderator",
        "super_moderator",
      ],
    },
  },
} as const
