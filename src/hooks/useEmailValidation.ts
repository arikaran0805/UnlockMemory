import { useState, useEffect } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DOMAIN_CORRECTIONS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "yahho.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "outlool.com": "outlook.com",
};

export function useEmailValidation(email: string) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    if (!email || email.length < 3) {
      setIsValid(null);
      setError("");
      setSuggestion("");
      return;
    }

    const valid = EMAIL_REGEX.test(email);
    setIsValid(valid);
    setError(valid ? "" : "Please enter a valid email address.");

    // Check domain typo
    if (valid) {
      const [local, domain] = email.split("@");
      const corrected = DOMAIN_CORRECTIONS[domain?.toLowerCase()];
      if (corrected && corrected !== domain?.toLowerCase()) {
        setSuggestion(`${local}@${corrected}`);
      } else {
        setSuggestion("");
      }
    } else {
      setSuggestion("");
    }
  }, [email]);

  return { isValid, error, suggestion };
}
