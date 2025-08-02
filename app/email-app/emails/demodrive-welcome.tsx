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

interface DemodriveWelcomeEmailProps {
  username?: string;
  reportLink?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

export const DemodriveWelcomeEmail = ({
  username,
  reportLink,
}: DemodriveWelcomeEmailProps) => {
  const previewText = `Welcome to DemoDrive, ${username}! Let's build amazing docs together.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>
              <Img
                src={`${baseUrl}/static/logo.svg`}
                width="40"
                height="37"
                alt="DemoDrive"
                style={logoImg}
              />{" "}
              DemoDrive
            </Text>
          </Section>

          <Section style={heroSection}>
            {/* <Img
              src={`${baseUrl}/static/welcome-hero.png`}
              width="400"
              height="200"
              alt="Welcome to DemoDrive"
              style={heroImage}
            /> */}
            <Heading style={heading}>Welcome, {username}! 🎉</Heading>
            <Text style={text}>
              Thank you for joining DemoDrive. We're Nehil and Selvam, the
              founders of DemoDrive, and we are here to ensure your users get
              the most out of your documentation.
            </Text>
          </Section>

          <Text style={text}>
            Let's remove any pain points in your documentation and make it
            awesome.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={reportLink}>
              Your first report →
            </Button>
          </Section>

          <Text style={smallText}>
            or copy this URL:{" "}
            <Link href={reportLink} style={link}>
              {reportLink}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Got questions? Just hit reply - we read every message!
            <br />
            If you didn't create this account, simply ignore this email.
          </Text>
        </Container>
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
};

const heading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "24px",
  fontWeight: "normal",
  textAlign: "left" as const,
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
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "hsl(68, 100%, 40%)",
  borderRadius: "9999px",
  color: "hsl(0, 0%, 5%)",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "16px 24px",
  border: "1px solid transparent",
  transition: "all 0.2s ease",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
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

const heroSection = {
  textAlign: "left" as const,
  margin: "20px 0 40px",
};

const heroImage = {
  borderRadius: "12px",
  marginBottom: "24px",
};

const subheading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const featureSection = {
  margin: "32px 0",
  padding: "16px",
  backgroundColor: "hsla(240, 10%, 3.9%, 0.5)",
  borderRadius: "4px",
};

const featureHeading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "16px",
  fontWeight: "600",
  marginBottom: "12px",
};

const featureText = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const smallText = {
  color: "hsl(240, 5%, 64.9%)",
  fontSize: "12px",
  textAlign: "left" as const,
};

DemodriveWelcomeEmail.PreviewProps = {
  username: "John",
  reportLink: "https://app.demodrive.tech/verify?token=xyz123",
} as DemodriveWelcomeEmailProps;

export default DemodriveWelcomeEmail;
