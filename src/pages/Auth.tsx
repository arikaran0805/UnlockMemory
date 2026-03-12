/**
 * Auth Page - Legacy Route Fallback
 * 
 * This page redirects users to the new /login route.
 * Kept for backwards compatibility with old links.
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Preserve supported query parameters during redirect
    const reason = searchParams.get("reason");
    const redirect = searchParams.get("redirect") ?? searchParams.get("returnUrl") ?? searchParams.get("returnTo");

    const nextParams = new URLSearchParams();
    if (reason) nextParams.set("reason", reason);
    if (redirect) nextParams.set("redirect", redirect);

    const queryString = nextParams.toString();
    navigate(`/login${queryString ? `?${queryString}` : ""}`, { replace: true });
  }, [navigate, searchParams]);

  // Show nothing while redirecting
  return null;
};

export default Auth;
