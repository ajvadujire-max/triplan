import { useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";

export function useAppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine base path based on current route prefix
  let basePath = "/dashboard";
  if (location.pathname.startsWith("/admin/dashboard")) {
    basePath = "/admin/dashboard";
  } else if (location.pathname.startsWith("/app")) {
    basePath = "/app";
  }

  // Get relative path without basePath
  const relativePath = location.pathname.startsWith(basePath)
    ? location.pathname.substring(basePath.length)
    : location.pathname;

  const pathSegments = relativePath.split("/").filter(Boolean);

  // Compute fallback parent path when history is missing (e.g. direct deep link refresh)
  const getFallbackParent = useCallback((): string => {
    if (pathSegments.length <= 1) {
      return `${basePath}/dashboard`;
    }
    const parentSegments = pathSegments.slice(0, pathSegments.length - 1);
    return `${basePath}/${parentSegments.join("/")}`;
  }, [basePath, pathSegments]);

  // Unified goBack implementation
  const goBack = useCallback(
    (customFallback?: string) => {
      if (window.history.length > 1 && location.key !== "default") {
        navigate(-1);
      } else {
        const fallback = customFallback || getFallbackParent();
        navigate(fallback, { replace: true });
      }
    },
    [location.key, navigate, getFallbackParent]
  );

  // Helper to push a relative or absolute route
  const goTo = useCallback(
    (path: string) => {
      if (path.startsWith("/")) {
        navigate(path);
      } else {
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        navigate(`${basePath}${cleanPath}`);
      }
    },
    [navigate, basePath]
  );

  return {
    basePath,
    relativePath,
    pathSegments,
    location,
    navigate,
    goBack,
    goTo,
    getFallbackParent,
  };
}
