import { useQuery } from "@tanstack/react-query";
import { ddApiClient } from "@/lib/api-client";

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  new_price?: string;
  price_id: string;
  features: string[];
  stripe_url?: string;
  email?: string;
  isPopular: boolean;
};

const fetchSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await ddApiClient.get("/api/subscription-plans/");

  if (response.status !== 200) {
    throw new Error("Failed to fetch subscription plans");
  }

  return response.data;
};

export const useSubscriptionPlans = () => {
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscriptionPlans"],
    queryFn: fetchSubscriptionPlans,
  });

  return plans;
};
