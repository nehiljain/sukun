import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/shared/Footer";
import Navbar from "@/components/shared/Navbar";

export const Privacy: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen relative">
      <Navbar
        buttons={[
          {
            label: "Sign In",
            onClick: () => {
              window.location.href = "/";
            },
            variant: "primary",
          },
        ]}
      />
      <main className="flex-grow pt-24">
        <section id="features" className="bg-primary-background">
          <div className="w-[80%] mx-auto px-6">
            <div className="container mx-auto py-8 px-4">
              <Card className="mx-auto">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-center">
                    Privacy Policy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    At DemoDrive AI, owned and operated by 19bits Inc., we take
                    your privacy seriously. This Privacy Policy explains how we
                    collect, use, and protect your personal information when you
                    use our services.
                  </p>

                  <h2 className="text-lg font-bold">
                    1. Information We Collect
                  </h2>
                  <p className="mb-4">
                    We collect the following types of information:
                  </p>
                  <ul className="list-disc list-inside mb-4">
                    <li>Account information (name, email, password)</li>
                    <li>Usage data and analytics</li>
                    <li>Communication preferences</li>
                    <li>
                      Technical information (IP address, browser type, device
                      information)
                    </li>
                  </ul>

                  <h2 className="text-lg font-bold">
                    2. How We Use Your Information
                  </h2>
                  <p className="mb-4">We use your information to:</p>
                  <ul className="list-disc list-inside mb-4">
                    <li>Provide and improve our services</li>
                    <li>Communicate with you about your account</li>
                    <li>Send important updates and notifications</li>
                    <li>Analyze and optimize our platform</li>
                    <li>Prevent fraud and ensure security</li>
                  </ul>

                  <h2 className="text-lg font-bold">
                    3. Data Storage and Security
                  </h2>
                  <p className="mb-4">
                    We implement industry-standard security measures to protect
                    your data. Your information is stored on secure servers
                    located in Canada and is encrypted during transmission.
                  </p>

                  <h2 className="text-lg font-bold">4. Your Data Rights</h2>
                  <p className="mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside mb-4">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate information</li>
                    <li>Request deletion of your data</li>
                    <li>Export your data</li>
                    <li>Opt-out of marketing communications</li>
                  </ul>

                  <h2 className="text-lg font-bold">5. Data Deletion</h2>
                  <p className="mb-4">
                    You have the right to delete your data at any time. To
                    request deletion of your account and associated data, please
                    email us at privacy@demodrive.tech. We will process your
                    request within 30 days and confirm once completed. Note that
                    some information may be retained for legal or regulatory
                    requirements.
                  </p>

                  <h2 className="text-lg font-bold">6. Cookies and Tracking</h2>
                  <p className="mb-4">
                    We use cookies and similar technologies to improve your
                    experience and analyze platform usage. You can control
                    cookie preferences through your browser settings.
                  </p>

                  <h2 className="text-lg font-bold">7. Third-Party Services</h2>
                  <p className="mb-4">
                    We may use third-party services for analytics, payment
                    processing, and other functions. These services have their
                    own privacy policies and data practices.
                  </p>

                  <h2 className="text-lg font-bold">8. Children's Privacy</h2>
                  <p className="mb-4">
                    Our services are not intended for users under 13 years of
                    age. We do not knowingly collect information from children.
                  </p>

                  <h2 className="text-lg font-bold">
                    9. Changes to Privacy Policy
                  </h2>
                  <p className="mb-4">
                    We may update this Privacy Policy periodically. We will
                    notify you of significant changes via email or through our
                    platform.
                  </p>

                  <h2 className="text-lg font-bold">10. Contact Information</h2>
                  <p className="mb-4">
                    For privacy-related inquiries or concerns, please contact us
                    at founders@demodrive.tech.
                  </p>

                  <div className="text-sm text-gray-500 mt-8 text-center">
                    Last updated: 2025-02-28
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
