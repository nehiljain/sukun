import { BrandAsset } from "@/types/brand";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API_URL = "/api/brand-assets/";

// Get CSRF token from cookie
const getCsrfToken = () => {
  const name = "csrftoken=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
};

// Axios config with CSRF token
const axiosConfig = {
  withCredentials: true,
  headers: {
    "X-CSRFToken": getCsrfToken(),
  },
};

export function useBrandAssets() {
  return useQuery({
    queryKey: ["brandAssets"],
    queryFn: () => axios.get(API_URL, axiosConfig).then((res) => res.data),
  });
}

export function useCreateBrandAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<BrandAsset, "id">) =>
      axios.post(API_URL, data, axiosConfig).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandAssets"] });
    },
  });
}

export function useUpdateBrandAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BrandAsset) =>
      axios
        .put(`${API_URL}${data.id}/`, data, axiosConfig)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandAssets"] });
    },
  });
}

export function useDeleteBrandAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${API_URL}${id}/`, axiosConfig).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandAssets"] });
    },
  });
}
