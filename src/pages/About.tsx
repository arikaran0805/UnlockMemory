import { useEffect } from "react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const About = () => {
  useEffect(() => {
    document.title = "UnlockMemory - About Us";
  }, []);

  return (
    <Layout>
      <SEOHead 
        title="About Us - Our Story and Mission"
        description="Learn about UnlockMemory's mission to democratize knowledge and inspire curious minds. Discover our values, team, and commitment to quality content."
        keywords="about us, our mission, our story, company values, team"
      />

      <div className="container px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Logo with Cloud Background */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl rounded-full"></div>
              <div className="relative flex items-center justify-center h-96 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-3xl shadow-elegant">
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-primary shadow-glow">
                  <span className="text-6xl font-bold text-primary-foreground">B</span>
                </div>
              </div>
            </div>

            {/* Right: Text Content */}
            <div>
              <h1 className="text-4xl font-bold mb-6">About UnlockMemory</h1>
              
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  Welcome to <span className="text-primary font-semibold">UnlockMemory</span>, your destination for inspiring stories, insightful articles, and thought-provoking content across technology, lifestyle, business, education, and health.
                </p>

                <p>
                  Founded with a mission to democratize knowledge and inspire curious minds, we bring together writers, thinkers, and creators from around the world to share their expertise and perspectives.
                </p>

                <p>
                  Our platform is built on the belief that everyone has a story worth telling and knowledge worth sharing. Whether you're looking to learn something new, stay updated on industry trends, or simply find inspiration, UnlockMemory is your go-to resource.
                </p>

                <div className="pt-6">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">Our Values</h2>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <strong className="text-foreground">Quality First:</strong> We prioritize well-researched, authentic content that adds real value.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <strong className="text-foreground">Community Driven:</strong> Our readers and writers are at the heart of everything we do.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <strong className="text-foreground">Continuous Learning:</strong> We believe in lifelong learning and growth.
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                      <div>
                        <strong className="text-foreground">Innovation:</strong> We embrace new ideas and technologies to improve the reading experience.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <p className="text-lg font-medium text-foreground">
                    Join us on this journey of discovery and growth. Together, we can create a world where knowledge knows no boundaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
