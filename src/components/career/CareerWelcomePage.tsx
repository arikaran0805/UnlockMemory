/**
 * Career Brand Welcome Page
 * 
 * One-time onboarding experience shown the first time a learner enters a specific career.
 * Sets expectations, builds confidence, and orients the learner to their career journey.
 */
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  Award, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Compass
} from "lucide-react";
import { Career, CareerSkill } from "@/hooks/useCareers";
import { cn } from "@/lib/utils";

interface CareerWelcomePageProps {
  career: Career;
  skills: CareerSkill[];
  onStart: () => void;
}

export const CareerWelcomePage = ({ career, skills, onStart }: CareerWelcomePageProps) => {
  const handleStartJourney = () => {
    onStart();
  };

  // Journey steps
  const journeySteps = [
    { icon: BookOpen, label: "Learn", description: "Master core concepts through structured courses" },
    { icon: Target, label: "Practice", description: "Apply skills with hands-on exercises" },
    { icon: TrendingUp, label: "Track", description: "Monitor your progress with skill metrics" },
    { icon: Award, label: "Certify", description: "Earn your career certificate" },
  ];

  // Display up to 4 skills
  const displaySkills = skills.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header - Career Identity */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6">
            <Compass className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Welcome to {career.name}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {career.description || `Your structured path to becoming a ${career.name} professional.`}
          </p>
        </div>

        {/* Journey Overview */}
        <Card className="p-6 mb-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
            Your Journey
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {journeySteps.map((step, index) => (
              <div 
                key={step.label}
                className="relative flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/30"
              >
                {/* Step number badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </div>
                
                <step.icon className="h-6 w-6 text-primary mb-3" />
                <span className="font-semibold text-foreground text-sm mb-1">{step.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{step.description}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* What You'll Gain */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Skills Card */}
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">Skills You'll Master</h3>
            </div>
            
            <div className="space-y-2.5">
              {displaySkills.length > 0 ? (
                displaySkills.map((skill) => (
                  <div 
                    key={skill.id}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary/70 flex-shrink-0" />
                    <span className="text-foreground">{skill.skill_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Core skills tailored to this career path</p>
              )}
              {skills.length > 4 && (
                <p className="text-xs text-muted-foreground mt-2">
                  + {skills.length - 4} more skills
                </p>
              )}
            </div>
          </Card>

          {/* Outcome Card */}
          <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">What You'll Achieve</h3>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary/70 flex-shrink-0" />
                <span className="text-foreground">Job-ready career competency</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary/70 flex-shrink-0" />
                <span className="text-foreground">Measurable skill proficiency</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary/70 flex-shrink-0" />
                <span className="text-foreground">Official career certificate</span>
              </div>
            </div>
          </Card>
        </div>

        {/* How Progress is Tracked */}
        <Card className="p-5 mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">How We Track Your Progress</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-foreground mb-1">📊</div>
              <p className="text-xs text-muted-foreground">Skill-by-skill progress</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-foreground mb-1">🎯</div>
              <p className="text-xs text-muted-foreground">Career readiness score</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="text-2xl font-bold text-foreground mb-1">🏆</div>
              <p className="text-xs text-muted-foreground">Certificate at completion</p>
            </div>
          </div>
        </Card>

        {/* Reassurance & CTA */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">
            Move at your own pace — we'll guide you step by step.
          </p>
          
          <Button 
            size="lg" 
            onClick={handleStartJourney}
            className="px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Start My Career Journey
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CareerWelcomePage;
