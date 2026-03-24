import { useEffect } from "react";

interface CourseStructuredDataProps {
  course: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    featured_image: string | null;
  };
  lessons: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
  stats?: {
    enrollmentCount: number;
    averageRating: number;
    reviewCount: number;
  };
  siteUrl?: string;
}

const CourseStructuredData = ({
  course,
  lessons,
  stats,
  siteUrl = window.location.origin,
}: CourseStructuredDataProps) => {
  useEffect(() => {
    // Remove any existing structured data scripts we've added
    const existingScripts = document.querySelectorAll(
      'script[data-structured-data="course"]'
    );
    existingScripts.forEach((script) => script.remove());

    const courseUrl = `${siteUrl}/courses/${course.slug}`;

    // Course schema (using Course type from schema.org)
    const courseSchema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "@id": courseUrl,
      name: course.name,
      description: course.description || `Learn ${course.name}`,
      url: courseUrl,
      provider: {
        "@type": "Organization",
        name: "UnlockMemory",
        url: siteUrl,
      },
      ...(course.featured_image && {
        image: course.featured_image,
      }),
      ...(stats?.averageRating && stats.reviewCount > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: stats.averageRating.toFixed(1),
          ratingCount: stats.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
      ...(lessons.length > 0 && {
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: `PT${lessons.length}H`, // Estimate 1 hour per lesson
        },
        numberOfCredits: lessons.length,
        syllabusSections: lessons.slice(0, 10).map((lesson, index) => ({
          "@type": "Syllabus",
          name: lesson.title,
          position: index + 1,
        })),
      }),
    };

    // Breadcrumb schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Courses",
          item: `${siteUrl}/courses`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: course.name,
          item: courseUrl,
        },
      ],
    };

    // Create and append script elements
    const courseScript = document.createElement("script");
    courseScript.type = "application/ld+json";
    courseScript.setAttribute("data-structured-data", "course");
    courseScript.textContent = JSON.stringify(courseSchema);
    document.head.appendChild(courseScript);

    const breadcrumbScript = document.createElement("script");
    breadcrumbScript.type = "application/ld+json";
    breadcrumbScript.setAttribute("data-structured-data", "course");
    breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    // Cleanup on unmount
    return () => {
      const scripts = document.querySelectorAll(
        'script[data-structured-data="course"]'
      );
      scripts.forEach((script) => script.remove());
    };
  }, [course, lessons, stats, siteUrl]);

  return null;
};

export default CourseStructuredData;
