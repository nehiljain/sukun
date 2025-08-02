import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Github, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/shared/Footer";
import Navbar from "@/components/shared/Navbar";

export default function LandingPage() {
  const baseUrl = `${window.location.protocol}//${window.location.host}/api`;
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isAuthenticated) {
          window.location.href = "/dashboard";
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      }
    };

    checkAuth();
  }, [baseUrl]);

  const navigateToShowCase = () => {
    window.location.href = "/gallery";
  };

  const navigateToMarketing = () => {
    window.location.href = "https://demodrive.tech";
  };

  const navigateToGoogleAuth = () => {
    window.location.href = "/auth/google";
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <Navbar
        buttons={[
          {
            label: "Showcase",
            onClick: navigateToShowCase,
            variant: "secondary",
          },
        ]}
      />

      <main className="flex-grow pt-24">
        <section id="features" className="py-20 bg-primary-background">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-xl text-secondary-foreground text-center mb-12">
              <p className="text-muted-foreground mt-2 mb-8">
                We'll sign you in asd sd ssd sds in, or create an account if you don't have one
                yet.
              </p>
              <div className="flex flex-col gap-4 items-center">
                {/* Temporarily disabled GitHub login
                <Button
                  variant="primary"
                  onClick={navigateToGitHubAuth}
                  className="w-64 h-12 text-lg font-semibold"
                >
                  <Github className="w-5 h-5 mr-2" /> Sign in with GitHub
                </Button>
                */}
                <Button
                  variant="primary"
                  onClick={navigateToGoogleAuth}
                  className="w-64 h-12 text-lg font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="secondary"
                  onClick={navigateToMarketing}
                  className="w-64 h-12 text-lg font-semibold"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back to Website
                </Button>
              </div>
            </h2>
            <p className="text-sm text-muted-foreground mt-8 text-center">
              By clicking "Continue", you agree to the{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy policy
              </a>
              .
            </p>
            {/* <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "Build Trust",
                  description:
                    "Give your users a behind-the-scenes look at what's new and what's improved. Our release notes are designed to build trust, not just list features.",
                  icon: <ScrollText className="h-12 w-12 text-accent" />,
                },
                {
                  title: "Feature Discovery",
                  description:
                    "Are your new features getting the attention they deserve? Our visual assets will make them shine.",
                  icon: <Binoculars className="h-12 w-12 text-accent" />,
                },
                {
                  title: "Engage devs",
                  description:
                    "Tired of throwing code snippets at your dev community and hoping they stick? Our interactive code walkthroughs will make them fall in love with your product.",
                  icon: <Code className="h-12 w-12 text-accent" />,
                },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="transition-all duration-300 hover:shadow-lg border-none"
                >
                  <CardHeader>
                    <div className="flex justify-center mb-4">{item.icon}</div>
                    <CardTitle className="text-xl font-semibold text-center">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div> */}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
