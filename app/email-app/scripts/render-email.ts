import * as React from "react";
import { DemodriveSignUpEmail } from "../emails/demodrive-sign-up";
import { render } from "@react-email/render";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const previewProps = {
  username: "{username}",
  paymentLink: "{paymentLink}",
  planName: "{planName}",
  planPrice: "{planPrice}",
  promoCode: "{promoCode}",
};

async function main() {
  // Generate HTML version
  const html = await render(
    React.createElement(DemodriveSignUpEmail, previewProps),
    {
      pretty: false,
    },
  );

  console.log(html);

  // // Generate plain text version
  // const text = await render(React.createElement(DemodriveReportEmail, previewProps), {
  //   plainText: true,
  // });

  // console.log("\n\nPlain text version:\n");
  // console.log(text);
}

main().catch(console.error);
