import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Check, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";

const Billing: React.FC = () => {
  const { user } = useAuth();
  const SUBSCRIPTION_PLANS = useSubscriptionPlans();

  const stripeBillingUrl =
    import.meta.env.VITE_STRIPE_BILLING_PAGE_URL ||
    "https://billing.stripe.com/p/login/test_14kcOhgYHd3e5bicMM";

  const handleManageSubscription = () => {
    if (user?.email) {
      // Append email to the Stripe URL if user email is available
      const urlWithEmail = `${stripeBillingUrl}?prefilled_email=${encodeURIComponent(user.email)}`;
      window.open(urlWithEmail, "_blank");
    } else {
      window.open(stripeBillingUrl, "_blank");
    }
  };

  const getCurrentPlan = () => {
    if (!user?.has_subscription_access) return null;
    return (
      SUBSCRIPTION_PLANS.find(
        (plan) => plan.price_id === user.stripe_price_id,
      ) || null
    );
  };

  const currentPlan = getCurrentPlan();

  return (
    <div className="flex">
      <main className="text-foreground flex-1 p-12 space-y-12">
        <div className="mb-8">
          <h1 className="text-3xl text-foreground font-bold">Membership</h1>
          <p className="text-muted-foreground mt-2">
            Manage your membership and billing.
          </p>
        </div>
        <Card className="w-full py-10">
          <CardContent>
            {/* Current Subscription */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
              <Card className="bg-secondary">
                <CardContent className="pt-6">
                  {user?.has_subscription_access ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-lg font-medium">
                            {currentPlan?.name || "Unknown Plan"}
                          </p>
                          <p className="text-muted-foreground">
                            {currentPlan?.price || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status
                          </p>
                          <p className="capitalize font-medium">
                            {user?.has_subscription_access
                              ? "Active"
                              : "Inactive"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Next billing date
                          </p>
                          <p className="font-medium">
                            {user?.subscription_renewal_date}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleManageSubscription}
                        className="flex items-center mt-2"
                        variant="outline"
                      >
                        Manage Subscription{" "}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p>
                        Free account (Lite Features available for limited time)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Available Plans */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative border h-full ${plan.isPopular ? "border-accent ring-1 ring-accent/50" : "border-border"}`}
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs rounded-bl-md rounded-tr-md font-medium">
                        Popular
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-xl font-bold">{plan.price}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="h-5 w-5 text-accent mr-2 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {user?.stripe_price_id != plan.price_id && (
                        <Button
                          onClick={() => {
                            if (plan.email) {
                              // Send email instead of opening link
                              window.location.href = `mailto:${plan.email}?subject=Subscription%20Request&body=I'm%20interested%20in%20the%20${plan.name}%20plan.%20My%20email%20is%20${user?.email}.`;
                            } else {
                              // Open Stripe URL as before
                              window.open(
                                plan.stripe_url +
                                  "?prefilled_email=" +
                                  user?.email,
                                "_blank",
                              );
                            }
                          }}
                          className="w-full"
                          variant="secondary"
                        >
                          Select Plan
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Billing;
