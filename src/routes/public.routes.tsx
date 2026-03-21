import { Route, Navigate } from "react-router-dom";

// Public Pages
import Index from "@/pages/Index";
import Pricing from "@/pages/Pricing";
import Plan from "@/pages/Plan";
import Courses from "@/pages/Courses";
import Careers from "@/pages/Careers";
import CourseDetail from "@/pages/CourseDetail";
import CourseNotes from "@/pages/CourseNotes";
import VerifyCertificate from "@/pages/VerifyCertificate";
import Library from "@/pages/Library";
import Arcade from "@/pages/Arcade";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Auth from "@/pages/Auth";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import AcceptInvite from "@/pages/AcceptInvite";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import TagPosts from "@/pages/TagPosts";
import Tags from "@/pages/Tags";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import AccessDenied from "@/pages/AccessDenied";
import NotFound from "@/pages/NotFound";
import SkillProblems from "@/pages/SkillProblems";
import ProblemDetail from "@/pages/ProblemDetail";
import LessonProblems from "@/pages/LessonProblems";
import PredictOutputDetail from "@/pages/PredictOutputDetail";
import PredictOutputWorkspace from "@/pages/PredictOutputWorkspace";
import FixErrorWorkspace from "@/pages/FixErrorWorkspace";
import EliminateWrongWorkspace from "@/pages/EliminateWrongWorkspace";
import ChoosePlan from "@/pages/ChoosePlan";
import Checkout from "@/pages/Checkout";
import MyDoubts from "@/pages/MyDoubts";

/**
 * Public Routes - No authentication required
 * Returns an array of Route elements to be spread in the main router
 */
export const publicRoutes = [
  <Route key="home" path="/" element={<Index />} />,
  <Route key="pricing" path="/pricing" element={<Pricing />} />,
  <Route key="plan" path="/plan" element={<Plan />} />,
  <Route key="careers" path="/careers" element={<Careers />} />,
  <Route key="courses" path="/courses" element={<Courses />} />,
  <Route key="course-detail" path="/course/:slug" element={<CourseDetail />} />,
  <Route key="course-notes" path="/courses/:courseId/notes" element={<CourseNotes />} />,
  <Route key="verify-certificate" path="/verify/certificate/:certificateId" element={<VerifyCertificate />} />,
  <Route key="library" path="/library" element={<Library />} />,
  <Route key="arcade" path="/arcade" element={<Arcade />} />,
  <Route key="practice-lab" path="/practice-lab" element={<Navigate to="/profile?tab=practice" replace />} />,
  <Route key="skill-problems" path="/practice/:skillId" element={<SkillProblems />} />,
  <Route key="lesson-problems" path="/practice/:skillId/lesson/:lessonId" element={<LessonProblems />} />,
  <Route key="problem-detail" path="/practice/:skillId/problem/:problemId" element={<ProblemDetail />} />,
  <Route key="predict-output-detail" path="/predict-output/:slug" element={<PredictOutputDetail />} />,
  <Route key="predict-output-workspace" path="/practice/:skillId/predict/:problemSlug" element={<PredictOutputWorkspace />} />,
  <Route key="fix-error-workspace" path="/practice/:skillId/fix-error/:slug" element={<FixErrorWorkspace />} />,
  <Route key="eliminate-wrong-workspace" path="/practice/:skillId/eliminate/:slug" element={<EliminateWrongWorkspace />} />,
  <Route key="tag-posts" path="/tag/:slug" element={<TagPosts />} />,
  <Route key="tags" path="/tags" element={<Tags />} />,
  <Route key="about" path="/about" element={<About />} />,
  <Route key="contact" path="/contact" element={<Contact />} />,
  <Route key="terms" path="/terms" element={<Terms />} />,
  <Route key="privacy" path="/privacy" element={<Privacy />} />,
  
  // Auth Routes
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="signup" path="/signup" element={<Signup />} />,
  <Route key="verify-email" path="/verify-email" element={<VerifyEmail />} />,
  <Route key="verify-email-confirm" path="/verify-email/confirm" element={<VerifyEmail />} />,
  <Route key="forgot-password" path="/forgot-password" element={<Navigate to="/login" replace />} />,
  <Route key="invite" path="/invite/:token" element={<AcceptInvite />} />,
  <Route key="auth" path="/auth" element={<Auth />} />,
  <Route key="reset-password" path="/reset-password" element={<ResetPassword />} />,
  
  <Route key="choose-plan" path="/choose-plan" element={<ChoosePlan />} />,
  <Route key="checkout" path="/checkout" element={<Checkout />} />,
  <Route key="profile" path="/profile" element={<Profile />} />,
  <Route key="access-denied" path="/access-denied" element={<AccessDenied />} />,
  <Route key="unauthorized" path="/unauthorized" element={<AccessDenied />} />,
  <Route key="not-found" path="*" element={<NotFound />} />,
];

export default publicRoutes;
