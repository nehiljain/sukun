import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DemodriveSignUpEmailProps {
  username?: string;
  paymentLink?: string;
  planName?: string;
  planPrice?: string;
  promoCode?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const promoCodeStyle = {
  backgroundColor: "hsla(68, 100%, 40%, 0.2)",
  color: "hsl(68, 100%, 40%)",
  padding: "2px 8px",
  borderRadius: "4px",
  fontFamily: "monospace",
  fontWeight: "500",
};

export const DemodriveSignUpEmail = ({
  username,
  paymentLink,
  planName = "Pro Plan",
  planPrice = "$50/month",
  promoCode = "WELCOME",
}: DemodriveSignUpEmailProps) => {
  const previewText = `✨ Complete your DemoDrive subscription`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>
              <Img
                src="https://i.ibb.co/cQrJLFd/Group.png"
                width="40"
                height="37"
                alt="DemoDrive"
                style={logoImg}
              />{" "}
              DemoDrive
            </Text>
          </Section>
          <Heading style={heading}>
            One last step: Activate your account 🚀
          </Heading>
          <Text style={text}>Hi {username},</Text>
          <Text style={text}>
            You're almost ready to start building better documentation with
            DemoDrive.
          </Text>
          <Text style={text}>
            Use code <span style={promoCodeStyle}>{promoCode}</span> to get your
            first month for free! 🎁
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={paymentLink}>
              Complete Subscription →
            </Button>
          </Section>
          <Text style={text}>
            or copy and paste this URL into your browser:{" "}
            <Link href={paymentLink} style={link}>
              {paymentLink}
            </Link>
          </Text>
          <Section style={featureSection}>
            <Text style={featureHeading}>✨ What you'll get:</Text>
            <Text style={featureText}>• AI-powered documentation analysis</Text>
            <Text style={featureText}>• Weekly quality reports</Text>
            <Text style={featureText}>• Automated improvement suggestions</Text>
            <Text style={featureText}>• Priority support</Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            This payment link will expire in 24 hours. If you need help or have
            questions about pricing, reach out to us at founders@demodrive.tech.
          </Text>
        </Container>{" "}
        <Text style={featureHeading}>What you'll get:</Text>
        <Text style={featureText}>• AI-powered documentation analysis</Text>
        <Text style={featureText}>• Weekly quality reports</Text>
        <Text style={featureText}>• Automated improvement suggestions</Text>
        <Text style={featureText}>• Priority support</Text>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "hsl(0, 0%, 100%)",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: "0 12px",
};

const container = {
  backgroundColor: "hsl(240, 10%, 3.9%)",
  border: "1px solid hsl(240, 3.7%, 15.9%)",
  borderRadius: "8px",
  margin: "40px auto",
  padding: "20px",
  maxWidth: "465px",
};

const logoSection = {
  marginTop: "32px",
};

const logoText = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0",
};

const logoImg = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "8px",
  width: "40px",
};

const heading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "24px",
  fontWeight: "normal",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "14px",
  lineHeight: "24px",
};

const link = {
  color: "hsl(68, 100%, 40%)",
  textDecoration: "none",
};

const buttonContainer = {
  margin: "32px 0",
};

const button = {
  backgroundColor: "hsl(68, 100%, 40%)",
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: "8px",
  color: "hsl(0, 0%, 5%)",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px",
  border: "none",
  cursor: "pointer",
  display: "block",
};

const featureSection = {
  margin: "32px 0",
  padding: "0 16px 16px 0",
  backgroundColor: "hsla(240, 10%, 3.9%, 0.5)",
  borderRadius: "4px",
};

const featureHeading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "12px",
  textAlign: "left" as const,
};

const featureText = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "14px",
  padding: "16px 0 0 16px",
  lineHeight: "16px",
  margin: "8px 0",
};

const hr = {
  border: "none",
  borderTop: "1px solid hsl(240, 5.9%, 90%)",
  margin: "26px 0",
  width: "100%",
};

const footer = {
  color: "hsl(240, 5%, 64.9%)",
  fontSize: "12px",
  lineHeight: "24px",
};

DemodriveSignUpEmail.PreviewProps = {
  username: "Stefan",
  paymentLink: "https://buy.stripe.com/eVabKF7zrbUM9LG4gg",
  planName: "Lite Plan",
  planPrice: "$50/month",
  promoCode: "EoZY9Io5c5tE5A",
} as DemodriveSignUpEmailProps;

export default DemodriveSignUpEmail;
