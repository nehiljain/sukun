import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/shared/Footer";
import Navbar from "@/components/shared/Navbar";
export const Terms: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Floating Navbar with transparency */}
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
                    Terms and Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    Welcome to Gestral, a product owned and operated by 19bits
                    Inc. ("we," "us," or "our"), a company incorporated in
                    Canada. By accessing or using the Gestral AI services,
                    website, and related applications (collectively referred to
                    as the "Service"), you ("you" or "User") agree to comply
                    with and be bound by these Terms and Conditions ("Terms").
                    If you do not agree to these Terms, you should not access or
                    use the Service.
                  </p>
                  <h2 className="text-lg font-bold">1. Acceptance of Terms</h2>
                  <p className="mb-4">
                    By accessing or using the Service, you agree to abide by
                    these Terms and any applicable laws and regulations
                    governing the Service. We reserve the right to modify,
                    amend, or update these Terms at any time, without prior
                    notice. Any changes will be effective immediately upon
                    posting on this page, and your continued use of the Service
                    after such changes constitutes your acceptance of the new
                    Terms.
                  </p>

                  <h2 className="text-lg font-bold">
                    2. Prohibited Activities
                  </h2>
                  <p>
                    You agree not to engage in any of the following activities:
                  </p>
                  <ol className="list-decimal list-inside mb-4">
                    <li>
                      Uploading, posting, or transmitting any content that is
                      unlawful, harmful, defamatory, obscene, or otherwise
                      objectionable.
                    </li>
                    <li>
                      Interfering with the functioning of the Service or
                      attempting to disrupt its operations.
                    </li>
                    <li>
                      Engaging in any activity that could harm, disable,
                      overburden, or impair the Service.
                    </li>
                  </ol>

                  <h2 className="text-lg font-bold">3. User Account</h2>
                  <p className="mb-4">
                    To access certain features of the Service, you must register
                    for an account. You agree to provide accurate information
                    and keep it updated.
                  </p>
                  <h2 className="text-lg font-bold">
                    4. User Responsibilities
                  </h2>
                  <p className="mb-4">You are responsible for:</p>
                  <ul className="list-disc list-inside mb-4">
                    <li>
                      Maintaining the confidentiality of your account and login
                      information.
                    </li>
                    <li>
                      All activity that occurs under your account, whether
                      authorized or not.
                    </li>
                    <li>
                      Ensuring that any information you provide is accurate and
                      up to date.
                    </li>
                    <li>
                      Complying with all applicable laws and regulations while
                      using the Service.
                    </li>
                  </ul>

                  <h2 className="text-lg font-bold">5. Privacy Policy</h2>
                  <p className="mb-4">
                    We are committed to protecting your privacy. Our collection
                    and use of personal information is governed by our{" "}
                    <a href="/privacy">Privacy Policy</a>, which explains how we
                    collect, use, and protect your data. By using the Service,
                    you consent to the collection and use of your information as
                    described in the Privacy Policy.
                  </p>

                  <h2 className="text-lg font-bold">
                    6. Intellectual Property
                  </h2>
                  <p className="mb-4">
                    All content, software, and intellectual property related to
                    the Service, including but not limited to trademarks, logos,
                    text, graphics, images, videos, and code, are owned by
                    19bits Inc. or its licensors and are protected by copyright,
                    trademark, and other intellectual property laws. You may not
                    use any content from the Service without our explicit
                    permission.
                  </p>

                  <h2 className="text-lg font-bold">
                    7. Third-Party Links and Services
                  </h2>
                  <p className="mb-4">
                    The Service may contain links to third-party websites or
                    services that are not owned or controlled by 19bits Inc. We
                    are not responsible for the content or practices of these
                    third-party websites and services. We recommend reviewing
                    the terms and privacy policies of any third-party websites
                    or services that you visit.
                  </p>

                  <h2 className="text-lg font-bold">
                    8. Limitation of Liability
                  </h2>
                  <p className="mb-4">
                    To the fullest extent permitted by applicable law, 19bits
                    Inc. and its officers, employees, agents, and affiliates
                    will not be liable for any direct, indirect, incidental,
                    special, or consequential damages arising from:
                  </p>
                  <ol>
                    <li>Your use or inability to use the Service.</li>
                    <li>
                      Any unauthorized access to or alteration of your data.
                    </li>
                    <li>Any content posted by other users or third parties.</li>
                  </ol>
                  <p>
                    Our total liability, in any case, will not exceed the amount
                    you paid for the Service during the six months preceding the
                    claim.
                  </p>

                  <h2 className="text-lg font-bold">9. Indemnification</h2>
                  <p className="mb-4">
                    You agree to indemnify, defend, and hold harmless 19bits
                    Inc., its affiliates, officers, employees, and agents from
                    any claims, damages, liabilities, costs, or expenses arising
                    from your use of the Service, your violation of these Terms,
                    or any third-party claims related to your use of the
                    Service.
                  </p>

                  <h2 className="text-lg font-bold">10. Termination</h2>
                  <p className="mb-4">
                    We reserve the right to suspend or terminate your access to
                    the Service at our discretion, without notice, for any
                    violation of these Terms or for any other reason. Upon
                    termination, you must cease using the Service and destroy
                    any copies of related materials in your possession.
                  </p>

                  <h2 className="text-lg font-bold">11. Governing Law</h2>
                  <p className="mb-4">
                    These Terms are governed by the laws of the Province of
                    Ontario, Canada, without regard to its conflict of law
                    principles. Any disputes arising from or relating to these
                    Terms shall be resolved in the courts located in Toronto,
                    Ontario, Canada.
                  </p>

                  <h2 className="text-lg font-bold">12. Dispute Resolution</h2>
                  <p className="mb-4">
                    In the event of a dispute, both parties agree to attempt to
                    resolve the matter amicably through informal negotiation. If
                    such negotiations fail, the dispute shall be submitted to
                    binding arbitration under the rules of ADR Chambers,
                    Toronto, Ontario, Canada.
                  </p>

                  <h2 className="text-lg font-bold">13. Force Majeure</h2>
                  <p className="mb-4">
                    Neither party will be held liable for failure to perform
                    under these Terms due to causes beyond their reasonable
                    control, including but not limited to natural disasters,
                    wars, strikes, or government actions.
                  </p>

                  <h2 className="text-lg font-bold">14. Miscellaneous</h2>
                  <p>
                    These Terms constitute the entire agreement between you and
                    19bits Inc. regarding your use of the Service and supersede
                    any prior agreements or understandings.
                  </p>
                  <p>
                    If any provision of these Terms is found to be invalid or
                    unenforceable, the remaining provisions shall remain in full
                    effect.
                  </p>
                  <p className="mb-4">
                    You may not assign or transfer your rights or obligations
                    under these Terms without our prior written consent.
                  </p>

                  <h2 className="text-lg font-bold">15. Contact Us</h2>
                  <p className="mb-4">
                    If you have any questions about these Terms, please contact
                    us at {import.meta.env.VITE_CONTACT_EMAIL}.
                  </p>

                  <div className="text-sm text-gray-500 mt-8 text-center">
                    Last updated: 2024-11-17
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

export default Terms;
