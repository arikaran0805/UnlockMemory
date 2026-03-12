import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import BlogCard from "@/components/BlogCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  image: string;
  slug: string;
  level?: string;
  enrollmentCount: number;
  averageRating: number;
}

const FeaturedCoursesSection = ({ courses }: { courses: FeaturedCourse[] }) => {
  const animation = useScrollAnimation({ threshold: 0.1 });

  if (courses.length === 0) return null;

  return (
    <section
      ref={animation.ref}
      className={`py-24 lg:py-32 bg-muted/20 transition-all duration-1000 ${
        animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="container px-6 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-3 block">
              Featured
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Popular Courses
            </h2>
            <p className="text-muted-foreground mt-3 max-w-md">
              Start your learning journey with our most popular courses
            </p>
          </div>
          <Link
            to="/courses"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            View all courses
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <div
              key={course.id}
              style={{ transitionDelay: animation.isVisible ? `${index * 100}ms` : '0ms' }}
              className={`transition-all duration-500 ${
                animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <BlogCard
                title={course.title}
                excerpt={course.description}
                category=""
                image={course.image}
                date=""
                author=""
                slug={course.slug}
                views={course.enrollmentCount}
                linkType="category"
                rating={course.averageRating}
                level={course.level}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCoursesSection;
